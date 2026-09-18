import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun} from '../src/game.js';
import {createPart,equip,unequip,stats,weaponStats,digestionYield} from '../src/assembly.js';
import {CATALOG} from '../src/catalog.js';
import {bodyBonuses,organEffect,bodyReloadBonus,bodyTraitDescription,bodyTraitState,recordCritRamp,critRampStacks,defensiveOrganHitCapacity} from '../src/systems/body-traits.js';
import {reloadDuration} from '../src/systems/sets-loot.js';
import {prepareIsaacAttack,isaacHit,tickIsaacCombat} from '../src/systems/organs/combat.js';
import {tickHealth,receiveHit} from '../src/systems/health.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function part(s,key,tier=1){const p=createPart(s,key,tier);p.rarity='common';p.setId={body:'reactor',arm:'hecaton',leg:'hunter',organ:'chimera'}[CATALOG[key].kind];p.affixes=[];p.affix=null;return p;}
function body(s,key){s.body=part(s,key);const d=CATALOG[key];s.arms=Array(d.arms).fill(null);s.legs=Array(d.legs).fill(null);s.organs=Array(d.organs).fill(null);}
function organic(){const s=createRun();body(s,'bastion');s.arms[0]=part(s,'seed');s.isaac={attacks:{},deals:{organs:1,arms:0,hpCost:0}};s.organs=['stabilizer','accelerator','regen','digestion'].map(k=>part(s,k));return s;}

test('each chassis exposes one signature condition without universal slot bonuses',()=>{
 const s=createRun();
 for(const [key,text] of Object.entries({reactor:'Каждое убийство повышает урон всего оружия на 1%, до \\+100%',wanderer:'Установлен Скороход',hunter:'каждая атака повышает шанс и урон крита на 3%',bastion:'Установлены 4 органа',chimera:'включая ближний бой и снаряды',rootwalker:'за каждую ячейку максимального здоровья',hecaton:'скорость перезарядки Сеялки, Рассеивателя, Маркера и Скребков \\+35%',broodmother:'постоянных неуязвимых дронов'}))assert.match(bodyTraitDescription({key}),new RegExp(text));
 body(s,'rootwalker');s.arms=Array.from({length:4},()=>part(s,'seed'));s.legs=Array(4).fill(null);assert.equal(bodyTraitState(s).active,false);assert.deepEqual(bodyBonuses(s),{speed:0,rate:0,organ:0,damage:0,rangedDamage:0,hp:0,familyReload:0,healthDamage:0,speedDamage:0});
});

/** Item 36: the Casing clause is Casing-only now, and kills drive weapon damage. */
test('reactor doubles only the Casing and ramps weapon damage with every kill',()=>{
 const s=createRun();body(s,'reactor');s.arms=[part(s,'seed'),null];const interval=weaponStats(s,s.arms[0]).interval;
 s.organs=[part(s,'stabilizer'),null];assert.equal(bodyTraitState(s).active,false);assert.equal(weaponStats(s,s.arms[0]).interval,interval);
 s.organs[1]=part(s,'shield');assert.equal(bodyTraitState(s).active,true);assert.match(bodyTraitState(s).status,/Кожух: Активно/);assert.equal(weaponStats(s,s.arms[0]).interval,interval);
 assert.equal(defensiveOrganHitCapacity(s,s.organs[1]),2);
 // Plates are a shared 0.5-per-hit pool, so the trait never applied to them.
 s.organs=[part(s,'armor'),null];assert.equal(bodyTraitState(s).active,false);assert.equal(defensiveOrganHitCapacity(s,s.organs[0]),1);
 s.organs=[part(s,'mirrorGland'),null];assert.equal(bodyTraitState(s).active,false);
 // The kill ramp needs no organ and stops at double damage.
 const base=weaponStats(s,s.arms[0]).damage;
 for(const [kills,bonus] of [[0,0],[1,.01],[50,.5],[100,1],[400,1]]){
  s.kills=kills;assert.equal(bodyBonuses(s).damage,bonus);
  assert.ok(Math.abs(weaponStats(s,s.arms[0]).damage-base*(1+bonus))<1e-9,`${kills} kills`);
 }
});

test('broodmother description shows the current drone count without a rank formula',()=>{
 const s=createRun();
 for(let rank=1;rank<=5;rank++){
  const p=part(s,'broodmother',rank),description=bodyTraitDescription(p);
  assert.match(description,new RegExp(rank===1?'одного постоянного неуязвимого дрона':`${rank} постоянных неуязвимых дрон`));
  assert.doesNotMatch(description,/перехват/i);
  assert.match(description,/атаку(ет|ют) самостоятельно/);
  assert.match(description,/Требуется установленное и включённое оружие «Опылитель»/);
  assert.doesNotMatch(description,/за ранг|от ранга|ранг выше|ранг усиливает/i);
 }
});

test('beekeeper ability requires an equipped enabled Pollinator, not an inventory arm',()=>{
 const s=createRun();body(s,'broodmother');const arm=part(s,'drone');s.inventory=[arm];
 s.arms=[part(s,'rocket'),null];assert.equal(bodyTraitState(s).active,false);
 s.arms[1]=arm;assert.equal(bodyTraitState(s).active,true);
 assert.equal(bodyTraitState(s,part(s,'broodmother')).active,false);
 arm.disabled=true;assert.equal(bodyTraitState(s).active,false);
 arm.disabled=false;s.arms[0]=part(s,'drone');assert.equal(bodyTraitState(s).active,true);
 s.arms[1]=null;assert.equal(bodyTraitState(s).active,true);
 s.arms[0]=null;assert.equal(bodyTraitState(s).active,false);
});

test('wanderer needs one Runner leg for its movement multiplier and dodges without any condition',()=>{
 const s=createRun();s.body=part(s,'wanderer');s.arms=[];s.inventory=[];s.legs=[part(s,'universal'),null];s.organs=[null,null];
 near(stats(s).speed,3);near(stats(s).dodge,.2);assert.match(bodyTraitState(s).status,/Скорость: Неактивно · 0 из 1 Скорохода/);
 s.legs[1]=part(s,'universal');near(stats(s).dodge,.2);assert.match(bodyTraitState(s).status,/Скорость: Неактивно · 0 из 1 Скорохода/);
 s.legs[1]=part(s,'runner');assert.match(bodyTraitState(s).status,/Скорость: Активно · 1 из 1 Скорохода/);near(stats(s).dodge,.2);
 // Organ slots no longer gate anything on this chassis.
 s.organs[0]=part(s,'stabilizer');near(stats(s).dodge,.2);assert.match(bodyTraitState(s).status,/Уклонение: всегда активно/);
 s.legs[1]=null;near(stats(s).speed,3);near(stats(s).dodge,.2);assert.equal(bodyTraitState(s).active,false);
});

test('hunter fills three hands to ramp crit with every attack and loses the stack after a pause',()=>{
 const s=createRun();body(s,'hunter');s.arms=[part(s,'pistol'),part(s,'claws'),null];
 const base=weaponStats(s,s.arms[0]),reload=reloadDuration(s,s.arms[0],1.2);assert.equal(bodyTraitState(s).active,false);
 recordCritRamp(s,0);assert.equal(critRampStacks(s,0),0);
 s.arms[2]=part(s,'needle');assert.equal(bodyTraitState(s).active,true);assert.equal(bodyTraitState(s).status,'Активно · 3 из 3');
 near(reloadDuration(s,s.arms[0],1.2),reload);
 for(let i=0;i<4;i++)recordCritRamp(s,i*.5);
 assert.equal(critRampStacks(s,1.5),4);
 near(weaponStats(s,s.arms[0]).crit,base.crit+.12);near(weaponStats(s,s.arms[0]).critPower,base.critPower+.12);
 s.time=5;assert.equal(critRampStacks(s,5),0);near(weaponStats(s,s.arms[0]).crit,base.crit);
 for(let i=0;i<40;i++)recordCritRamp(s,5+i*.5);assert.equal(critRampStacks(s,24.5),10);
});

test('wanderer converts movement above eight metres per second into damage and attack rate',()=>{
 const s=createRun();body(s,'wanderer');s.inventory=[];s.arms=[part(s,'seed'),null];
 s.legs=[part(s,'universal'),part(s,'universal')];near(stats(s).speed,6);
 const base=weaponStats(s,s.arms[0]);
 s.legs=[part(s,'runner',5),part(s,'runner',5)];const fast=stats(s);near(fast.speed,7*1.8*1.2);
 const rush=Math.min(1,.08*(fast.speed-8));assert.ok(rush>0);
 near(weaponStats(s,s.arms[0],fast).damage,base.damage*(1+rush));
 near(weaponStats(s,s.arms[0],fast).interval,CATALOG.seed.interval/(1+rush));
});

test('bastion requires four installed organs rather than four available or empty slots',()=>{
 const s=createRun();body(s,'bastion');s.isaac={deals:{organs:1,arms:0,hpCost:0}};s.organs=Array(4).fill(null);assert.equal(organEffect(s),1);assert.equal(bodyTraitState(s).status,'Неактивно · 0 из 4');
 s.organs=['stabilizer','stabilizer','regen','digestion'].map(k=>part(s,k));assert.equal(organEffect(s),1.3);assert.equal(bodyTraitState(s).status,'Активно · 4 из 4');s.organs[3]=null;assert.equal(organEffect(s),1);
});

test('chimera needs four mixed arms and boosts every arm only while mixed',()=>{
 const s=createRun();body(s,'chimera');s.arms=Array.from({length:4},()=>part(s,'seed'));const ranged=weaponStats(s,s.arms[0]).damage;assert.equal(bodyTraitState(s).active,false);assert.match(bodyTraitState(s).status,/нужны ближний бой и снаряды/);
 s.arms[3]=part(s,'claws');near(weaponStats(s,s.arms[0]).damage,ranged*1.25);near(weaponStats(s,s.arms[3]).damage,CATALOG.claws.damage*1.25);s.arms[2]=null;near(weaponStats(s,s.arms[0]).damage,ranged);
});

test('rootwalker has six leg slots and scales weapon damage with every max health cell',()=>{
 const s=createRun();body(s,'rootwalker');assert.equal(s.legs.length,6);s.arms=[part(s,'seed'),null];
 s.legs=Array.from({length:6},(_,i)=>i<3?part(s,'universal'):null);assert.equal(bodyTraitState(s).active,false);assert.equal(bodyBonuses(s).healthDamage,0);
 s.legs[3]=part(s,'universal');assert.equal(bodyTraitState(s).active,true);assert.equal(bodyBonuses(s).healthDamage,.05);
 const boosted=weaponStats(s,s.arms[0]).damage;s.legs[3]=null;assert.ok(boosted>weaponStats(s,s.arms[0]).damage);
});

test('hecaton needs two Heavy Hauler legs to reload its own weapon family faster',()=>{
 const s=createRun();body(s,'hecaton');s.arms=[part(s,'seed'),part(s,'seed'),part(s,'seed'),part(s,'seed')];
 s.legs=[part(s,'plated'),null,null,null];
 const interval=weaponStats(s,s.arms[0]).interval,base=reloadDuration(s,s.arms[0],1.2);assert.equal(bodyReloadBonus(s,s.arms[0]),0);
 s.legs[1]=part(s,'plated');assert.equal(bodyTraitState(s).active,true);assert.equal(bodyReloadBonus(s,s.arms[0]),.35);assert.equal(bodyReloadBonus(s,part(s,'needle')),0);
 near(weaponStats(s,s.arms[0]).interval,interval);near(reloadDuration(s,s.arms[0],1.2),1.2/(1.2/base+.35));
});
test('organ booster scales projectile speed, attack rate and regeneration but never the composter',()=>{
 const s=organic();s.organs=['stabilizer','accelerator','regen','digestion'].map(k=>createPart(s,k));near(stats(s).projectile,1.39);near(stats(s).rate,.195);near(stats(s).regenDelay,15/1.3);
 const p=createPart(s,'seed');p.spent=20;s.inventory.push(p);assert.equal(digestionYield(s,p.id),13);
});
test('slime snapshots on attack and larvae snapshot organ power when summoned',()=>{
 const s=organic();s.organs=['slime','parasite','stabilizer','digestion'].map(k=>createPart(s,k));
 const w=prepareIsaacAttack(s,s.arms[0],{});s.enemies=[{id:1,x:5,y:0,z:0,hp:10000,radius:1,kind:'normal'}];s.isaac.larvae=[];s.isaac.slimePools=[];
 for(let i=0;i<40;i++)tickIsaacCombat(s,.05,()=>{});
 near(s.isaac.larvae[0].damage,7.8);s.organs.pop();const e={};isaacHit(s,e,100,w);
 near(e.slimeUntil,3.9);near(s.isaac.larvae[0].damage,7.8);assert.equal(e.clutch,undefined);
});
test('shield recharge and armor capacity use boosted organs without extra HP',()=>{
 const s=organic();s.organs=['shield','armor','stabilizer','digestion'].map(k=>createPart(s,k));const st=stats(s);assert.equal(st.hp,4);assert.equal(st.armor,3);// Item 2: armour repairs continuously, and the Mason's organ boost scales the rate.
 near(st.armorRepairPerSecond,.01*1.3);near(st.armorRepairDelay,1/(.01*1.3));tickHealth(s,st);near(s.organs[0].shieldReadyAt,15/1.3);s.time=15/1.3;tickHealth(s,st);assert.equal(receiveHit(s,st),'shield');assert.equal(s.organs[0].shieldCharge,0);
});
test('reverse heart impulse uses boosted power without recursively creating pulses',()=>{
 const s=organic();s.organs=['reverseHeart','stabilizer','regen','digestion'].map(k=>createPart(s,k));s.isaac={deals:{organs:1},pulses:1,pulseDamage:2,larvae:[],slimePools:[]};s.enemies=[{hp:1000,x:1,y:0,z:0}];let total=0;tickIsaacCombat(s,0,(e,d)=>total+=d);near(total,weaponStats(s,s.arms[0]).damage*2.6);assert.equal(s.isaac.pulses,0);
});

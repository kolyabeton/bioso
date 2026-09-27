import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun} from '../src/game.js';
import {createPart,equip,unequip,stats,weaponStats,digestionYield} from '../src/assembly.js';
import {CATALOG} from '../src/catalog.js';
import {bodyBonuses,organEffect,bodyReloadBonus,bodyTraitDescription,bodyTraitState,recordKillRamp,recordCritRamp,critRampStacks,defensiveOrganHitCapacity} from '../src/systems/body-traits.js';
import {reloadDuration} from '../src/systems/sets-loot.js';
import {prepareIsaacAttack,isaacHit,tickIsaacCombat} from '../src/systems/organs/combat.js';
import {tickHealth,receiveHit} from '../src/systems/health.js';
import {activeEquipmentCards} from '../src/ui/catalog-sets.js';
import {learn} from '../src/systems/abilities.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function part(s,key,tier=1){const p=createPart(s,key,tier);p.rarity='common';p.setId={body:'reactor',arm:'hecaton',leg:'hunter',organ:'chimera'}[CATALOG[key].kind];p.affixes=[];p.affix=null;return p;}
function body(s,key){s.body=part(s,key);const d=CATALOG[key];s.arms=Array(d.arms).fill(null);s.legs=Array(d.legs).fill(null);s.organs=Array(d.organs).fill(null);}
function organic(){const s=createRun();body(s,'bastion');s.arms[0]=part(s,'seed');s.isaac={attacks:{},deals:{organs:1,arms:0,hpCost:0}};s.organs=['stabilizer','accelerator','regen','digestion'].map(k=>part(s,k));return s;}

test('Soul displays final chassis percentages from both installed Repair Kits without a boost footer',()=>{
 const s=createRun();body(s,'wanderer');s.legs=[part(s,'runner'),part(s,'runner')];
 s.organs=[part(s,'repairGland',1),part(s,'repairGland',5),part(s,'repairGland',5)];
 s.inventory=[part(s,'repairGland',5)];
 const html=activeEquipmentCards(s);
 assert.match(html,/скорость движения \+44%/);
 assert.match(html,/урон и скорость атаки \+11%/);
 assert.doesNotMatch(html,/не больше|до \+100%/);
 assert.match(html,/ui-set-bonus-heading/);
 assert.match(html,/ui-set-bonus-row/);
 assert.doesNotMatch(html,/ui-set-bonus-card ui-learned/);
 assert.doesNotMatch(html,/Усиление Ремкомплектами/);
 s.organs=[];
 assert.doesNotMatch(activeEquipmentCards(s),/Уклонение/);
 assert.match(activeEquipmentCards(s),/урон и скорость атаки \+5%/);
});

test('each chassis exposes one signature condition without universal slot bonuses',()=>{
 const s=createRun();
 for(const [key,text] of Object.entries({reactor:'Каждое убийство повышает урон всего оружия на 1%',wanderer:'Установлен Скороход',hunter:'Установлены 2 Маркера',bastion:'Установлены 4 органа',chimera:'Мойка: весь периодический урон',rootwalker:'за каждую ячейку максимального здоровья',hecaton:'время перезарядки Сеялки, Рассеивателя, Маркера и Скребков сокращается на 26%',broodmother:'постоянных неуязвимых дронов'}))assert.match(bodyTraitDescription({key}),new RegExp(text));
 body(s,'rootwalker');s.arms=Array.from({length:4},()=>part(s,'seed'));s.legs=Array(4).fill(null);assert.equal(bodyTraitState(s).active,false);assert.deepEqual(bodyBonuses(s),{speed:0,rate:0,organ:0,damage:0,rangedDamage:0,periodicDamage:0,hp:0,familyReload:0,healthDamage:0,speedDamage:0});
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
 // The kill ramp needs no organ and keeps growing.
 const base=weaponStats(s,s.arms[0]).damage;
 for(const [kills,bonus] of [[0,0],[1,.01],[50,.5],[100,1],[400,1]]){
  s.killRamp=null;for(let i=0;i<kills;i++)recordKillRamp(s);assert.equal(bodyBonuses(s).damage,bonus);
  assert.ok(Math.abs(weaponStats(s,s.arms[0]).damage-base*(1+bonus))<1e-9,`${kills} kills`);
 }
});

test('broodmother description shows the current drone count without a rank formula',()=>{
 const s=createRun();
 for(let rank=1;rank<=5;rank++){
  const p=part(s,'broodmother',rank),description=bodyTraitDescription(p);
  assert.match(description,new RegExp(rank===1?'одного постоянного неуязвимого дрона':`${rank} постоянных неуязвимых дрон`));
  assert.doesNotMatch(description,/перехват/i);
  assert.match(description,/Включённый Опылитель/);
  assert.doesNotMatch(description,/Базовая скорость движения/);
  assert.ok(description.split(/[.!?]+/).filter(Boolean).length<=2);
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

test('wanderer keeps its base dodge independently of the Runner trait',()=>{
 const s=createRun();s.body=part(s,'wanderer');s.arms=[];s.inventory=[];s.legs=[part(s,'universal'),null];s.organs=[null,null];
 near(stats(s).speed,6);near(stats(s).dodge,.2);assert.match(bodyTraitState(s).status,/Неактивно · 0 из 1 Скорохода/);
 s.legs[1]=part(s,'universal');near(stats(s).dodge,.2);assert.match(bodyTraitState(s).status,/Неактивно · 0 из 1 Скорохода/);
 s.legs[1]=part(s,'runner');assert.match(bodyTraitState(s).status,/Активно · 1 из 1 Скорохода/);near(stats(s).dodge,.2);
 // Organ slots no longer gate anything on this chassis.
 s.organs[0]=part(s,'stabilizer');near(stats(s).dodge,.2);
 s.legs[1]=null;near(stats(s).speed,6);near(stats(s).dodge,.2);assert.equal(bodyTraitState(s).active,false);
});

test('hunter needs two Markers to ramp crit with every attack and loses the stack after a pause',()=>{
 const s=createRun();body(s,'hunter');s.arms=[part(s,'pistol'),part(s,'claws'),part(s,'needle')];
 const reload=reloadDuration(s,s.arms[0],1.2);assert.equal(bodyTraitState(s).active,false);
 recordCritRamp(s,0);assert.equal(critRampStacks(s,0),0);
 s.arms[1]=part(s,'pistol');assert.equal(bodyTraitState(s).active,true);assert.equal(bodyTraitState(s).status,'Активно · 2 из 2 Маркеров');
 const base=weaponStats(s,s.arms[0]);
 near(reloadDuration(s,s.arms[0],1.2),reload);
 for(let i=0;i<4;i++)recordCritRamp(s,i*.5);
 assert.equal(critRampStacks(s,1.5),4);
 near(weaponStats(s,s.arms[0]).crit,base.crit+.12);near(weaponStats(s,s.arms[0]).critPower,base.critPower+.12*1.25);
 s.time=5;assert.equal(critRampStacks(s,5),0);near(weaponStats(s,s.arms[0]).crit,base.crit);
 for(let i=0;i<40;i++)recordCritRamp(s,5+i*.5);assert.equal(critRampStacks(s,24.5),40);assert.equal(weaponStats(s,s.arms[0]).crit,1);
});

test('wanderer converts movement above eight metres per second into damage and attack rate',()=>{
 const s=createRun();body(s,'wanderer');s.inventory=[];s.arms=[part(s,'seed'),null];
 s.legs=[part(s,'universal'),part(s,'universal')];near(stats(s).speed,9);
 const base=weaponStats(s,s.arms[0]);
 s.legs=[part(s,'runner',5),part(s,'runner',5)];const fast=stats(s);near(fast.speed,18);
 const rush=Math.min(1,.05*(fast.speed-8));assert.ok(rush>0);
 near(weaponStats(s,s.arms[0],fast).damage,base.damage*(1+rush));
 near(weaponStats(s,s.arms[0],fast).interval,CATALOG.seed.interval/(1+rush));
 const extreme={...fast,speed:30};near(weaponStats(s,s.arms[0],extreme).damage,base.damage*2);near(weaponStats(s,s.arms[0],extreme).interval,CATALOG.seed.interval/2);
 s.isaac={deals:{speed:100}};near(stats(s).speed,18);
 s.legs=[null,null];near(stats(s).speed,0);
});

test('bastion requires four installed organs rather than four available or empty slots',()=>{
 const s=createRun();body(s,'bastion');s.isaac={deals:{organs:1,arms:0,hpCost:0}};s.organs=Array(4).fill(null);assert.equal(organEffect(s),1);assert.equal(bodyTraitState(s).status,'Неактивно · 0 из 4');
 s.organs=['stabilizer','stabilizer','regen','digestion'].map(k=>part(s,k));assert.equal(organEffect(s),1.3);assert.equal(bodyTraitState(s).status,'Активно · 4 из 4');s.organs[3]=null;assert.equal(organEffect(s),1);
});

test('chimera gains periodic damage from biomass without an arm requirement',()=>{
 const s=createRun();body(s,'chimera');s.arms=[part(s,'seed')];const direct=weaponStats(s,s.arms[0]).damage;
 assert.equal(bodyTraitState(s).active,false);s.biomass=50;assert.equal(bodyTraitState(s).active,true);near(bodyBonuses(s).periodicDamage,.1);near(weaponStats(s,s.arms[0]).damage,direct);
 s.biomass=250;near(bodyBonuses(s).periodicDamage,.5);s.biomass=0;assert.equal(bodyTraitState(s).active,false);
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
 near(weaponStats(s,s.arms[0]).interval,interval);near(reloadDuration(s,s.arms[0],1.2),base/1.35);
});
test('organ booster scales reload reduction, attack rate and regeneration but never the composter',()=>{
 const s=organic();s.organs=['stabilizer','accelerator','regen','digestion'].map(k=>createPart(s,k));near(stats(s).projectile,1);near(stats(s).reloadReduction,.195);near(stats(s).rate,.195);near(stats(s).regenPerSecond,.013);
 const p=createPart(s,'seed');p.spent=20;s.inventory.push(p);assert.equal(digestionYield(s,p.id),13);
});
test('slime snapshots on attack and larvae snapshot organ power when summoned',()=>{
 const s=organic();s.organs=['slime','parasite','stabilizer','digestion'].map(k=>createPart(s,k));
 const w=prepareIsaacAttack(s,s.arms[0],{});s.enemies=[{id:1,x:5,y:0,z:0,hp:10000,radius:1,kind:'normal'}];s.isaac.larvae=[];s.isaac.slimePools=[];
 for(let i=0;i<40;i++)tickIsaacCombat(s,.05,()=>{});
 near(s.isaac.larvae[0].damage,7.8);s.organs.pop();const e={};isaacHit(s,e,100,w);
 near(e.slimeUntil,5);near(e.coolerDots[0].dps,2.6);near(s.isaac.larvae[0].damage,7.8);assert.equal(e.clutch,undefined);
});
test('shield recharge and armor capacity use boosted organs without extra HP',()=>{
 const s=organic();s.organs=['shield','armor','stabilizer','digestion'].map(k=>createPart(s,k));const st=stats(s);assert.equal(st.hp,4);assert.equal(st.armor,3);// Item 2: armour repairs continuously, and the Mason's organ boost scales the rate.
 near(st.armorRepairPerSecond,.01*1.3);near(st.armorRepairDelay,1/(.01*1.3));tickHealth(s,st);near(s.organs[0].shieldReadyAt,15/1.3);s.time=15/1.3;tickHealth(s,st);assert.equal(receiveHit(s,st),'shield');assert.equal(s.organs[0].shieldCharge,0);
});
test('reverse heart impulse uses boosted power without recursively creating pulses',()=>{
 const s=organic();s.organs=['reverseHeart','stabilizer','regen','digestion'].map(k=>createPart(s,k));s.isaac={deals:{organs:1},pulses:1,pulseDamage:2,larvae:[],slimePools:[]};s.enemies=[{hp:1000,x:1,y:0,z:0}];let total=0;tickIsaacCombat(s,0,(e,d)=>total+=d);near(total,weaponStats(s,s.arms[0]).damage*2.6);assert.equal(s.isaac.pulses,0);
});

test('all twelve chassis share amplified descriptions in Soul and assembly and refresh after kit changes',async()=>{
 const {chassisDescription,chassisTuning}=await import('../src/systems/support-chassis.js');
 const {itemInspectorData}=await import('../src/ui/item-inspector-data.js');
 const {describePart,formatUiNumber}=await import('../src/ui/adapters.js');
 const {upgrade}=await import('../src/assembly.js');
 const expected={reactor:/на 1,2%,/,wanderer:/скорость движения \+24%/,hunter:/на 3,6%,/,bastion:/\+36%/,chimera:/За каждые 50 биомассы \+12%/,rootwalker:/\+6%/,hecaton:/на 31,2%/,broodmother:/6 постоянных неуязвимых дронов/,demolition:/на 60%\./,regulator:/на 1,2 с/,sentinel:/выстрела — [\d,]+%/,assembler:/Урон башни — 36%/};
 for(const key of Object.keys(expected)){
  const s=createRun();body(s,key);s.body.tier=5;s.kills=1;
  if(key==='chimera')s.biomass=50;
  const arms={demolition:['drill','needle'],regulator:['whip','harpoon'],sentinel:['shieldArm','pistol'],assembler:['arc','arc'],hunter:['pistol','pistol','pistol'],chimera:['pistol','pistol','pistol','claws'],broodmother:['drone']}[key];
  if(arms)s.arms=arms.map(k=>part(s,k));
  if(key==='regulator')learn(s,'cold.3');
  s.legs=Array(CATALOG[key].legs).fill(null).map(()=>part(s,key==='hecaton'?'plated':key==='wanderer'?'runner':'universal'));
  const kit=part(s,'repairGland');s.organs=[kit];if(key==='bastion')s.organs.push(...['regen','shield','armor'].map(k=>part(s,k)));
  const text=chassisDescription(s);assert.match(text,expected[key],key);
  assert.ok(itemInspectorData(s,s.body).lines.includes(text),key);
  assert.ok(describePart(s,s.body).lines.includes(text),key);
  assert.ok(activeEquipmentCards(s).includes(text),key);
  if(key==='sentinel')assert.ok(text.includes(`${formatUiNumber(chassisTuning(s).reflectionScale*100)}%`));
  assert.ok(upgrade(s,kit.id,'traitBoost'),key);
  const changed=chassisDescription(s);assert.ok(itemInspectorData(s,s.body).lines.includes(changed));assert.ok(activeEquipmentCards(s).includes(changed));
  s.organs=s.organs.map(p=>p===kit?part(s,'stabilizer'):p);const removed=chassisDescription(s);assert.notEqual(removed,text,key);assert.ok(itemInspectorData(s,s.body).lines.includes(removed));assert.ok(activeEquipmentCards(s).includes(removed));
 }
});

 test('reactor streak expires at three combat seconds and each kill refreshes it',()=>{
 const s=createRun();body(s,'reactor');s.time=0;s.kills=400;
 assert.equal(bodyBonuses(s).damage,0);
 recordKillRamp(s);s.time=2.9;recordKillRamp(s);
 s.time=5.899;assert.equal(bodyBonuses(s).damage,.02);
 s.time=5.9;assert.equal(bodyBonuses(s).damage,0);
 recordKillRamp(s);assert.equal(bodyBonuses(s).damage,.01);
 s.isaac={...s.isaac,extraTime:3};assert.equal(bodyBonuses(s).damage,0);
 assert.match(bodyTraitDescription(s.body),/Через 3 с без убийств бонус сбрасывается/);
 });

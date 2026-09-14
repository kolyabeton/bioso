import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun} from '../src/game.js';
import {createPart,equip,unequip,stats,weaponStats,digestionYield} from '../src/assembly.js';
import {CATALOG} from '../src/catalog.js';
import {bodyBonuses,organEffect,bodyTraitDescription,bodyTraitState} from '../src/systems/body-traits.js';
import {prepareIsaacAttack,isaacHit,tickIsaacCombat} from '../src/systems/organs/combat.js';
import {tickHealth,receiveHit} from '../src/systems/health.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function part(s,key,tier=1){const p=createPart(s,key,tier);p.rarity='common';p.setId={body:'reactor',arm:'hecaton',leg:'hunter',organ:'chimera'}[CATALOG[key].kind];p.affixes=[];p.affix=null;return p;}
function body(s,key){s.body=part(s,key);const d=CATALOG[key];s.arms=Array(d.arms).fill(null);s.legs=Array(d.legs).fill(null);s.organs=Array(d.organs).fill(null);}
function organic(){const s=createRun();body(s,'bastion');s.arms[0]=part(s,'seed');s.isaac={attacks:{},deals:{organs:1,arms:0,hpCost:0}};s.organs=['stabilizer','accelerator','regen','digestion'].map(k=>part(s,k));return s;}

test('each chassis exposes one signature condition without universal slot bonuses',()=>{
 const s=createRun();
 for(const [key,text] of Object.entries({reactor:'15 убийств',wanderer:'Установлены 2 ноги',hunter:'Установлены 3 руки',bastion:'Установлены 4 органа',chimera:'включая ближнюю и дальнюю',rootwalker:'максимальное здоровье \\+2',hecaton:'скорость атак всех рук \\+20%',broodmother:'постоянных неуязвимых дронов'}))assert.match(bodyTraitDescription({key}),new RegExp(text));
 body(s,'rootwalker');s.arms=Array.from({length:4},()=>part(s,'seed'));s.legs=Array(4).fill(null);assert.equal(bodyTraitState(s).active,false);assert.deepEqual(bodyBonuses(s),{speed:0,rate:0,organ:0,damage:0,rangedDamage:0,hp:0});
});

test('broodmother description shows the current drone count without a rank formula',()=>{
 const s=createRun();
 for(let rank=1;rank<=5;rank++){
  const p=part(s,'broodmother',rank),description=bodyTraitDescription(p);
  assert.match(description,new RegExp(rank===1?'одного постоянного неуязвимого дрона':`${rank} постоянных неуязвимых дрон`));
  assert.doesNotMatch(description,/перехват/i);
  assert.match(description,/атаку(ет|ют) самостоятельно/);
  assert.doesNotMatch(description,/за ранг|от ранга|ранг выше|ранг усиливает/i);
 }
});

test('wanderer needs both installed legs for its movement multiplier',()=>{
 const s=createRun();s.body=part(s,'wanderer');s.arms=[];s.inventory=[];s.legs=[part(s,'universal'),null];s.organs=[null,null];near(stats(s).speed,3);near(stats(s).dodge,0);assert.match(bodyTraitState(s).status,/Скорость: Неактивно · 1\/2 ног/);
 s.legs[1]=part(s,'universal');near(stats(s).speed,7.2);near(stats(s).dodge,0);assert.match(bodyTraitState(s).status,/Скорость: Активно · 2\/2 ног/);
 s.organs[0]=part(s,'stabilizer');near(stats(s).dodge,0);assert.match(bodyTraitState(s).status,/Уклонение: Неактивно · 1\/2 органов/);
 s.organs[1]=part(s,'regen');near(stats(s).dodge,.2);assert.match(bodyTraitState(s).status,/Уклонение: Активно · 2\/2 органов/);
 s.organs.push(null);near(stats(s).dodge,0);assert.match(bodyTraitState(s).status,/Уклонение: Неактивно · 2\/3 органов/);
 s.organs[2]=part(s,'digestion');near(stats(s).dodge,.2);
 s.legs[1]=null;near(stats(s).speed,3);near(stats(s).dodge,.2);
});

test('hunter needs three installed arms and boosts only ranged damage',()=>{
 const s=createRun();body(s,'hunter');s.arms=[part(s,'seed'),part(s,'claws'),null];const ranged=weaponStats(s,s.arms[0]).damage,melee=weaponStats(s,s.arms[1]).damage;
 s.arms[2]=part(s,'needle');near(weaponStats(s,s.arms[0]).damage,ranged*1.2);near(weaponStats(s,s.arms[1]).damage,melee);assert.equal(bodyTraitState(s).active,true);
});

test('bastion requires four installed organs rather than four available or empty slots',()=>{
 const s=createRun();body(s,'bastion');s.isaac={deals:{organs:1,arms:0,hpCost:0}};s.organs=Array(4).fill(null);assert.equal(organEffect(s),1);assert.equal(bodyTraitState(s).status,'Неактивно · 0/4');
 s.organs=['stabilizer','stabilizer','regen','digestion'].map(k=>part(s,k));assert.equal(organEffect(s),1.3);assert.equal(bodyTraitState(s).status,'Активно · 4/4');s.organs[3]=null;assert.equal(organEffect(s),1);
});

test('chimera needs four mixed arms and boosts every arm only while mixed',()=>{
 const s=createRun();body(s,'chimera');s.arms=Array.from({length:4},()=>part(s,'seed'));const ranged=weaponStats(s,s.arms[0]).damage;assert.equal(bodyTraitState(s).active,false);assert.match(bodyTraitState(s).status,/нужны ближняя и дальняя руки/);
 s.arms[3]=part(s,'claws');near(weaponStats(s,s.arms[0]).damage,ranged*1.25);near(weaponStats(s,s.arms[3]).damage,CATALOG.claws.damage*1.25);s.arms[2]=null;near(weaponStats(s,s.arms[0]).damage,ranged);
});

test('rootwalker gains two max health with four legs and preserves wounds when toggled',()=>{
 const s=createRun();body(s,'rootwalker');s.legs=Array.from({length:4},()=>part(s,'universal'));s.hp=stats(s).hp;assert.equal(stats(s).hp,5);s.health.missing=1;s.hp=4;
 assert(unequip(s,'legs',3));assert.equal(stats(s).hp,3);assert.equal(s.hp,2);const leg=s.inventory.at(-1);assert(equip(s,leg.id,3));assert.equal(stats(s).hp,5);assert.equal(s.hp,4);
});

test('hecaton needs four installed arms for twenty percent attack speed',()=>{
 const s=createRun();body(s,'hecaton');s.arms=[part(s,'seed'),part(s,'seed'),part(s,'seed'),null];const interval=weaponStats(s,s.arms[0]).interval;s.arms[3]=part(s,'seed');near(weaponStats(s,s.arms[0]).interval,interval/1.2);s.arms[3]=null;near(weaponStats(s,s.arms[0]).interval,interval);
});
test('organ booster scales projectile speed, attack rate, regeneration and biomass but not refunds',()=>{
 const s=organic();s.organs=['stabilizer','accelerator','regen','digestion'].map(k=>createPart(s,k));near(stats(s).projectile,1.39);near(stats(s).rate,.195);near(stats(s).regenDelay,15/1.3);
 const p=createPart(s,'seed');p.spent=20;s.inventory.push(p);assert.equal(digestionYield(s,p.id),17);
});
test('slime snapshots on attack and larvae snapshot organ power when summoned',()=>{
 const s=organic();s.organs=['slime','parasite','stabilizer','digestion'].map(k=>createPart(s,k));
 const w=prepareIsaacAttack(s,s.arms[0],{});s.enemies=[];s.isaac.larvae=[];s.isaac.slimePools=[];
 for(let i=0;i<40;i++)tickIsaacCombat(s,.05,()=>{});
 near(s.isaac.larvae[0].damage,7.8);s.organs.pop();const e={};isaacHit(s,e,100,w);
 near(e.slimeUntil,3.9);near(s.isaac.larvae[0].damage,7.8);assert.equal(e.clutch,undefined);
});
test('shield recharge and armor capacity use boosted organs without extra HP',()=>{
 const s=organic();s.organs=['shield','armor','stabilizer','digestion'].map(k=>createPart(s,k));const st=stats(s);assert.equal(st.hp,3);assert.equal(st.armor,3);near(st.armorRepairDelay,15/1.3);tickHealth(s,st);near(s.organs[0].shieldReadyAt,15/1.3);s.time=15/1.3;tickHealth(s,st);assert.equal(receiveHit(s,st),'shield');assert.equal(s.organs[0].shieldCharge,0);
});
test('reverse heart impulse uses boosted power without recursively creating pulses',()=>{
 const s=organic();s.organs=['reverseHeart','stabilizer','regen','digestion'].map(k=>createPart(s,k));s.isaac={deals:{organs:1},pulses:1,pulseDamage:2,larvae:[],slimePools:[]};s.enemies=[{hp:1000,x:1,y:0,z:0}];let total=0;tickIsaacCombat(s,0,(e,d)=>total+=d);near(total,weaponStats(s,s.arms[0]).damage*2.6);assert.equal(s.isaac.pulses,0);
});

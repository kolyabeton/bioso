import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,attack,step} from '../src/game.js';
import {createPart,upgrade,unequip,equip,weaponStats,parasiteLarvaDamage} from '../src/assembly.js';
import {summonTuning} from '../src/systems/symbionts.js';
import {tickEffects} from '../src/systems/effects.js';
import {tickIsaacCombat,isaacDeath,ISAAC_LIMITS} from '../src/systems/organs/combat.js';
import {itemInspectorData} from '../src/ui/item-inspector-data.js';
import {modifiers} from '../src/systems/abilities.js';
import {soulSummonStats} from '../src/ui/soul-summon-stats.js';

const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function run(){const s=createRun(undefined,'survival',27);s.arms=[];s.organs=[];s.legs=[];s.world={walkable:()=>true,lineClear:()=>true};s.enemies=[];return s;}
function advance(s,seconds,fn){for(let i=0;i<Math.round(seconds/.05);i++){s.time+=.05;fn(.05);}}

test('swarm equipment integrates rank, paid upgrades and strongest duplicate caps',()=>{
 const s=run(),leg=createPart(s,'swarmLeg'),node=createPart(s,'broodNode');s.legs=[leg];s.organs=[node];s.biomass=10000;
 near(summonTuning(s).rate,1.15);near(summonTuning(s).damage,1.2);near(summonTuning(s).speed,1);
 for(const [p,stat,first]of [[leg,'summonRate',15],[node,'summonDamage',20]]){
  for(let i=0;i<10;i++){
   const ui=itemInspectorData(s,p);assert.equal(ui.preview.before,`+${first+4*i}%`);assert.equal(ui.preview.after,`+${first+4*(i+1)}%`);
   assert.ok(upgrade(s,p.id,stat,true));
  }
  assert.equal(upgrade(s,p.id,stat,true),false);p.tier=5;
 }
 near(summonTuning(s).rate,1.71);near(summonTuning(s).damage,1.76);
 s.legs=[...Array.from({length:3},()=>createPart(s,'swarmLeg')),leg];
 s.organs=[createPart(s,'broodNode'),createPart(s,'broodNode'),node];
 near(summonTuning(s).rate,2.01);near(summonTuning(s).damage,1.96);assert.equal(summonTuning(s).search,12);
});

test('old swarm-leg movement upgrades retain their investment as summon rate',()=>{
 const s=run(),p=createPart(s,'swarmLeg');p.upgrades.speed=3;s.legs=[p];
 near(summonTuning(s).rate,1.27);assert.equal(itemInspectorData(s,p).preview.before,'+27%');
 assert.ok(upgrade(s,p.id,'summonRate'));near(summonTuning(s).rate,1.31);
});

test('drone arm attacks autonomously through the shared swarm, with no hero shots',()=>{
 const s=run(),arm=createPart(s,'drone');s.arms=[arm];
 s.enemies=[{id:1,x:5,y:0,z:0,hp:10000,radius:.5,kind:'elite'}];
 s.abilities.learned=['summons.1','summons.2','summons.3','swarm','sporebrood'];
 const hits=[];advance(s,10,dt=>{attack(s,dt);tickEffects(s,dt,(e,d,source)=>hits.push({d,source}));});
 assert.equal(s.abilities.companions.length,1);assert.equal(s.abilities.companions[0].sourcePartId,arm.id);
 assert.ok(hits.length>3);assert.ok(hits.every(h=>['summon','sporebrood','burn'].includes(h.source)));assert.equal(s.shots.length,0);
 assert.equal(s.events.filter(e=>e.type==='attack').length,0);assert.ok(s.abilities.sporeHits>0);
 near(hits[0].d,weaponStats(s,arm).damage*summonTuning(s,modifiers(s)).bossDamage);
 const helper=s.abilities.companions[0];assert.ok(upgrade(s,arm.id,'damage'));tickEffects(s,0,()=>{});assert.equal(s.abilities.companions[0],helper);
 assert.ok(unequip(s,'arms',0));tickEffects(s,0,()=>{});assert.equal(s.abilities.companions.length,0);
 assert.ok(equip(s,arm.id,0));tickEffects(s,0,()=>{});assert.equal(s.abilities.companions.length,1);
});

test('Colony and arm drones are additional to the five Broodmother companions',()=>{
 const s=run();s.body=createPart(s,'broodmother',5);s.arms=[createPart(s,'drone'),createPart(s,'drone')];
 s.abilities.learned=['summons.0'];s.abilities.levels={'summons.0':5};
 tickEffects(s,0,()=>{});
 assert.equal(summonTuning(s,modifiers(s)).baseCount,8);
 assert.equal(s.abilities.companions.length,11);const originals=s.abilities.companions.slice(0,8);
 s.arms.reverse();tickEffects(s,0,()=>{});assert.deepEqual(s.abilities.companions.slice(0,8),originals);
 assert.equal(new Set(s.abilities.companions.map(c=>c.id)).size,11);
});

test('broodmother maintains one drone source per chassis rank',()=>{
 for(let rank=1;rank<=5;rank++){
  const s=run();s.body=createPart(s,'broodmother',rank);
  const tuning=summonTuning(s);assert.equal(tuning.baseCount,rank);assert.equal(tuning.count,rank);
  tickEffects(s,0,()=>{});assert.equal(s.abilities.companions.length,rank);
 }
});

test('an equipped drone recovers after a room jump and retains its damage and identity',()=>{
 const s=run(),arm=createPart(s,'drone');arm.affixes=[];arm.affix=null;s.arms=[arm];
 tickEffects(s,0,()=>{});const c=s.abilities.companions[0];
 s.player.x+=100;s.player.z+=100;
 s.enemies=[{id:1,x:s.player.x+4,y:0,z:s.player.z,hp:1000,radius:.5,kind:'normal'}];
 const before={x:c.x,z:c.z};tickEffects(s,0,()=>assert.fail('paused hit'));
 assert.deepEqual({x:c.x,z:c.z},before,'a paused tick cannot recall the drone');
 tickEffects(s,.05,()=>assert.fail('recall hit'));assert.equal(s.abilities.companions[0],c);
 assert.equal(c.sourcePartId,arm.id);assert.ok(Math.hypot(c.x-s.player.x,c.z-s.player.z)<3);
 const hits=[];advance(s,5,dt=>tickEffects(s,dt,(_,damage,source)=>hits.push({damage,source})));
 assert.ok(hits.length>=3);assert.ok(hits.every(h=>h.source==='summon'&&h.damage===weaponStats(s,arm).damage));
});

test('unmodified rank-I arm drone sustains fifteen DPS after reaching its target',()=>{
 const s=run(),p=createPart(s,'drone');p.affixes=[];p.affix=null;s.arms=[p];
 s.enemies=[{id:1,x:5,y:0,z:0,hp:100000,radius:.5,kind:'normal'}];
 advance(s,5,dt=>tickEffects(s,dt,()=>{}));let damage=0;
 advance(s,60,dt=>tickEffects(s,dt,(_,amount)=>damage+=amount));
 assert.equal(weaponStats(s,p).damage,18);assert.equal(weaponStats(s,p).range,10);
 assert.ok(Math.abs(damage/60-15)<=.3,`Actual DPS: ${damage/60}`);
});

test('drone arm acquires targets within ten metres without range bonuses from swarm legs',()=>{
 const s=run(),p=createPart(s,'drone');s.arms=[p];
 const e={id:1,x:10.01,y:0,z:0,hp:100,radius:.5,kind:'normal'};s.enemies=[e];
 assert.equal(weaponStats(s,p).range,10);
 tickEffects(s,0,()=>assert.fail('remote hit'));assert.equal(s.abilities.companions.find(c=>c.sourcePartId===p.id).target,null);
 e.x=10;tickEffects(s,0,()=>{});assert.equal(s.abilities.companions.find(c=>c.sourcePartId===p.id).target,1);
 e.x=10.01;tickEffects(s,0,()=>{});assert.equal(s.abilities.companions.find(c=>c.sourcePartId===p.id).target,null);
 s.legs=[createPart(s,'swarmLeg')];assert.equal(weaponStats(s,p).range,10);
 e.x=12;tickEffects(s,0,()=>{});assert.equal(s.abilities.companions.find(c=>c.sourcePartId===p.id).target,null);
 assert.ok(soulSummonStats(s,{}).some(([k,v])=>k==='Поиск дронов'&&v==='10 м'));
 assert.ok(soulSummonStats(s,{}).some(([k])=>k==='Поиск роя'),'the set adds a separate companion with its own search range');
 s.legs=Array.from({length:3},()=>createPart(s,'swarmLeg'));assert.equal(weaponStats(s,p).range,10);
});

test('womb produces two larvae every two seconds without attacks or deaths',()=>{
 const s=run();s.organs=[createPart(s,'parasite')];const tick=dt=>tickIsaacCombat(s,dt,()=>assert.fail('no enemies'));
 advance(s,1.95,tick);assert.equal(s.isaac.larvae.length,0);advance(s,.05,tick);assert.equal(s.isaac.larvae.length,2);
 assert.deepEqual(s.isaac.larvae.map(l=>l.damage),[6,6]);advance(s,2,tick);assert.equal(s.isaac.larvae.length,4);
 const before=JSON.stringify(s.isaac);tick(0);assert.equal(JSON.stringify(s.isaac),before);
 s.pending=1;step(s,1);assert.equal(JSON.stringify(s.isaac),before);
 s.organs=[];tick(.05);assert.deepEqual(s.isaac.broodTimers,{});
});

test('summon rate accelerates womb production and swarm damage affects the larva hit',()=>{
 const s=run();s.organs=[createPart(s,'parasite'),createPart(s,'broodNode')];s.abilities.learned=['summons.2','summons.1','summons.3'];s.abilities.levels={'summons.2':4};
 const b=modifiers(s),t=summonTuning(s,b);near(t.rate,1.5);
 advance(s,1.3,dt=>tickIsaacCombat(s,dt,()=>{}));assert.equal(s.isaac.larvae.length,0);
 advance(s,.05,dt=>tickIsaacCombat(s,dt,()=>{}));assert.equal(s.isaac.larvae.length,2);
 const rows=soulSummonStats(s,b);assert.ok(rows.some(([k,v])=>k==='Призыв личинок'&&v==='2 / 1.33 с'));
 s.enemies=[{id:1,x:0,y:0,z:0,hp:10000,radius:1,kind:'elite'}];const hits=[];
 advance(s,.5,dt=>tickIsaacCombat(s,dt,(e,d)=>hits.push(d)));assert.equal(hits.length,2);near(hits[0],6*t.damage*t.bossDamage);
});

test('womb ranks, independent timers and old infection removal',()=>{
 const s=run();s.organs=[createPart(s,'parasite',1),createPart(s,'parasite',5)];
 advance(s,2,dt=>tickIsaacCombat(s,dt,()=>{}));assert.deepEqual(s.isaac.larvae.map(l=>l.damage),[6,6,18,18]);
 const count=s.isaac.larvae.length;isaacDeath(s,{x:0,z:0,kind:'normal',clutch:{until:100,damage:100}},'direct');assert.equal(s.isaac.larvae.length,count);
 assert.ok(upgrade(s,s.organs[0].id,'larvaDamage'));near(parasiteLarvaDamage(s,s.organs[0]),8.4);
 for(let i=0;i<1000;i++)tickIsaacCombat(s,.05,()=>{});assert.ok(s.isaac.larvae.length<=ISAAC_LIMITS.larvae);
});

test('Hive uses the same timed production and no longer responds to deaths',()=>{
 const s=run();s.arms=[createPart(s,'rocket'),createPart(s,'fangs')];s.organs=[createPart(s,'digestion')];
 for(let i=0;i<10;i++)isaacDeath(s,{kind:'normal',x:0,z:0},'direct');assert.equal(s.isaac.larvae.length,0);
 advance(s,2,dt=>tickIsaacCombat(s,dt,()=>{}));assert.equal(s.isaac.larvae.length,3);
 assert.ok(soulSummonStats(s,{}).some(([k,v])=>k==='Призыв личинок'&&v==='3 / 2.00 с'));
 s.organs=[];tickIsaacCombat(s,.05,()=>{});assert.equal(s.isaac.broodTimers.hive,undefined);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,attack,step} from '../src/game.js';
import {createPart,upgrade,unequip,equip,weaponStats,parasiteLarvaDamage} from '../src/assembly.js';
import {destroySymbiont,summonTuning} from '../src/systems/symbionts.js';
import {tickEffects} from '../src/systems/effects.js';
import {tickIsaacCombat,isaacDeath,ISAAC_LIMITS} from '../src/systems/organs/combat.js';
import {itemInspectorData} from '../src/ui/item-inspector-data.js';
import {modifiers,abilityById,abilityDescriptionAtLevel} from '../src/systems/abilities.js';
import {soulSummonStats} from '../src/ui/soul-summon-stats.js';
import {droneStats} from '../src/systems/summon-equipment.js';

const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function run(){const s=createRun(undefined,'survival',27);s.arms=[];s.organs=[];s.legs=[];s.world={walkable:()=>true,lineClear:()=>true};s.enemies=[];return s;}
function advance(s,seconds,fn){for(let i=0;i<Math.round(seconds/.05);i++){s.time+=.05;fn(.05);}}

test('swarm equipment integrates rank, paid upgrades and strongest duplicate caps',()=>{
 const s=run(),leg=createPart(s,'swarmLeg'),node=createPart(s,'broodNode');s.legs=[leg];s.organs=[node];s.biomass=10000;
 near(summonTuning(s).rate,1);near(summonTuning(s).damage,1.35);near(summonTuning(s).speed,1);
 for(const [p,stat,first]of [[leg,'summonDamage',15],[node,'summonDamage',20]]){
  for(let i=0;i<10;i++){
   const ui=itemInspectorData(s,p);assert.equal(ui.preview.before,`+${first+4*i}%`);assert.equal(ui.preview.after,`+${first+4*(i+1)}%`);
   assert.ok(upgrade(s,p.id,stat,true));
  }
  assert.equal(upgrade(s,p.id,stat,true),false);p.tier=5;
 }
 near(summonTuning(s).rate,1);near(summonTuning(s).damage,2.47);
 s.legs=[...Array.from({length:3},()=>createPart(s,'swarmLeg')),leg];
 s.organs=[createPart(s,'broodNode'),createPart(s,'broodNode'),node];
 near(summonTuning(s).rate,1);near(summonTuning(s).damage,2.97);assert.equal(summonTuning(s).search,12);
});

test('old swarm-leg movement and rate upgrades retain their investment as swarm damage',()=>{
 const s=run(),p=createPart(s,'swarmLeg');p.upgrades.speed=2;p.upgrades.summonRate=1;s.legs=[p];
 near(summonTuning(s).rate,1);near(summonTuning(s).damage,1.27);assert.equal(itemInspectorData(s,p).preview.before,'+27%');
 assert.ok(upgrade(s,p.id,'summonDamage'));near(summonTuning(s).damage,1.31);near(summonTuning(s).rate,1);
});

test('drone arm attacks autonomously through the shared swarm, with no hero shots',()=>{
 const s=run(),arm=createPart(s,'drone');s.arms=[arm];
 s.enemies=[{id:1,x:5,y:0,z:0,hp:10000,radius:.5,kind:'elite'}];
 s.abilities.learned=['summons.1','summons.2','summons.3','swarm','sporebrood'];
 const hits=[];advance(s,10,dt=>{attack(s,dt);tickEffects(s,dt,(e,d,source)=>hits.push({d,source}));});
 assert.equal(s.abilities.companions.length,1);assert.equal(s.abilities.companions[0].sourcePartId,arm.id);
 assert.ok(hits.length>3);assert.ok(hits.every(h=>['summon','sporebrood','burn'].includes(h.source)));assert.equal(s.shots.length,0);
 assert.equal(s.events.filter(e=>e.type==='attack').length,0);assert.ok(s.abilities.sporeHits>0);
 const tuning=summonTuning(s,modifiers(s));near(hits[0].d,tuning.biteDamage*tuning.damage*tuning.bossDamage);
 const helper=s.abilities.companions[0];assert.ok(upgrade(s,arm.id,'damage'));tickEffects(s,0,()=>{});assert.equal(s.abilities.companions[0],helper);
 assert.ok(unequip(s,'arms',0));tickEffects(s,0,()=>{});assert.equal(s.abilities.companions.length,0);
 assert.ok(equip(s,arm.id,0));tickEffects(s,0,()=>{});assert.equal(s.abilities.companions.length,1);
});

test('Colony ranks show and summon the same whole drone counts',()=>{
 for(const [index,count]of [1,2,3,4,5].entries()){
  const s=run(),rank=index+1;s.abilities.learned=['summons.0'];s.abilities.levels={'summons.0':rank};
  assert.equal(modifiers(s).summons,count);
  assert.equal(abilityDescriptionAtLevel(abilityById('summons.0'),rank),`Призывает дронов: ${count}. Урон укуса: 6 + урон Опылителей.`);
  tickEffects(s,0,()=>{});
  assert.equal(summonTuning(s,modifiers(s)).baseCount,count);
  assert.equal(s.abilities.companions.length,count);
 }
});

test('swarm counts do not cap Colony or truncate additional drone sources',()=>{
 const s=run();s.arms=Array.from({length:25},()=>createPart(s,'drone'));
 for(const count of [6,50,1000]){
  const tuning=summonTuning(s,{summons:count});
  assert.equal(tuning.colonyCount,count);assert.equal(tuning.baseCount,count);
  assert.equal(tuning.drones.length,25);assert.equal(tuning.count,count+25);
 }
 s.abilities.learned=['summons.0'];s.abilities.levels={'summons.0':5};
 tickEffects(s,0,()=>{});assert.equal(s.abilities.companions.length,30);
});

test('Colony drones bite for six base damage',()=>{
 const s=run();s.abilities.learned=['summons.0'];s.abilities.levels={'summons.0':1};
 s.enemies=[{id:1,x:2,y:0,z:0,hp:10000,radius:.5,kind:'mass'}];
 const hits=[];advance(s,5,dt=>tickEffects(s,dt,(_,damage)=>hits.push(damage)));
 assert.ok(hits.length>0);assert.ok(hits.every(damage=>damage===6));
 assert.match(abilityDescriptionAtLevel(abilityById('summons.0'),1),/Урон укуса: 6 \+ урон Опылителей/);
});

test('Colony and arm drones are additional to the five Broodmother companions',()=>{
 const s=run();s.body=createPart(s,'broodmother',5);s.arms=[createPart(s,'drone'),createPart(s,'drone')];
 s.body.setId=s.arms[0].setId='broodmother';
 s.abilities.learned=['summons.0'];s.abilities.levels={'summons.0':5};
 tickEffects(s,0,()=>{});
 assert.equal(summonTuning(s,modifiers(s)).baseCount,10);
 assert.equal(s.abilities.companions.length,13);const originals=s.abilities.companions.slice(0,10);
 s.arms.reverse();tickEffects(s,0,()=>{});assert.deepEqual(s.abilities.companions.slice(0,10),originals);
 assert.equal(new Set(s.abilities.companions.map(c=>c.id)).size,13);
});

test('broodmother maintains one drone source per chassis rank with a Pollinator equipped',()=>{
 for(let rank=1;rank<=5;rank++){
  const s=run();s.body=createPart(s,'broodmother',rank);s.arms=[createPart(s,'drone')];
  s.body.setId=s.arms[0].setId='broodmother';
  const tuning=summonTuning(s);assert.equal(tuning.baseCount,rank);assert.equal(tuning.count,rank+2);
  tickEffects(s,0,()=>{});assert.equal(s.abilities.companions.length,rank+2);
 }
});

test('beekeeper toggles chassis drones with the last Pollinator while Colony and set helpers remain',()=>{
 const s=run();s.body=createPart(s,'broodmother',5);s.arms=[null,null];s.legs=[createPart(s,'swarmLeg')];
 s.body.setId=s.legs[0].setId='broodmother';
 s.abilities.learned=['summons.0'];s.abilities.levels={'summons.0':5};
 const sync=()=>{tickEffects(s,0,()=>{});return s.abilities.companions.length;};
 assert.equal(sync(),6);assert.equal(summonTuning(s,modifiers(s)).baseCount,5);
 const arm=createPart(s,'drone');s.inventory.push(arm);assert.equal(sync(),6);
 assert.ok(equip(s,arm.id,0));assert.equal(sync(),12);
 arm.disabled=true;assert.equal(sync(),6);
 arm.disabled=false;assert.equal(sync(),12);
 const second=createPart(s,'drone');s.inventory.push(second);assert.ok(equip(s,second.id,1));assert.equal(sync(),13);
 assert.ok(unequip(s,'arms',0));assert.equal(sync(),12);
 assert.ok(unequip(s,'arms',1));assert.equal(sync(),6);
 assert.equal(summonTuning(s,modifiers(s)).baseCount,5);
 assert.ok(equip(s,arm.id,0));assert.equal(sync(),12);
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
 const bite=summonTuning(s,modifiers(s)).biteDamage;assert.ok(hits.length>=3);assert.ok(hits.every(h=>h.source==='summon'&&h.damage===bite));
});

test('unmodified rank-I Pollinator raises every bite to twenty-four and sustains twenty DPS',()=>{
 const s=run(),p=createPart(s,'drone');p.affixes=[];p.affix=null;s.arms=[p];
 s.enemies=[{id:1,x:5,y:0,z:0,hp:100000,radius:.5,kind:'normal'}];
 advance(s,5,dt=>tickEffects(s,dt,()=>{}));let damage=0;
 advance(s,60,dt=>tickEffects(s,dt,(_,amount)=>damage+=amount));
 assert.equal(weaponStats(s,p).damage,18);assert.equal(weaponStats(s,p).range,10);
 assert.equal(summonTuning(s).biteDamage,24);assert.ok(Math.abs(damage/60-20)<=.3,`Actual DPS: ${damage/60}`);
});

test('Pollinator strike damages enemies inside its half-metre radius only',()=>{
 const s=run(),p=createPart(s,'drone');p.affixes=[];p.affix=null;s.arms=[p];
 const primary={id:1,x:.49,y:0,z:0,hp:100,radius:0,kind:'normal'},inside={id:2,x:-.49,y:0,z:0,hp:100,radius:0,kind:'normal'},outside={id:3,x:-.51,y:0,z:0,hp:100,radius:0,kind:'normal'};s.enemies=[primary,inside,outside];
 tickEffects(s,0,()=>{});Object.assign(s.abilities.companions[0],{x:0,y:0,z:0,target:primary.id,phase:'approach',cooldown:0});
 const hits=[];tickEffects(s,.00001,(e,damage,source)=>{e.hp-=damage;hits.push([e.id,damage,source]);});
 assert.deepEqual(hits,[[primary.id,24,'summon'],[inside.id,24,'summon']]);
 assert.equal(outside.hp,100);assert.equal(weaponStats(s,p).attackRadius,.5);
});

test('three twenty-damage Pollinators make every autonomous drone bite for sixty-six',()=>{
 const s=run();s.arms=Array.from({length:3},()=>{const p=createPart(s,'drone');p.affixes=[{stat:'damage',value:1/9}];return p;});
 assert.deepEqual(s.arms.map(droneStats).map(d=>Math.round(d.damage)),[20,20,20]);
 assert.equal(Math.round(summonTuning(s).biteDamage),66);
 s.abilities.learned=['summons.0'];s.abilities.levels={'summons.0':1};
 s.enemies=[{id:1,x:1,y:0,z:0,hp:10000,radius:.5,kind:'normal'}];const hits=[];
 advance(s,3,dt=>tickEffects(s,dt,(_,damage,source)=>hits.push([damage,source])));
 assert.ok(hits.length>0);assert.ok(hits.every(([damage,source])=>Math.round(damage)===66&&source==='summon'));
});

test('Pollinator damage reaches Incubator larvae, Hive larvae and Courier kamikaze drones',()=>{
 const s=run(),pollinator=createPart(s,'drone'),rocket=createPart(s,'rocket'),parasite=createPart(s,'parasite');
 pollinator.affixes=[{stat:'damage',value:1/9}];pollinator.affix=null;
 s.arms=[rocket,createPart(s,'fangs'),pollinator];s.organs=[parasite,createPart(s,'digestion')];
 const tuning=summonTuning(s,modifiers(s));near(tuning.pollinatorDamage,20);near(parasiteLarvaDamage(s,parasite),26);near(weaponStats(s,rocket).damage,32);
 const inspector=itemInspectorData(s,parasite);assert.deepEqual(inspector.preview,{label:'Урон личинок',before:'26',after:'28,4'});assert.ok(inspector.rows.some(row=>row.label==='Эффект'&&row.value.includes('Урон личинки — 26')));
 s.enemies=[{id:1,x:5,y:0,z:0,hp:10000,radius:1,kind:'normal'}];
 advance(s,2,dt=>tickIsaacCombat(s,dt,()=>{}));
 assert.deepEqual(s.isaac.larvae.slice(0,2).map(l=>l.damage),[26,26]);
 const hiveDamage=Math.max(8,...s.arms.filter(Boolean).map(p=>weaponStats(s,p,undefined,{pollinators:false}).damage*.4))+tuning.pollinatorDamage;
 assert.deepEqual(s.isaac.larvae.slice(2).map(l=>l.damage),[hiveDamage,hiveDamage,hiveDamage]);
 pollinator.disabled=true;near(summonTuning(s).pollinatorDamage,0);near(parasiteLarvaDamage(s,parasite),6);near(weaponStats(s,rocket).damage,12);
});

test('Detonation ranks use approved curves and explosions never recurse',()=>{
 const curves={
  'detonation.0':['droneBlastDamage',[.3,.4,.5,.6,.7]],
  'detonation.1':['droneBlastRadiusRank',[1,2,3,4,5]],
  'detonation.2':['droneDeathBlastDamage',[1,1.25,1.5,1.75,2]],
  'detonation.3':['droneChainBlastDamage',[.5,.6,.7,.8,.9]],
 };
 for(const [id,[key,expected]]of Object.entries(curves))for(let rank=1;rank<=5;rank++){
  const s=run();s.abilities.learned=[id];s.abilities.levels={[id]:rank};near(modifiers(s)[key],expected[rank-1]);
 }
 const s=run();s.abilities.learned=['summons.0','detonation.0','detonation.2','detonation.3'];s.abilities.levels={'summons.0':1,'detonation.0':1,'detonation.2':1,'detonation.3':1};
 const primary={id:1,x:.4,y:0,z:0,hp:6,radius:0,kind:'normal'},blastVictim={id:2,x:.8,y:0,z:0,hp:1,radius:0,kind:'normal'},survivor={id:3,x:1.2,y:0,z:0,hp:100,radius:0,kind:'normal'};s.enemies=[primary,blastVictim,survivor];
 tickEffects(s,0,()=>{});const c=s.abilities.companions[0];Object.assign(c,{x:0,y:0,z:0,target:primary.id,phase:'approach',cooldown:0});
 tickEffects(s,.00001,(e,damage)=>e.hp-=damage);
 assert.equal(s.events.filter(e=>e.kind==='detonation-chain').length,1,'a blast kill cannot create another chain');
 const before=survivor.hp;destroySymbiont(s,c,modifiers(s));tickEffects(s,0,(e,damage)=>e.hp-=damage);
 assert.ok(survivor.hp<before);assert.equal(s.events.filter(e=>e.kind==='detonation-death').length,1);
});

test('drone arm acquires targets within ten metres without range bonuses from swarm legs',()=>{
 const s=run(),p=createPart(s,'drone');s.arms=[p];
 const e={id:1,x:10.01,y:0,z:0,hp:100,radius:.5,kind:'normal'};s.enemies=[e];
 assert.equal(weaponStats(s,p).range,10);
 tickEffects(s,0,()=>assert.fail('remote hit'));assert.equal(s.abilities.companions.find(c=>c.sourcePartId===p.id).target,null);
 e.x=10;tickEffects(s,0,()=>{});assert.equal(s.abilities.companions.find(c=>c.sourcePartId===p.id).target,1);
 e.x=10.01;tickEffects(s,0,()=>{});assert.equal(s.abilities.companions.find(c=>c.sourcePartId===p.id).target,null);
 s.legs=[createPart(s,'swarmLeg')];p.setId=s.legs[0].setId='broodmother';assert.equal(weaponStats(s,p).range,10);
 e.x=12;tickEffects(s,0,()=>{});assert.equal(s.abilities.companions.find(c=>c.sourcePartId===p.id).target,null);
 assert.ok(soulSummonStats(s,{}).some(([k,v])=>k==='Поиск дронов'&&v==='10 м'));
 assert.ok(soulSummonStats(s,{}).some(([k])=>k==='Поиск роя'),'the set adds a separate companion with its own search range');
 s.legs=Array.from({length:3},()=>createPart(s,'swarmLeg'));assert.equal(weaponStats(s,p).range,10);
});

test('womb pauses production until a visible enemy enters the swarm search radius',()=>{
 const s=run();s.organs=[createPart(s,'parasite')];const tick=dt=>tickIsaacCombat(s,dt,()=>{});
 advance(s,3,tick);assert.equal(s.isaac.larvae.length,0);assert.equal(s.isaac.broodTimers[s.organs[0].id],undefined);
 const enemy={id:1,x:12.01,y:0,z:0,hp:10000,radius:.5,kind:'normal'};s.enemies=[enemy];advance(s,2,tick);assert.equal(s.isaac.larvae.length,0);
 enemy.x=12;s.world.lineClear=()=>false;advance(s,2,tick);assert.equal(s.isaac.larvae.length,0);
 s.world.lineClear=()=>true;advance(s,1,tick);near(s.isaac.broodTimers[s.organs[0].id],1);
 enemy.x=12.01;advance(s,3,tick);near(s.isaac.broodTimers[s.organs[0].id],1);
 enemy.x=12;advance(s,.95,tick);assert.equal(s.isaac.larvae.length,0);advance(s,.05,tick);assert.equal(s.isaac.larvae.length,2);
 assert.deepEqual(s.isaac.larvae.map(l=>l.damage),[6,6]);const firstBrood=s.isaac.larvae.map(l=>l.id);advance(s,2,tick);assert.equal(s.isaac.larvae.length,2);assert.notDeepEqual(s.isaac.larvae.map(l=>l.id),firstBrood);
 const before=JSON.stringify(s.isaac);tick(0);assert.equal(JSON.stringify(s.isaac),before);
 s.pending=1;step(s,1);assert.equal(JSON.stringify(s.isaac),before);
 s.organs=[];tick(.05);assert.deepEqual(s.isaac.broodTimers,{});
});

test('summon rate accelerates womb production and swarm damage affects the larva hit',()=>{
 const s=run();s.organs=[createPart(s,'parasite'),createPart(s,'broodNode')];s.abilities.learned=['summons.2','summons.1','summons.3'];s.abilities.levels={'summons.2':4};
 const b=modifiers(s),t=summonTuning(s,b);near(t.rate,1.5);
 s.enemies=[{id:1,x:5,y:0,z:0,hp:10000,radius:1,kind:'elite'}];
 advance(s,1.3,dt=>tickIsaacCombat(s,dt,()=>{}));assert.equal(s.isaac.larvae.length,0);
 advance(s,.05,dt=>tickIsaacCombat(s,dt,()=>{}));assert.equal(s.isaac.larvae.length,2);
 const rows=soulSummonStats(s,b);assert.ok(rows.some(([k,v])=>k==='Призыв личинок'&&v==='2 каждые 1.33 с'));
 s.enemies[0].x=0;const hits=[];
 advance(s,.5,dt=>tickIsaacCombat(s,dt,(e,d)=>hits.push(d)));assert.equal(hits.length,2);near(hits[0],6*t.damage*t.bossDamage);
});

test('womb ranks, independent timers and old infection removal',()=>{
 const s=run();s.organs=[createPart(s,'parasite',1),createPart(s,'parasite',5)];
 s.enemies=[{id:1,x:5,y:0,z:0,hp:10000,radius:1,kind:'normal'}];
 advance(s,2,dt=>tickIsaacCombat(s,dt,()=>{}));assert.deepEqual(s.isaac.larvae.map(l=>l.damage),[6,6,18,18]);
 const count=s.isaac.larvae.length;isaacDeath(s,{x:0,z:0,kind:'normal',clutch:{until:100,damage:100}},'direct');assert.equal(s.isaac.larvae.length,count);
 assert.ok(upgrade(s,s.organs[0].id,'larvaDamage'));near(parasiteLarvaDamage(s,s.organs[0]),8.4);
 for(let i=0;i<1000;i++)tickIsaacCombat(s,.05,()=>{});assert.ok(s.isaac.larvae.length<=ISAAC_LIMITS.larvae);
});

test('Hive uses the same timed production and no longer responds to deaths',()=>{
 const s=run();s.arms=[createPart(s,'rocket'),createPart(s,'fangs')];s.organs=[createPart(s,'digestion')];
 for(let i=0;i<10;i++)isaacDeath(s,{kind:'normal',x:0,z:0},'direct');assert.equal(s.isaac.larvae.length,0);
 s.enemies=[{id:1,x:5,y:0,z:0,hp:10000,radius:1,kind:'normal'}];
 advance(s,2,dt=>tickIsaacCombat(s,dt,()=>{}));assert.equal(s.isaac.larvae.length,3);
 assert.ok(soulSummonStats(s,{}).some(([k,v])=>k==='Призыв личинок'&&v==='3 каждые 2.00 с'));
 s.organs=[];tickIsaacCombat(s,.05,()=>{});assert.equal(s.isaac.broodTimers.hive,undefined);
});

test('Repair Kits multiply only chassis drones, floor the result, and keep all sources visible',async()=>{
 const {createSymbiontView}=await import('../src/systems/symbiont-view.js');
 const {Group}=await import('three');
 const s=run();s.body=createPart(s,'broodmother',5);s.body.setId='broodmother';
 s.arms=Array.from({length:3},()=>createPart(s,'drone'));s.arms.forEach(p=>p.setId='broodmother');
 const kit=createPart(s,'repairGland');s.organs=[kit];s.inventory=[createPart(s,'repairGland',5)];
 assert.equal(summonTuning(s).baseCount,6);
 assert.match(itemInspectorData(s,s.body).lines.join(' '),/6 постоянных неуязвимых дронов/);
 s.body.tier=4;assert.equal(summonTuning(s).baseCount,4);
 assert.ok(upgrade(s,kit.id,'traitBoost'));assert.equal(summonTuning(s).baseCount,4);
 kit.upgrades.traitBoost=3;assert.equal(summonTuning(s).baseCount,5);
 s.body.tier=5;s.organs=Array.from({length:3},()=>{const p=createPart(s,'repairGland',5);p.upgrades.traitBoost=20;return p;});
 s.abilities.learned=['summons.0'];s.abilities.levels={'summons.0':5};
 assert.equal(summonTuning(s,modifiers(s)).baseCount,20);
 tickEffects(s,0,()=>{});assert.equal(s.abilities.companions.length,24);
 const parent=new Group(),view=createSymbiontView(parent);view.update(s);
 assert.equal(parent.children.filter(p=>p.visible).length,24);view.dispose();assert.equal(parent.children.length,0);
 s.arms.forEach(p=>p.disabled=true);assert.equal(summonTuning(s,modifiers(s)).baseCount,5);
 assert.deepEqual(itemInspectorData(s,s.organs[0]).options,[]);
 s.arms[0].disabled=false;s.organs=[];tickEffects(s,0,()=>{});
 assert.equal(summonTuning(s,modifiers(s)).baseCount,10);assert.equal(s.abilities.companions.length,12);
});

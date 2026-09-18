import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnEnemy,step,hurtEnemy,beginEncounter} from '../src/game.js';
import {createWorldRun} from '../src/world-run.js';
import {SURVIVAL_CADENCE,survivalSpawnLimit,survivalWavePosition,survivalWaveSpec} from '../src/systems/survival-cadence.js';
import {tickSurvivalBosses} from '../src/systems/survival-bosses.js';
import {tickSurvivalElites} from '../src/systems/survival-elites.js';
import {assignEnemyAssembly} from '../src/systems/enemy-assembly.js';
import {waveRun,tickWave,openWave,members,clearPack,drainPack,nextWave} from './helpers/survival-wave.mjs';

test('only the introductory habitat starts the finite wave cycle, once',()=>{
 const s=createWorldRun(undefined,'survival',42),intro=s.enemies.find(e=>e.id===s.introBossId),other=s.enemies.find(e=>e.habitat&&e.kind==='boss'&&e!==intro);
 s.time=42;hurtEnemy(s,other,1e12);assert.equal(survivalSpawnLimit(s).intro,true);
 s.time=43;hurtEnemy(s,intro,1e12);assert.equal(s.waves.cadence.index,0);assert.equal(s.waves.cadence.at,43);
 assert.equal(s.introBossRewarded,true);assert.equal(s.ground.filter(q=>q.part?.key==='digestion').length,1);
 hurtEnemy(s,intro,1e12);assert.equal(s.waves.cadence.index,0);
 tickWave(s);assert.ok(members(s).length>0);assert.equal(s.waves.cadence.phase,'main');
});

for(const duration of [1,400])test(`clearing a pack after ${duration}s starts reinforcement, then exactly 20 active seconds of rest`,()=>{
 const s=openWave(waveRun());assert.equal(members(s).length,20);
 s.time+=duration;tickWave(s);assert.equal(s.waves.cadence.phase,'main');assert.equal(s.metrics.spawned,20);
 // The roster outlasts the live cap, so clearing the first wall only streams in the rest of it.
 for(const e of members(s))hurtEnemy(s,e,1e12);tickWave(s);
 assert.equal(s.waves.cadence.phase,'main');assert.equal(s.waves.cadence.issued,36);
 const stragglers=members(s);assert.equal(stragglers.length,16);
 for(const e of stragglers.slice(0,6))hurtEnemy(s,e,1e12);
 assert.equal(s.waves.cadence.phase,'main');assert.equal(members(s).length,10);
 // The handover does not wait for the last few, but nobody despawns either: the
 // stragglers stay on the field and keep taking room in the live cap.
 const kills=s.kills;hurtEnemy(s,stragglers[6],1e12);
 assert.equal(s.waves.cadence.phase,'reinforcement');assert.equal(s.kills,kills+1);
 const held=stragglers.slice(7);assert.equal(held.length,9);assert.ok(held.every(e=>e.hp>0&&s.enemies.includes(e)));
 tickWave(s);assert.equal(members(s).length,11);assert.equal(s.enemies.filter(e=>e.hp>0).length,20);
 s.time+=1;drainPack(s);assert.equal(s.waves.cadence.phase,'rest');const clearedAt=s.time;
 assert.ok(held.every(e=>e.hp>0&&s.enemies.includes(e)));
 const spawned=s.metrics.spawned;for(const delta of [0,1,15,19.999]){s.time=clearedAt+delta;tickWave(s);assert.equal(s.metrics.spawned,spawned);assert.equal(s.waves.cadence.index,0);}
 s.time=clearedAt+20;tickWave(s);assert.equal(s.waves.cadence.phase,'main');assert.equal(s.waves.cadence.index,1);
 assert.equal(members(s).length,17);assert.equal(s.enemies.filter(e=>e.hp>0).length,26);
});

test('warmup has a capped mass trickle and no automatic elite promotions',()=>{
 const s=waveRun();spawnEnemy(s,'boss',{x:200,z:0});s.normalSpawnCount=29;
 for(let second=1;second<=200;second++){s.time=second;tickWave(s,1);}
 assert.equal(s.waves.cadence,undefined);assert.ok(s.enemies.filter(e=>e.kind==='normal').length<=5);assert.ok(!s.enemies.some(e=>e.waveElite));
});

test('later habitat bosses never replace either pack or its rest timer',()=>{
 const s=openWave(waveRun());
 for(const phase of ['main','reinforcement','rest']){
  assert.equal(s.waves.cadence.phase,phase);const before=structuredClone(s.waves.cadence);
  const e=spawnEnemy(s,'boss',{x:100,z:0},'mass',s.time,{introductory:false});e.habitat=true;hurtEnemy(s,e,1e12);
  assert.deepEqual(s.waves.cadence,before);s.bossRewards=[];if(phase!=='rest')drainPack(s);
 }
});

test('unrelated inhabitants and timed enemies do not block pack clear or rest expiry',()=>{
 const s=openWave(waveRun(),540),spawn=(...args)=>spawnEnemy(s,...args);
 const boss=tickSurvivalBosses(s,spawn),elite=tickSurvivalElites(s,spawn);assert.ok(boss&&elite);
 while(s.waves.cadence.phase!=='rest'){clearPack(s);tickWave(s);}assert.ok(boss.hp>0&&elite.hp>0);
 const until=s.waves.cadence.restUntil;s.time=until;tickWave(s);assert.equal(s.waves.cadence.index,1);assert.ok(members(s).length>0);
});

for(const phase of ['main','reinforcement','rest'])test(`timed invasion and minute elite arrive during ${phase} without resetting the cycle`,()=>{
 const s=openWave(waveRun(),500);if(phase!=='main'){drainPack(s);tickWave(s);}if(phase==='rest'){s.time=530;drainPack(s);}
 assert.equal(s.waves.cadence.phase,phase);const before=structuredClone(s.waves.cadence);s.time=540;const spawn=(...args)=>spawnEnemy(s,...args);
 assert.ok(tickSurvivalBosses(s,spawn));assert.ok(tickSurvivalElites(s,spawn));assert.deepEqual(s.waves.cadence,before);
});

test('failed placement and full slots retain exact pending members and elite quota',()=>{
 const s=waveRun();s.world.walkable=()=>false;openWave(s);assert.equal(s.waves.cadence.issued,0);assert.equal(s.waves.eliteWave.issued,0);
 const roster=structuredClone(s.waves.cadence.rosters);s.world.walkable=()=>true;
 const foreign=Array.from({length:20},(_,i)=>({id:900+i,hp:1,x:0,z:0}));s.enemies.push(...foreign);s.time+=500;tickWave(s);
 assert.equal(s.waves.cadence.issued,0);assert.deepEqual(s.waves.cadence.rosters,roster);
 foreign[0].hp=0;tickWave(s);assert.equal(members(s).length,1);assert.equal(s.waves.cadence.issued,1);
 clearPack(s);assert.equal(s.waves.cadence.phase,'main','unissued roster is not a clear');
 for(const e of foreign)e.hp=0;tickWave(s);assert.equal(s.waves.cadence.issued,21);assert.equal(members(s).length,20);assert.equal(s.waves.eliteWave.issued,1);
});

test('pack strength and eligible roles remain frozen across a slow battle and blocked placement',()=>{
 const s=openWave(waveRun(),120),roster=structuredClone(s.waves.cadence.rosters),hp=members(s).find(e=>e.kind==='normal'&&e.role==='mass').maxHp;
 s.time=1800;clearPack(s);tickWave(s);assert.deepEqual(s.waves.cadence.rosters,roster);
 assert.ok(members(s).every(e=>e.threat===120&&!['divider','puppeteer','shield-bearer','mirrorling'].includes(e.recipeId)));
 assert.equal(members(s).find(e=>e.kind==='normal'&&e.role==='mass'&&!e.volatile).maxHp,hp);
});

test('divider descendants inherit pack ownership and must die before reinforcement',()=>{
 const s=openWave(waveRun(),960),parent=members(s).at(-1);
 assignEnemyAssembly(s,parent,960,{missionRecipeId:'divider'});
 while(members(s).some(e=>e!==parent))for(const e of members(s).filter(e=>e!==parent))hurtEnemy(s,e,1e12);
 hurtEnemy(s,parent,1e12);const children=members(s);assert.equal(children.length,2);
 assert.ok(children.every(e=>e.summonOwner===parent.id&&e.survivalWavePack===0&&e.waveSpawn));
 tickWave(s);assert.equal(s.waves.cadence.phase,'main');clearPack(s);assert.equal(s.waves.cadence.phase,'reinforcement');
});

test('distant normal, elite and summoned wave members return with HP and identity intact, without rewards',()=>{
 const s=openWave(waveRun()),normal=members(s).find(e=>e.kind==='normal'),elite=members(s).find(e=>e.kind==='elite');
 const child=spawnEnemy(s,'normal',{x:100,z:0},'mass',120,{promote:false});Object.assign(child,{survivalWaveIndex:0,survivalWavePack:0,waveSpawn:true,summonOwner:normal.id});
 const foreign=spawnEnemy(s,'elite',{x:110,z:0});
 for(const e of [normal,elite,child]){e.x=100;e.z=0;e.hp=7;}
 tickWave(s);for(const e of [normal,elite,child]){assert.ok(s.enemies.includes(e));assert.equal(e.hp,7);assert.ok(Math.hypot(e.x,e.z)<=28.001);}
 assert.equal(foreign.x,110);assert.equal(s.kills,0);assert.equal(s.xpDrops.length,0);assert.equal(s.ground.length,0);
});

test('relocation cancels movement anchored at the old position and leaves promoted map elites alone',()=>{
 const s=openWave(waveRun()),e=members(s).find(q=>q.kind==='normal');
 Object.assign(e,{x:100,z:0,path:[{x:90,z:0}],navigationLine:{ex:100,ez:0},locomotionState:{kind:'hop',from:{x:100,z:0},to:{x:97,z:0}},fuseAnchor:{x:100,z:0},fuseRemaining:1,enemyAttack:{readyAt:0,warning:{x:100,z:0}}});
 s.normalSpawnCount=29;const local=spawnEnemy(s,'normal',{x:110,z:0});assert.equal(local.kind,'elite');assert.equal(local.waveSpawn,true);
 tickWave(s);assert.equal(e.locomotionState,undefined);assert.equal(e.path,null);assert.equal(e.navigationLine,null);assert.equal(e.enemyAttack.warning,null);
 assert.deepEqual(e.fuseAnchor,{x:e.x,z:e.z});assert.equal(e.fuseRemaining,1);assert.equal(local.x,110);
});

test('failed straggler relocation keeps a living member and prevents a false clear',()=>{
 const s=openWave(waveRun()),last=members(s).at(-1);for(const e of members(s).slice(0,-1))hurtEnemy(s,e,1e12);
 last.x=100;s.world.walkable=()=>false;tickWave(s);assert.equal(last.x,100);assert.equal(s.waves.cadence.phase,'main');
});

test('superboss half cap delays pending pack members without reducing the finite roster',()=>{
 const s=waveRun();s.enemies.push({id:900,hp:1,kind:'boss',survivalSuperBoss:true,x:50,z:50});openWave(s);
 assert.equal(s.waves.softCap,10);assert.equal(members(s).length,9);assert.equal(s.waves.cadence.packSize,36);
 drainPack(s);tickWave(s);
 assert.equal(s.waves.cadence.phase,'reinforcement');assert.equal(s.metrics.spawned,45);
});

test('pause for rewards, level choices and an actual challenge preserves remaining rest',()=>{
 const s=createWorldRun(undefined,'survival',42),boss=s.enemies.find(e=>e.id===s.introBossId);hurtEnemy(s,boss,1e12);s.bossRewards=[];
 tickWave(s);drainPack(s);tickWave(s);drainPack(s);const until=s.waves.cadence.restUntil,time=s.time;
 assert.equal(s.waves.cadence.phase,'rest');
 s.pending=1;step(s,10);s.pending=0;assert.equal(s.time,time);
 s.bossRewards=[{}];step(s,10);s.bossRewards=[];assert.equal(s.time,time);
 const node=s.encounters.nodes.find(n=>n.type==='sealed');assert.ok(node);s.level=30;s.player={x:node.x,y:node.y??0,z:node.z};
 assert.ok(beginEncounter(s,node.id));step(s,1);assert.equal(s.time,time);assert.equal(s.waves.cadence.restUntil,until);
 s.encounters.active=null;s.health.invulnerableUntil=Infinity;step(s,1);assert.equal(s.time,time+1);assert.equal(s.waves.cadence.restUntil,until);
});

test('jumping the clock does not skip waves or replace survivors',()=>{
 const s=openWave(waveRun());s.time=10000;tickWave(s);assert.equal(s.waves.cadence.index,0);assert.equal(s.metrics.spawned,20);
 drainPack(s);tickWave(s);drainPack(s);s.time+=10000;tickWave(s);assert.equal(s.waves.cadence.index,1);assert.equal(s.waves.cadence.packSize,82);assert.equal(s.waves.cadence.liveCap,39);assert.equal(members(s).length,39);
});

test('late waves cap each roster at 200 and the field at 120',()=>{
 assert.deepEqual([0,1,14,50].map(i=>survivalWaveSpec(i).packSize),[36,47,188,200]);
 const s=openWave(waveRun());for(let i=0;i<18;i++)nextWave(s);
 assert.equal(s.waves.cadence.packSize,200);assert.equal(members(s).length,120);assert.equal(SURVIVAL_CADENCE.rest,20);
});

test('reinforcement expires at 15 active seconds with survivors; rest lasts 20 seconds',()=>{
 const s=openWave(waveRun());drainPack(s);tickWave(s);const started=s.time,survivors=[...members(s)],kills=s.kills;
 s.time=started+14.999;tickWave(s);assert.equal(s.waves.cadence.phase,'reinforcement');
 s.time=started+15;tickWave(s);assert.equal(s.waves.cadence.phase,'rest');assert.equal(s.waves.cadence.restUntil,started+35);
 assert.ok(survivors.every(e=>e.hp>0&&s.enemies.includes(e)));assert.equal(s.kills,kills);
 s.time=started+34.999;tickWave(s);assert.equal(s.waves.cadence.index,0);
 s.time=started+35;tickWave(s);assert.equal(s.waves.cadence.index,1);assert.ok(members(s).length>0);assert.ok(survivors.every(e=>e.hp>0));
});

test('abandoned reinforcement survivors and descendants return to the front instead of despawning',()=>{
 const s=openWave(waveRun());drainPack(s);tickWave(s);const survivors=[...members(s)];s.time+=15;tickWave(s);
 const child=spawnEnemy(s,'normal',{x:110,z:0},'mass',120,{promote:false});Object.assign(child,{waveSpawn:true,survivalWaveIndex:0,survivalWavePack:1,summonOwner:survivors[0].id});
 const kills=s.kills,xp=s.xpDrops.length;for(const e of survivors)e.x=100;tickWave(s);
 for(const e of [...survivors,child]){assert.ok(s.enemies.includes(e)&&e.hp>0);assert.ok(Math.hypot(e.x-s.player.x,e.z-s.player.z)<=28.001);}
 assert.equal(s.kills,kills);assert.equal(s.xpDrops.length,xp);
 // The next wave still opens; the survivors simply take their room in the live cap.
 s.time=s.waves.cadence.restUntil;tickWave(s);assert.equal(s.waves.cadence.index,1);
 assert.equal(members(s).length,5);assert.equal(s.enemies.filter(e=>e.hp>0).length,26);
});

test('reinforcement timeout cancels unissued slots and late deaths cannot extend rest',()=>{
 const s=openWave(waveRun());drainPack(s);assert.equal(s.waves.cadence.phase,'reinforcement');
 s.world.walkable=()=>false;tickWave(s);assert.equal(s.waves.cadence.issued,0);
 const deadline=s.waves.cadence.reinforcementUntil;s.time=deadline;tickWave(s);assert.equal(s.waves.cadence.phase,'rest');
 s.world.walkable=()=>true;tickWave(s);assert.equal(s.waves.cadence.issued,0);assert.equal(members(s).length,0);
 const foreign=spawnEnemy(s,'normal',{x:10,z:0},'mass',120,{promote:false});s.time+=5;hurtEnemy(s,foreign,1e12);assert.equal(s.waves.cadence.restUntil,deadline+20);
});

test('reinforcement deadline freezes during level, reward and encounter pauses',()=>{
 const s=openWave(waveRun());drainPack(s);tickWave(s);const deadline=s.waves.cadence.reinforcementUntil,time=s.time;
 s.pending=1;step(s,20);s.pending=0;s.bossRewards=[{}];step(s,20);s.bossRewards=[];
 s.encounters.active={id:'paused',type:'sealed',members:[],elapsed:0};tickWave(s,20);s.encounters.active=null;
 assert.equal(s.time,time);assert.equal(s.waves.cadence.reinforcementUntil,deadline);
 s.time=deadline-.001;tickWave(s);assert.equal(s.waves.cadence.phase,'reinforcement');s.time=deadline;tickWave(s);assert.equal(s.waves.cadence.phase,'rest');
});

test('previous-wave elites do not consume the next wave quota after reinforcement timeout',()=>{
 const s=openWave(waveRun());nextWave(s);drainPack(s);tickWave(s);const survivor=members(s).find(e=>e.kind==='elite');assert.ok(survivor);
 s.time=s.waves.cadence.reinforcementUntil;tickWave(s);s.time=s.waves.cadence.restUntil;tickWave(s);
 assert.equal(s.waves.cadence.index,2);assert.equal(members(s).filter(e=>e.kind==='elite').length,2);assert.ok(survivor.hp>0);
});

test('moving fronts favor the route ahead with valid safe approach positions',()=>{
 const s=waveRun();s.motion={x:7,z:0};const points=Array.from({length:200},()=>survivalWavePosition(s,.55));
 assert.ok(points.filter(p=>p.x>s.player.x).length>150);
 for(const p of points)assert.ok(Math.hypot(p.x,p.z)>=20-1e-8&&Math.hypot(p.x,p.z)<=28+1e-8);
 s.world.walkable=()=>false;assert.equal(survivalWavePosition(s,.55),null);
});

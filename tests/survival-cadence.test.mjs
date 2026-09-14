import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,spawnEnemy,step,hurtEnemy} from '../src/game.js';
import {tickWaves} from '../src/systems/waves.js';
import {tickSurvivalHordes} from '../src/systems/survival-hordes.js';
import {SURVIVAL_CADENCE,SURVIVAL_FIRST_WAVE_DELAY,survivalCadenceAt,survivalBudgetBetween,survivalSpawnLimit,survivalWavePosition} from '../src/systems/survival-cadence.js';

function fixture(){
 const s=createRun(undefined,'survival',20260913);
 s.world={flat:true,walkable:()=>true,lineClear:()=>true};s.enemies=[];
 s.bossHabitats=[];s.encounters={active:null,nodes:[]};s.nextElite=Infinity;
 return s;
}
const tick=(s,dt)=>{const spawn=(...args)=>spawnEnemy(s,...args);tickSurvivalHordes(s,dt,spawn);tickWaves(s,dt,spawn);};

test('the first assault starts fifteen seconds after the introductory boss dies',()=>{
 const s=fixture(),boss=spawnEnemy(s,'boss',{x:1,z:0});
 s.time=200;tick(s,80);assert.equal(s.survivalHordes?.queue,null);assert.equal(survivalSpawnLimit(s).intro,true);
 hurtEnemy(s,boss,1e9);assert.equal(s.survivalFirstWaveAt,200+SURVIVAL_FIRST_WAVE_DELAY);assert.equal(s.nextElite,275);
 s.enemies=[];s.time=214.9;tick(s,14.9);assert.equal(s.enemies.length,0);assert.equal(survivalSpawnLimit(s).intro,true);
 s.time=215;tick(s,.1);assert.deepEqual({index:survivalSpawnLimit(s).index,rest:survivalSpawnLimit(s).rest},{index:0,rest:false});
 s.time=216.3;tick(s,1.3);assert.ok(s.enemies.some(e=>e.hordeEvent));
 assert.equal(survivalCadenceAt(280,s.survivalFirstWaveAt).rest,true);assert.equal(survivalCadenceAt(315,s.survivalFirstWaveAt).index,1);
});

test('the first two minutes keep at most a six-enemy mass trickle before the first assault',()=>{
 const s=fixture();
 assert.equal(SURVIVAL_CADENCE.introRate,3);assert.equal(SURVIVAL_CADENCE.introSoftCap,6);
 assert.equal(survivalBudgetBetween(0,120),6);
 for(let second=1;second<120;second++){s.time=second;tick(s,1);assert.ok(s.enemies.length<=6);}
 assert.ok(s.metrics.spawned>=5&&s.metrics.spawned<=6);assert.ok(s.enemies.every(e=>e.kind==='normal'&&e.role==='mass'&&!e.waveElite));
 s.time=120;tick(s,1);assert.ok(s.enemies.length<=20);
});

test('third minute starts the assault; every 35-second lull keeps a sparse trickle',()=>{
 assert.equal(survivalCadenceAt(119.999),null);
 for(let i=0;i<24;i++){
  const start=120+i*100;
  assert.equal(survivalCadenceAt(start).rest,false);
  assert.equal(survivalCadenceAt(start+64.999).rest,false);
  assert.equal(survivalCadenceAt(start+65).rest,true);
  assert.equal(survivalCadenceAt(start+99.999).rest,true);
  assert.equal(survivalCadenceAt(start+100).rest,false);
  assert.equal(survivalBudgetBetween(start+65,start+100),3.5);
 }
 assert.equal(survivalBudgetBetween(120,220),55.5);
 assert.equal(survivalBudgetBetween(120,320),127.25);
 assert.deepEqual([120,220,320].map(t=>{const p=survivalCadenceAt(t);return[p.burst,p.rate,p.softCap];}),[[8,48,20],[11,63,26],[14,78,32]]);
 assert.deepEqual([185,285].map(t=>{const p=survivalCadenceAt(t);return[p.rate,p.softCap];}),[[6,8],[6,8]]);
});

test('first opening horde and stream fill at most 20 slots from all quadrants',()=>{
 const s=fixture();s.time=120;tick(s,0);
 for(let i=1;i<=300;i++){s.time=120+i/10;tick(s,.1);assert.ok(s.enemies.length<=20);}
 assert.equal(s.enemies.length,20);
 assert.equal(s.enemies.filter(e=>e.hordeEvent).length,8);
 assert.equal(new Set(s.enemies.filter(e=>e.hordeEvent).map(e=>`${e.x>=0}/${e.z>=0}`)).size,4);
 assert.equal(s.enemies.filter(e=>e.waveElite).length,0);
 assert.ok(s.enemies.filter(e=>e.waveElite&&e.territory.pursuit).length<=3);
});

test('opening hordes and elites stop in the lull while isolated mass creatures continue',()=>{
 const s=fixture();s.time=120;tick(s,0);s.time=122;tick(s,2);s.enemies=[];
 const count=s.metrics.spawned;s.nextElite=185;s.waves.credit=400;s.time=185;tick(s,0);
 for(let i=1;i<350;i++){s.time=185+i/10;tick(s,.1);}
 const lull=s.enemies.filter(e=>e.hp>0);assert.equal(s.metrics.spawned-count,3);assert.equal(lull.length,3);
 assert.ok(lull.every(e=>e.kind==='normal'&&e.role==='mass'&&!e.hordeEvent&&!e.waveElite));assert.ok(s.waves.credit<1);assert.equal(s.survivalHordes.queue,null);
 s.enemies=[];s.time=220;tick(s,.1);assert.ok(s.enemies.length<=1);
 s.time=221;tick(s,1);assert.ok(s.enemies.length<4);
});

test('boss relief cancels an opening instead of releasing its remainder afterwards',()=>{
 const s=fixture();s.time=120;tick(s,0);s.reliefUntil=124;
 s.time=122;tick(s,2);assert.equal(s.enemies.length,0);
 s.time=125;tick(s,1);assert.equal(s.enemies.filter(e=>e.hordeEvent).length,0);assert.equal(s.enemies.length,0);
 s.time=126;tick(s,1);assert.equal(s.enemies.length,1);
});

test('superboss quarter flow also applies to opening hordes and the shared half cap',()=>{
 const s=fixture();s.enemies.push({hp:1,kind:'boss',survivalSuperBoss:true});s.time=120;tick(s,0);
 for(let i=1;i<=100;i++){s.time=120+i/10;tick(s,.1);}
 assert.equal(s.enemies.filter(e=>e.hordeEvent).length,2);assert.equal(s.waves.softCap,10);
 assert.ok(s.enemies.length<=10);
});

test('blocked placement, full slots, dungeons and last stands cannot bank a late horde',()=>{
 const s=fixture();s.time=120;tick(s,0);s.enemies=Array.from({length:60},()=>({hp:1}));
 s.time=129;tick(s,9);s.enemies=[];s.time=130;tick(s,1);
 assert.ok(s.enemies.length<=6); // Last three arrivals plus three regular requests.
 for(const block of [{encounters:{active:{}}},{overrun:{state:'active'}}]){
  const q=fixture();Object.assign(q,block);q.time=120;tick(q,10);assert.equal(q.enemies.length,0);
  q.encounters={active:null,nodes:[]};q.overrun=null;q.time=150;tick(q,.1);assert.equal(q.enemies.length,0);
 }
 const q=fixture();q.world.heightAt=()=>0;q.world.walkable=()=>false;q.time=120;tick(q,0);
 q.time=130;tick(q,10);assert.equal(q.enemies.length,0);assert.equal(q.survivalHordes.queue,null);
});

test('exploration recycles only distant ordinary wave enemies without rewards',()=>{
 const s=fixture();s.time=150;
 const wave=spawnEnemy(s,'normal',{x:100,z:0},'mass',150,{promote:false,wave:true});
 const habitat=spawnEnemy(s,'elite',{x:110,z:0}),local=spawnEnemy(s,'normal',{x:101,z:0},'mass',150,{promote:false});
 const near=spawnEnemy(s,'normal',{x:20,z:0},'mass',150,{promote:false,wave:true});
 tick(s,0);assert.ok(!s.enemies.includes(wave));assert.ok(s.enemies.includes(habitat)&&s.enemies.includes(local)&&s.enemies.includes(near));
 assert.equal(s.kills,0);assert.equal(s.xpDrops.length,0);assert.equal(s.ground.length,0);
});

test('moving fronts favor the route ahead while preserving safe distance and collision checks',()=>{
 const s=fixture();s.motion={x:7,z:0};const points=Array.from({length:200},()=>survivalWavePosition(s,.55));
 assert.ok(points.filter(p=>p.x>s.player.x).length>150);
 for(const p of points){const d=Math.hypot(p.x-s.player.x,p.z-s.player.z);assert.ok(d>=20-1e-8&&d<=28+1e-8);}
 s.world.walkable=(x,z,r)=>x<0&&r===.55;
 for(let i=0;i<20;i++)assert.ok(survivalWavePosition(s,.55).x<0);
 s.world.walkable=()=>false;assert.equal(survivalWavePosition(s,.55),null);
});

test('late combined wave spawners stop at the gradual 104-enemy cap and cannot add an extra scheduled elite',()=>{
 const s=fixture();s.time=1520;tick(s,0);
 for(let i=1;i<=650;i++){s.time=1520+i/10;s.nextElite=s.time;tick(s,.1);assert.ok(s.enemies.length<=104);}
 assert.equal(s.enemies.length,104);
});

test('production simulation keeps a moving player surrounded by a bounded crowd',()=>{
 const s=fixture();s.time=119;s.health.invulnerableUntil=Infinity;
 // Density fixture: movement and combat are real; protection only prevents an
 // early death from ending the pressure/cap regression before its boundary.
 s.world.chunk=()=>({cx:0,cz:0,lair:{x:1000,z:1000}});
 let peakNear=0;
 for(let i=0;i<650;i++){
  s.pending=0;s.choices=[];s.bossRewards=[];
  step(s,.1,{x:Math.cos(i/110),z:Math.sin(i/110)});s.events.length=0;
  peakNear=Math.max(peakNear,s.enemies.filter(e=>Math.hypot(e.x-s.player.x,e.z-s.player.z)<30).length);
 }
 assert.ok(s.time>183);assert.ok(peakNear>=8,`nearby peak ${peakNear}`);assert.ok(s.enemies.length<=20);
 assert.ok(Math.hypot(s.player.x,s.player.z)>10);
});

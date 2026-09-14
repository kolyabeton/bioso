import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,spawnEnemy,step,beginEncounter,hurtEnemy} from '../src/game.js';
import {createWorldRun} from '../src/world-run.js';
import {MISSIONS} from '../src/catalog.js';
import {SURVIVAL_BOSS_INTERVAL,SURVIVAL_BOSS_LIMIT,tickSurvivalBosses} from '../src/systems/survival-bosses.js';
import {tickWaves} from '../src/systems/waves.js';
import {tickMissionBoss} from '../src/systems/mission-bosses.js';

const run=()=>{const s=createRun(undefined,'survival',42);s.world={walkable:()=>true};return s;};
const tick=s=>tickSurvivalBosses(s,(...args)=>spawnEnemy(s,...args));

test('roaming bosses start at minute seven and never overlap a living invader',()=>{
 const s=run();s.time=SURVIVAL_BOSS_INTERVAL-.01;assert.equal(tick(s),undefined);
 s.time=SURVIVAL_BOSS_INTERVAL;const e=tick(s);assert.ok(e?.bossCombat);assert.equal(e.bossDesignId,MISSIONS[0].bossId);assert.equal(e.territory,null);assert.equal(tick(s),undefined);
 s.time=SURVIVAL_BOSS_INTERVAL*2;assert.equal(tick(s),undefined);assert.equal(s.survivalBosses.nextAt,SURVIVAL_BOSS_INTERVAL*2);assert.equal(s.enemies.filter(e=>e.survivalInvader&&e.hp>0).length,1);
 tickMissionBoss(s,e,0,()=>{});
 hurtEnemy(s,e,1e12);assert.equal(s.bossRewards.length,1);assert.equal(s.won,false);assert.equal(s.reliefUntil,0);
 const second=tick(s);assert.ok(second?.survivalSuperBoss);assert.equal(second.bossDesignId,MISSIONS[1].bossId);assert.equal(s.survivalBosses.nextAt,SURVIVAL_BOSS_INTERVAL*3);
 assert.equal(s.profile.achievements.some(id=>id.startsWith('mission:')),false);
});

test('roaming boss schedule ends after the fifth boss at minute thirty-five',()=>{
 const s=run();
 for(let index=1;index<=SURVIVAL_BOSS_LIMIT;index++){
  s.time=index*SURVIVAL_BOSS_INTERVAL;
  const boss=tick(s);assert.ok(boss,`boss ${index}`);boss.hp=0;
 }
 assert.equal(s.survivalBosses.count,SURVIVAL_BOSS_LIMIT);
 assert.equal(s.survivalBosses.nextAt,Infinity);
 s.time=6*SURVIVAL_BOSS_INTERVAL;
 assert.equal(tick(s),undefined);
 assert.equal(s.survivalBosses.count,SURVIVAL_BOSS_LIMIT);
});

test('event, overrun and mission modes defer the boss; failed placement never consumes an interval',()=>{
 const s=run();s.time=1200;
 s.encounters={active:{}};assert.equal(tick(s),undefined);s.encounters.active=null;
 s.overrun={state:'active'};assert.equal(tick(s),undefined);s.overrun=null;
 s.mode='garden';assert.equal(tick(s),undefined);s.mode='survival';
 s.world.walkable=()=>false;assert.equal(tick(s),undefined);assert.equal(s.survivalBosses.nextAt,SURVIVAL_BOSS_INTERVAL);
 s.world.walkable=()=>true;assert.equal(tickSurvivalBosses(s,()=>null),undefined);assert.equal(s.survivalBosses.count,0);
 assert.ok(tick(s));
});

test('all boss footprints fit real survival terrain and fixed habitats remain intact',()=>{
 for(const seed of [1,42,20317]){
  const s=createWorldRun(undefined,'survival',seed),habitats=s.bossHabitats.map(h=>h.id);
  s.time=1200;const e=tick(s);assert.ok(e,`${seed}/20`);
  assert.ok(s.world.walkable(e.x,e.z,e.radius),`${e.bossDesignId} footprint`);
  assert.ok(Number.isFinite(e.y));
  for(const part of s.enemies.filter(q=>q.bossOwner===e.id))assert.ok(s.world.walkable(part.x,part.z,part.radius),`${e.bossDesignId} targetable part`);
  if(e.speed===0)assert.ok(Math.hypot(e.x-s.player.x,e.z-s.player.z)<=22);
  s.time=2400;assert.equal(tick(s),undefined);
  assert.deepEqual(s.bossHabitats.map(h=>h.id),habitats);
 }
});

test('real event entry pauses waves, elite schedule and survival clock; success and failure resume spawning',()=>{
 for(const type of ['infection','sealed','hunt']){
  const s=run();s.world={walkable:()=>true,chunk:()=>({cx:0,cz:0,lair:{x:100,z:100}})};
  s.arms=[];s.time=1199.9;s.nextElite=1200;s.nextBoss=99999;s.waves.credit=.95;
  const n={id:'event',type,state:'ready',x:0,z:0,radius:7,recommended:0,unlockLevel:0,rewards:['claws']};
  s.encounters={nodes:[n],active:null};assert.ok(beginEncounter(s,n.id));
  // Keep actual challenge enemies alive and out of contact while simulating its timer.
  for(const e of s.enemies){e.speed=0;e.x=6;e.z=0;e.damage=0;}
  const spawned=s.metrics.spawned,credit=s.waves.credit;
  step(s,.1);assert.equal(s.time,1199.9);assert.equal(s.metrics.spawned,spawned);assert.equal(s.waves.credit,credit);
  tickWaves(s,300,()=>assert.fail('background wave during event'));
  if(type==='infection')n.progress=29.95;
  if(type==='sealed'){n.elapsed=45;for(const e of s.enemies)e.hp=0;}
  if(type==='hunt')n.elapsed=60;
  step(s,.1);assert.equal(s.encounters.active,null);assert.equal(s.metrics.spawned,spawned);
  assert.equal(n.state,type==='hunt'?'failed':'reward');
  step(s,.2);assert.ok(s.time>=1200);assert.ok(s.metrics.spawned>spawned);
  assert.equal(s.enemies.filter(e=>e.survivalInvader&&e.hp>0).length,1);
 }
});

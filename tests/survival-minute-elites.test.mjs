import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,spawnEnemy,step} from '../src/game.js';
import {createWorldRun} from '../src/world-run.js';
import {tickSurvivalElites} from '../src/systems/survival-elites.js';
import {territoryTarget} from '../src/systems/territories.js';

const tick=s=>tickSurvivalElites(s,(...args)=>spawnEnemy(s,...args));
function fixture(){
 const s=createRun(undefined,'survival',42);
 s.world={flat:true,walkable:()=>true,lineClear:()=>true};
 return s;
}

test('a local elite appears at each minute, including warmup, lulls and full assault quotas',()=>{
 const s=fixture();s.time=59.99;assert.equal(tick(s),undefined);
 s.introBossId=99;s.reliefUntil=1000;s.waves.eliteWave={index:0,issued:6};
 s.enemies.push({kind:'boss',hp:100,territory:{state:'engaged'}});
 for(let i=0;i<120;i++)s.enemies.push({kind:'normal',hp:100});
 for(let minute=1;minute<=5;minute++){
  s.time=minute*60;const e=tick(s);assert.ok(e);
  assert.equal(e.kind,'elite');assert.equal(e.scheduledAt,s.time);
  assert.equal(e.waveElite,undefined);assert.equal(e.wavePressureIndex,undefined);
  assert.equal(e.territory.pursuit,undefined);assert.equal(e.territory.state,'idle');
  assert.equal(territoryTarget(s,e,s.player),e.territory.home);
  assert.equal(s.waves.eliteWave.issued,6);assert.equal(tick(s),undefined);
  assert.equal(s.survivalElites.count,minute);
 }
});

test('failed placement retries without losing the minute or shifting later boundaries',()=>{
 const s=fixture();s.time=60;s.world.walkable=()=>false;
 assert.equal(tick(s),undefined);assert.equal(s.survivalElites.count,0);
 assert.equal(s.survivalElites.nextAt,60);
 s.time=60.5;s.world.walkable=()=>true;assert.equal(tick(s),undefined);
 s.time=61;assert.ok(tick(s));assert.equal(s.survivalElites.nextAt,120);
 s.time=120;assert.ok(tick(s));assert.equal(s.survivalElites.nextAt,180);
 s.time=400;assert.ok(tick(s));assert.equal(tick(s),undefined);
 assert.equal(s.survivalElites.nextAt,420);
});

test('events, final defense, ended runs and missions do not emit local elites',()=>{
 for(const state of [{encounters:{active:{}}},{overrun:{state:'active'}},{dead:true},{won:true},{mode:'garden'}]){
  const s=fixture();s.time=60;Object.assign(s,state);
  tickSurvivalElites(s,()=>assert.fail('spawn while suspended'));
  assert.equal(s.survivalElites,undefined);
 }
 const s=fixture();s.time=60;s.won=true;s.continued=true;assert.ok(tick(s));
});

test('real Survival step spawns at 1:00, 2:00 and 3:00 while the opening boss remains alive',()=>{
 for(const seed of [1,42,20317]){
  const s=createWorldRun(undefined,'survival',seed);
  s.arms=[];s.health.invulnerableUntil=Infinity;
  const habitats=s.bossHabitats.map(h=>h.id);
  for(const minute of [1,2,3]){
   s.time=minute*60-.05;step(s,.05);
   const elites=s.enemies.filter(e=>e.survivalMinuteElite);
   assert.equal(elites.length,minute,`seed ${seed}, minute ${minute}`);
   const e=elites.at(-1);assert.ok(s.world.walkable(e.x,e.z,e.radius));
   assert.ok(Number.isFinite(e.y));assert.deepEqual(e.territory.home,{x:e.x,y:e.y,z:e.z});
   assert.equal(s.survivalElites.nextAt,(minute+1)*60);
  }
  assert.deepEqual(s.bossHabitats.map(h=>h.id),habitats);
  assert.ok(s.enemies.find(e=>e.id===s.introBossId).hp>0);
 }
});

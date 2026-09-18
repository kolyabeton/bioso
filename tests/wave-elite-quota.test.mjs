import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnEnemy,hurtEnemy} from '../src/game.js';
import {assignWaveEliteDisposition} from '../src/systems/territories.js';
import {enemyBalance,SURVIVAL_PRESSURE} from '../src/systems/balance.js';
import {waveRun,openWave,tickWave,members,clearPack,drainPack,nextWave} from './helpers/survival-wave.mjs';

test('each finite wave splits its elites across two packs with the odd remainder in main',()=>{
 const s=openWave(waveRun()),counts=[];
 for(let index=0;index<8;index++){
  const main=members(s).filter(e=>e.kind==='elite').length,total=s.waves.cadence.eliteCap;
  assert.equal(main,Math.ceil(total/2));drainPack(s);tickWave(s);
  const reinforcement=members(s).filter(e=>e.kind==='elite').length;assert.equal(reinforcement,Math.floor(total/2));
  counts.push(main+reinforcement);drainPack(s);s.time=s.waves.cadence.restUntil;tickWave(s);
 }
 // Every fifth wave replaces the usual handful with a wall of elites.
 assert.deepEqual(counts,[1,2,3,4,40,6,6,6]);
});

test('a surviving wave elite stays on the field and cannot accumulate into the next pack quota',()=>{
 const s=openWave(waveRun()),elite=members(s).find(e=>e.kind==='elite');
 for(const e of members(s).filter(e=>e!==elite))hurtEnemy(s,e,1e12);
 // The roster is not exhausted yet, so the pack keeps streaming in instead of handing over.
 s.time=5000;tickWave(s);assert.equal(s.waves.cadence.index,0);assert.equal(s.waves.cadence.phase,'main');
 assert.equal(s.waves.cadence.issued,36);assert.equal(members(s).length,17);
 for(const e of members(s).filter(e=>e!==elite).slice(0,8))hurtEnemy(s,e,1e12);
 assert.equal(s.waves.cadence.phase,'reinforcement');assert.ok(elite.hp>0&&s.enemies.includes(elite));
 tickWave(s);assert.equal(members(s).filter(e=>e.kind==='elite').length,0);
});

test('elites keep baseline health and the first wave elite deals half damage exactly once',()=>{
 const s=openWave(waveRun());
 for(let index=0;index<4;index++){
  const elite=members(s).find(e=>e.kind==='elite'),base=Math.round(enemyBalance(s.waves.cadence.at,'elite').hp*SURVIVAL_PRESSURE.hp);
  assert.equal(elite.maxHp,base);assert.equal(elite.damage,index===0?.5:1);
  assignWaveEliteDisposition(s,elite);assert.equal(elite.damage,index===0?.5:1);nextWave(s);
 }
});

test('map elites do not consume a finite wave elite quota during warmup, packs or rest',()=>{
 const s=waveRun();
 for(const phase of ['waiting','main','reinforcement','rest']){
  if(phase==='main')openWave(s);if(phase==='reinforcement'){drainPack(s);tickWave(s);}if(phase==='rest')drainPack(s);
  const issued=s.waves.eliteWave?.issued;
  const e=spawnEnemy(s,'elite',{x:10,z:0});assert.ok(e);assert.equal(e.wavePressureIndex,undefined);assert.equal(e.survivalWaveIndex,undefined);assert.equal(s.waves.eliteWave?.issued,issued);
  // Kill the independent threat so it does not occupy the shared crowd cap.
  hurtEnemy(s,e,1e12);
 }
});

test('failed placement retries the reserved elite; killing it never refills its pack quota',()=>{
 const s=waveRun();s.world.walkable=()=>false;openWave(s);assert.equal(s.waves.eliteWave.issued,0);
 s.world.walkable=()=>true;tickWave(s);const elite=members(s).find(e=>e.kind==='elite');assert.ok(elite);hurtEnemy(s,elite,1e12);
 for(let i=0;i<10;i++){
  s.normalSpawnCount=29;const e=spawnEnemy(s,'normal',{x:10,z:0},'mass',s.time,{wave:true,promote:true});assert.equal(e.kind,'normal');
  assert.equal(spawnEnemy(s,'elite',null,'mass',s.time,{wave:true}),null);s.nextElite=s.time;tickWave(s);
 }
 assert.equal(s.waves.eliteWave.issued,1);assert.equal(members(s).filter(e=>e.kind==='elite').length,0);
});

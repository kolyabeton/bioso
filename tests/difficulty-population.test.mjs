import test from 'node:test';
import assert from 'node:assert/strict';
import {survivalWaveSpec,survivalSpawnLimit} from '../src/systems/survival-cadence.js';
import {difficultyProfile} from '../src/systems/difficulty.js';
import {waveRun,openWave,nextWave,tickWave} from './helpers/survival-wave.mjs';
import {createWorldRun,stepWorldRun} from '../src/world-run.js';

test('normal Survival rosters scale to 40/70/100 percent while elite slots and wave transitions survive',()=>{
 const runs=[0,50,100].map(difficulty=>{const s=waveRun();s.difficulty=difficulty;return openWave(s);});
 for(let index=0;index<6;index++){
  for(let pack=0;pack<2;pack++){
   const hard=runs[2].waves.cadence.rosters[pack],normal=hard.filter(e=>e.kind==='normal').length,elite=hard.length-normal;
   for(const s of runs){const roster=s.waves.cadence.rosters[pack];assert.equal(roster.filter(e=>e.kind==='normal').length,Math.round((survivalWaveSpec(index,s.waves.cadence.at).packSize-elite)*1.5*difficultyProfile(s.difficulty).normalCount));assert.equal(roster.filter(e=>e.kind==='elite').length,elite);}
  }
  for(const s of runs){assert.equal(s.waves.cadence.index,index);nextWave(s);}
 }
});
test('late field density grows fifty percent on easy, medium and hard, including during superbosses',()=>{
 for(const [difficulty,cap] of [[0,72],[50,126],[100,180]]){
  const s=waveRun();s.difficulty=difficulty;s.waves.cadence={...survivalWaveSpec(50,1800),index:50,at:1800,phase:'main'};
  assert.equal(survivalSpawnLimit(s).softCap,cap);
  s.enemies.push({kind:'boss',hp:1,survivalSuperBoss:true});assert.equal(survivalSpawnLimit(s).softCap,cap/2);
 }
});
test('warmup accrues 60 percent fewer ordinary spawn requests on easy',()=>{
 const counts=[0,100].map(difficulty=>{const s=waveRun();s.difficulty=difficulty;s.introBossId='waiting';for(let t=1;t<=1000;t++){s.time=t;s.enemies=[];tickWave(s,1);}return s.metrics.spawned;});
 assert.ok(Math.abs(counts[0]-counts[1]*.4)<=1);
});
test('mission rooms scale only normal defenders with difficulty',()=>{
 const runs=[0,50,100].map(difficulty=>{const s=createWorldRun(undefined,'garden',917,difficulty);stepWorldRun(s,0);return s;});
 const normal=s=>s.enemies.filter(e=>e.kind==='normal'&&e.missionRoom===1).length;
 for(const s of runs){assert.equal(normal(s),Math.round(normal(runs[2])*difficultyProfile(s.difficulty).normalCount));assert.equal(s.enemies.filter(e=>e.kind==='elite'&&e.missionRoom===1).length,1);}
 assert.ok(normal(runs[2])>0);
});

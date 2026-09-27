import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,spawnEnemy,step} from '../src/game.js';
import {difficultyBossDamage} from '../src/systems/difficulty.js';
import {setupMissionBoss} from '../src/systems/mission-bosses.js';
import {updateSurvivalBossDamage} from '../src/systems/survival-scaling.js';

test('existing and new Survival bosses scale damage on every difficulty without compounding twice',()=>{
 for(const difficulty of [0,50,100])for(const kind of ['boss','final']){
  const s=createRun(undefined,'survival',123);s.difficulty=difficulty;
  const e=spawnEnemy(s,kind,{x:20,z:0}),base=difficultyBossDamage(difficulty);
  for(const [time,multiplier] of [[1199,1],[1200,1],[1500,Math.sqrt(2)],[1800,2],[2400,4]]){
   s.time=time;updateSurvivalBossDamage(s,e);updateSurvivalBossDamage(s,e);
   assert.ok(Math.abs(e.damage-base*multiplier)<1e-9);
   const fresh=spawnEnemy(s,kind,{x:25,z:0});assert.equal(fresh.damage,base*multiplier);
  }
  const invader=spawnEnemy(s,'boss',{x:30,z:0});setupMissionBoss(s,invader,'boss-mercury-hunter');
  assert.equal(invader.damage,base*4);updateSurvivalBossDamage(s,invader);assert.equal(invader.damage,base*4);
  e.damage*=3;s.recordMode=true;e.endgameScaled=true;updateSurvivalBossDamage(s,e);assert.ok(Math.abs(e.damage-base*12)<1e-9);
 }
});

test('game step updates pre-existing Mother while missions keep their damage',()=>{
 const s=createRun(undefined,'survival',123),mother=spawnEnemy(s,'final',{x:25,z:0});
 s.arms=[];s.time=1800;s.health.invulnerableUntil=Infinity;step(s,0);assert.equal(mother.damage,4);
 const mission=createRun(undefined,'garden',123);mission.time=2400;
 const boss=spawnEnemy(mission,'boss',{x:25,z:0});setupMissionBoss(mission,boss,'boss-mercury-hunter');
 updateSurvivalBossDamage(mission,boss);assert.equal(boss.damage,2);
});

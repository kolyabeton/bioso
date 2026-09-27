import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,spawnEnemy,hurtEnemy,step,continueSurvival} from '../src/game.js';
import {collectBiomass,tickEscape,continueForRecord,tickRecordBosses} from '../src/systems/survival-endgame.js';
import {normalizeMeta} from '../src/systems/meta-progression.js';
import {trackAchievements} from '../src/systems/achievements.js';
import {readProfile} from '../src/assembly.js';
import {survivalEscapeMass} from '../src/systems/survival-endgame.js';
test('difficulty finale goals unlock only their own achievement after the ending and survive saving',()=>{
 for(const [difficulty,goal,id] of [[0,2000,'easy'],[25,3000,'easy'],[50,4000,'medium'],[75,5000,'medium'],[100,6000,'hard']]){
  const s=createRun(undefined,'survival',123);s.difficulty=difficulty;
  collectBiomass(s,700);hurtEnemy(s,spawnEnemy(s,'final',{x:0,z:7}),1e9);
  assert.equal(s.escapeQuest.goal,goal);s.bossRewards=[];s.pending=0;
  const completions=()=>s.profile.achievements.filter(a=>a.startsWith('survival:escape-'));
  trackAchievements(s);assert.deepEqual(completions(),[]);
  collectBiomass(s,goal-1);s.biomass=0;step(s,0);assert.equal(s.ending,undefined);
  collectBiomass(s,1);step(s,0);assert.deepEqual(completions(),[]);
  step(s,18);assert.equal(s.won,true);assert.deepEqual(completions(),['survival:escape-'+id]);
  const tokens=s.profile.meta.rerolls;trackAchievements(s);assert.equal(s.profile.meta.rerolls,tokens);
  const restored=readProfile({getItem:()=>JSON.stringify(s.profile)});assert.ok(restored.achievements.includes('survival:escape-'+id));
 }
 assert.equal(survivalEscapeMass(undefined),6000);
 const mission=createRun(undefined,'garden',123);mission.won=mission.finalDefeated=true;mission.escapeQuest={goal:2000};mission.difficulty=0;trackAchievements(mission);
 assert.equal(mission.profile.achievements.some(a=>a.startsWith('survival:escape-')),false);
});
test('Mother starts an additional earned-mass quest; spending never loses progress; ending runs once',()=>{
 const s=createRun(undefined,'survival',123);collectBiomass(s,500);
 hurtEnemy(s,spawnEnemy(s,'final',{x:0,z:7}),1e9);
 assert.equal(s.won,false);assert.equal(s.escapeQuest.startMass,500);
 collectBiomass(s,5999);s.biomass=0;assert.equal(tickEscape(s,0),false);
 collectBiomass(s,1);assert.equal(tickEscape(s,0),true);
 tickEscape(s,11);assert.equal(s.ending.exploded,true);assert.equal(s.dead,false);
 tickEscape(s,7);assert.equal(s.won,true);assert.equal(s.profile.meta.biomassRecord,6500);
 assert.equal(normalizeMeta(s.profile.meta).biomassRecord,6500);
 assert.equal(continueForRecord(s),true);tickRecordBosses(s);
 const mother=s.enemies.find(e=>e.hp>0&&e.kind==='final');assert.equal(mother.maxHp,s.endgameBosses[0].template.maxHp*3);
 hurtEnemy(s,mother,1e9);assert.equal(s.ending,null);s.time+=60;tickRecordBosses(s);
 assert.equal(s.enemies.filter(e=>e.kind==='final'&&e.hp>0).length,1);
});
test('record enemies have triple HP and damage while missions retain their balance',()=>{
 const a=createRun(undefined,'survival',123),b=createRun(undefined,'survival',123);b.recordMode=true;
 const normal=spawnEnemy(a,'normal',{x:0,z:7}),hard=spawnEnemy(b,'normal',{x:0,z:7});
 assert.equal(hard.hp,normal.hp*3);assert.equal(hard.damage,normal.damage*3);
});

test('continuation resets completed events including dungeon layers and never resets twice',()=>{
 const s=createRun(undefined,'survival',123);s.won=s.finalDefeated=true;
 s.encounters={nodes:[{id:'encounter-slab',type:'slab',x:4,y:0,z:8,state:'complete',claimed:true,discovered:true}],active:null};
 assert.equal(continueSurvival(s),true);const slab=s.encounters.nodes.find(n=>n.id==='encounter-slab');
 assert.equal(slab.state,'ready');assert.equal(slab.claimed,false);assert.equal(slab.x,4);assert.equal(slab.z,8);
 assert.equal(continueSurvival(s),false);
});

test('ordinary game coordinator starts the approved ending from earned mass and settles victory once',()=>{
 const s=createRun(undefined,'survival',123);
 hurtEnemy(s,spawnEnemy(s,'final',{x:0,z:7}),1e9);
 s.bossRewards=[];s.pending=0;
 collectBiomass(s,6000);step(s,0);
 assert.equal(s.ending.elapsed,0);assert.equal(s.ending.previewHold,undefined);
 const time=s.time;step(s,5);assert.equal(s.ending.elapsed,5);assert.equal(s.ending.exploded,false);
 step(s,6);assert.equal(s.ending.exploded,true);assert.equal(s.won,false);
 step(s,7);assert.equal(s.ending,null);assert.equal(s.won,true);assert.equal(s.dead,false);
 assert.equal(s.time,time);assert.equal(s.profile.meta.wins,1);
 step(s,1);assert.equal(s.profile.meta.wins,1);
});

test('Mother always drops a separate legendary rank-five reverse stomach once per survival run',()=>{
 for(const seed of [1,123,999]){
  const s=createRun(undefined,'survival',seed),mother=spawnEnemy(s,'final',{x:10,z:12});
  hurtEnemy(s,mother,1e9);
  const drop=s.ground.find(q=>q.part?.key==='reverseStomach');
  assert.ok(drop);assert.equal(drop.x,10);assert.equal(drop.z,12);assert.equal(drop.part.tier,5);assert.equal(drop.part.rarity,'relic');
  assert.ok(s.profile.unlocked.includes('reverseStomach'));assert.equal(s.bossRewards[0].options.length,3);
  hurtEnemy(s,spawnEnemy(s,'final',{x:20,z:12}),1e9);
  assert.equal(s.ground.filter(q=>q.part?.key==='reverseStomach').length,1);
 }
 const mission=createRun(undefined,'garden',123);hurtEnemy(mission,spawnEnemy(mission,'final',{x:10,z:12}),1e9);
 assert.equal(mission.ground.some(q=>q.part?.key==='reverseStomach'),false);
});

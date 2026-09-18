import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorldRun} from '../src/world-run.js';
import {createRun,spawnEnemy,receiveDamage} from '../src/game.js';
import {setupMissionBoss} from '../src/systems/mission-bosses.js';
import {tickModularAttack} from '../src/systems/enemy-combat.js';
import {levelFourDuel} from './helpers/level-four-boss-duel.mjs';

test('fourth generated habitat shows level 24 and keeps its fixed budget across seeds',()=>{
 for(const seed of [1,42,20317]){
  const s=createWorldRun(undefined,'survival',seed),bosses=s.enemies.filter(e=>e.habitat);
  assert.deepEqual(bosses.map(e=>e.maxHp),[182,3600,9600,25000,240000]);
  assert.deepEqual(bosses.map(e=>e.bossLevel),[1,8,16,24,30]);
  const e=bosses[3];assert.equal(e.habitatRank,4);assert.equal(e.recipeId,'root-warden');assert.equal(e.bossDesignId,undefined);assert.equal(e.damage,.5);
  assert.equal(e.attackRecoveryScale,1.25);assert.equal(e.speed,1.7);assert.equal(e.armor,20);
 }
});

test('level-24 tier-one melee and ranged builds make meaningful progress against the doubled fourth habitat',()=>{
 for(const weapon of ['claws','pistol'])for(const seed of [1,42,20317]){
  const result=levelFourDuel({weapon,seed,missedHit:true}),label=JSON.stringify(result);
  assert.equal(result.initial.level,24,label);
  assert.equal(Object.values(result.initial.abilities).reduce((a,b)=>a+b,0),23,label);
  assert.equal(result.initial.bossHp,25000,label);assert.ok(result.bossHp<=22500,label);
  assert.ok(result.seconds>=120&&result.seconds<=421,label);
  assert.ok(result.hits>=6,label);assert.equal(result.rewards,0,label);
 }
});

test('standing still remains dangerous for level-24 melee and ranged players',()=>{
 for(const weapon of ['claws','pistol']){
  const result=levelFourDuel({weapon,moving:false});
  assert.ok(result.dead&&!result.killed,JSON.stringify(result));assert.ok(result.hits>=4);
 }
});

test('generated level-four boss uses its own phase-two ring and bounded damage',()=>{
 const s=createWorldRun(undefined,'survival',42),e=s.enemies.find(e=>e.habitatRank===4);
 s.player={x:e.x,y:e.y,z:e.z+6};e.hp=e.maxHp*.4;
 e.territory.state='engaged';e.enemyAttack.index=2;e.enemyAttack.readyAt=0;
 tickModularAttack(s,e,s.player,()=>{});const warning=e.enemyAttack.warning;
 assert.equal(warning.bossAction,'root-ring');s.time=warning.at;
 tickModularAttack(s,e,s.player,()=>{});assert.equal(s.hostileShots.length,12);
 for(const shot of s.hostileShots){
  assert.ok(shot.damage>0&&shot.damage<=.5);s.hp=2;s.health.invulnerableUntil=0;
  receiveDamage(s,shot.damage,{hp:2,armor:0,dodge:0},shot);assert.equal(s.hp,2-shot.damage);
 }
});

test('mission and roaming Collector setup keeps its separate damage and timing',()=>{
 for(const mode of ['survival','nursery']){
  const s=createRun(undefined,mode,42);s.world={walkable:()=>true};
  const e=spawnEnemy(s,'boss',{x:0,z:8},'mass',1920,{introductory:false});
  setupMissionBoss(s,e,'boss-mirror-collector');
  assert.ok(e.maxHp>12500);assert.equal(e.damage,2);assert.equal(e.attackRecoveryScale,undefined);
 }
});

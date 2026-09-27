import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,spawnEnemy} from '../src/game.js';
import {ENEMY_ATTACK_SPEED,ENEMY_WEAPONS,tickModularAttack} from '../src/systems/enemy-combat.js';
import {SURVIVAL_PRESSURE} from '../src/systems/balance.js';
import {MISSION_BOSSES,setupMissionBoss,tickMissionBoss} from '../src/systems/mission-bosses.js';

const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-9,`${actual} != ${expected}`);

test('elite and boss modular attack recovery is three and two times faster',()=>{
 assert.deepEqual(ENEMY_ATTACK_SPEED,{normal:1,elite:3,boss:2,final:2});
 for(const kind of ['normal','elite']){
  const s=createRun(undefined,'survival',481);s.world={walkable:()=>true};s.arms=[];
  const e=spawnEnemy(s,kind,{x:0,z:6},'ranged',960);e.territory=null;e.assembly.arms=[{key:'seed'}];e.enemyAttack={index:0,readyAt:0,warning:null};
  tickModularAttack(s,e,s.player,()=>{});
  near(e.enemyAttack.readyAt-s.time,ENEMY_WEAPONS.seed.recovery*SURVIVAL_PRESSURE.recovery*(e.attackRecoveryScale??1)/(ENEMY_ATTACK_SPEED[kind]*(e.difficultyAttackRate??1)));
 }
 const s=createRun(undefined,'survival',481);s.world={walkable:()=>true};s.arms=[];const e=spawnEnemy(s,'boss',{x:0,z:6},'ranged',960);e.territory=null;e.enemyAttack.readyAt=0;tickModularAttack(s,e,s.player,()=>{});const w=e.enemyAttack.warning;s.time=w.at;tickModularAttack(s,e,s.player,()=>{});near(e.enemyAttack.readyAt-s.time,w.recovery*SURVIVAL_PRESSURE.recovery/(ENEMY_ATTACK_SPEED.boss*e.difficultyAttackRate));
});

test('attack telegraphs keep their readable duration when recovery accelerates',()=>{
 for(const kind of ['elite']){
  const s=createRun(undefined,'survival',482);s.world={walkable:()=>true};s.arms=[];
  const e=spawnEnemy(s,kind,{x:0,z:1},'mass',960);e.territory=null;e.assembly.arms=[{key:'hammer'}];e.enemyAttack={index:0,readyAt:0,warning:null};
  tickModularAttack(s,e,s.player,()=>{});
  near(e.enemyAttack.warning.at-e.enemyAttack.warning.started,ENEMY_WEAPONS.hammer.warning);
 }
 const s=createRun(undefined,'survival',482);s.world={walkable:()=>true};s.arms=[];const e=spawnEnemy(s,'boss',{x:0,z:1},'mass',960);e.territory=null;e.enemyAttack.readyAt=0;tickModularAttack(s,e,s.player,()=>{});near(e.enemyAttack.warning.at-e.enemyAttack.warning.started,e.enemyAttack.warning.warning/e.difficultyAttackRate);
});

test('authored mission bosses use the same two-times recovery multiplier',()=>{
 const s={time:10,entityId:1,player:{x:0,y:0,z:0},enemies:[],hostileShots:[],events:[],arms:[],world:{walkable:()=>true}};
 const e={id:1,kind:'boss',x:0,y:0,z:1,hp:100,maxHp:100,radius:1,speed:0,armor:0,frozenUntil:0,pickupSleepUntil:0};s.enemies.push(e);
 setupMissionBoss(s,e,'boss-root-cathedral');e.bossCombat.readyAt=0;
 tickMissionBoss(s,e,0,()=>{});const warning=e.enemyAttack.warning;s.time=warning.at;tickMissionBoss(s,e,0,()=>{});
 near(e.bossCombat.readyAt-s.time,MISSION_BOSSES[e.bossDesignId].recovery/(ENEMY_ATTACK_SPEED.boss*e.difficultyAttackRate));
});

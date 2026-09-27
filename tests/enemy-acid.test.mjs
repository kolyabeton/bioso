import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,step} from '../src/game.js';
import {stats} from '../src/assembly.js';
import {assembleEnemy,ENEMY_RECIPES} from '../src/systems/enemy-assembly.js';
import {ENEMY_ACID_DAMAGE,ENEMY_ACID_PUDDLE_DURATION,ENEMY_ACID_SLOW_FACTOR,enemyAcidPace,tickEnemyAcidPools,tickModularAttack} from '../src/systems/enemy-combat.js';

const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);

test('enemy acid leaves a two-second pool that slows on entry and deals half HP per exposed second',()=>{
 const s=createRun(undefined,'survival',321),recipe=ENEMY_RECIPES.find(r=>r.id==='acid-spitter');
 s.health.armorSpent=stats(s).armor;
 s.world={walkable:()=>true};s.enemies=[];
 const e={id:7,kind:'elite',role:'ranged',x:0,y:0,z:8,radius:1,hp:100,maxHp:100,speed:0,frozenUntil:0,born:0,assembly:assembleEnemy(recipe,4,'elite'),enemyAttack:{index:0,readyAt:0,warning:null}};
 s.enemies.push(e);tickModularAttack(s,e,s.player,()=>assert.fail('acid impact should not deal direct damage'));const strikeAt=e.enemyAttack.warning.at;s.time=strikeAt;
 tickModularAttack(s,e,s.player,()=>assert.fail('acid impact should not deal direct damage'));s.enemies=[];
 assert.equal(s.enemyAcidPools.length,1);near(s.enemyAcidPools[0].life,ENEMY_ACID_PUDDLE_DURATION);assert.equal(enemyAcidPace(s),ENEMY_ACID_SLOW_FACTOR);
 const base=stats(s).speed,before=s.player.x;step(s,.1,{x:1,z:0});near(s.player.x-before,base*.1*ENEMY_ACID_SLOW_FACTOR);
 const hp=s.hp;s.player.x=4;step(s,.2);assert.equal(enemyAcidPace(s),1);assert.equal(s.hp,hp);
 s.player.x=0;assert.equal(enemyAcidPace(s),ENEMY_ACID_SLOW_FACTOR);step(s,.99);assert.equal(s.hp,hp);step(s,.01);near(s.hp,hp-Math.round(ENEMY_ACID_DAMAGE*25));
 step(s,.7);assert.equal(s.enemyAcidPools.length,0);assert.equal(enemyAcidPace(s),1);
});

test('dodging the acid impact avoids its pool until the player enters it later',()=>{
 const s=createRun(undefined,'survival',322),recipe=ENEMY_RECIPES.find(r=>r.id==='acid-spitter');s.world={walkable:()=>true};
 const e={id:8,kind:'elite',role:'ranged',x:0,y:0,z:8,radius:1,hp:100,maxHp:100,speed:0,frozenUntil:0,born:0,assembly:assembleEnemy(recipe,4,'elite'),enemyAttack:{index:0,readyAt:0,warning:null}};
 tickModularAttack(s,e,s.player,()=>assert.fail('dodged strike dealt damage'));const strikeAt=e.enemyAttack.warning.at;s.player.x=4;s.time=strikeAt;
 tickModularAttack(s,e,s.player,()=>assert.fail('dodged strike dealt damage'));
 assert.equal(s.enemyAcidPools.length,1);assert.equal(enemyAcidPace(s),1);s.player.x=0;assert.equal(enemyAcidPace(s),ENEMY_ACID_SLOW_FACTOR);
});

test('overlapping enemy acid pools share one damage clock',()=>{
 const s=createRun(undefined,'survival',323);s.player.x=s.player.z=0;s.enemyAcidPools=[{x:0,y:0,z:0,radius:2.2,life:2},{x:0,y:0,z:0,radius:2.2,life:2}];let damage=0;
 tickEnemyAcidPools(s,1,(amount)=>damage+=amount);near(damage,ENEMY_ACID_DAMAGE);
});

test('mission room strength scales acid pool damage',()=>{
 const s=createRun(undefined,'survival',324);s.player.x=s.player.z=0;s.enemyAcidPools=[{x:0,y:0,z:0,radius:2.2,life:2,damage:1.07,missionScaled:true}];let damage=0;
 tickEnemyAcidPools(s,1,(amount)=>damage+=amount);near(damage,ENEMY_ACID_DAMAGE*1.07);
});

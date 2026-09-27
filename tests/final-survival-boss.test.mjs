import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,spawnEnemy,hurtEnemy} from '../src/game.js';
import {createWorldRun} from '../src/world-run.js';
import {filteredMapMarkers} from '../src/ui/map.js';
import {atlasSelection,focusFinalBoss} from '../src/ui/map-atlas.js';
import {waypointTarget} from '../src/systems/waypoint.js';
import {tickModularAttack} from '../src/systems/enemy-combat.js';
import {duel} from './helpers/final-boss-duel.mjs';

test('final challenge never scales down for an early arrival and leaves mission tuning alone',()=>{
 const early=createRun(undefined,'survival',321),late=createRun(undefined,'survival',321),mission=createRun(undefined,'garden',321);
 late.level=30;late.time=2400;
 const a=spawnEnemy(early,'final',{x:0,z:7}),b=spawnEnemy(late,'final',{x:0,z:7}),m=spawnEnemy(mission,'final',{x:0,z:7});
 assert.equal(a.maxHp,b.maxHp);assert.equal(a.armor,b.armor);assert.equal(a.speed,b.speed);assert.equal(a.recommended,30);
 assert.ok(a.maxHp>m.maxHp*10);assert.equal(m.recommended,undefined);
});

test('Mother remains identifiable from spawn, focuses a live waypoint, and clears on victory',()=>{
 const s=createWorldRun(undefined,'survival',20317),final=s.enemies.find(e=>e.kind==='final'),marker=filteredMapMarkers(s,'threats').find(m=>m.id===final.id);
 assert.match(marker.label,/финальный босс/);assert.equal(marker.glyph,'♛');assert.equal(marker.recommended,30);
 assert.match(atlasSelection(s,final.id).access,/Тяжёлый бой.*30/);
 assert.equal(focusFinalBoss(s),final.id);assert.equal(waypointTarget(s).id,final.id);
 final.x+=2;assert.equal(waypointTarget(s).x,final.x);
 hurtEnemy(s,final,1e9);assert.equal(s.won,false);assert.equal(s.finalDefeated,true);assert.equal(s.escapeQuest.goal,6000);
 assert.ok(!filteredMapMarkers(s).some(m=>m.kind==='final'));assert.equal(focusFinalBoss(s),null);assert.equal(waypointTarget(s),null);
});

test('Mother teaches two telegraphed patterns, then unlocks a third attack below sixty percent',()=>{
 const s=createRun(undefined,'survival',321);s.world={walkable:()=>true};
 const e=spawnEnemy(s,'final',{x:0,z:8});e.enemyAttack.readyAt=0;
 tickModularAttack(s,e,s.player,()=>assert.fail('projectile pattern cannot deal direct damage'));let w=e.enemyAttack.warning;assert.equal(w.bossAction,'seed-spiral');assert.equal(w.telegraphMode,'area');s.time=w.at;tickModularAttack(s,e,s.player,()=>{});assert.equal(s.hostileShots.length,10);assert.ok(s.hostileShots.every(q=>q.fractional));
 s.time=e.enemyAttack.readyAt;tickModularAttack(s,e,s.player,()=>{});w=e.enemyAttack.warning;assert.equal(w.bossAction,'needle-fan');s.time=w.at;tickModularAttack(s,e,s.player,()=>{});assert.equal(s.hostileShots.length,17);
 e.hp=e.maxHp*.6;e.z=1;s.time=e.enemyAttack.readyAt;tickModularAttack(s,e,s.player,()=>{});assert.equal(e.enemyAttack.warning,null);s.time+=.6;tickModularAttack(s,e,s.player,()=>{});assert.equal(e.enemyAttack.warning.bossAction,'brood-sweep');assert.ok(s.events.some(event=>event.type==='notice'&&/тактику/.test(event.text)));
});

test('prepared level 30 builds win or push the final boss to its last three percent; standing still loses',()=>{
 for(const weapon of ['claws','needle','seed']){
  const moving=duel({weapon}),standing=duel({weapon,dodge:false});
  assert.equal(moving.learned,29);assert.ok(moving.won||moving.bossLeft<=3000,JSON.stringify(moving));
  assert.ok(moving.seconds>=60&&moving.seconds<=360,JSON.stringify(moving));
  assert.equal(standing.dead,true,JSON.stringify(standing));assert.ok(standing.bossLeft>moving.bossLeft);
 }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,step,attack,spawnEnemy} from '../src/game.js';
import {createPart} from '../src/assembly.js';

test('rocket bees never expire or hit terrain; they patrol and acquire a later target',()=>{
 const s=createRun();s.world.heightAt=()=>0;s.world.lineClear=()=>true;s.rng=()=>.99;s.arms=[createPart(s,'rocket')];
 const first=spawnEnemy(s,'normal',{x:5,z:0});first.hp=first.maxHp=10000;first.speed=first.damage=0;
 attack(s,.01);s.arms=[];first.hp=0;s.world.lineClear=()=>false;s.world.walkable=()=>false;
 for(let t=0;t<5;t+=.02)step(s,.02);
 assert.equal(s.shots.filter(q=>q.mode==='rocket').length,4);assert.equal(s.events.filter(e=>e.type==='blast'&&e.key==='rocket').length,0);
 s.world.lineClear=()=>true;s.world.walkable=()=>true;
 const late=spawnEnemy(s,'normal',{x:0,z:4});late.hp=late.maxHp=10000;late.speed=late.damage=0;
 for(let t=0;t<3&&late.hp===10000;t+=.02)step(s,.02);
 assert.ok(late.hp<10000);assert.ok(s.events.some(e=>e.type==='blast'&&e.key==='rocket'));
});

test('patrolling bees reserve different new targets when enough are available',()=>{
 const s=createRun();s.world.heightAt=()=>0;s.world.lineClear=()=>true;s.rng=()=>.99;s.arms=[createPart(s,'rocket')];
 const first=spawnEnemy(s,'normal',{x:5,z:0});first.hp=first.maxHp=10000;first.speed=first.damage=0;
 attack(s,.01);s.arms=[];first.hp=0;step(s,.02);
 for(const z of [-3,-1,1,3]){const target=spawnEnemy(s,'normal',{x:20,z});target.hp=target.maxHp=10000;target.speed=target.damage=0;}
 step(s,.02);assert.equal(new Set(s.shots.map(q=>q.target)).size,4);
});

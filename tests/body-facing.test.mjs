import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,spawnEnemy,attack} from '../src/game.js';
import {createPart,stats} from '../src/assembly.js';
import {SHIELD_IMPACT_DELAY} from '../src/melee-animation.js';
import {armCanReach,clampArmYaw,turnBody,angleDelta} from '../src/body-facing.js';
function target(s,x,z){const e=spawnEnemy(s,'normal',{x,z});e.hp=e.maxHp=10000;return e;}
test('bulk and rated capacity slow turning; backpack load does not',()=>{
 const s=createRun(),light=stats(s).turnSpeed;
 s.inventory.push(createPart(s,'rocket'));assert.equal(stats(s).turnSpeed,light);
 s.body.upgrades.capacity=2;assert.ok(stats(s).turnSpeed<light);
 s.body=createPart(s,'bastion');const heavy=stats(s).turnSpeed;assert.ok(heavy<light);
 s.body=createPart(s,'rootwalker');assert.ok(stats(s).turnSpeed<heavy);
});
test('turning takes the shortest arc, is bounded and independent of timestep',()=>{
 const a=createRun(),b=createRun();a.motion=b.motion={x:1,z:0};
 turnBody(a,.1,2);for(let i=0;i<10;i++)turnBody(b,.01,2);
 assert.ok(Math.abs(a.player.facing-.2)<1e-9);assert.ok(Math.abs(a.player.facing-b.player.facing)<1e-9);
 a.player.facing=Math.PI-.01;a.motion={x:-.01,z:-1};turnBody(a,.01,2);
 assert.ok(Math.abs(angleDelta(a.player.facing,Math.PI-.01))<=.02+1e-9);
});
test('each mount owns its side; rear targets and empty opposite mounts cannot bypass it',()=>{
 const s=createRun();for(const slot of [0,1,2,3]){
  assert.equal(armCanReach(s,slot,{x:slot%2?-2:2,z:1}),true);
  assert.equal(armCanReach(s,slot,{x:slot%2?2:-2,z:1}),false);
  assert.equal(armCanReach(s,slot,{x:0,z:-2}),false);
  assert.equal(armCanReach(s,slot,{x:0,z:2}),true);
  for(const yaw of [-3,-1,0,1,3])assert.ok(Math.abs(clampArmYaw(yaw,slot))<=Math.PI/2);
 }
});
test('blocked attacks spend no ammo or attack proc and resume after the body turns',()=>{
 for(const key of ['claws','seed','arc']){
  const s=createRun();s.arms=[createPart(s,key),null];target(s,-2,0);const p=s.arms[0],ammo=p.ammo;
  attack(s,.01);assert.equal(s.events.some(e=>e.type==='attack'),false);assert.equal(p.ammo,ammo);assert.equal(s.isaac?.attacks?.[p.id]??0,0);
  for(let i=0;i<120&&!s.events.some(e=>e.type==='attack');i++)attack(s,1/60);
  assert.ok(s.events.some(e=>e.type==='attack'),key);
 }
});
test('shield splash crosses the centreline after a valid strike, but repeats cannot originate across the body',()=>{
 const s=createRun();s.arms=[createPart(s,'hammer'),null];const right=target(s,1,2),left=target(s,-1,2);
 attack(s,0);s.time+=SHIELD_IMPACT_DELAY;attack(s,0);assert.ok(right.hp<right.maxHp);assert.ok(left.hp<left.maxHp);
 right.hp=0;left.hp=left.maxHp;attack(s,0,stats(s),s.arms[0]);assert.equal(left.hp,left.maxHp);
});

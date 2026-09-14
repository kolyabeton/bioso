import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,spawnEnemy,hurtEnemy,step,attack} from '../src/game.js';
import {learn} from '../src/systems/abilities.js';
import {createPart} from '../src/assembly.js';
import {decorateLivingEnemy,tickVolatile,separateEnemies,splinterShots,VOLATILE} from '../src/living-combat.js';
import {paintedTerrain} from '../src/painterly-stage.js';
function fixture(){const s=createRun(undefined,'survival',123);s.world=paintedTerrain(123);s.player={x:0,z:0};return s;}
test('volatile variants are limited to every seventh automatic mass spawn after twelve seconds',()=>{
 const s=fixture();s.time=20;const enemies=Array.from({length:14},()=>spawnEnemy(s,'normal',{x:0,z:8}));
 for(const e of enemies)decorateLivingEnemy(s,e,true);
 assert.equal(enemies.filter(e=>e.volatile).length,2);
 const manual=spawnEnemy(s,'normal',{x:0,z:8});decorateLivingEnemy(s,manual,false);assert.equal(manual.volatile,undefined);
});
test('boomer gives a full warning, damages the hero once, and never harms other enemies',()=>{
 const s=fixture(),e=spawnEnemy(s,'normal',{x:0,z:3}),near=spawnEnemy(s,'normal',{x:1,z:3}),far=spawnEnemy(s,'normal',{x:0,z:-8});e.volatile=true;
 let hits=0;const hurt=(q,d)=>hurtEnemy(s,q,d),hit=()=>hits++;
 assert.equal(tickVolatile(s,e,.1,hurt,hit),true);assert.equal(e.fuseRemaining,VOLATILE.fuse);assert.equal(hits,0);
 tickVolatile(s,e,1,hurt,hit);assert.ok(e.hp>0);tickVolatile(s,e,VOLATILE.fuse-1,hurt,hit);
 assert.equal(hits,1);assert.equal(e.hp,0);assert.equal(near.hp,near.maxHp);assert.equal(far.hp,far.maxHp);
 tickVolatile(s,e,1,hurt,hit);assert.equal(hits,1);
});
test('walking out avoids blast; freeze pauses fuse and killing disarms it',()=>{
 const s=fixture(),e=spawnEnemy(s,'normal',{x:0,z:3});e.volatile=true;const hurt=(q,d)=>hurtEnemy(s,q,d);let hits=0;
 tickVolatile(s,e,0,hurt,()=>hits++);e.frozenUntil=5;tickVolatile(s,e,1,hurt,()=>hits++);assert.equal(e.fuseRemaining,VOLATILE.fuse);
 s.time=6;s.player.z=-5;tickVolatile(s,e,2,hurt,()=>hits++);assert.equal(hits,0);
 const other=spawnEnemy(s,'normal',{x:0,z:-3});other.volatile=true;tickVolatile(s,other,0,hurt,()=>hits++);hurt(other,1e9);tickVolatile(s,other,2,hurt,()=>hits++);assert.equal(hits,0);
});
test('crowds separate deterministically without moving the player, armed enemies or objects',()=>{
 const s=fixture(),a=spawnEnemy(s,'normal',{x:0,z:5}),b=spawnEnemy(s,'normal',{x:0,z:5});
 const player={...s.player};separateEnemies(s,.05);assert.ok(Math.hypot(a.x-b.x,a.z-b.z)>0);assert.deepEqual(s.player,player);
 a.fuseRemaining=1;const fixed={x:a.x,z:a.z};separateEnemies(s,.05);assert.equal(a.x,fixed.x);assert.equal(a.z,fixed.z);
 for(let i=0;i<90;i++)separateEnemies(s,1/60);assert.ok(s.enemies.every(e=>s.world.walkable(e.x,e.z)));
});
test('three damaging shards retain source, exclude the corpse and cannot split again',()=>{
 const s=fixture(),e=spawnEnemy(s,'normal',{x:0,z:3});e.hp=0;
 const q={source:42,dx:0,dz:1,w:{damage:20,crit:.4,pierce:3,mode:'projectile'}};
 const shards=splinterShots(s,q,e,true);assert.equal(shards.length,3);
 for(const p of shards){assert.equal(p.source,42);assert.equal(p.w.damage,7);assert.equal(p.w.crit,0);assert.ok(p.hit.has(e.id));assert.equal(splinterShots(s,p,e,true).length,0);}
 assert.equal(splinterShots(s,{...q,w:{...q.w,secondary:'ricochet'}},e,true).length,0);
 assert.equal(splinterShots(s,q,e,false).length,0);
});
test('learned Splinter is connected to real projectile kills without spending extra ammo',()=>{
 const s=fixture();s.arms=[createPart(s,'seed')];learn(s,'projectiles.0');learn(s,'projectiles.2');
 const e=spawnEnemy(s,'normal',{x:0,z:1});e.hp=1;e.speed=0;attack(s,0);const ammo=s.arms[0].ammo;
 step(s,.05);const shards=s.shots.filter(q=>q.isSplinter);assert.equal(shards.length,3);assert.equal(s.arms[0].ammo,ammo);
 const shard=shards[0],target=spawnEnemy(s,'normal',{x:shard.x+shard.dx*.7,z:shard.z+shard.dz*.7});target.hp=100;target.speed=0;
 s.arms=[];step(s,.05);assert.ok(target.hp<100,'shards must collide and damage, not just draw');
});
test('pending level pauses fuses, and explosion respects ordinary player invulnerability',()=>{
 const s=fixture();s.arms=[];const e=spawnEnemy(s,'normal',{x:0,z:3});e.volatile=true;e.fuseRemaining=.02;
 s.pending=1;step(s,.05);assert.equal(e.fuseRemaining,.02);
 s.pending=0;s.health.invulnerableUntil=2;const hp=s.hp;step(s,.05);assert.equal(e.hp,0);assert.equal(s.hp,hp);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {seededRandom,movementFromDrag,clampPosition,targetsForPart,initialState,arenaBounds,ARENA_ROWS} from '../src/simulation.js';
test('same seed produces same world sequence',()=>{const a=seededRandom(8),b=seededRandom(8);assert.deepEqual(Array.from({length:30},a),Array.from({length:30},b));});
test('drag dead zone and diagonal speed cap',()=>{assert.deepEqual(movementFromDrag(2,2),{x:0,z:0});const p=movementFromDrag(100,100);assert.ok(Math.abs(Math.hypot(p.x,p.z)-1)<1e-10);assert.equal(movementFromDrag(0,-45).z,-1);});
test('hero cannot leave painted terrace',()=>{assert.deepEqual(clampPosition({x:99,z:99}),{x:2.5,z:11});assert.deepEqual(clampPosition({x:-99,z:-99}),{x:0,z:-9.2});});
test('terrace margins keep every clamped sample on traversable ground',()=>{for(let z=-20;z<20;z+=.13)for(const x of [-30,0,30]){const p=clampPosition({x,z}),b=arenaBounds(p.z);assert.ok(p.x>=b.left&&p.x<=b.right);assert.ok(p.z>=ARENA_ROWS[0][0]&&p.z<=ARENA_ROWS.at(-1)[0]);assert.deepEqual(clampPosition({...p}),p);}});
test('weapons produce different target sets and ignore dead enemies',()=>{
  const enemies=[{x:1,z:0,hp:0},{x:2,z:0,hp:5},{x:3,z:0,hp:5},{x:4,z:0,hp:5},{x:8,z:0,hp:5}],p={x:0,z:0};
  assert.deepEqual(targetsForPart('seed',p,enemies).map(e=>e.x),[2]);assert.deepEqual(targetsForPart('arc',p,enemies).map(e=>e.x),[2,3,4]);assert.deepEqual(targetsForPart('pulse',p,enemies).map(e=>e.x),[2,3]);
});
test('restart does not share mutable state',()=>{const a=initialState(),b=initialState();a.player.x=4;a.enemies.push({});assert.equal(b.player.x,.5);assert.equal(b.enemies.length,0);});

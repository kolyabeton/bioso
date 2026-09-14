import test from 'node:test';
import assert from 'node:assert/strict';
import {HERO_HIT_SHAKE,heroHitShakeOffset} from '../src/camera-shake.js';

test('hero hit camera shake is brief, bounded and settles at the exact origin',()=>{
 const samples=Array.from({length:24},(_,i)=>heroHitShakeOffset(HERO_HIT_SHAKE.duration*(1-i/23)));
 assert.ok(samples.some(({x,z})=>Math.abs(x)>.05||Math.abs(z)>.05));
 for(const {x,z} of samples)assert.ok(Math.hypot(x,z)<=Math.hypot(HERO_HIT_SHAKE.horizontal,HERO_HIT_SHAKE.depth)+1e-9);
 assert.ok(Math.hypot(...Object.values(heroHitShakeOffset(HERO_HIT_SHAKE.duration*.05)))<Math.hypot(...Object.values(heroHitShakeOffset(HERO_HIT_SHAKE.duration))));
 assert.deepEqual(heroHitShakeOffset(0),{x:0,z:0});
 assert.deepEqual(heroHitShakeOffset(-1),{x:0,z:0});
});

test('reduced motion suppresses hero hit camera shake',()=>{
 assert.deepEqual(heroHitShakeOffset(HERO_HIT_SHAKE.duration,true),{x:0,z:0});
});

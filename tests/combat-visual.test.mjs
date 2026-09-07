import test from 'node:test';
import assert from 'node:assert/strict';
import {weaponPose,impactShape,reloadReadout} from '../src/combat-visual.js';
import {consumeRound,tickWeapons,hitFeedback,SHOOT_MOVE_FACTOR} from '../src/combat-feel.js';
import {createPart} from '../src/assembly.js';
import {createRun,spawnEnemy,step} from '../src/game.js';
test('shot creates a full readable recoil with exponential recovery',()=>{
 const s=createRun(undefined,'survival',123),p=createPart(s,'seed');s.arms[1]=p;consumeRound(s,p);
 assert.equal(p.recoil,1);assert.equal(weaponPose(p).retract,.65);
 tickWeapons(s,.1);assert.ok(p.recoil>.25&&p.recoil<.35);
 assert.equal(SHOOT_MOVE_FACTOR,.5);
});
test('impact color and squash decay, reload readout follows actual timer',()=>{
 assert.deepEqual(impactShape({}),{flash:0,squash:1,stretch:1});
 assert.equal(impactShape({hitFlash:.16}).flash,1);
 const p={reloadRemaining:.6,reloadDuration:1.2};assert.equal(reloadReadout([null,p]).progress,.5);
 assert.match(reloadReadout([p]).text,/0.6/);assert.equal(reloadReadout([]),null);
});
test('a normal enemy is pushed backwards despite continuing pursuit; impulse is capped',()=>{
 const s=createRun(undefined,'survival',123);s.arms=[];const e=spawnEnemy(s,'normal',{x:0,z:6});
 hitFeedback(s,e,{knockback:3},{dx:0,dz:1});const z=e.z;step(s,.05);
 assert.ok(e.z-z>.3,'pursuit must not cancel the visible kick');
 for(let i=0;i<20;i++)hitFeedback(s,e,{knockback:3},{dx:0,dz:1});
 assert.ok(Math.hypot(e.kickX,e.kickZ)<=22.001);
});

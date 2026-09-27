import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createMeleeTrail,updateMeleeTrail,disposeMeleeTrail} from '../src/melee-trail.js';
import {WHIP_HIT_PHASE} from '../src/whip-timing.js';
import {alignWhipVfx} from '../src/whip-vfx.js';

test('whip is one tapered deforming cable, not a static swipe or particle fan',()=>{
 const whip=createMeleeTrail('whip'),geometry=whip.userData.cable.geometry,positions=geometry.attributes.position;
 assert.equal(whip.getObjectByName('whip-sweep'),undefined);assert.ok(positions.count>400);
 updateMeleeTrail(whip,{phase:.15},'whip');const windup=positions.array.slice();updateMeleeTrail(whip,{phase:WHIP_HIT_PHASE},'whip');assert.notDeepEqual(windup,positions.array);
 assert.ok(whip.userData.points.at(-1).distanceTo(whip.userData.target)<1e-8);
 for(let i=0;i<100;i++)updateMeleeTrail(whip,{phase:i%30/30},'whip');assert.equal(whip.userData.cable.geometry,geometry);assert.equal(geometry.attributes.position,positions);assert.ok([...positions.array].every(Number.isFinite));disposeMeleeTrail(whip);
});
test('whip crack reaches the target surface on both mounts, with body scale and arm rotation',()=>{
 for(const scale of [.6,1,1.6])for(const side of [-1,1]){
  const hero=new T.Group(),arm=new T.Group(),whip=createMeleeTrail('whip');hero.scale.setScalar(scale);hero.position.set(2,.2,3);hero.rotation.set(.05,.8,-.1);hero.add(arm);arm.position.set(side*.7,1.1,.3);arm.rotation.set(-.25,side*.8,.2);arm.userData.side=side;arm.add(whip);
  const strike={phase:WHIP_HIT_PHASE,tx:3,ty:.2,tz:7.5,targetRadius:.5};alignWhipVfx(whip,arm,strike,hero);updateMeleeTrail(whip,strike,'whip');hero.updateMatrixWorld(true);
  const tip=whip.localToWorld(whip.userData.points.at(-1).clone());assert.ok(Math.abs(tip.distanceTo(new T.Vector3(3,.6,7.5))-.5)<1e-6);disposeMeleeTrail(whip);
 }
});
test('whip impact fires once, respects reduced motion and disposes all private geometry',()=>{
 const whip=createMeleeTrail('whip');updateMeleeTrail(whip,{phase:.3},'whip');assert.equal(updateMeleeTrail(whip,{phase:WHIP_HIT_PHASE+.01},'whip'),true);assert.equal(updateMeleeTrail(whip,{phase:WHIP_HIT_PHASE+.06},'whip'),false);assert.equal(whip.userData.sparks.count,12);
 updateMeleeTrail(whip,{phase:WHIP_HIT_PHASE+.06},'whip',true);assert.equal(whip.userData.sparks.count,0);assert.ok(whip.userData.flash.material.uniforms.strength.value>0);updateMeleeTrail(whip,null,'whip');assert.equal(whip.visible,false);
 let disposed=0;whip.traverse(o=>o.geometry?.addEventListener('dispose',()=>disposed++));disposeMeleeTrail(whip);assert.equal(disposed,4);
});

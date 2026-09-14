import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {meleePose,createMeleeAnimation} from '../src/melee-animation.js';
import {alignMeleeTrail,createMeleeTrail,disposeMeleeTrail,updateMeleeTrail} from '../src/melee-trail.js';
import {HERO_MELEE_RANGE_MULTIPLIER} from '../src/melee-range.js';
import {updateDrillExtension} from '../src/drill-extension.js';

test('melee extension retains combat range and claws keep their reduced visual scale',()=>{
 const base={claws:.35,hammer:1.25,drill:.48,whip:.55,fangs:1.05},phase={claws:.44,hammer:.44,drill:0,whip:.5,fangs:.44};
 for(const key of Object.keys(base))assert.ok(Math.abs(meleePose(key,phase[key]).extension-base[key]*HERO_MELEE_RANGE_MULTIPLIER)<1e-8,key);
 const claws=createMeleeTrail('claws');assert.equal(claws.scale.x,1.35*HERO_MELEE_RANGE_MULTIPLIER);disposeMeleeTrail(claws);
});
test('claw world aim survives both mounts, pitch, roll and lunge without sideways drift',()=>{
 for(const side of [-1,1])for(const aim of [-1.2,0,1.8]){
  const hero=new T.Group(),arm=new T.Group(),trail=createMeleeTrail('claws');hero.rotation.y=.7;hero.add(arm);arm.userData.rest=new T.Vector3(side*.7,1.15,.2);arm.position.set(side*.9,1.25,.65);arm.rotation.set(-.16,side*.8,.3);arm.add(trail);
  alignMeleeTrail(trail,arm,'claws',aim);updateMeleeTrail(trail,{phase:.4,trail:true,yaw:1.1},'claws');hero.updateMatrixWorld(true);
  const origin=trail.getWorldPosition(new T.Vector3()),rotation=trail.getWorldQuaternion(new T.Quaternion()),direction=new T.Vector3(0,0,1).applyQuaternion(rotation);
  assert.ok(origin.distanceTo(new T.Vector3(0,1.15,0))<1e-8);
  assert.ok(direction.distanceTo(new T.Vector3(Math.sin(aim+.7),0,Math.cos(aim+.7)))<1e-8);disposeMeleeTrail(trail);
 }
});
test('claws use three tapering cuts without a sprite; phase reveals and then clears all particles',()=>{
 const root=createMeleeTrail('claws');assert.equal(root.userData.blades.length,3);assert.equal(root.getObjectByName('claw-rake-reference'),undefined);
 for(const blade of root.userData.blades){assert.equal(blade.material.map,undefined);assert.ok(blade.geometry.attributes.position.count>50);}
 updateMeleeTrail(root,{phase:.2},'claws');const before=root.userData.blades[0].material.uniforms.phase.value;
 assert.equal(updateMeleeTrail(root,{phase:.4},'claws'),true);assert.ok(root.userData.blades[0].material.uniforms.phase.value>before);assert.ok(root.userData.sparks.count>0);
 updateMeleeTrail(root,{phase:.4},'claws',true);assert.equal(root.userData.sparks.count,0);updateMeleeTrail(root,null,'claws');assert.equal(root.visible,false);disposeMeleeTrail(root);
});
test('drill emits bounded contact sparks, soft smoke and debris, never a helix or cone',()=>{
 const drill=createMeleeTrail('drill');assert.equal(drill.getObjectByName('drill-pressure-cone'),undefined);assert.equal(drill.getObjectByName('drill-contact-helix'),undefined);
 updateMeleeTrail(drill,{phase:.1},'drill');assert.equal(updateMeleeTrail(drill,{phase:.4},'drill'),true);
 for(const name of ['sparks','smoke','debris'])assert.ok(drill.userData[name].count>0);
 assert.equal(drill.userData.smoke.geometry.type,'PlaneGeometry');assert.ok(drill.position.z<1.2);
 for(let i=0;i<100;i++){updateMeleeTrail(drill,{phase:(i%30)/30},'drill');for(const name of ['sparks','smoke','debris'])assert.ok(drill.userData[name].count<=drill.userData[name].instanceMatrix.count);}
 updateMeleeTrail(drill,{phase:.5},'drill',true);assert.equal(drill.userData.sparks.count,0);assert.ok(drill.userData.smoke.count>0);
 let disposed=0;drill.traverse(o=>o.geometry?.addEventListener('dispose',()=>disposed++));disposeMeleeTrail(drill);assert.equal(disposed,6);
});
test('rapid drill damage ticks do not restart the contact animation before its sparks',()=>{
 const animation=createMeleeAnimation(),event={type:'attack',key:'drill',source:1,x:0,z:0,tx:0,tz:3};
 animation.attack(event,0);animation.attack(event,.1);animation.attack(event,.2);
 assert.ok(animation.pose(1,.25).phase>.5);
 animation.attack(event,.5);assert.ok(animation.pose(1,.55).phase<.2);
});
test('telescopic drill tip reaches the target surface at different body scales and retracts without scaling the head',()=>{
 for(const scale of [.6,1,1.6])for(const side of [-1,1]){
  const hero=new T.Group(),arm=new T.Group(),asset=new T.Group(),effect=createMeleeTrail('drill');hero.position.set(4,.3,-2);hero.scale.setScalar(scale);hero.rotation.set(.04,.7,-.02);hero.add(arm);arm.position.set(side*.7,1.1,.5);arm.add(asset,effect);arm.userData.drillAsset=asset;arm.userData.drillTipZ=1.08;arm.userData.meleeTrail=effect;
  const strike={phase:.4,tx:5,ty:.2,tz:1.5,targetRadius:.5};updateDrillExtension(arm,strike,hero);hero.updateMatrixWorld(true);
  const tip=effect.getWorldPosition(new T.Vector3()),target=new T.Vector3(5,.6,1.5);assert.ok(Math.abs(tip.distanceTo(target)-.5)<1e-6);assert.equal(strike.drillContact,true);assert.equal(asset.scale.z,1);assert.ok(asset.position.z>0);assert.ok(effect.userData.sleeves.every(mesh=>mesh.visible));
  updateDrillExtension(arm,null,hero);assert.equal(asset.position.z,0);assert.ok(effect.userData.sleeves.every(mesh=>!mesh.visible));disposeMeleeTrail(effect);
 }
});

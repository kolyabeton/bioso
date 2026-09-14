import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createSpringLeapView,SPRING_LEAP_ARC_HEIGHT} from '../src/spring-leap-view.js';
import {SPRING_LEAP_DURATION} from '../src/systems/extra-parts.js';

test('spring leap draws a progressive arc and returns an airborne hero pose',()=>{
 const scene=new T.Scene(),view=createSpringLeapView(scene),target={x:2.5,y:0,z:0};
 assert.equal(view.event({type:'dodge',x:0,y:0,z:0,tx:2.5,ty:0,tz:0}),false);
 assert.equal(view.event({type:'spring-leap',x:0,y:0,z:0,tx:2.5,ty:0,tz:0,duration:SPRING_LEAP_DURATION}),true);
 const halfway=view.update(SPRING_LEAP_DURATION/2,target,false),root=scene.getObjectByName('spring-leap-vfx');
 assert.ok(halfway.x>0&&halfway.x<target.x);assert.ok(halfway.y>SPRING_LEAP_ARC_HEIGHT*.9);assert.equal(halfway.airborne,true);
 assert.ok(root.getObjectByName('spring-leap-arc').geometry.drawRange.count>2);assert.ok(root.getObjectByName('spring-leap-trail').count>1);assert.equal(root.getObjectByName('spring-leap-landing').visible,true);
 const landed=view.update(SPRING_LEAP_DURATION/2,target,false);assert.equal(landed.x,target.x);assert.ok(Math.abs(landed.y-target.y)<1e-10);assert.equal(landed.groundY,target.y);assert.equal(landed.z,target.z);assert.equal(landed.progress,1);assert.equal(landed.airborne,false);assert.equal(view.info().airborne,false);assert.equal(view.info().active,true);
 view.update(1,target,false);assert.equal(view.info().active,false);view.dispose();assert.equal(scene.getObjectByName('spring-leap-vfx'),undefined);
});

test('reduced motion resolves the visual leap without retaining VFX',()=>{
 const scene=new T.Scene(),view=createSpringLeapView(scene),target={x:2.5,y:0,z:0};view.event({type:'spring-leap',x:0,y:0,z:0,tx:2.5,ty:0,tz:0});
 assert.deepEqual(view.update(0,target,true),{x:2.5,y:0,groundY:0,z:0,progress:1,airborne:false});assert.equal(view.info().active,false);view.dispose();
});

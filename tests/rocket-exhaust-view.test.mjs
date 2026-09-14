import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createRocketExhaustView} from '../src/rocket-exhaust-view.js';

test('rocket exhaust has a hot attached flame and pooled lingering smoke',()=>{
 const scene=new T.Group(),view=createRocketExhaustView(scene,{shotCapacity:4,smokeCapacity:12}),shot={id:1,x:2,y:3,z:4,dx:1,dy:0,dz:0,travel:1};
 view.update([shot],q=>q.y,0,false);assert.deepEqual(view.count(),{flames:1,smoke:0});
 view.update([shot],q=>q.y,.1,false);assert.deepEqual(view.count(),{flames:1,smoke:1});assert.equal(scene.getObjectByName('rocket-exhaust-sparks').count,1);
 assert.equal(scene.getObjectByName('rocket-exhaust-middle').count,1);assert.equal(scene.getObjectByName('rocket-exhaust-core').count,1);assert.equal(scene.getObjectByName('rocket-exhaust-heat').count,1);assert.equal(scene.getObjectByName('rocket-exhaust-nozzle-disc').count,1);
 view.update([],q=>q.y,.2,false);assert.deepEqual(view.count(),{flames:0,smoke:1});
 for(let time=.25;time<=1.8;time+=.05)view.update([],q=>q.y,time,false);assert.deepEqual(view.count(),{flames:0,smoke:0});assert.equal(scene.getObjectByName('rocket-exhaust-sparks').count,0);
 view.dispose();assert.equal(scene.children.length,0);
});

test('reduced motion keeps the readable flame but suppresses smoke emission',()=>{
 const scene=new T.Group(),view=createRocketExhaustView(scene,{shotCapacity:2,smokeCapacity:4}),shot={id:2,x:0,y:1,z:0,dx:0,dy:0,dz:1,travel:1};
 const flame=scene.getObjectByName('rocket-exhaust-flame'),before=new T.Matrix4(),after=new T.Matrix4();view.update([shot],q=>q.y,0,true);flame.getMatrixAt(0,before);view.update([shot],q=>q.y,.1,true);flame.getMatrixAt(0,after);assert.deepEqual(view.count(),{flames:1,smoke:0});assert.deepEqual(after.elements,before.elements);view.dispose();
});

test('all exhaust effects use fixed-capacity instanced pools',()=>{
 const scene=new T.Group(),view=createRocketExhaustView(scene,{shotCapacity:2,smokeCapacity:3,sparkCapacity:5});
 const shots=Array.from({length:5},(_,id)=>({id,x:id,y:1,z:0,dx:0,dy:0,dz:1,travel:1}));view.update(shots,q=>q.y,0,false);view.update(shots,q=>q.y,.1,false);
 assert.equal(scene.getObjectByName('rocket-exhaust-flame').count,2);assert.equal(scene.getObjectByName('rocket-exhaust-heat').count,2);
 assert.equal(scene.getObjectByName('rocket-exhaust-smoke').instanceMatrix.count,3);assert.equal(scene.getObjectByName('rocket-exhaust-sparks').instanceMatrix.count,5);assert.ok(scene.getObjectByName('rocket-exhaust-sparks').count<=5);view.dispose();
});

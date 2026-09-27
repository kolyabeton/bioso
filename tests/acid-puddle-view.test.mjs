import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createAcidPuddleView} from '../src/acid-puddle-view.js';

test('acid puddles are pooled, elevated and enlarged by mire without changing gameplay data',()=>{
 const scene=new T.Scene(),view=createAcidPuddleView(scene),puddles=[{id:7,x:2,y:4,z:-3,life:3}];
 view.update(puddles,.1,false,true);const mesh=scene.getObjectByName('acid-puddles'),center=mesh.geometry.attributes.center,data=mesh.geometry.attributes.data;
 assert.equal(mesh.geometry.instanceCount,1);assert.equal(center.getX(0),2);assert.ok(Math.abs(center.getY(0)-4.025)<1e-5);assert.equal(center.getZ(0),-3);assert.equal(data.getX(0),3.75);assert.deepEqual(puddles,[{id:7,x:2,y:4,z:-3,life:3}]);
 view.reset();assert.equal(mesh.geometry.instanceCount,0);view.dispose();assert.equal(scene.getObjectByName('acid-puddles'),undefined);
});

test('overlapping washer puddles collapse to a bounded visual surface without changing simulation puddles',()=>{
 const scene=new T.Scene(),view=createAcidPuddleView(scene),overlap=Array.from({length:400},(_,i)=>({id:i+1,x:(i%4)*.1,y:0,z:(i%5)*.1,life:3,damage:10})),before=structuredClone(overlap);
 view.update(overlap,.1);const mesh=scene.getObjectByName('acid-puddles');assert.equal(mesh.geometry.instanceCount,1);assert.equal(view.info().visiblePuddles,1);assert.deepEqual(overlap,before);
 const spread=Array.from({length:200},(_,i)=>({id:i+1,x:(i%20)*3,y:0,z:Math.floor(i/20)*3,life:3,damage:10}));view.update(spread,.1);assert.equal(mesh.geometry.instanceCount,96);assert.equal(view.info().visiblePuddles,96);view.reset();assert.equal(view.info().visiblePuddles,0);view.dispose();
});

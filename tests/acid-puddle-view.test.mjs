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

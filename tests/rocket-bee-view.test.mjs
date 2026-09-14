import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createRocketBeeView,rocketFlightOffset,RICOCHET_BEE_SCALE} from '../src/rocket-bee-view.js';

test('the three-bee presentation formation has distinct lanes without moving gameplay shots',()=>{
 const shots=[3,4,5].map(id=>({id,x:0,z:0,dx:0,dz:1})),before=structuredClone(shots),offsets=shots.map(shot=>rocketFlightOffset(shot,0,true));
 assert.deepEqual(offsets.map(o=>o.x),[-.36,0,.36]);assert.deepEqual(shots,before);
});

test('rocket projectiles reuse a batched mechanical bee model',()=>{
 const scene=new T.Group(),view=createRocketBeeView(scene,8),shots=[{id:1,x:2,y:3,z:4,dx:1,dy:0,dz:0}];
 view.update(shots,q=>q.y,1,false);
 const meshes=scene.children.filter(o=>o.name==='rocket-bees');
 assert.ok(meshes.length>=3);assert.ok(meshes.every(mesh=>mesh.isInstancedMesh&&mesh.count===1));assert.equal(view.count(),1);
 const wings=scene.getObjectByName('rocket-bee-wing-motion'),engines=scene.getObjectByName('rocket-bee-engine-glow');
 assert.equal(wings.count,4);assert.equal(wings.instanceMatrix.count,8*4);assert.equal(engines.count,1);assert.equal(engines.instanceMatrix.count,8);
 view.reset();assert.ok(meshes.every(mesh=>mesh.count===0));view.dispose();assert.equal(scene.children.length,0);
});

test('melee ricochet uses one centered half-size bee',()=>{
 const scene=new T.Group(),view=createRocketBeeView(scene,2,{scale:RICOCHET_BEE_SCALE,formation:false}),shot={id:3,x:2,y:3,z:4,dx:0,dy:0,dz:1};
 view.update([shot],q=>q.y,0,true);
 const body=scene.children.find(o=>o.name==='rocket-bees'),matrix=new T.Matrix4(),position=new T.Vector3(),rotation=new T.Quaternion(),scale=new T.Vector3();body.getMatrixAt(0,matrix);matrix.decompose(position,rotation,scale);
 assert.equal(position.x,2);assert.equal(position.z,4);assert.equal(scale.x,RICOCHET_BEE_SCALE);assert.equal(view.count(),1);view.dispose();
});

test('wing beat and banking animate normally but remain stable in reduced motion',()=>{
 const scene=new T.Group(),view=createRocketBeeView(scene,2),shot={id:7,x:0,y:1,z:0,dx:0,dy:0,dz:1};
 const wings=scene.getObjectByName('rocket-bee-wing-motion'),body=scene.children.find(o=>o.name==='rocket-bees'),first=new T.Matrix4(),second=new T.Matrix4();
 view.update([shot],q=>q.y,0,false);wings.getMatrixAt(0,first);view.update([shot],q=>q.y,.1,false);wings.getMatrixAt(0,second);assert.notDeepEqual(second.elements,first.elements);
 view.update([shot],q=>q.y,.2,true);body.getMatrixAt(0,first);wings.getMatrixAt(0,second);view.update([shot],q=>q.y,.8,true);
 const bodyAfter=new T.Matrix4(),wingAfter=new T.Matrix4();body.getMatrixAt(0,bodyAfter);wings.getMatrixAt(0,wingAfter);assert.deepEqual(bodyAfter.elements,first.elements);assert.deepEqual(wingAfter.elements,second.elements);view.dispose();
});

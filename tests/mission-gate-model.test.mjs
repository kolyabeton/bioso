import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {bisectGateGeometry,prepareGateModel} from '../src/mission-gate-model.js';
import {createMissionEnvironmentView} from '../src/mission-environment-view.js';
import {createWorldRun} from '../src/world-run.js';
import {architectureGLB} from './helpers/architecture-glb.mjs';

function area(geometry){
 const p=geometry.attributes.position,indices=geometry.index;let sum=0;const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();
 for(let i=0;i<(indices?.count??p.count);i+=3){a.fromBufferAttribute(p,indices?indices.getX(i):i);b.fromBufferAttribute(p,indices?indices.getX(i+1):i+1);c.fromBufferAttribute(p,indices?indices.getX(i+2):i+2);sum+=b.sub(a).cross(c.sub(a)).length()/2;}
 return sum;
}
test('actual gate GLB keeps geometry and frame textures while leaf material is isolated from the source',()=>{
 const source=architectureGLB('arch-gate'),mesh=source.children[0],before=mesh.geometry.attributes.position.array.slice(),halves=bisectGateGeometry(mesh.geometry);
 assert.ok(Math.abs(halves.reduce((n,g)=>n+area(g),0)/area(mesh.geometry)-1)<1e-6);
 assert.deepEqual(mesh.geometry.attributes.position.array,before);
 for(const [i,g] of halves.entries()){
  assert.equal(g.attributes.uv.count,g.attributes.position.count);assert.equal(g.attributes.normal.count,g.attributes.position.count);
  assert.ok(i?g.boundingBox.min.x>=-1e-7:g.boundingBox.max.x<=1e-7);
  assert.ok([...g.attributes.uv.array].every(Number.isFinite));g.dispose();
 }
 const prepared=prepareGateModel(source,12),combined=new T.Box3();
 for(const half of prepared.halves){combined.union(new T.Box3().setFromObject(half));half.traverse(o=>{if(o.isMesh){assert.notEqual(o.material,mesh.material);assert.equal(o.material.map,mesh.material.map);assert.equal(o.material.normalMap,mesh.material.normalMap);assert.equal(o.material.name,'arch-gate-ceramic-leaves');}});}
 assert.ok(Math.abs(combined.min.y)<1e-6);assert.ok(Math.abs(combined.getSize(new T.Vector3()).x-12)<1e-6);
 prepared.dispose();assert.equal(mesh.geometry.attributes.position.count,before.length/3);
});
test('asynchronous loads cannot resurrect retired world objects or attach to a disposed view',async()=>{
 let resolve;const gate=new Promise(r=>resolve=r),source=architectureGLB('arch-gate'),scene=new T.Scene();
 const view=createMissionEnvironmentView(scene,{load:()=>gate}),s=createWorldRun(undefined,'garden',42);
 view.update(s,0);view.update({world:{},player:{x:0,z:0}},0);resolve(source);await view.ready();
 assert.equal(view.info().missionGates,0);assert.equal(scene.getObjectByName('mission-fences').visible,false);
 view.update(s,0);assert.ok(view.info().missionGates>0);view.dispose();assert.equal(scene.children.length,0);
 let finish;const later=new Promise(r=>finish=r),retired=createMissionEnvironmentView(scene,{load:()=>later});retired.update(s,0);retired.dispose();finish(source);await retired.ready();assert.equal(scene.children.length,0);
});
test('failed 3D asset loading is reported instead of claiming a rendered gate',async()=>{
 const scene=new T.Scene(),view=createMissionEnvironmentView(scene,{load:async()=>null});
 view.update(createWorldRun(undefined,'garden',42),0);await view.ready();
 assert.equal(view.info().missionGates,0);assert.ok(view.info().missionGateErrors.length);view.dispose();
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createGroundItemsView} from '../src/ground-items-view.js';
test('unregistered loot cannot interrupt frames or hide other pickups',async()=>{
 const scene=new T.Scene(),requests=[];
 const view=createGroundItemsView(scene,async id=>{requests.push(id);return new T.Mesh(new T.BoxGeometry(),new T.MeshBasicMaterial());});
 const items=[{x:0,z:0,part:{key:'repairGland'}},{x:2,z:0,part:{key:'armor'}}];
 for(let i=0;i<100;i++)view.update(items,1,i/60);
 await Promise.resolve();view.update(items);
 assert.deepEqual(requests,['organ-armor']);assert.deepEqual(view.info().missingGroundItemModels,['repairGland']);
 assert.equal(view.info().visibleGroundItems,2);assert.equal(scene.getObjectByName('ground-item-halos').count,2);
 assert.equal(scene.getObjectByName('ground-item-pointers').count,2);assert.ok(view.info().groundItemDrawBatches>3);
 view.reset();assert.deepEqual(view.info().missingGroundItemModels,[]);assert.equal(scene.getObjectByName('ground-item-halos').count,0);
});

test('ground item and affordance share the live terrain height without terrain clipping',async()=>{
 const scene=new T.Scene(),view=createGroundItemsView(scene,async()=>new T.Mesh(new T.BoxGeometry(1,1,1),new T.MeshBasicMaterial()));
 const item={id:1,x:7,y:-4,z:11,part:{key:'armor'}},terrainY=1.35;
 view.update([item],1,0,true,()=>terrainY);await Promise.resolve();view.update([item],1,0,true,()=>terrainY);
 const halo=scene.getObjectByName('ground-item-halos'),pointer=scene.getObjectByName('ground-item-pointers'),itemBatch=scene.children[0].children.find(o=>o.isInstancedMesh&&o!==halo&&o!==pointer);
 const haloMatrix=new T.Matrix4(),pointerMatrix=new T.Matrix4(),itemMatrix=new T.Matrix4();halo.getMatrixAt(0,haloMatrix);pointer.getMatrixAt(0,pointerMatrix);itemBatch.getMatrixAt(0,itemMatrix);
 const position=matrix=>new T.Vector3().setFromMatrixPosition(matrix),near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-5,`${actual} != ${expected}`);
 const itemPosition=position(itemMatrix),haloPosition=position(haloMatrix),pointerPosition=position(pointerMatrix);
 near(itemPosition.x,item.x);near(itemPosition.y,terrainY+.04+.75);near(itemPosition.z,item.z);
 near(haloPosition.x,item.x);near(haloPosition.y,terrainY+.105);near(haloPosition.z,item.z);
 near(pointerPosition.x,item.x);near(pointerPosition.y,terrainY+2.54);near(pointerPosition.z,item.z);
 assert.equal(halo.material.depthTest,false);
 assert.match(halo.material.vertexShader,/modelViewMatrix\*instanceMatrix\*/);
});

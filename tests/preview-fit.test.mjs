import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {fitPreview} from '../src/preview-fit.js';
test('all visible equipment fits at every rotation and narrow or wide preview aspect',()=>{
 const root=new T.Group(),camera=new T.PerspectiveCamera(35);const body=new T.Mesh(new T.BoxGeometry(2,3,2));root.add(body);
 const arm=new T.Mesh(new T.BoxGeometry(1,1,5));arm.position.set(2,1,2);root.add(arm);
 const hidden=new T.Mesh(new T.BoxGeometry(100,100,100));hidden.visible=false;root.add(hidden);
 for(const aspect of [.18,.4,1,2])for(let i=0;i<16;i++){
  root.rotation.y=i*Math.PI/8;fitPreview(camera,root,aspect);camera.updateMatrixWorld();
  for(const mesh of [body,arm]){mesh.geometry.computeBoundingBox();const b=mesh.geometry.boundingBox;for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]){const p=new T.Vector3(x,y,z).applyMatrix4(mesh.matrixWorld).project(camera);assert.ok(Math.abs(p.x)<1&&Math.abs(p.y)<1&&Math.abs(p.z)<1);}}
 }
});

test('round silhouettes fill the width without the empty corners of their bounding box',()=>{
 const mesh=new T.Mesh(new T.SphereGeometry(1,40,24)),camera=new T.PerspectiveCamera(35);mesh.rotation.y=.6;
 fitPreview(camera,mesh,.4);camera.updateMatrixWorld();let left=1,right=-1;const positions=mesh.geometry.attributes.position;
 for(let i=0;i<positions.count;i++){const p=new T.Vector3().fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld).project(camera);left=Math.min(left,p.x);right=Math.max(right,p.x);}
 assert.ok(left<-.99&&right>.99);assert.ok(left>-1&&right<1);
});

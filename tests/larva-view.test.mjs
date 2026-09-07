import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createLarvaView} from '../src/systems/larva-view.js';
import {createIsaacView} from '../src/isaac-view.js';

test('larvae retain orientation by entity id when pool order changes, without mutating combat state',()=>{
 const scene=new T.Scene(),view=createLarvaView(scene),s={time:1,isaac:{larvae:[{id:1,x:0,y:7,z:0,prepare:.35},{id:2,x:4,y:0,z:4}]}};
 const matrix=new T.Matrix4(),position=new T.Vector3(),q=new T.Quaternion(),scale=new T.Vector3();
 const read=i=>{scene.getObjectByName('larva-head').getMatrixAt(i,matrix);matrix.decompose(position,q,scale);};
 view.update(s,true);read(0);assert(Math.abs(position.y-7.234)<1e-5);
 s.time=2;s.isaac.larvae[0].x=1;view.update(s,true);read(0);const heading=q.clone();assert(new T.Vector3(0,0,1).applyQuaternion(q).x>.99);
 s.isaac.larvae.reverse();const before=JSON.stringify(s);view.update(s,true);read(1);assert(Math.abs(q.dot(heading))>.999);assert.equal(JSON.stringify(s),before);
 view.dispose();assert.equal(scene.children.length,0);
});

test('runtime view bounds larvae at 120 and clears instanced geometry on reset/disposal',()=>{
 const scene=new T.Scene(),view=createIsaacView(scene),s={time:1,enemies:[],isaac:{larvae:Array.from({length:125},(_,id)=>({id,x:id,y:0,z:0,prepare:0}))}};
 view.update(s,true);const root=scene.getObjectByName('mechanical-larvae');assert.equal(root.children.length,11);assert.equal(scene.getObjectByName('larva-head').count,120);assert.equal(scene.getObjectByName('larva-carapace').count,600);
 const transform=new T.Matrix4();for(const mesh of root.children){mesh.getMatrixAt(0,transform);assert(transform.determinant()>0,'instancing requires positive scales');}
 let disposed=0;for(const mesh of root.children)mesh.geometry.addEventListener('dispose',()=>disposed++);
 view.reset();assert(root.children.every(m=>m.count===0));s.isaac.larvae=[];view.update(s);assert(root.children.every(m=>m.count===0));view.dispose();assert.equal(disposed,11);assert.equal(scene.children.length,0);
});

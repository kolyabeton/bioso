import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from 'three';
import {fittedModel,BODY_MODELS,ARM_MODELS,LEG_MODELS} from '../src/asset-models.js';
test('runtime library contains valid GLBs and equipment references resolve',async()=>{
 const base=new URL('../public/assets/kit/',import.meta.url),manifest=JSON.parse(await readFile(new URL('manifest.json',base)));assert.ok(manifest.length>=70);assert.equal(new Set(manifest.map(a=>a.id)).size,manifest.length);
 const ids=new Set(manifest.map(a=>a.id));for(const map of [BODY_MODELS,ARM_MODELS,LEG_MODELS])for(const list of Object.values(map))for(const id of list)assert.ok(ids.has(id),id);
 for(const item of manifest){const bytes=await readFile(new URL(item.file,base));assert.equal(bytes.readUInt32LE(0),0x46546c67,item.id);assert.equal(bytes.readUInt32LE(8),bytes.length);assert.equal(bytes.length,item.bytes);const data=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));assert.ok(data.meshes.length,item.id);assert.ok((data.images||[]).every(i=>Number.isInteger(i.bufferView)),item.id);}
});
test('fitting leaves cached geometry unchanged and places a limb under its socket',()=>{
 const mesh=new T.Mesh(new T.BoxGeometry(2,6,2)),source=new T.Group();mesh.position.set(3,5,2);source.add(mesh);
 const before=new T.Box3().setFromObject(source),limb=fittedModel(source,{size:1.2,anchor:'top'}),box=new T.Box3().setFromObject(limb);
 assert.ok(Math.abs(box.max.y)<1e-6);assert.ok(Math.abs(box.min.y+1.2)<1e-6);assert.deepEqual(new T.Box3().setFromObject(source),before);
 const weapon=fittedModel(source,{size:1.2,anchor:'top',rotation:[-Math.PI/2,0,0]}),wb=new T.Box3().setFromObject(weapon);assert.ok(Math.abs(wb.min.z)<1e-6);assert.ok(Math.abs(wb.max.z-1.2)<1e-6);
});
test('starter pistol resolves to a dedicated articulated arm model',async()=>{
 assert.deepEqual(ARM_MODELS.pistol,['arm-pistol-v1']);
 const bytes=await readFile(new URL('../public/assets/kit/arm-pistol-v1.glb',import.meta.url));
 const data=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12))),names=new Set(data.nodes.map(node=>node.name));
 for(const name of ['arm-pistol-v1','pistol-forearm','pistol-slide','pistol-breech','pistol-muzzle'])assert.ok(names.has(name),name);
 assert.equal(data.meshes.length,5);
});

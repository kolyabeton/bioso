import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {ARM_MODELS,LEG_MODELS} from '../src/asset-models.js';
import {EQUIPMENT_SURFACE_RECTS} from '../src/equipment-surface.js';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),kit=new URL('../public/assets/kit/',import.meta.url);
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
test('icon variants reuse the original PBR images and atlas windows within the mobile mesh budget',async()=>{
 const source=await io.read(new URL('leg-worker.glb',kit).pathname),hashes=new Set(source.getRoot().listTextures().map(t=>digest(t.getImage())));
 const windows=Object.values(EQUIPMENT_SURFACE_RECTS).flat();
 for(const [key,[id]]of Object.entries({...ARM_MODELS,...LEG_MODELS})){
  if(!/-icon-v[12]$/.test(id))continue;
  const doc=await io.read(new URL(id+'.glb',kit).pathname),root=doc.getRoot();
  assert(root.listTextures().length>0,id);
  for(const texture of root.listTextures())assert(hashes.has(digest(texture.getImage())),`${id}: unexpected replacement texture`);
  const node=root.listNodes().find(n=>n.getName()===id),extras=node.getExtras();
  assert.equal(extras.equipmentKey,key);assert(extras.geometryReuse.includes('arm-pistol-v1:Pistol arm upper assembly'));
  let triangles=0;
  for(const mesh of root.listMeshes())for(const p of mesh.listPrimitives()){
   triangles+=p.getIndices().getCount()/3;
   if(!p.getMaterial().getBaseColorTexture())continue;
   assert(p.getMaterial().getMetallicRoughnessTexture(),`${id}: PBR roughness lost`);
   const uv=p.getAttribute('TEXCOORD_0').getArray();
   for(let i=0;i<uv.length;i+=2)assert(windows.some(([x,y,w,h])=>uv[i]>=x/512-1e-6&&uv[i]<=(x+w)/512+1e-6&&uv[i+1]>=y/512-1e-6&&uv[i+1]<=(y+h)/512+1e-6),`${id}: atlas stretched outside its material windows`);
  }
  assert(triangles<=12000,`${id}: ${triangles} triangles`);
 }
});

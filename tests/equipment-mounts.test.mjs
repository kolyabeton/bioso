import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {CATALOG,BODIES,WEAPONS,LEGS} from '../src/catalog.js';
import {createRun} from '../src/game.js';
import {createPart} from '../src/assembly.js';
import {creatureModel} from '../src/game-view.js';
import {partModelId,retireModel} from '../src/asset-models.js';
import {equipmentLayout} from '../src/equipment-mounts.js';
const templates=new Map();
async function load(id){
 if(!templates.has(id))templates.set(id,(async()=>{
  const b=await readFile(new URL(`../public/assets/kit/${id}.glb`,import.meta.url));
  const n=b.readUInt32LE(12),j=JSON.parse(b.subarray(20,20+n));
  j.buffers=[{byteLength:b.readUInt32LE(20+n),uri:'data:application/octet-stream;base64,'+b.subarray(28+n).toString('base64')}];
  delete j.images;delete j.textures;delete j.materials;for(const m of j.meshes)for(const p of m.primitives)delete p.material;
  globalThis.ProgressEvent??=class {};
  return (await new GLTFLoader().parseAsync(JSON.stringify(j),'')).scene;
 })());
 return templates.get(id);
}
test('every catalog item has a nonempty real GLB, distinct weapons, legs and organs',async()=>{
 const ids={};for(const [key,meta] of Object.entries(CATALOG)){
  const id=partModelId({key,setId:'wanderer'}),model=await load(id),box=new T.Box3().setFromObject(model);
  assert(!box.isEmpty(),key);assert(box.getSize(new T.Vector3()).length()>0,key);
  if(meta.kind!=='body'){ids[meta.kind]??=new Set();assert(!ids[meta.kind].has(id),`${key} duplicates ${id}`);ids[meta.kind].add(id);}
 }
});
test('real attachments fit every chassis, weapon, leg and additional six-leg configuration',async()=>{
 for(const body of Object.keys(BODIES))for(const legs of [BODIES[body].legs,6])for(const weapon of Object.keys(WEAPONS))for(const leg of Object.keys(LEGS)){
  const s=createRun();s.body=createPart(s,body);s.arms=Array.from({length:BODIES[body].arms},()=>createPart(s,weapon));s.legs=Array.from({length:legs},()=>createPart(s,leg));s.organs=[];
  const model=creatureModel(s,{load});await model.userData.modelsReady;model.updateMatrixWorld(true);
  assert.equal(model.userData.arms.size,BODIES[body].arms);assert.equal(model.userData.legs.length,legs);
  for(const g of model.userData.legs){
   const asset=g.children.find(o=>o.name.startsWith('asset:'));assert(asset);
   const box=new T.Box3().setFromObject(asset);assert(Math.abs(box.min.y-.03)<1e-5,`${body}/${leg} floor ${box.min.y}`);
   assert(box.getCenter(new T.Vector3()).x*g.position.x>g.position.x**2,`${body}/${leg} folds inwards`);
  }
  const boxes=[...model.userData.arms.values()].map(g=>{assert(g.children.some(o=>o.name==='asset:'+partModelId(s.arms[g.userData.slot])));return new T.Box3().setFromObject(g.children.find(o=>o.name.startsWith('asset:')));});
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)assert(!boxes[i].intersectsBox(boxes[j]),`${body}/${weapon} arms ${i},${j} overlap at rest ${JSON.stringify([boxes[i],boxes[j]])}`);
  retireModel(model);
 }
});
test('removing slots does not recenter remaining limbs, delayed loads cannot revive retired models',async()=>{
 const s=createRun();s.arms=Array.from({length:4},()=>createPart(s,'rocket'));s.legs=Array.from({length:6},()=>createPart(s,'universal'));
 const before=equipmentLayout(s);s.arms[0]=null;s.legs[2]=null;assert.deepEqual(equipmentLayout(s),before);
 let release;const promise=new Promise(r=>release=r),m=creatureModel(s,{load:()=>promise});retireModel(m);release(await load('arm-rocket'));await m.userData.modelsReady;
 let assets=0;m.traverse(o=>{if(o.name.startsWith('asset:'))assets++;});assert.equal(assets,0);
});

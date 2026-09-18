import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {BODIES,ORGANS} from '../src/catalog.js';
import {createRun} from '../src/game.js';
import {createPart,autoPickup,drop,equip} from '../src/assembly.js';
import {creatureModel} from '../src/game-view.js';
import {partModelId,retireModel} from '../src/asset-models.js';

const templates=new Map();
async function load(id){
 if(!templates.has(id))templates.set(id,(async()=>{
  const b=await readFile(new URL(`../public/assets/kit/${id}.glb`,import.meta.url)),n=b.readUInt32LE(12),j=JSON.parse(b.subarray(20,20+n));
  j.buffers=[{byteLength:b.readUInt32LE(20+n),uri:'data:application/octet-stream;base64,'+b.subarray(28+n).toString('base64')}];
  delete j.images;delete j.textures;delete j.materials;for(const mesh of j.meshes)for(const primitive of mesh.primitives)delete primitive.material;
  globalThis.ProgressEvent??=class{};return(await new GLTFLoader().parseAsync(JSON.stringify(j),'')).scene;
 })());return templates.get(id);
}
test('all icon organs mount on every real chassis with sealed rear sockets',async()=>{
 for(const body of Object.keys(BODIES))for(const key of Object.keys(ORGANS)){
  const s=createRun();s.body=createPart(s,body);s.arms=[];s.legs=[];s.organs=Array.from({length:BODIES[body].organs},()=>createPart(s,key));
  const root=creatureModel(s,{load});await root.userData.modelsReady;root.updateMatrixWorld(true);
  const mounts=root.children.filter(o=>o.userData.organMount);assert.equal(mounts.length,s.organs.length,`${body}/${key}`);
  for(const mount of mounts){
   assert.equal(mount.userData.partId,s.organs[mount.userData.slot].id);assert.equal(mount.userData.assetId,partModelId({key}));
   assert.ok(mount.position.distanceTo(new T.Vector3(...mount.userData.surfacePoint))<.033);
   const outward=new T.Vector3(...mount.userData.surfaceNormal);assert.ok(outward.dot(new T.Vector3(0,0,1).applyQuaternion(mount.quaternion))>.9999);
   const local=mount.children[0].clone(true),bounds=new T.Box3().setFromObject(local);
   assert.ok(Math.abs(bounds.min.z+.012)<1e-5);assert.ok(Math.abs(Math.max(...bounds.getSize(new T.Vector3()).toArray())-.43)<1e-5);
  }
  retireModel(root);
 }
});
test('sparse organ slots stay fixed and retired async models cannot reappear',async()=>{
 const s=createRun();s.body=createPart(s,'bastion');s.arms=[];s.legs=[];s.organs=['slime','parasite','repairGland'].map(k=>createPart(s,k));
 const first=creatureModel(s,{load});await first.userData.modelsReady;const position=first.getObjectByName('organ-mount-2').position.clone();s.organs[0]=null;
 const second=creatureModel(s,{load});await second.userData.modelsReady;assert.deepEqual(second.getObjectByName('organ-mount-2').position,position);assert.equal(second.getObjectByName('organ-mount-0'),undefined);
 let release;const pending=new Promise(r=>release=r),retired=creatureModel(s,{load:async id=>{await pending;return load(id);}});retireModel(retired);release();await retired.userData.modelsReady;assert.equal(retired.children.filter(o=>o.userData.organMount).length,0);
});
test('every organ retains the same visual through pickup, equipment and discard',()=>{
 for(const key of Object.keys(ORGANS)){
  const s=createRun();s.organs=[null,null];s.inventory=[];const part=createPart(s,key),id=partModelId(part);
  s.ground=[{id:++s.entityId,part,x:s.player.x,z:s.player.z,y:s.player.y??0}];assert.equal(autoPickup(s)[0],part);
  if(s.inventory.includes(part))assert.ok(equip(s,part.id,0));assert.ok(s.organs.includes(part));assert.equal(partModelId(part),id);
  assert.ok(drop(s,part.id));assert.equal(s.ground.at(-1).part,part);assert.equal(partModelId(s.ground.at(-1).part),id);
 }
});

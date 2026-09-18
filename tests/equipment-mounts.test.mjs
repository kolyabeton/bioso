import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {CATALOG,BODIES,WEAPONS,LEGS} from '../src/catalog.js';
import {createRun} from '../src/game.js';
import {createPart} from '../src/assembly.js';
import {creatureModel} from '../src/game-view.js';
import {BODY_MODELS,partModelId,retireModel} from '../src/asset-models.js';
import {CHASSIS_MATERIALS,CHASSIS_BODY_MATERIALS} from '../src/creature-materials.js';
import {partArt} from '../src/ui/molecules.js';
import {equipmentLayout} from '../src/equipment-mounts.js';
const templates=new Map();
test('body identity follows its inventory icon even with a saved legacy visual or another set',()=>{
 const ids=new Set();
 for(const key of Object.keys(BODIES)){
  const id=partModelId({key,setId:'chimera',visualId:'body-heavy'});
  assert.equal(id,`body-${key}-v3`);assert(!ids.has(id));ids.add(id);
 }
});
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
test('registered catalog items have nonempty real GLBs and only the authored brood fallback is shared',async()=>{
 const ids={};for(const [key,meta] of Object.entries(CATALOG)){
  let id;try{id=partModelId({key,setId:'wanderer'});}catch(error){assert.equal(key,'repairGland');assert.match(error.message,/No equipment model registered/);continue;}const model=await load(id),box=new T.Box3().setFromObject(model);
  assert(!box.isEmpty(),key);assert(box.getSize(new T.Vector3()).length()>0,key);
  if(meta.kind!=='body'){ids[meta.kind]??=new Set();if(ids[meta.kind].has(id))assert.ok([['broodNode','organ-parasite'],['revivalCore','organ-reverseHeart-icon-v1']].some(pair=>pair[0]===key&&pair[1]===id),`${key} shares ${id}`);ids[meta.kind].add(id);}
 }
});
test('real attachments fit every chassis, weapon, leg and additional six-leg configuration',async()=>{
 for(const body of Object.keys(BODIES))for(const legs of [BODIES[body].legs,6])for(const weapon of Object.keys(WEAPONS))for(const leg of Object.keys(LEGS)){
  const s=createRun();s.body=createPart(s,body);s.arms=Array.from({length:BODIES[body].arms},()=>createPart(s,weapon));s.legs=Array.from({length:legs},()=>createPart(s,leg));s.organs=[];
  const model=creatureModel(s,{load});await model.userData.modelsReady;model.updateMatrixWorld(true);
  assert.equal(model.userData.arms.size,BODIES[body].arms);assert.equal(model.userData.legs.length,legs);
  for(const g of model.userData.legs){
   const asset=g.children.find(o=>o.name.startsWith('asset:')),joint=g.getObjectByName('mounting-joint');assert(asset);assert(joint?.visible);const materials=new Set();asset.traverse(o=>{if(o.isMesh)for(const material of (Array.isArray(o.material)?o.material:[o.material]))if(material)materials.add(material);});assert.equal(joint.material.name,'Rusted inner mechanism');assert.equal(joint.material.userData.sourceModel,'leg-worker');assert.equal(joint.userData.materialSource,partModelId(s.legs[g.userData.slot]));
   const box=new T.Box3().setFromObject(asset);assert(Math.abs(box.min.y-.03)<1e-5,`${body}/${leg} floor ${box.min.y}`);
   assert(box.getCenter(new T.Vector3()).x*g.position.x>g.position.x**2,`${body}/${leg} folds inwards`);
  }
  const boxes=[...model.userData.arms.values()].map(g=>{const asset=g.children.find(o=>o.name.startsWith('asset:')),joint=g.getObjectByName('mounting-joint');assert.equal(asset?.name,'asset:'+partModelId(s.arms[g.userData.slot]));assert(joint?.visible);const materials=new Set();asset.traverse(o=>{if(o.isMesh)for(const material of (Array.isArray(o.material)?o.material:[o.material]))if(material)materials.add(material);});assert.equal(joint.material.name,'Rusted inner mechanism');assert.equal(joint.material.userData.sourceModel,'leg-worker');assert.equal(joint.userData.materialSource,partModelId(s.arms[g.userData.slot]));return new T.Box3().setFromObject(asset);});
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

test('every chassis visual variant remains connected through turns, recoil and melee extension',async()=>{
 for(const body of Object.keys(BODIES))for(const visualId of BODY_MODELS[body]){
  const s=createRun();s.body=createPart(s,body);s.body.visualId=visualId;s.arms=Array.from({length:BODIES[body].arms},()=>createPart(s,'seed'));s.legs=Array.from({length:6},()=>createPart(s,'universal'));s.organs=[];
  const model=creatureModel(s,{load});await model.userData.modelsReady;const rig=model.userData.structuralFrame;const bodyAsset=model.getObjectByName('asset:'+visualId);assert(bodyAsset);
  let closedCore;bodyAsset.traverse(o=>{if(o.name===body+'-steel')closedCore=o;});assert(closedCore,'real closed inner chassis was not loaded');
  const liner=model.getObjectByName('closed-body-liner');assert(liner);assert.equal(liner.visible,false,'closed authored chassis must hide the legacy filler');assert.equal(liner.material.transparent,false);assert(!model.children.some(o=>o.name.startsWith('asset:head-')),'icon chassis must not grow an unrelated head');
  for(const phase of [0,.5,1]){
   for(const arm of model.userData.arms.values()){arm.position.copy(arm.userData.rest);arm.position.z+=phase*.8;arm.rotation.set(phase*.7,phase*1.1,phase*.3);}
   model.rotation.set(.1,.8,.04);model.scale.setScalar(1.8);rig.update();model.updateMatrixWorld(true);
   for(const {limb,sleeve,anchor,hardware,radius} of rig.links){
    assert.deepEqual(hardware.scale.toArray(),[radius,radius,radius],`${body}/${visualId}: machined joint stretched`);
    assert.equal(hardware.children.length,3);
    const worldEnd=sleeve.localToWorld(new T.Vector3(0,.5,0)),bearing=limb.getWorldPosition(new T.Vector3());
    assert.ok(worldEnd.distanceTo(bearing)<.12,`${body}/${visualId}: moving bearing lost chassis contact`);
    const inside=liner.worldToLocal(model.localToWorld(anchor.clone()));
    assert.ok(anchor.distanceTo(rig.links.find(l=>l.limb===limb).port.point)<.03,`${body}: drive must start at its actual socket`);
    // Each support must meet the actual authored metal hull, beyond the old filler.
    const origin=model.localToWorld(anchor.clone()),direction=limb.getWorldPosition(new T.Vector3()).sub(origin).normalize();
    const side=closedCore.material.side;closedCore.material.side=T.DoubleSide;
    const hits=new T.Raycaster(origin,direction).intersectObject(closedCore,false);closedCore.material.side=side;
    assert(hits.length,`${body}/${limb.name}: support misses the authored hull; anchor=${anchor.toArray()} end=${limb.position.toArray()}`);
    assert(hits[0].distance<origin.distanceTo(limb.getWorldPosition(new T.Vector3()))+.08,`${body}/${limb.name} phase ${phase}: limb is buried behind the hull; hit ${hits[0].distance} end ${origin.distanceTo(limb.getWorldPosition(new T.Vector3()))} anchor ${anchor.toArray()}`);
   }
  }
 }
});

test('the authored body silhouettes retain horizontal, broad and upright proportions',async()=>{
 const sizes={};
 for(const body of ['hunter','bastion','hecaton','rootwalker','reactor']){
  const s=createRun();s.body=createPart(s,body);s.arms=[];s.legs=[];s.organs=[];
  const model=creatureModel(s,{load});await model.userData.modelsReady;
  sizes[body]=new T.Box3().setFromObject(model.getObjectByName('asset:'+partModelId(s.body))).getSize(new T.Vector3());
 }
 assert(sizes.hunter.z>sizes.hunter.y*1.5,'hunter lost the long horizontal silhouette');
 assert(sizes.bastion.y>sizes.bastion.z*1.15,'bastion must retain the upright armored shield from its icon');
 assert(sizes.hecaton.y>sizes.hecaton.z*1.5,'hecaton must retain the tall core and lateral socket banks');
 assert(sizes.rootwalker.x>sizes.rootwalker.y*1.15,'rootwalker must remain squat');
 assert(sizes.reactor.y>sizes.reactor.x*1.1,'reactor must preserve the upright torso');
});

test('new nursery items cannot shift the existing icon atlas coordinates',async()=>{
 assert.match(partArt('claws'),/viewBox="250.8 250 250.8 260"/);
 assert.match(partArt('hecaton'),/viewBox="0 250 250.8 260"/);
 assert.match(partArt('bastion'),/viewBox="501.6 0 250.8 250"/);
 assert.match(partArt('broodmother'),/items\/broodmother-v2\.png/);
 const bytes=await readFile(new URL('../public/assets/ui/items/broodmother-v2.png',import.meta.url));
 assert(bytes.length>1000,'nursery body icon is missing');
});

test('body wear reuses joint textures without enabling missing vertex colors on bearings',()=>{
 for(const key of Object.keys(CHASSIS_MATERIALS)){
  assert.equal(CHASSIS_BODY_MATERIALS[key].map,CHASSIS_MATERIALS[key].map);
  assert.equal(CHASSIS_BODY_MATERIALS[key].vertexColors,true);
  assert.equal(CHASSIS_MATERIALS[key].vertexColors,false);
 }
});

test('every socket belongs to one equipment slot, empty sockets are closed and occupied drives start there',async()=>{
 for(const body of Object.keys(BODIES)){
  const s=createRun();s.body=createPart(s,body);s.arms=Array.from({length:BODIES[body].arms},(_,i)=>i?createPart(s,'seed'):null);s.legs=Array.from({length:BODIES[body].legs},(_,i)=>i?createPart(s,'universal'):null);s.organs=[];
  const model=creatureModel(s,{load});await model.userData.modelsReady;const rig=model.userData.structuralFrame;
  assert.equal(rig.ports.length,s.arms.length+s.legs.length);
  assert.equal(new Set(rig.ports.map(p=>`${p.kind}:${p.slot}`)).size,rig.ports.length);
  for(const p of rig.ports){assert.equal(p.cap.visible,!s[p.kind][p.slot]);assert(p.group.getObjectByName('sealed-socket-casing'));}
  for(const link of rig.links){const fixed=link.port.point.clone();link.limb.position.z+=.8;rig.update();assert(link.port.point.equals(fixed));assert(link.anchor.distanceTo(fixed)<.03);}
 }
});

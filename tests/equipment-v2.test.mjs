import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,addXP} from '../src/game.js';
import {createPart,equip,unequip,stats,swapBody,weaponStats} from '../src/assembly.js';
import {BODIES,LEGS,ORGANS} from '../src/catalog.js';
import {legModelId,ARM_MODELS} from '../src/asset-models.js';
import {creatureModel} from '../src/game-view.js';
import {createMeleeAnimation} from '../src/melee-animation.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('mixed root and normal legs average speed, swapping and removing immediately recompute',()=>{
 const s=createRun();s.inventory=[];s.arms=[null,null];const root=createPart(s,'root');s.inventory.push(root);
 near(stats(s).speed,6.6);assert(equip(s,root.id,0));near(stats(s).speed,4.4);
 const other=createPart(s,'root');s.inventory.push(other);assert(equip(s,other.id,1));near(stats(s).speed,2.2);
 assert(unequip(s,'legs',0));near(stats(s).speed,1.1);
 const normal=s.inventory.find(p=>p.key==='universal');assert(equip(s,normal.id,0));near(stats(s).speed,4.4);
});
test('every chassis supports independently typed legs and sparse slots preserve physical identity',()=>{
 for(const body of Object.keys(BODIES)){
  const s=createRun();s.arms=[null,null];s.legs=[createPart(s,'root'),createPart(s,'universal')];const rootId=s.legs[0].id;
  const next=createPart(s,body);s.inventory.push(next);assert(swapBody(s,next.id));s.inventory=[];
  assert.equal(s.legs[0].id,rootId);near(stats(s).speed,8/BODIES[body].legs*(body==='wanderer'?1.1:1)*(BODIES[body].legs>=4?1.15:1));
  s.legs[0]=null;const m=creatureModel(s);assert.equal(m.userData.legs.length,1);assert.equal(m.userData.legs[0].userData.slot,1);assert.equal(m.userData.legs[0].userData.partId,s.legs[1].id);
 }
 for(const key of Object.keys(LEGS))for(const setId of Object.keys(BODIES))assert.equal(legModelId({key,setId}),legModelId({key}));
 assert.notEqual(legModelId({key:'root'}),legModelId({key:'universal'}));
});
test('internal organs retain mechanical effects without exterior model placeholders',()=>{
 const s=createRun();s.organs=Object.keys(ORGANS).map(key=>createPart(s,key));const m=creatureModel(s);let exterior=[];m.traverse(o=>{if(o.name.startsWith('organ-'))exterior.push(o);});assert.equal(exterior.length,0);assert(stats(s).regen);assert.equal(stats(s).shieldMax,1);assert(stats(s).rate>0);
});
test('new weapon models are distinct; legacy hammer remains a functional shield bash',()=>{
 assert.equal(ARM_MODELS.whip[0],'arm-whip');assert.equal(ARM_MODELS.needle[0],'arm-needle');
 const s=createRun(),p=createPart(s,'hammer');assert.equal(weaponStats(s,p).name,'Таранный щит');assert.equal(weaponStats(s,p).mode,'area');
 const a=createMeleeAnimation();a.attack({type:'attack',key:'hammer',source:p.id,x:0,z:0,tx:0,tz:2},0);const pose=a.pose(p.id,.2);assert(pose.extension>.6);assert.equal(pose.trail,false);assert(Math.abs(pose.yaw)<.15);
});
test('root unlock remains available to profiles that already earned the old five minute reward',()=>{
 const s=createRun();s.profile.achievements.push('time5');s.time=300;addXP(s,1);assert(s.profile.unlocked.includes('root'));assert(s.ground.some(q=>q.part.key==='root'));const count=s.ground.filter(q=>q.part.key==='root').length;addXP(s,1);assert.equal(s.ground.filter(q=>q.part.key==='root').length,count);
});
test('real GLB legs stay above ground and extend outwards on either side',async()=>{
 const {readFile}=await import('node:fs/promises'),T=await import('three'),{GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js'),{fittedModel,legMountOptions}=await import('../src/asset-models.js');
 // Geometry-only parse: no browser texture decoder is needed for physical bounds.
 const old=globalThis.ProgressEvent;globalThis.ProgressEvent??=class {};
 try{for(const key of Object.keys(LEGS)){
  const bytes=await readFile(new URL(`../public/assets/kit/${legModelId({key})}.glb`,import.meta.url)),len=bytes.readUInt32LE(12),data=JSON.parse(bytes.subarray(20,20+len));
  data.buffers=[{byteLength:bytes.readUInt32LE(20+len),uri:'data:application/octet-stream;base64,'+bytes.subarray(28+len).toString('base64')}];delete data.images;delete data.textures;delete data.materials;for(const m of data.meshes)for(const p of m.primitives)delete p.material;
  const template=(await new GLTFLoader().parseAsync(JSON.stringify(data),'')).scene;
  for(const side of [-1,1]){
   const model=fittedModel(template,legMountOptions(side,.65));model.position.set(side*.45,.65,0);const box=new T.Box3().setFromObject(model);
   near(box.min.y,.03);assert(side*box.getCenter(new T.Vector3()).x>.45,`${key} folds into the body on side ${side}`);
  }
 }}finally{if(old===undefined)delete globalThis.ProgressEvent;else globalThis.ProgressEvent=old;}
});

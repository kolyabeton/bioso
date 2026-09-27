import {limitedLoad} from './frame-work.js';
import {CHASSIS_MATERIALS,CHASSIS_BODY_MATERIALS,equipmentMaterialsReady} from './creature-materials.js';
import {CHASSIS_PROFILES,chassisModelId} from './chassis-profiles.js';
import {partMeta,SETS} from './systems/sets-loot.js';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {mountOrgan} from './organ-mounts.js';
import {equipmentSurfaceUV} from './equipment-surface.js';

// Visual variants never alter equipment IDs, combat stats or save data.
export const BODY_MODELS=Object.fromEntries(Object.keys(CHASSIS_PROFILES).map(key=>[key,[chassisModelId(key)]]));
export const ARM_MODELS={shieldArm:['arm-shield'],drone:['arm-drone-icon-v1'],harpoon:['arm-harpoon-icon-v1'],pistol:['arm-pistol-v1'],claws:['arm-claws-icon-v1'],fangs:['arm-fangs-icon-v1'],hammer:['arm-hammer-icon-v1'],drill:['arm-drill-icon-v1'],whip:['arm-whip-icon-v1'],seed:['arm-seed-icon-v1'],shotgun:['arm-shotgun-v2'],needle:['arm-needle-icon-v1'],rocket:['arm-rocket-icon-v1'],arc:['arm-arc-icon-v1'],acid:['arm-acid-icon-v1']};
// Part type owns its silhouette. Set affiliation must never turn a normal leg into a root.
export const LEG_MODELS={spring:['leg-spring-icon-v2'],runner:['leg-runner-icon-v2'],universal:['leg-universal-icon-v2'],plated:['leg-plated-icon-v2'],root:['leg-root'],swarmLeg:['leg-swarmLeg-icon-v2']};
export const ORGAN_MODELS={...Object.fromEntries(['mirrorGland','reflexNerve','returnNerve','slime','parasite','commonNerve','reverseHeart','regen','shield','armor','repairGland','broodNode','stabilizer','digestion','accelerator'].map(key=>[key,['organ-'+key+'-icon-v1']])),
 broodNode:['organ-broodNode-icon-v3'],
 reverseStomach:['organ-reverseStomach-icon-v2'],
 revivalCore:['organ-revivalCore-icon-v2']};
export const legModelId=p=>LEG_MODELS[p.key]?.[0];
export const legMountOptions=(side,height)=>({size:.83,anchor:'top',rotation:[0,Math.PI,-side*.55],floorDistance:height-.03});
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),cache=new Map(),errors=new Set();let loaded=0;
export const modelInfo=()=>({loadedModels:loaded,failedModels:[...errors]});
export function loadModel(id){
 if(typeof window==='undefined')return Promise.resolve(null);
 if(!cache.has(id))cache.set(id,limitedLoad(()=>loader.loadAsync(`/assets/kit/${id}.glb`)).then(g=>{g.scene.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});loaded++;return g.scene;}).catch(error=>{errors.add(id);console.warn('Model fallback:',id,error.message);return null;}));
 return cache.get(id);
}
export function fittedModel(template,{size=1,anchor='center',rotation=[0,0,0],floorDistance,envelope}={}){
 const copy=template.clone(true),box=new T.Box3().setFromObject(copy),dims=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3()),scale=size/Math.max(dims.x,dims.y,dims.z);
 if(anchor==='top')center.y=box.max.y;if(anchor==='bottom')center.y=box.min.y;if(anchor==='socket')center.set(0,0,0);
 copy.position.sub(center).multiplyScalar(scale);copy.scale.multiplyScalar(scale);const pivot=new T.Group();pivot.add(copy);pivot.rotation.set(...rotation);
 if(envelope){const d=new T.Box3().setFromObject(pivot).getSize(new T.Vector3());pivot.scale.multiplyScalar(Math.min(1,...envelope.map((max,i)=>max/d.getComponent(i))));}
 if(floorDistance!==undefined){const bottom=new T.Box3().setFromObject(pivot).min.y;if(bottom<0)pivot.scale.setScalar(floorDistance/-bottom);}
 return pivot;
}
function install(parent,id,options,position,hide,load=loadModel){
 return load(id).then(template=>{if(!template||parent.userData.retired)return;const model=fittedModel(template,options);model.name='asset:'+id;model.userData.assetId=id;model.position.set(...position);for(const o of hide)o.visible=false;
  const joint=parent.children.find(o=>o.name==='mounting-joint');if(joint){joint.visible=true;joint.userData.materialSource=id;}
  // The shield is only the plate; keep its forearm and cuff connected to the bearing.
  if(id==='arm-shield')for(const [name,surface] of [['support','steel'],['cuff','ceramic']]){
   const connector=parent.getObjectByName(name);if(connector){connector.visible=true;connector.geometry=equipmentSurfaceUV(connector.geometry.clone(),surface);connector.material=CHASSIS_MATERIALS[surface];}
  }
  if(ARM_MODELS.drill.includes(id)){parent.userData.drillTipZ=new T.Box3().setFromObject(model).max.z;parent.userData.drillAsset=model;parent.userData.drillVisual=model.children[0];}
  if(id==='arm-shotgun-v2')parent.userData.shotgunMuzzle=model.getObjectByName('shotgun-muzzle');
  if(id==='arm-pistol-v1'){
   for(const [key,name] of [['pistolSlide','pistol-slide'],['pistolBreech','pistol-breech'],['pistolMuzzle','pistol-muzzle']]){const part=model.getObjectByName(name);if(part){parent.userData[key]=part;parent.userData[key+'Rest']={position:part.position.clone(),rotation:part.rotation.clone()};}}
  }
  if(id.endsWith('-v3'))model.traverse(o=>{if(o.isMesh){const source=Object.values(CHASSIS_BODY_MATERIALS).find(m=>m.name===o.material?.name);if(source)o.material=source;}});
  parent.add(model);if(parent.userData.structuralFrame&&id.startsWith('body-'))parent.userData.structuralFrame.fit(model);});
}
export function retireModel(root){root?.traverse(o=>{o.userData.retired=true;});}
const variant=(list,p)=>list[Math.max(0,Object.keys(SETS).indexOf(partMeta(p).setId))%list.length];
export function partModelId(p){
 // Saved legacy visualId values must not replace the body type's canonical silhouette.
 if(BODY_MODELS[p.key])return BODY_MODELS[p.key][0];
 if(p.visualId)return p.visualId;
 if(ARM_MODELS[p.key])return variant(ARM_MODELS[p.key],p);
 if(LEG_MODELS[p.key])return legModelId(p);
 if(ORGAN_MODELS[p.key])return ORGAN_MODELS[p.key][0];
 throw new Error('No equipment model registered for '+p.key);
}
export function dressCreature(root,s,{load=loadModel}={}){
 const pending=[];const attach=(parent,id,options,position,hide)=>pending.push(install(parent,id,options,position,hide,load));
 const body=partModelId(s.body),bodyMeshes=root.children.filter(o=>o.isMesh&&!o.name.startsWith('socket-')&&!o.name.startsWith('organ-')&&!o.name.startsWith('mounting-'));
 attach(root,body,{size:1.65,rotation:[0,Math.PI,0]},[0,1.06,0],bodyMeshes);
 // A head is cosmetic because the current rules have no separate head equipment slot.
 if(body!=='player-core'&&!body.endsWith('-v3'))attach(root,SETS[partMeta(s.body).setId].head,{size:.48,anchor:'bottom',rotation:[0,Math.PI,0]},[0,1.68,.16],[]);
 root.userData.legs.forEach(g=>{const p=s.legs[g.userData.slot],side=g.userData.mountSide??(g.position.x>0?1:-1);attach(g,legModelId(p),legMountOptions(side,g.position.y),[0,0,0],g.children.filter(o=>!o.name.startsWith('mounting-')));});
 for(const p of s.arms.filter(Boolean)){const g=root.userData.arms.get(p.id);attach(g,variant(ARM_MODELS[p.key]||['arm-seed'],p),{size:p.key==='pistol'?1.05:1.1,anchor:p.key==='pistol'?'socket':p.key==='shieldArm'?'center':'top',rotation:p.key==='shieldArm'?[0,0,0]:[-Math.PI/2,0,0],envelope:p.key==='pistol'?[.72,.54,1.05]:p.key==='shieldArm'?[.95,1.05,.62]:[.8,.52,1.1]},p.key==='shieldArm'?[0,-.08,.65]:[0,0,0],g.children.filter(o=>o!==g.userData.meleeTrail&&!o.name.startsWith('mounting-')&&!(p.key==='shieldArm'&&['support','cuff'].includes(o.name))));}
 // Wait for the fitted chassis before locating each organ on its actual skin.
 const organs=Promise.all(pending).then(()=>Promise.all(s.organs.map(async(p,slot)=>{
  if(!p)return;const id=partModelId(p),template=await load(id);
  if(!template||root.userData.retired)return;
  const chassis=root.children.find(o=>o.userData.assetId===body);if(!chassis)return;
  const model=fittedModel(template,{size:.43});model.name='asset:'+id;model.userData.assetId=id;
  mountOrgan(root,chassis,model,{slot,count:s.organs.length,partId:p.id,key:p.key,assetId:id});
 })));
 return Promise.all([...pending,organs,equipmentMaterialsReady]);
}
export function createAssetEnemies(scene){
 const active=new Map(),templates=new Map();const ids=['anatomy-quadruped','anatomy-crawler','anatomy-biped','anatomy-flyer','boss-warden'];
 for(const id of ids)loadModel(id).then(t=>{if(t)templates.set(id,t);});
 function update(enemies,player,time,scale=1){
  const keep=new Set(),fallback=[];
  for(const e of enemies){const id=e.kind==='boss'?'boss-warden':e.role==='armored'?'anatomy-crawler':e.role==='ranged'?'anatomy-biped':e.role==='fast'?'anatomy-flyer':'anatomy-quadruped',template=templates.get(id);
   if(!template||keep.size>=40){fallback.push(e);continue;}keep.add(e.id);let g=active.get(e.id);
   if(!g){g=fittedModel(template,{size:2,anchor:'bottom',rotation:[0,Math.PI,0]});const holder=new T.Group();holder.add(g);holder.name='enemy-asset:'+id;scene.add(holder);active.set(e.id,holder);g=holder;}
   g.position.set(e.x,(e.y||0)+(e.pickupSleepUntil>time?0:Math.abs(Math.sin(time*8+e.id))*.06),e.z);g.rotation.y=Math.atan2(player.x-e.x,player.z-e.z);const silhouette=e.volatile?[1.3,1.55,1.3]:e.role==='fast'?[.65,.65,1.35]:e.role==='armored'?[1.25,.85,1.1]:e.role==='ranged'?[.8,1.35,.8]:[1,1,1];g.scale.set(...silhouette).multiplyScalar(e.radius*scale);
  }
  for(const [id,g] of active)if(!keep.has(id)){scene.remove(g);active.delete(id);}return fallback;
 }
 function reset(){for(const g of active.values())scene.remove(g);active.clear();}
 return{update,reset,count:()=>active.size};
}

export function decorateObstacle(parent,obstacle,index){
 const id=['veg-shrub','veg-fern','veg-seedpod'][index%3];
 install(parent,id,{size:obstacle.radius*1.5,anchor:'bottom'},[obstacle.x,obstacle.height*.55,obstacle.z],[]);
}
export function decorateLandmark(parent,shape){
 const assets={greenhouse:'arch-planter',collector:'arch-cistern',nursery:'veg-vine',depot:'arch-pillar',exit:'arch-arch',stash:'arch-cistern'};
 const id=assets[shape];if(!id)return;
 for(const side of [-1,1])install(parent,id,{size:shape==='exit'?5:4,anchor:'bottom'},[side*12,0,-8],[]);
}

// Exterior mutation details reuse the textured equipment library rather than debug primitives.
export function dressHiveDetails(parent,{load=loadModel}={}){
 return Promise.all([-1,1].map(side=>install(parent,'organ-parasite',{size:.32,rotation:[0,side*Math.PI/2,0]},[side*.6,1.25,-.35],[],load)));
}

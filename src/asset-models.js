import {partMeta,SETS} from './systems/sets-loot.js';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

// Visual variants never alter equipment IDs, combat stats or save data.
export const BODY_MODELS={reactor:['body-heavy'],wanderer:['body-worker'],hunter:['body-scout','body-carapace'],bastion:['body-heavy','body-guard'],chimera:['body-jade','body-pod'],rootwalker:['body-seed'],hecaton:['body-pod','body-heavy']};
export const ARM_MODELS={harpoon:['arm-harpoon'],claws:['arm-claw'],fangs:['arm-fangs'],hammer:['arm-shield'],drill:['arm-drill'],whip:['arm-whip'],seed:['arm-seed'],needle:['arm-needle'],rocket:['arm-rocket'],arc:['arm-arc'],acid:['arm-siphon']};
// Part type owns its silhouette. Set affiliation must never turn a normal leg into a root.
export const LEG_MODELS={spring:['leg-spring'],runner:['leg-jumper'],universal:['leg-worker'],plated:['leg-guard'],root:['leg-root']};
export const ORGAN_MODELS=Object.fromEntries(['mirrorGland','returnNerve','slime','parasite','commonNerve','outerStomach','reverseHeart','regen','shield','armor','stabilizer','digestion','accelerator'].map(key=>[key,['organ-'+key]]));
export const legModelId=p=>LEG_MODELS[p.key]?.[0];
export const legMountOptions=(side,height)=>({size:.83,anchor:'top',rotation:[0,Math.PI,-side*.55],floorDistance:height-.03});
const heroOutlineMaterial=new T.MeshBasicMaterial({color:'#173d35',side:T.BackSide});
function addHeroOutline(model,parent){let owner=parent;while(owner&&!owner.userData.heroOutline)owner=owner.parent;if(!owner)return;const meshes=[];model.traverse(o=>{if(o.isMesh)meshes.push(o);});for(const mesh of meshes){const outline=new T.Mesh(mesh.geometry,heroOutlineMaterial);outline.name='hero-outline';outline.scale.setScalar(1.055);mesh.add(outline);}}
const loader=new GLTFLoader(),cache=new Map(),errors=new Set();let loaded=0;
export const modelInfo=()=>({loadedModels:loaded,failedModels:[...errors]});
export function loadModel(id){
 if(typeof window==='undefined')return Promise.resolve(null);
 if(!cache.has(id))cache.set(id,loader.loadAsync(`/assets/kit/${id}.glb`).then(g=>{g.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});loaded++;return g.scene;}).catch(error=>{errors.add(id);console.warn('Model fallback:',id,error.message);return null;}));
 return cache.get(id);
}
export function fittedModel(template,{size=1,anchor='center',rotation=[0,0,0],floorDistance,envelope}={}){
 const copy=template.clone(true),box=new T.Box3().setFromObject(copy),dims=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3()),scale=size/Math.max(dims.x,dims.y,dims.z);
 if(anchor==='top')center.y=box.max.y;if(anchor==='bottom')center.y=box.min.y;
 copy.position.sub(center).multiplyScalar(scale);copy.scale.multiplyScalar(scale);const pivot=new T.Group();pivot.add(copy);pivot.rotation.set(...rotation);
 if(envelope){const d=new T.Box3().setFromObject(pivot).getSize(new T.Vector3());pivot.scale.multiplyScalar(Math.min(1,...envelope.map((max,i)=>max/d.getComponent(i))));}
 if(floorDistance!==undefined){const bottom=new T.Box3().setFromObject(pivot).min.y;if(bottom<0)pivot.scale.setScalar(floorDistance/-bottom);}
 return pivot;
}
function install(parent,id,options,position,hide,load=loadModel){
 return load(id).then(template=>{if(!template||parent.userData.retired)return;const model=fittedModel(template,options);model.name='asset:'+id;model.userData.assetId=id;model.position.set(...position);for(const o of hide)o.visible=false;parent.add(model);addHeroOutline(model,parent);if(id==='arm-drill')parent.userData.drillVisual=model.children[0];});
}
export function retireModel(root){root?.traverse(o=>{o.userData.retired=true;});}
const variant=(list,p)=>list[Math.max(0,Object.keys(SETS).indexOf(partMeta(p).setId))%list.length];
export function partModelId(p){
 if(p.visualId)return p.visualId;
 if(BODY_MODELS[p.key])return variant(BODY_MODELS[p.key],p);
 if(ARM_MODELS[p.key])return variant(ARM_MODELS[p.key],p);
 if(LEG_MODELS[p.key])return legModelId(p);
 if(ORGAN_MODELS[p.key])return ORGAN_MODELS[p.key][0];
 throw new Error('No equipment model registered for '+p.key);
}
export function dressCreature(root,s,{load=loadModel}={}){
 const pending=[];const attach=(parent,id,options,position,hide)=>pending.push(install(parent,id,options,position,hide,load));
 const body=s.body.visualId||variant(BODY_MODELS[s.body.key]||['player-core'],s.body),bodyMeshes=root.children.filter(o=>o.isMesh&&!o.name.startsWith('socket-')&&!o.name.startsWith('organ-')&&!o.name.startsWith('mounting-'));
 attach(root,body,{size:1.65,rotation:[0,Math.PI,0]},[0,1.06,0],bodyMeshes);
 // A head is cosmetic because the current rules have no separate head equipment slot.
 if(body!=='player-core')attach(root,SETS[partMeta(s.body).setId].head,{size:.48,anchor:'bottom',rotation:[0,Math.PI,0]},[0,1.68,.16],[]);
 root.userData.legs.forEach(g=>{const p=s.legs[g.userData.slot],side=g.position.x>0?1:-1;attach(g,legModelId(p),legMountOptions(side,g.position.y),[0,0,0],[...g.children]);});
 for(const p of s.arms.filter(Boolean)){const g=root.userData.arms.get(p.id);attach(g,variant(ARM_MODELS[p.key]||['arm-seed'],p),{size:1.1,anchor:'top',rotation:[-Math.PI/2,0,0],envelope:[.8,.52,1.1]},[0,0,0],g.children.filter(o=>o!==g.userData.meleeTrail&&!o.name.startsWith('mounting-')));}
 // Organs are internal: their gameplay effects and inventory art stay, no exterior meshes.
 return Promise.all(pending);
}
export function createAssetEnemies(scene){
 const active=new Map(),templates=new Map();const ids=['anatomy-quadruped','anatomy-crawler','anatomy-biped','anatomy-flyer','boss-warden'];
 for(const id of ids)loadModel(id).then(t=>{if(t)templates.set(id,t);});
 function update(enemies,player,time,scale=1){
  const keep=new Set(),fallback=[];
  for(const e of enemies){const id=e.kind==='boss'?'boss-warden':e.role==='armored'?'anatomy-crawler':e.role==='ranged'?'anatomy-biped':e.role==='fast'?'anatomy-flyer':'anatomy-quadruped',template=templates.get(id);
   if(!template||keep.size>=40){fallback.push(e);continue;}keep.add(e.id);let g=active.get(e.id);
   if(!g){g=fittedModel(template,{size:2,anchor:'bottom',rotation:[0,Math.PI,0]});const holder=new T.Group();holder.add(g);holder.name='enemy-asset:'+id;scene.add(holder);active.set(e.id,holder);g=holder;}
   g.position.set(e.x,(e.y||0)+Math.abs(Math.sin(time*8+e.id))*.06,e.z);g.rotation.y=Math.atan2(player.x-e.x,player.z-e.z);const silhouette=e.volatile?[1.3,1.55,1.3]:e.role==='fast'?[.65,.65,1.35]:e.role==='armored'?[1.25,.85,1.1]:e.role==='ranged'?[.8,1.35,.8]:[1,1,1];g.scale.set(...silhouette).multiplyScalar(e.radius*scale);
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

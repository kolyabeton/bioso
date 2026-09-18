import * as T from 'three';
import {loadModel} from './asset-models.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createBossAnimationRig,animateBoss} from './boss-animation.js';
import {groundBossModel} from './boss-grounding.js';

export const BOSS_MODEL_IDS=Object.freeze(['boss-mercury-hunter','boss-scrap-leviathan','boss-root-cathedral','boss-mirror-collector','boss-swarm-shepherd']);
const ids=new Set(BOSS_MODEL_IDS);
export const bossModelId=e=>['boss','final'].includes(e.kind)&&ids.has(e.bossDesignId)?e.bossDesignId:null;

/** Uniform fit preserves the approved shape, the existing collision radius and health-bar clearance. */
export function fittedBossModel(template,{height}={}){
 const copy=template.clone(true),box=new T.Box3().setFromObject(copy),dims=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());
 const factor=height?height/Math.max(dims.y,.001):Math.min(2.2/Math.max(dims.x,dims.z,.001),1.85/Math.max(dims.y,.001));
 copy.position.sub(new T.Vector3(center.x,box.min.y,center.z)).multiplyScalar(factor);copy.scale.multiplyScalar(factor);
 const group=new T.Group(),motionRoot=new T.Group();motionRoot.name='boss-motion-root';motionRoot.add(copy);group.add(motionRoot);group.userData.motionRoot=motionRoot;const parts=[];
 copy.traverse(o=>{const role=o.userData.motionRole;if(role)parts.push({object:o,role,position:o.position.clone(),rotation:o.rotation.clone(),quaternion:o.quaternion.clone(),scale:o.scale.clone()});});
 group.updateMatrixWorld(true);for(const part of parts)part.modelPosition=group.worldToLocal(part.object.getWorldPosition(new T.Vector3()));group.userData.motionParts=parts;group.userData.rig=createBossAnimationRig(group,parts);return group;
}

/** Dedicated full-body boss assets. Until loaded, the regular renderer remains the fallback. */
export function createBossModelView(scene,{load=loadModel,renderer}={}){
 const environmentScene=renderer?new RoomEnvironment():null,pmrem=renderer?new T.PMREMGenerator(renderer):null,environment=pmrem?.fromScene(environmentScene,.02);environmentScene?.dispose();pmrem?.dispose();
 const root=new T.Group();root.name='mission-boss-models';scene.add(root);
 const sources=new Map(),pending=new Set(),failures=new Set(),active=new Map(),bounds=new T.Box3();let disposed=false;
 const request=id=>{if(pending.has(id))return;pending.add(id);Promise.resolve().then(()=>load(id)).then(source=>{if(disposed)return;if(source){const prepared=source.clone(true),materials=new Map();prepared.traverse(o=>{if(!o.isMesh)return;const adapt=m=>{if(!materials.has(m)){const c=m.clone();if(c.isMeshStandardMaterial){c.envMap=environment?.texture??null;c.envMapIntensity=.85;c.normalScale?.multiplyScalar(.7);}materials.set(m,c);}return materials.get(m);};o.material=Array.isArray(o.material)?o.material.map(adapt):adapt(o.material);});sources.set(id,prepared);}else failures.add(id);}).catch(()=>{if(!disposed)failures.add(id);});};
 function update(enemies,player,time,scale=1,reducedMotion=false,world=null){
  const remaining=[],keep=new Set();
  for(const e of enemies){
   const id=bossModelId(e);if(!id||e.hp<=0){remaining.push(e);continue;}request(id);
   const source=sources.get(id);if(!source){remaining.push(e);continue;}
   keep.add(e.id);let entry=active.get(e.id);
   if(entry&&entry.id!==id){root.remove(entry.model);active.delete(e.id);entry=null;}
   if(!entry){const model=fittedBossModel(source,{height:e.visualHeight?e.visualHeight/e.radius:undefined});model.name='boss-asset:'+id;model.userData.assetId=id;root.add(model);bounds.setFromObject(model,true);entry={id,model,height:bounds.max.y-bounds.min.y,x:e.x,z:e.z,travel:0,clock:time,walkWeight:0,hover:e.bossHover??0,lastTime:time};active.set(e.id,entry);}
   const {model}=entry,dt=Math.max(0,time-entry.lastTime),distance=Math.hypot(e.x-entry.x,e.z-entry.z),frozen=e.frozenUntil>time||e.pickupSleepUntil>time;
   const yaw=e.bossCombat?.facing??e.facing??Math.atan2(player.x-e.x,player.z-e.z);
   entry.groundHeightAt=world?.heightAt?(x,z)=>world.heightAt(x,z):null;
   model.position.set(e.x,(e.y??0)+entry.hover,e.z);model.rotation.y=yaw;model.scale.setScalar(e.radius*(e.bossCombat?1:scale));
   if(!frozen){
    if(dt>0){const turn=entry.yaw==null?0:Math.abs(Math.atan2(Math.sin(yaw-entry.yaw),Math.cos(yaw-entry.yaw)));const movement=Math.min(distance+turn*e.radius*.25,dt*14);entry.travel+=movement;entry.clock+=dt;const moving=movement/dt>.04?1:0;entry.walkWeight+=(moving-entry.walkWeight)*(1-Math.exp(-dt*15));entry.hover+=((e.bossHover??0)-entry.hover)*(1-Math.exp(-dt*5));}
    model.position.y=(e.y??0)+entry.hover;
    entry.pose=animateBoss(model,model.userData.rig,e,time,entry,reducedMotion);
   }
   entry.groundLift=groundBossModel(model,entry.groundHeightAt,e.y??0);
   entry.lastTime=time;entry.yaw=yaw;
   entry.x=e.x;entry.z=e.z;e.presentationHeight=entry.height*e.radius*(e.bossCombat?1:scale)+entry.hover+entry.groundLift;
  }
  for(const [key,entry] of active)if(!keep.has(key)){root.remove(entry.model);active.delete(key);}
  return remaining;
 }
 function reset(){for(const e of active.values())root.remove(e.model);active.clear();}
 return {update,reset,preload(id){if(ids.has(id))request(id);},count:()=>active.size,info:()=>({bossModels:active.size,bossModelIds:[...active.values()].map(e=>e.id),bossModelFailures:[...failures],bossAnimations:[...active.values()].map(e=>({id:e.id,...e.pose,clock:e.clock,travel:e.travel})),bossModelObjects:[...active.values()].reduce((n,e)=>n+e.model.userData.motionParts.length,0)}),dispose(){disposed=true;reset();scene.remove(root);const materials=new Set();for(const source of sources.values())source.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);});for(const m of materials)m.dispose();sources.clear();environment?.dispose();}};
}

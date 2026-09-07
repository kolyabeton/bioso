import {equipmentLayout} from './equipment-mounts.js';
import * as T from 'three';
import {loadModel,fittedModel,BODY_MODELS,ARM_MODELS,LEG_MODELS} from './asset-models.js';
import {enemyWeaponPose,enemyAnimationState} from './enemy-attack-animation.js';

const heads={wanderer:'head-worker',hunter:'head-optic',bastion:'head-sentinel',chimera:'head-mandible',rootwalker:'head-crown',hecaton:'head-knight'};
const fallbackGeometry=new T.IcosahedronGeometry(1,1);
const fallbackMaterial=new T.MeshStandardMaterial({color:'#71817b',roughness:.7,metalness:.25});
const armorMaterial=new T.MeshStandardMaterial({color:'#b99b65',roughness:.5,metalness:.45});
/** Local socket layouts shared by gallery and runtime. No item mutation or player rendering. */
export function enemyVisualParts(e,time=0,reducedMotion=false){
 const a=e.assembly,layout=equipmentLayout(a),parts=[],strong=e.kind!=='normal',tierScale=1+(e.tier-1)*.025;
 const add=(asset,size,position,rotation=[0,Math.PI,0],anchor='center',motion=null)=>parts.push({asset,size,position,rotation,anchor,motion});
 add(BODY_MODELS[a.body.key][0],1.25*tierScale,[0,.95,0]);
 add(heads[a.body.key],.4,[0,1.55,.18]);
 if(!e.flying)a.legs.forEach((p,i)=>{if(!p)return;const {side,position}=layout.legs[i],row=Math.floor(i/2);
  const stride=reducedMotion||e.enemyAttack?.warning||e.fuseRemaining!=null||e.frozenUntil>time||e.territory&&e.territory.state!=='engaged'?0:Math.sin(time*(e.role==='fast'?13:9)+i*Math.PI+row*1.4)*.3;
  add(LEG_MODELS[p.key][0],.95,[position[0]*.8,.65,position[2]*.8],[stride,Math.PI,-side*.55],'top');parts.at(-1).floorDistance=.62;
 });
 if(e.flying)for(const side of [-1,1])add('shell-elytra',1,[side*.7,1.25,-.1],[0,Math.PI,side*(.65+(reducedMotion?0:Math.sin(time*42)*.3))],'center','wing');
 a.arms.forEach((p,i)=>{if(!p)return;const {side,position}=layout.arms[i];
  const pose=enemyWeaponPose(e,i,time,reducedMotion);
  add(ARM_MODELS[p.key][0],(strong?1.1:p.key==='fangs'?.65:.85)*tierScale,[position[0]*.8+pose.x,position[1]+pose.y,position[2]*.8+pose.z],[-Math.PI/2+pose.pitch,pose.yaw,side*.13+pose.roll],'top');
  parts.at(-1).rotationOrder='YXZ';parts.at(-1).spin=pose.spin;
 });
 a.organs.forEach((p,i)=>{if(p)add(p.key==='armor'?'shell-elytra':'organ-reactor',strong?.7:.48,[(i-1)*.23,1.32,-.28]);});
 // Reinforced bosses have an extra visible shoulder plate, not a hidden stats multiplier.
 if(strong)add('shell-elytra',.65,[0,1.38,-.45]);
 return parts;
}

/** One pool per GLB mesh/material: every visible enemy remains modular beyond 40. */
export function createEnemyAssemblyView(scene,{load=loadModel}={}){
 const root=new T.Group();root.name='modular-enemies';scene.add(root);
 const sources=new Map(),pending=new Set(),pools=new Map(),local=new T.Object3D(),world=new T.Object3D(),matrix=new T.Matrix4();
 let count=0,partCount=0,fallbackCount=0;
 function request(id){if(pending.has(id))return;pending.add(id);load(id).then(source=>{if(source)sources.set(id,source);});}
 const fitted=new Map();
 function meshParts(part){
  request(part.asset);const source=sources.get(part.asset);
  if(!source){fallbackCount++;const o=new T.Object3D();o.scale.set(part.size*.35,part.size*.5,part.size*.3);o.position.y=part.anchor==='top'?-part.size*.5:0;o.updateMatrix();const pivot=new T.Object3D();pivot.rotation.set(...part.rotation,part.rotationOrder||'XYZ');if(part.spin)pivot.rotateY(part.spin);pivot.updateMatrix();o.matrix.premultiply(pivot.matrix);return [{geometry:fallbackGeometry,material:part.asset.includes('shell')?armorMaterial:fallbackMaterial,matrix:o.matrix,key:`fallback:${part.asset}`}];}
  const key=[part.asset,part.size,part.anchor,part.floorDistance,...part.rotation.map((r,i)=>i===0&&part.asset.startsWith('leg-')?0:r)].join(':');
  // Cache neutral leg shape; animated pivot remains a cheap instance transform.
  const rotation=part.asset.startsWith('leg-')?[0,...part.rotation.slice(1)]:part.rotation;
  // Animated wings must never put their frame angle into the fitted-shape cache.
  const animatedPivot=part.asset.startsWith('arm-')||part.motion==='wing';
  const stableKey=animatedPivot?[part.asset,part.size,part.anchor,part.motion||'arm'].join(':'):key;
  if(!fitted.has(stableKey)){
   const g=fittedModel(source,{size:part.size,anchor:part.anchor,rotation:animatedPivot?[0,0,0]:rotation,floorDistance:part.floorDistance,envelope:part.asset.startsWith('arm-')?[.64,1.1,.45]:undefined});g.updateMatrixWorld(true);const meshes=[];
   g.traverse(o=>{if(o.isMesh)meshes.push({geometry:o.geometry,material:o.material,matrix:o.matrixWorld.clone(),key:`${part.asset}:${meshes.length}`});});fitted.set(stableKey,meshes);
  }
  return fitted.get(stableKey);
 }
 function update(enemies,player,time,scale=1,reducedMotion=false){
  const batches=new Map();count=partCount=fallbackCount=0;
  for(const e of enemies){if(!e.assembly||e.hp<=0)continue;count++;
   world.position.set(e.x,(e.y??0)+(e.flying?1.1+(reducedMotion?0:Math.sin(time*6+e.id)*.12):0),e.z);const aim=enemyAnimationState(e,time)?.attack;
   world.rotation.set(0,aim?Math.atan2(aim.dx,aim.dz):Math.atan2(player.x-e.x,player.z-e.z),0);world.scale.setScalar(e.radius*scale);world.updateMatrix();
   for(const part of enemyVisualParts(e,time,reducedMotion)){partCount++;local.position.set(...part.position);local.rotation.set(0,0,0);local.scale.setScalar(1);
    const meshes=meshParts(part),ready=sources.has(part.asset);
    if(ready&&part.asset.startsWith('leg-'))local.rotation.x=part.rotation[0];
    if(ready&&(part.asset.startsWith('arm-')||part.motion==='wing')){local.rotation.set(...part.rotation,part.rotationOrder||'XYZ');if(part.spin)local.rotateY(part.spin);}
    local.updateMatrix();
    for(const m of meshes){matrix.multiplyMatrices(world.matrix,local.matrix).multiply(m.matrix);if(!batches.has(m.key))batches.set(m.key,{...m,transforms:[]});batches.get(m.key).transforms.push(matrix.clone());}
   }
  }
  for(const pool of pools.values())pool.count=0;
  for(const [key,batch]of batches){let pool=pools.get(key);const n=batch.transforms.length;
   if(!pool||pool.instanceMatrix.count<n){if(pool){root.remove(pool);pool.dispose();}pool=new T.InstancedMesh(batch.geometry,batch.material,Math.max(128,2**Math.ceil(Math.log2(n))));pool.instanceMatrix.setUsage(T.DynamicDrawUsage);pool.frustumCulled=false;pool.castShadow=pool.receiveShadow=true;root.add(pool);pools.set(key,pool);}
   pool.count=n;batch.transforms.forEach((m,i)=>pool.setMatrixAt(i,m));pool.instanceMatrix.needsUpdate=true;
  }
 }
 function reset(){count=partCount=fallbackCount=0;for(const p of pools.values())p.count=0;}
 return {update,reset,count:()=>count,info:()=>({modularEnemies:count,enemyParts:partCount,enemyFallbackParts:fallbackCount,enemyMeshPools:pools.size,enemyFittedShapes:fitted.size}),dispose(){scene.remove(root);for(const p of pools.values())p.dispose();}};
}

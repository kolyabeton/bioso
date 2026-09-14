import {FRAME_SURFACES,JOINT_SURFACES} from '../../src/creature-frame.js';
import {equipmentLayout} from '../../src/equipment-mounts.js';
import * as T from 'three';
import {loadModel,fittedModel,BODY_MODELS,ARM_MODELS,LEG_MODELS,ORGAN_MODELS} from '../../src/asset-models.js';
import {enemyWeaponPose,enemyAnimationState} from '../../src/enemy-attack-animation.js';
import {assembleEnemy,ENEMY_RECIPES} from '../../src/systems/enemy-assembly.js';
import {specialPoseAmount,summonAssemblyProgress} from '../../src/systems/enemy-specialists.js';

const heads={wanderer:'head-worker',hunter:'head-optic',bastion:'head-sentinel',chimera:'head-mandible',rootwalker:'head-crown',hecaton:'head-knight'};
// A species owns one deterministic body silhouette. Reusing a gameplay chassis
// may change its slots and balance, so visual bodies combine the existing kit
// meshes without mutating the underlying assembly.
export const ENEMY_BODY_APPEARANCES=Object.freeze({
 worker:{core:'body-worker',head:'head-worker',stretch:[1,.98,.92]},
 gatherer:{core:'body-pod',head:'head-mandible',stretch:[1.18,.86,1.08],addons:[['tail-counterweight',.56,[0,.92,-.58],[0,0,0]]]},
 digger:{core:'body-carapace',head:'head-driller',stretch:[1.16,.82,1.24],addons:[['shell-spine',.58,[0,1.2,-.18],[0,Math.PI,0]]]},
 gardener:{core:'body-seed',head:'head-crown',stretch:[.92,1.16,1.04],addons:[['veg-vine',.62,[0,1.25,-.2],[0,0,0]]]},
 'small-hunter':{core:'body-scout',head:'head-optic',size:1.08,stretch:[.8,1.04,1.2],addons:[['sensor-eye',.34,[0,1.38,.34],[0,Math.PI,0]]]},
 'robo-bee':{core:'body-guard',head:'head-optic',size:.96,stretch:[.76,.72,1.22],addons:[['tail-stinger',.48,[0,1.02,-.62],[0,0,0]]]},
 runner:{core:'body-jade',head:'head-worker',size:1.08,stretch:[.72,.88,1.34],addons:[['tail-counterweight',.48,[0,.86,-.62],[0,0,0]]]},
 biter:{core:'body-pod',head:'head-mandible',size:1.08,stretch:[1.2,.7,1.18],addons:[['shell-dome',.5,[0,1.12,-.12],[0,Math.PI,0]]]},
 'quick-digger':{core:'body-scout',head:'head-driller',size:1.12,stretch:[.82,.86,1.34],addons:[['shell-spine',.48,[0,1.18,-.22],[0,Math.PI,0]]]},
 chaser:{core:'body-seed',head:'head-crown',size:1.12,stretch:[.76,.94,1.42],addons:[['tail-stinger',.58,[0,.98,-.66],[0,0,0]]]},
 carapace:{core:'body-carapace',head:'head-sentinel',size:1.34,stretch:[1.28,.86,1.16],addons:[['shoulder-ivory',.48,[-.5,1.24,0],[0,Math.PI,0]],['shoulder-ivory',.48,[.5,1.24,0],[0,0,0]]]},
 crusher:{core:'body-heavy',head:'head-sentinel',size:1.42,stretch:[1.34,1,1.04],addons:[['shell-dome',.72,[0,1.42,-.08],[0,Math.PI,0]]]},
 'heavy-digger':{core:'body-guard',head:'head-driller',size:1.38,stretch:[1.14,1.08,1.18],addons:[['shell-spine',.68,[0,1.48,-.22],[0,Math.PI,0]]]},
 sower:{core:'body-worker',head:'head-crown',size:1.18,stretch:[.96,1.18,.88],addons:[['sensor-antenna',.5,[0,1.58,-.08],[0,Math.PI,0]]]},
 needler:{core:'body-scout',head:'head-optic',size:1.12,stretch:[.78,1.22,.84],addons:[['sensor-dish',.46,[0,1.52,-.1],[0,Math.PI,0]]]},
 'acid-spitter':{core:'body-jade',head:'head-mandible',size:1.24,stretch:[1.04,.82,1.28],addons:[['organ-slime',.56,[0,1.28,-.28],[0,Math.PI,0]]]},
 'shield-bearer':{core:'player-core',head:'head-worker',size:1.08,stretch:[.68,.72,.72]},
 divider:{core:'body-pod',head:'head-mandible',size:1.2,stretch:[1.24,.76,1.08],addons:[['shoulder-jade',.44,[-.42,1.2,-.02],[0,Math.PI,0]],['shoulder-jade',.44,[.42,1.2,-.02],[0,0,0]]]},
 mirrorling:{core:'body-heavy',head:'head-crown',size:1.32,stretch:[.86,1.32,.86]},
 puppeteer:{core:'body-pod',head:'head-knight',size:1.34,stretch:[1.12,1.08,1.02],addons:[['sensor-antenna',.54,[0,1.64,-.18],[0,Math.PI,0]]]},
});
const fallbackGeometry=new T.IcosahedronGeometry(1,1);
const fallbackMaterial=new T.MeshStandardMaterial({color:'#71817b',roughness:.7,metalness:.25});
const armorMaterial=new T.MeshStandardMaterial({color:'#b99b65',roughness:.5,metalness:.45});
const archetypeIds={mass:'worker',fast:'runner',armored:'carapace',ranged:'sower',flying:'robo-bee'};
const archetypes=Object.fromEntries(Object.entries(archetypeIds).map(([role,id])=>[role,assembleEnemy(ENEMY_RECIPES.find(r=>r.id===id))]));
export const SHIELD_VISUAL_SIZE=13.5;
export const SHIELD_VISUAL_MULTIPLIER=2.5;
export const enemyVisualArchetype=e=>['boss','final'].includes(e.kind)?`boss:${e.recipeId}`:e.specialty?`special:${e.recipeId}`:e.recipeId?`recipe:${e.recipeId}`:(e.assemblyRole||e.role||'mass');
// Combat radii as small as .4 are useful for movement, but make the shared
// silhouettes disappear into the detailed ground texture on a phone screen.
// Keep collision and attack ranges untouched and enforce readability here.
export const enemyVisualRadius=e=>['elite','boss','final'].includes(e.kind)?e.radius:Math.max(.8,e.radius??.55);
const visualAssembly=e=>e.assembly||archetypes[e.assemblyRole||e.role||'mass']||archetypes.mass;
/** Local socket layouts shared by gallery and runtime. No item mutation or player rendering. */
export function enemyVisualParts(e,time=0,reducedMotion=false){
 const a=visualAssembly(e),layout=equipmentLayout(a),parts=[],strong=e.kind!=='normal',tierScale=1+(e.tier-1)*.025,shieldBearer=e.specialty==='shield-bearer',mirrorling=e.specialty==='mirrorling';
 const add=(asset,size,position,rotation=[0,Math.PI,0],anchor='center',motion=null)=>parts.push({asset,size,position,rotation,anchor,motion});
 const appearance=ENEMY_BODY_APPEARANCES[e.recipeId]||{core:BODY_MODELS[a.body.key][0],head:heads[a.body.key]},bodyY=shieldBearer?.55:mirrorling?1.08:.95,bodyZ=shieldBearer?-.44:0;
 add(appearance.core,(appearance.size??1.25)*tierScale*(shieldBearer?.48:mirrorling?1.2:1),[0,bodyY,bodyZ]);parts.at(-1).stretch=appearance.stretch;
 add(appearance.head,(shieldBearer?.24:mirrorling?.48:(appearance.headSize??.4))*tierScale,[0,shieldBearer?1.02:mirrorling?1.82:1.55,shieldBearer?-.28:.18]);
 if(!shieldBearer&&!mirrorling)for(const [asset,size,position,rotation]of appearance.addons||[])add(asset,size*tierScale,position,rotation);
 const shieldThrust=shieldBearer?enemyWeaponPose(e,0,time,reducedMotion):null;
 if(!e.flying)a.legs.forEach((p,i)=>{if(!p)return;const {side,position}=layout.legs[i],row=Math.floor(i/2);
  const stride=reducedMotion||e.enemyAttack?.warning||e.fuseRemaining!=null||e.frozenUntil>time||e.territory&&e.territory.state!=='engaged'?0:Math.sin(time*(e.role==='fast'?13:9)+i*Math.PI+row*1.4)*.3;
  const small=shieldBearer?.58:mirrorling?1.04:1;add(LEG_MODELS[p.key][0],.95*small,[position[0]*.68*small,shieldBearer?.48:.7,position[2]*.68*small+(shieldBearer?-.3:0)],[stride,Math.PI,-side*.55],'top');parts.at(-1).floorDistance=shieldBearer?.4:.62;
 });
 if(e.flying)for(const side of [-1,1])add('shell-elytra',1,[side*.58,1.22,-.08],[0,Math.PI,side*(.65+(reducedMotion?0:Math.sin(time*42)*.3))],'center','wing');
 a.arms.forEach((p,i)=>{if(!p)return;const {side,position}=layout.arms[i];
  if(shieldBearer)return;
  const pose=enemyWeaponPose(e,i,time,reducedMotion);
  add(ARM_MODELS[p.key][0],(strong?1.1:p.key==='fangs'?.65:.85)*tierScale,[position[0]*.68+pose.x,position[1]+pose.y,position[2]*.68+pose.z],[-Math.PI/2+pose.pitch,pose.yaw,side*.13+pose.roll],'top');
  parts.at(-1).rotationOrder='YXZ';parts.at(-1).spin=pose.spin;
 });
 a.organs.forEach((p,i)=>{if(p)add(e.specialty&&ORGAN_MODELS[p.key]?.[0]?ORGAN_MODELS[p.key][0]:p.key==='armor'?'shell-elytra':'organ-reactor',(shieldBearer?.32:mirrorling?.78:strong?.7:.48),[(i-1)*.23*(shieldBearer?.55:1),shieldBearer?.78:mirrorling?1.36:1.32,shieldBearer?-.5:-.28]);});
 const special=specialPoseAmount(e,time);
 if(shieldBearer){const thrust=shieldThrust;add('arm-shield',SHIELD_VISUAL_SIZE,[0,1.05,.35+Math.max(0,thrust.z)*1.55],[thrust.pitch*.12,0,thrust.roll*.08],'center','special-shield');parts.at(-1).materialStyle='shield-special';parts.at(-1).visualScale=SHIELD_VISUAL_MULTIPLIER;}
 if(mirrorling){add('shell-elytra',1.72,[0,1.18,.54],[-.12-special*.35,Math.PI,0],'center','special-mirror-main');add('shell-elytra',1.28,[0,2.08,.12],[.08-special*.18,Math.PI,0],'center','special-mirror-mid');add('shell-elytra',.9,[0,2.72,-.02],[.24-special*.12,Math.PI,0],'center','special-mirror-crown');}
 if(e.specialty==='puppeteer')for(const side of [-1,1])add('organ-parasite',.44+special*.08,[side*.38,1.34,-.1],[0,side*Math.PI/2,special*side*.22],'center','special-puppet');
 // Reinforced bosses have an extra visible shoulder plate, not a hidden stats multiplier.
 if(strong)add('shell-elytra',.65,[0,1.38,-.45]);
 if(mirrorling)for(const part of parts)part.materialStyle='mirror';
 if(e.summonAssembly&&time<e.summonAssembly.until){
  const build=summonAssemblyProgress(e,time),assembled=[...parts];parts.length=0;
  const pulse=reducedMotion?1:1+Math.sin(time*28+e.id)*.12;
  add('organ-parasite',.52*pulse,[0,.52,0],[0,time*(reducedMotion?1:5),0],'center','summon-core');
  const emerge=Math.max(0,(build-.12)/.88);
  assembled.forEach((part,i)=>{
   const delay=(i%6)*.055,t=Math.max(0,Math.min(1,(emerge-delay)/(1-delay||1)));if(t<=0)return;
   const settle=1-(1-t)**3,angle=i*2.39996323+(reducedMotion?0:time*4*(1-settle)),spread=1.05+(i%3)*.28;
   part.size*=.2+.8*settle;
   part.position=[part.position[0]*settle+Math.cos(angle)*spread*(1-settle),part.position[1]*settle+(.28+Math.sin(angle*1.7)*.22)*(1-settle),part.position[2]*settle+Math.sin(angle)*spread*(1-settle)];
   part.rotation=[part.rotation[0]+(1-settle)*Math.sin(angle)*1.7,part.rotation[1]+(1-settle)*angle*1.4,part.rotation[2]+(1-settle)*Math.cos(angle)*1.7];
   part.motion='summon-assembly';parts.push(part);
  });
 }
 return parts;
}

/** One pool per GLB mesh/material: every visible enemy remains modular beyond 40. */
export function createEnemyAssemblyView(scene,{load=loadModel}={}){
 const root=new T.Group();root.name='modular-enemies';scene.add(root);
 const sources=new Map(),pending=new Set(),pools=new Map(),batches=new Map(),styledMaterials=new Map(),local=new T.Object3D(),world=new T.Object3D(),matrix=new T.Matrix4();
 let count=0,partCount=0,fallbackCount=0,archetypeCount=0;
 function request(id){if(pending.has(id))return;pending.add(id);load(id).then(source=>{if(source)sources.set(id,source);});}
 function materialFor(material,style){if(!style)return material;const key=`${material.uuid}:${style}`;if(styledMaterials.has(key))return styledMaterials.get(key);const clone=material.clone();if(style==='mirror'){clone.transparent=true;clone.opacity=.48;clone.depthWrite=false;clone.side=T.DoubleSide;if(clone.color)clone.color.lerp(new T.Color('#a8f1e9'),.38);if(clone.emissive){clone.emissive.set('#3da49d');clone.emissiveIntensity=Math.max(.18,clone.emissiveIntensity||0);}}else if(style==='shield-special'){if(clone.color)clone.color.lerp(new T.Color('#d6bb7c'),.62);if(clone.emissive){clone.emissive.set('#4e4229');clone.emissiveIntensity=Math.max(.08,clone.emissiveIntensity||0);}clone.roughness=Math.min(.56,clone.roughness??.56);clone.metalness=Math.max(.45,clone.metalness??0);}styledMaterials.set(key,clone);return clone;}
 const fitted=new Map(),frameBounds=new Map(),framePose=new T.Object3D(),frameFrom=new T.Vector3(),frameTo=new T.Vector3(),frameDirection=new T.Vector3(),frameUp=new T.Vector3(0,1,0);
 function batchMesh(m){
  if(!batches.has(m.key))batches.set(m.key,{...m,transforms:[],count:0});const batch=batches.get(m.key),target=batch.transforms[batch.count]??=new T.Matrix4();target.copy(matrix);batch.count++;
 }
 function structuralSurface(kind,position,scale,direction,style){
  const source=FRAME_SURFACES[kind];framePose.position.copy(position);framePose.scale.set(...scale);framePose.quaternion.identity();if(direction)framePose.quaternion.setFromUnitVectors(frameUp,direction);framePose.updateMatrix();matrix.multiplyMatrices(world.matrix,framePose.matrix);
  batchMesh({...source,material:materialFor(source.material,style),key:`frame:${kind}:${style||'solid'}`});
 }
 function structuralParts(e,parts,time){
  // Scattered summoned parts intentionally have no chassis until they finish assembling.
  if(e.summonAssembly&&time<e.summonAssembly.until)return;
  const body=parts[0],source=sources.get(body?.asset);if(!source)return;
  const key=[body.asset,body.size,...body.stretch||[]].join(':');
  if(!frameBounds.has(key)){
   const fittedBody=fittedModel(source,{size:body.size,rotation:body.rotation});if(body.stretch)fittedBody.scale.multiply(new T.Vector3(...body.stretch));
   frameBounds.set(key,new T.Box3().setFromObject(fittedBody).getSize(new T.Vector3()));
  }
  const dims=frameBounds.get(key),style=body.materialStyle;
  frameFrom.set(...body.position);structuralSurface('liner',frameFrom,[dims.x*.44,dims.y*.48,dims.z*.44],null,style);
  for(const part of parts){
   if(!part.asset.startsWith('leg-')&&!part.asset.startsWith('arm-'))continue;
   if(part.motion==='special-shield')continue;
   const leg=part.asset.startsWith('leg-'),radius=leg?.105:.12;
   frameTo.set(...part.position);frameFrom.set(body.position[0]+Math.sign(frameTo.x)*dims.x*.22,Math.max(body.position[1]-dims.y*.22,Math.min(body.position[1]+dims.y*.22,frameTo.y)),body.position[2]+Math.max(-dims.z*.2,Math.min(dims.z*.2,frameTo.z-body.position[2])));
   frameDirection.subVectors(frameTo,frameFrom);const length=frameDirection.length();if(length<.001)continue;frameDirection.normalize();frameFrom.add(frameTo).multiplyScalar(.5);
   structuralSurface('drive',frameFrom,[radius*.5,length+.18,radius*.5],frameDirection,style);
   frameFrom.copy(frameTo).addScaledVector(frameDirection,-radius*.72);
   for(const key of JOINT_SURFACES)structuralSurface(key,frameFrom,[radius,radius,radius],frameDirection,style);
  }
 }

 function meshParts(part){
  request(part.asset);const source=sources.get(part.asset);
  if(!source){fallbackCount++;const o=new T.Object3D(),arm=part.asset.startsWith('arm-');
   // Weapon GLBs may finish after the body on a cold load. A long canonical
   // drive keeps the socket readable without flashing a giant debug boulder.
   if(arm){const length=part.size*.9;o.scale.set(part.size*.14,length,part.size*.14);o.position.y=part.anchor==='top'?-length*.5:0;}
   else{o.scale.set(part.size*.35,part.size*.5,part.size*.3);o.position.y=part.anchor==='top'?-part.size*.5:0;}
   o.updateMatrix();const pivot=new T.Object3D();pivot.rotation.set(...part.rotation,part.rotationOrder||'XYZ');if(part.spin)pivot.rotateY(part.spin);pivot.updateMatrix();o.matrix.premultiply(pivot.matrix);const surface=arm?FRAME_SURFACES.drive:null,base=part.asset.includes('shell')?armorMaterial:fallbackMaterial;return [{geometry:surface?.geometry||fallbackGeometry,material:materialFor(surface?.material||base,part.materialStyle),matrix:o.matrix,key:`fallback:${arm?'arm:':''}${part.asset}:${part.materialStyle||'solid'}`}];}
  const key=[part.asset,part.size,part.anchor,part.floorDistance,...part.rotation.map((r,i)=>i===0&&part.asset.startsWith('leg-')?0:r)].join(':');
  // Cache neutral leg shape; animated pivot remains a cheap instance transform.
  const rotation=part.asset.startsWith('leg-')?[0,...part.rotation.slice(1)]:part.rotation;
  // Animated wings must never put their frame angle into the fitted-shape cache.
  const animatedPivot=part.asset.startsWith('arm-')||!!part.motion;
  const stableKey=animatedPivot?[part.asset,part.size,part.anchor,part.motion||'arm'].join(':'):key;
  if(!fitted.has(stableKey)){
   const g=fittedModel(source,{size:part.size,anchor:part.anchor,rotation:animatedPivot?[0,0,0]:rotation,floorDistance:part.floorDistance,envelope:part.asset.startsWith('arm-')?[.64,1.1,.45]:undefined});g.updateMatrixWorld(true);const meshes=[];
   g.traverse(o=>{if(o.isMesh)meshes.push({geometry:o.geometry,material:o.material,matrix:o.matrixWorld.clone(),key:`${part.asset}:${meshes.length}`});});fitted.set(stableKey,meshes);
  }
  const meshes=fitted.get(stableKey);return part.materialStyle?meshes.map(m=>({...m,material:materialFor(m.material,part.materialStyle),key:m.key+':'+part.materialStyle})):meshes;
 }
 function update(enemies,player,time,scale=1,reducedMotion=false){
  count=partCount=fallbackCount=0;const visibleArchetypes=new Set();for(const batch of batches.values())batch.count=0;
  for(const e of enemies){if(!e.assembly||e.hp<=0)continue;count++;
   visibleArchetypes.add(enemyVisualArchetype(e));
   world.position.set(e.x,(e.y??0)+(e.flying?1.1+(reducedMotion?0:Math.sin(time*6+e.id)*.12):0),e.z);const aim=enemyAnimationState(e,time)?.attack;
   const facing=e.specialty==='shield-bearer'&&e.specialFacing!=null?e.specialFacing:aim?Math.atan2(aim.dx,aim.dz):Math.atan2(player.x-e.x,player.z-e.z),charge=e.specialty==='puppeteer'&&e.specialAttack?.kind==='puppeteer'?Math.max(0,Math.min(1,(time-e.specialAttack.started)/(e.specialAttack.at-e.specialAttack.started||1))):0,shake=(reducedMotion?.025:.11)*charge;
   if(shake){world.position.x+=Math.sin(time*73+e.id)*shake;world.position.z+=Math.cos(time*61+e.id)*shake;}
   const assemblyScale=e.summonAssembly?1+Math.sin(Math.PI*summonAssemblyProgress(e,time))*.22:1;
   world.rotation.set(0,facing+(reducedMotion?0:Math.sin(time*67+e.id)*.08*charge),Math.sin(time*59+e.id)*shake*.8);world.scale.setScalar(enemyVisualRadius(e)*scale*(e.visualScale??1)*(1+Math.sin(time*42+e.id)*.025*charge)*assemblyScale);world.updateMatrix();
   const visualParts=enemyVisualParts(e,time,reducedMotion);structuralParts(e,visualParts,time);
   for(const part of visualParts){partCount++;local.position.set(...part.position);local.rotation.set(0,0,0);local.scale.set(...(part.stretch||[part.visualScale??1,part.visualScale??1,part.visualScale??1]));
    const meshes=meshParts(part),ready=sources.has(part.asset);
    if(ready&&part.asset.startsWith('leg-'))local.rotation.x=part.rotation[0];
    if(ready&&(part.asset.startsWith('arm-')||part.motion)){local.rotation.set(...part.rotation,part.rotationOrder||'XYZ');if(part.spin)local.rotateY(part.spin);}
    local.updateMatrix();
    for(const m of meshes){matrix.multiplyMatrices(world.matrix,local.matrix).multiply(m.matrix);batchMesh(m);}
   }
  }
  for(const pool of pools.values())pool.count=0;
  for(const [key,batch]of batches){let pool=pools.get(key);const n=batch.count;if(!n)continue;
   if(!pool||pool.instanceMatrix.count<n){if(pool){root.remove(pool);pool.dispose();}pool=new T.InstancedMesh(batch.geometry,batch.material,Math.max(128,2**Math.ceil(Math.log2(n))));pool.instanceMatrix.setUsage(T.DynamicDrawUsage);pool.frustumCulled=false;pool.castShadow=pool.receiveShadow=false;root.add(pool);pools.set(key,pool);}
   pool.count=n;for(let i=0;i<n;i++)pool.setMatrixAt(i,batch.transforms[i]);pool.instanceMatrix.needsUpdate=true;
  }
  archetypeCount=visibleArchetypes.size;
 }
 function reset(){count=partCount=fallbackCount=archetypeCount=0;for(const p of pools.values())p.count=0;}
 return {update,reset,count:()=>count,info:()=>({modularEnemies:count,enemyParts:partCount,enemyFallbackParts:fallbackCount,enemyDrawBatches:[...pools.values()].filter(p=>p.count).length,enemyVisualArchetypes:archetypeCount,enemyMeshPools:pools.size,enemyFittedShapes:fitted.size}),dispose(){scene.remove(root);for(const p of pools.values())p.dispose();for(const material of styledMaterials.values())material.dispose();}};
}

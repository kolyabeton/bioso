import * as T from 'three';
import {affixBonus} from './systems/sets/affixes.js';
import {stats} from './assembly.js';

/** Approved weapon rarity VFX. Presentation state never affects combat. */
export function createRarityVfxView(scene){
 const fury=new Map(),homing=new Map(),burst=new Map(),stationary=new Map(),ringGeometry=new T.TorusGeometry(.23,.035,6,24),pulseGeometry=new T.TorusGeometry(.2,.03,6,24),pulseSpineGeometry=new T.CylinderGeometry(.05,.05,.85,8,1,true);
 const furyMaterial=new T.MeshBasicMaterial({color:0xe95639,transparent:true,opacity:.85,depthWrite:false,toneMapped:false});
 const trailMaterial=new T.LineBasicMaterial({color:0x93f3e8,transparent:true,opacity:.95,depthWrite:false,toneMapped:false});
 function removeFury(id){const item=fury.get(id);if(!item)return;item.arm.remove(item.group);fury.delete(id);}
 function removeBurst(id){const item=burst.get(id);if(!item)return;item.arm.remove(item.group);item.material.dispose();item.spineMaterial.dispose();burst.delete(id);}
 function removeTrail(id){const item=homing.get(id);if(!item)return;scene.remove(item.line);item.line.geometry.dispose();homing.delete(id);}
 function removeStationary(id){const item=stationary.get(id);if(!item)return;item.model.rotation.copy(item.rest);stationary.delete(id);}
 function update(s,hero,shots,height,time,reducedMotion=false){
  const active=new Set();
  if(hero&&s.hp>0&&s.arms.some(p=>p&&affixBonus(p,'woundedFury'))&&s.hp<stats(s).hp*.5){
   for(const part of s.arms.filter(Boolean))if(affixBonus(part,'woundedFury')){
    const arm=hero.userData.arms.get(part.id);if(!arm)continue;active.add(part.id);
    let item=fury.get(part.id);if(item?.arm!==arm){removeFury(part.id);const group=new T.Group();for(const z of [.43,.85]){const ring=new T.Mesh(ringGeometry,furyMaterial);ring.position.z=z;group.add(ring);}arm.add(group);item={arm,group};fury.set(part.id,item);}
    item.group.scale.setScalar(reducedMotion?1:1+.08*Math.sin(time*10));
   }
  }
  for(const id of fury.keys())if(!active.has(id))removeFury(id);
  furyMaterial.opacity=reducedMotion?.72:.7+.22*(.5+.5*Math.sin(time*10));
  const bursting=new Set();
  if(hero&&s.hp>0)for(const part of s.arms.filter(Boolean))if(affixBonus(part,'burst')&&part.affixBurstUntil>time){
   const arm=hero.userData.arms.get(part.id);if(!arm)continue;bursting.add(part.id);
   let item=burst.get(part.id);if(item?.arm!==arm){removeBurst(part.id);const material=new T.MeshBasicMaterial({color:0x91f4e9,transparent:true,opacity:.85,depthWrite:false,toneMapped:false}),spineMaterial=new T.MeshBasicMaterial({color:0x67d9ce,transparent:true,opacity:.4,depthTest:false,depthWrite:false,toneMapped:false,side:T.DoubleSide}),group=new T.Group(),rings=[0,1,2].map(()=>{const ring=new T.Mesh(pulseGeometry,material);group.add(ring);return ring;}),spine=new T.Mesh(pulseSpineGeometry,spineMaterial);spine.rotation.x=Math.PI/2;group.add(spine);arm.add(group);item={arm,group,rings,material,spine,spineMaterial};burst.set(part.id,item);}
   const elapsed=Math.max(0,time-(part.affixBurstUntil-1)),travel=Math.min(1,elapsed/.34);
   item.rings.forEach((ring,i)=>{ring.position.z=.18+Math.max(0,travel-i*.16)*.94;ring.scale.setScalar(i===2?.72:1-i*.12);ring.visible=reducedMotion?i===0:elapsed<.55||i===0;});
   item.material.opacity=reducedMotion?.65:elapsed<.55?.88:.5;
   item.spine.position.z=.2+.42*travel;item.spine.scale.y=reducedMotion?1:Math.max(.12,travel);item.spineMaterial.opacity=reducedMotion?.28:elapsed<.55?.44:.25;
  }
  for(const id of burst.keys())if(!bursting.has(id))removeBurst(id);
  const waiting=new Set();
  if(hero&&s.hp>0&&s.stationaryFor>0)for(const part of s.arms.filter(Boolean))if(affixBonus(part,'stationaryDamage')){
   const arm=hero.userData.arms.get(part.id),model=arm?.children.find(child=>child.userData.assetId?.startsWith('arm-'));
   if(!model)continue;
   waiting.add(part.id);
   let item=stationary.get(part.id);
   if(item?.model!==model){removeStationary(part.id);item={model,rest:model.rotation.clone()};stationary.set(part.id,item);}
   model.rotation.copy(item.rest);
   if(!reducedMotion){
    const strength=Math.min(1,s.stationaryFor/3);
    model.rotation.y+=Math.sin(time*33+part.id*.7)*.18*strength;
    model.rotation.z+=Math.sin(time*41+part.id*1.3)*.1*strength;
   }
  }
  for(const id of stationary.keys())if(!waiting.has(id))removeStationary(id);
  const visible=new Set();
  for(const q of shots){if(!q.w?.homing||q.mode!=='projectile'||q.w.secondary&&q.w.secondary!=='rear'||visible.size>=64)continue;
   visible.add(q.id);let item=homing.get(q.id);
   if(!item){const geometry=new T.BufferGeometry(),array=new Float32Array(12*3);geometry.setAttribute('position',new T.BufferAttribute(array,3));geometry.setDrawRange(0,0);const line=new T.Line(geometry,trailMaterial);line.frustumCulled=false;scene.add(line);item={line,points:[]};homing.set(q.id,item);}
   const point=[q.x,height(q),q.z],last=item.points.at(-1);if(!last||Math.hypot(point[0]-last[0],point[2]-last[2])>.12)item.points.push(point);
   if(item.points.length>12)item.points.shift();const positions=item.line.geometry.attributes.position.array;item.points.forEach((p,i)=>positions.set(p,i*3));item.line.geometry.setDrawRange(0,item.points.length);item.line.geometry.attributes.position.needsUpdate=true;
  }
  for(const id of homing.keys())if(!visible.has(id))removeTrail(id);
 }
 return{update,reset(){for(const id of [...fury.keys()])removeFury(id);for(const id of [...burst.keys()])removeBurst(id);for(const id of [...stationary.keys()])removeStationary(id);for(const id of [...homing.keys()])removeTrail(id);},info:()=>({furyArms:fury.size,burstArms:burst.size,stationaryArms:stationary.size,homingTrails:homing.size})};
}

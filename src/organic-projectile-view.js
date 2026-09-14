import * as T from 'three';
import {CHASSIS_MATERIALS} from './creature-materials.js';
import {createProjectileBodyGeometry,createProjectileShellMaterial} from './enemy-projectile-view.js';
import {enableProjectileFade,projectileOpacity,setProjectileOpacity} from './projectile-fade.js';
import {projectileStyle} from './weapon-visuals.js';

export const isOrganicProjectile=shot=>['seed','acid'].includes(shot.w?.key??shot.mode);

// Reuse the sculpted seed shell and the canonical jade glass, with separate pools
// so these small organic shots retain lighting and surface detail in flight.
export function createOrganicProjectileView(parent,capacity=1000){
 const acid=CHASSIS_MATERIALS.glass.clone();
 acid.name='Acid droplet jade';acid.color.setHex(0x91b943);acid.emissive.setHex(0x668927);
 acid.emissiveIntensity=.45;acid.roughness=.2;acid.metalness=.08;
 const materials={seed:createProjectileShellMaterial({color:0xa9bf78,glow:0xcbe991}),acid};
 const pools=Object.fromEntries(Object.entries(materials).map(([key,material])=>{
  const mesh=enableProjectileFade(new T.InstancedMesh(createProjectileBodyGeometry(key==='seed'?'pod':'droplet'),material,capacity));
  mesh.name=`player-projectile-${key}-body`;mesh.count=0;mesh.frustumCulled=false;
  mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);parent.add(mesh);return [key,mesh];
 }));
 const pose=new T.Object3D(),forward=new T.Vector3(0,0,1),direction=new T.Vector3();
 function reset(){for(const mesh of Object.values(pools))mesh.count=0;}
 return {reset,update(shots,height){
  reset();
  for(const shot of shots){
   const mesh=pools[shot.w?.key??shot.mode];if(!mesh||mesh.count>=capacity)continue;
   const slot=mesh.count++,style=projectileStyle(shot);
   pose.position.set(shot.x,height(shot),shot.z);direction.set(shot.dx,shot.dy??0,shot.dz);
   if(direction.lengthSq()<1e-8)direction.copy(forward);else direction.normalize();
   pose.quaternion.setFromUnitVectors(forward,direction);pose.scale.set(style.width,style.height,style.length);
   pose.updateMatrix();mesh.setMatrixAt(slot,pose.matrix);setProjectileOpacity(mesh,slot,projectileOpacity(shot));
  }
  for(const mesh of Object.values(pools))mesh.instanceMatrix.needsUpdate=true;
 },dispose(){for(const mesh of Object.values(pools)){parent.remove(mesh);mesh.dispose();mesh.geometry.dispose();mesh.material.dispose();}}};
}

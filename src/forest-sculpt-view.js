import * as T from 'three';
import {loadModel} from './asset-models.js';
import {forestPlantMaterial} from './forest-light.js';
import {forestPlacements} from './forest-placements.js';
import {forestSurfaceMaterial} from './forest-surface.js';

/** Real root volumes and exposed bedrock sit inside the authored collision banks. */
export async function addForestSculpture(group,tile,atlas,uniforms,world,work=fn=>fn()){
 const placements=forestPlacements(tile,world);
 for(const [id,anchors] of placements){
  const template=await loadModel(id);if(!template)throw Error('Forest sculpture unavailable: '+id);
  template.updateMatrixWorld(true);
  const meshes=[];template.traverse(o=>{if(o.isMesh)meshes.push(o);});
  for(const o of meshes)await work(()=>{
   const leaves=o.material.name.includes('geometric-leaves'),mint=o.material.name.includes('mint');
   const m=leaves?forestPlantMaterial(o.material,uniforms):mint?o.material.clone():forestSurfaceMaterial(o.material,atlas);
   if(leaves){m.side=T.DoubleSide;m.color.set('#e4e5ce');m.emissive.set('#3c4827');m.emissiveIntensity=.12;}
   const mesh=new T.InstancedMesh(o.geometry,m,anchors.length),pose=new T.Object3D();
   mesh.name=id+(m.name.includes('mint')?'-inlay':'');mesh.userData.sharedPlant=mesh.userData.borderMaterial=true;
   anchors.forEach(({d,scale,rotation,offset},i)=>{
    pose.position.set(d.x+offset[0],offset[1],d.z+offset[2]);pose.rotation.set(0,rotation,0);
    if(Array.isArray(scale))pose.scale.set(...scale);else pose.scale.setScalar(scale);
    pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix.clone().multiply(o.matrixWorld));
   });mesh.computeBoundingSphere();group.add(mesh);
  });
 }
}

import * as T from 'three';
import {environmentPockets} from './environment-pockets.js';
import {environmentProfile} from './environment-profiles.js';
import {loadModel,fittedModel} from './asset-models.js';
import {forestPlantMaterial} from './forest-light.js';
import {forestSurfaceMaterial} from './forest-surface.js';

// Bent three-segment blades, not an alpha card. 84 triangles per tuft.
export function pocketGrassGeometry(){
 const positions=[],colors=[];
 for(let i=0;i<14;i++){
  const a=i*2.39996,h=.45+(i%5)*.13,r=.09+(i%3)*.045;
  const base=new T.Vector3(Math.cos(a)*r,0,Math.sin(a)*r),side=new T.Vector3(-Math.sin(a)*.022,0,Math.cos(a)*.022);
  const vertices=[];
  for(let k=0;k<4;k++){
   const t=k/3,p=base.clone().add(new T.Vector3(Math.cos(a)*t*t*.28,h*(t-.15*t*t),Math.sin(a)*t*t*.28));
   vertices.push(p.clone().addScaledVector(side,-(1-t*.96)),p.clone().addScaledVector(side,1-t*.96));
  }
  for(const j of [0,1,2,1,3,2,2,3,4,3,5,4,4,5,6,5,7,6]){
   const v=vertices[j];positions.push(v.x,v.y,v.z);const light=.65+v.y*.3;
   colors.push(.13*light,.17*light,.08*light);
  }
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;
}

export async function addEnvironmentPockets(group,tile,world,uniforms,atlas,work=fn=>fn()){
 const points=environmentPockets(tile,world),profile=environmentProfile(tile),pose=new T.Object3D();
 for(const kind of ['grass','dry','fern','shrub']){
  const placements=points.filter(p=>p.kind===kind);if(!placements.length)continue;
  const procedural=kind==='grass'||kind==='dry';
  let template;
  if(procedural){template=await work(()=>new T.Mesh(pocketGrassGeometry(),new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,roughness:1})));}
  else{const id=kind==='fern'?'forest-fern-v3':'forest-shrub-v3',source=await loadModel(id);if(!source)throw Error('Undergrowth unavailable: '+id);template=await work(()=>fittedModel(source,{size:1,anchor:'bottom'}));}
  template.updateMatrixWorld(true);
  const height=Math.max(.01,new T.Box3().setFromObject(template).getSize(new T.Vector3()).y);
  const meshes=[];template.traverse(o=>{if(o.isMesh)meshes.push(o);});
  for(const o of meshes)await work(()=>{
   const material=procedural||o.material.name.includes('geometric-leaves')?forestPlantMaterial(o.material,uniforms):forestSurfaceMaterial(o.material,atlas);material.side=T.DoubleSide;
   material.color.set(kind==='dry'?'#ab9765':profile.relief==='nests'?'#b5b492':'#d4d9bf');
   const mesh=new T.InstancedMesh(o.geometry,material,placements.length);mesh.name='environment-pocket-'+kind;
   mesh.userData.sharedPlant=mesh.userData.borderMaterial=true;mesh.userData.ownedGeometry=procedural;
   placements.forEach((p,i)=>{pose.position.set(p.x,world.heightAt(p.x,p.z)??0,p.z);pose.rotation.set(0,p.rotation,0);pose.scale.set(p.size,p.height/height*(procedural?.5:1),p.size);pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix.clone().multiply(o.matrixWorld));});
   mesh.computeBoundingSphere();group.add(mesh);
  });
  if(procedural)template.material.dispose();
 }
}

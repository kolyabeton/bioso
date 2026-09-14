import * as T from 'three';
import {environmentProfile} from './environment-profiles.js';
import {loadModel,fittedModel} from './asset-models.js';
import {forestSurfaceMaterial} from './forest-surface.js';
import {forestPlantMaterial} from './forest-light.js';
import {addEnvironmentGroundDetail} from './environment-ground-detail.js';
import {addEnvironmentPockets} from './environment-pockets-view.js';
import {environmentMetalMaterial} from './environment-metal.js';
import {addScrapyardDressing,isScrapVista} from './scrapyard-dressing.js';

export function environmentPlantMaterial(source,uniforms){
 const m=forestPlantMaterial(source,uniforms),compile=m.onBeforeCompile;
 m.onBeforeCompile=shader=>{compile(shader);shader.vertexShader=shader.vertexShader.replace(')*forestWind;',')*max(forestWind,.18);');};
 m.customProgramCacheKey=()=> 'environment-shared-wind-v1';return m;
}

/** Grounded 3D shoulders share authored obstacle envelopes in both modes. */
export async function addEnvironmentDressing(group,tile,world,atlas,uniforms,foliage=null,work=fn=>fn()){
 const profile=environmentProfile(tile);if(!profile)return;
 await work(()=>addEnvironmentGroundDetail(group,tile,world,profile,atlas));
 await addEnvironmentPockets(group,tile,world,uniforms,atlas,work);
 await work(()=>addScrapyardDressing(group,tile,world,atlas,uniforms,foliage));
 const pose=new T.Object3D();
 const casters=tile.decorations.filter(d=>d.model||d.feature),shadowGeometry=new T.PlaneGeometry(1,1);
 const shadowMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,vertexShader:'varying vec2 p;void main(){p=uv*2.0-1.0;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);}',fragmentShader:'varying vec2 p;void main(){float a=pow(max(0.0,1.0-dot(p,p)),2.0)*.3;gl_FragColor=vec4(.07,.09,.10,a);}'});
 const shadows=new T.InstancedMesh(shadowGeometry,shadowMaterial,casters.length);shadows.name='environment-contact-shadows';shadows.userData.sharedPlant=shadows.userData.ownedGeometry=shadows.userData.borderMaterial=true;
 casters.forEach((d,i)=>{pose.position.set(d.x,(world.heightAt(d.x,d.z)??0)+.025,d.z);pose.rotation.set(-Math.PI/2,0,0);const width=d.feature?d.radius*2.5:d.size*.95;pose.scale.set(width,width*.8,1);pose.updateMatrix();shadows.setMatrixAt(i,pose.matrix);});shadows.computeBoundingSphere();group.add(shadows);
 const ids=new Set([...profile.pieces,...tile.decorations.map(d=>d.model).filter(id=>id?.startsWith('environment-')||id?.startsWith('forest-'))]);
 for(const id of ids){
  const positions=tile.decorations.filter(d=>(d.model===id||d.coverModel===id)&&!(isScrapVista(tile)&&d.feature==='thicket'));
  if(!positions.length)continue;
  const source=await loadModel(id);if(!source)throw Error('Environment model unavailable: '+id);
  const template=await work(()=>fittedModel(source,{size:7,anchor:'bottom'}));template.updateMatrixWorld(true);
  const meshes=[];template.traverse(o=>{if(o.isMesh)meshes.push(o);});
  for(const o of meshes)await work(()=>{
   const plant=o.material.name.includes('geometric-leaves');
   const mint=o.material.name.includes('mint');
   const metal=o.material.name==='environment-aged-metal';
   const cocoon=o.material.name==='environment-cocoon-membrane';
   const m=metal?environmentMetalMaterial(o.material):mint||cocoon?o.material.clone():id.startsWith('forest-')||id.startsWith('environment-')?(plant?forestPlantMaterial(o.material,uniforms):forestSurfaceMaterial(o.material,atlas)):id.startsWith('veg-')?environmentPlantMaterial(o.material,uniforms):o.material.clone();
   if(plant){m.side=T.DoubleSide;m.color.set('#e4e5ce');}
   else if(!mint&&profile.relief==='heaps'){m.color.set('#d5d8d2');m.metalness=.08;m.roughness=.82;}
   else if(!mint&&profile.relief==='nests'){m.color.set('#e0e6ce');m.metalness=0;m.roughness=.88;}
   if(!plant&&!mint){m.emissive.set('#789097');m.emissiveIntensity=.035;}
   if(mint)m.emissiveIntensity=.4;
   if(metal){m.color.set('#657069');m.metalness=.18;m.roughness=.85;m.side=T.DoubleSide;}
   if(isScrapVista(tile)&&!metal&&!mint&&!plant&&!cocoon)m.color.set('#c5bfa9');
   if(cocoon){m.color.set('#a0ac82');m.roughness=.72;m.metalness=0;m.emissive.set('#577b60');m.emissiveIntensity=.13;}
   const mesh=new T.InstancedMesh(o.geometry,m,positions.length);mesh.name='environment-signature-'+id;mesh.userData.sharedPlant=mesh.userData.borderMaterial=true;
   positions.forEach((p,i)=>{pose.position.set(p.x,world.heightAt(p.x,p.z)??0,p.z);pose.rotation.set(0,p.rotation,0);pose.scale.setScalar(p.size/7);pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix.clone().multiply(o.matrixWorld));});mesh.computeBoundingSphere();group.add(mesh);
  });
 }
}

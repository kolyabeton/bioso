import * as T from 'three';

export {projectileOpacity,PROJECTILE_FADE_SECONDS,createProjectileAfterglow} from './projectile-opacity.js';

/** Each mesh must own its geometry; preserve existing material shader customizations. */
export function enableProjectileFade(mesh,{trail=false}={}){
 const material=mesh.material,compile=material.onBeforeCompile,cacheKey=material.customProgramCacheKey();
 let gradient='';if(trail){mesh.geometry.computeBoundingBox();const {min,max}=mesh.geometry.boundingBox;gradient=`vProjectileAlpha*=smoothstep(${min.z.toFixed(6)},${max.z.toFixed(6)},position.z);`;}
 material.transparent=true;material.depthWrite=false;
 material.onBeforeCompile=function(shader,renderer){
  compile.call(this,shader,renderer);
  shader.vertexShader='attribute float projectileAlpha;\nvarying float vProjectileAlpha;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvProjectileAlpha=projectileAlpha;'+gradient);
  shader.fragmentShader='varying float vProjectileAlpha;\n'+shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a*=vProjectileAlpha;');
 };
 material.customProgramCacheKey=()=>cacheKey+'-projectile-fade-v2-'+gradient;material.needsUpdate=true;
 return mesh;
}
export function setProjectileOpacity(mesh,index,alpha){
 let attribute=mesh.geometry.getAttribute('projectileAlpha');
 if(!attribute||attribute.count<mesh.instanceMatrix.count){
  const values=new Float32Array(mesh.instanceMatrix.count).fill(1);
  if(attribute)values.set(attribute.array);
  attribute=new T.InstancedBufferAttribute(values,1).setUsage(T.DynamicDrawUsage);mesh.geometry.setAttribute('projectileAlpha',attribute);
 }
 attribute.setX(index,alpha);attribute.needsUpdate=true;
}

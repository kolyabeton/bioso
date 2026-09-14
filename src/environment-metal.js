/** Matte oxidised steel: shared procedural wear, no extra texture or pass. */
export function environmentMetalMaterial(source){
 const m=source.clone();m.color.set('#657069');m.metalness=.18;m.roughness=.85;
 m.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 agedMetalPoint;').replace('#include <begin_vertex>','#include <begin_vertex>\nagedMetalPoint=position;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
   varying vec3 agedMetalPoint;
   float metalHash(vec3 p){return fract(sin(dot(p,vec3(17.13,41.7,93.1)))*43758.5453);}
   float metalNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
    return mix(mix(mix(metalHash(i),metalHash(i+vec3(1,0,0)),f.x),mix(metalHash(i+vec3(0,1,0)),metalHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(metalHash(i+vec3(0,0,1)),metalHash(i+vec3(1,0,1)),f.x),mix(metalHash(i+vec3(0,1,1)),metalHash(i+vec3(1,1,1)),f.x),f.y),f.z);
   }
  `).replace('#include <color_fragment>',`#include <color_fragment>
   float wear=metalNoise(agedMetalPoint*3.2)*.7+metalNoise(agedMetalPoint*14.0)*.3;
   float rust=smoothstep(.45,.7,wear);
   float fleck=metalNoise(agedMetalPoint*70.0);
   diffuseColor.rgb=mix(diffuseColor.rgb*(.63+fleck*.3),vec3(.115,.055,.025)*(.6+fleck*.4),rust*.8);
  `).replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(.76,.96,rust);');
 };m.customProgramCacheKey=()=> 'environment-aged-metal-v1';return m;
}

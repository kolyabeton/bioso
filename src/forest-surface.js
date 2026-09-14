/** Continuous material projection, distinct ceramic/bark roughness and micro-relief. */
export function forestSurfaceMaterial(source,atlas){
 const m=source.clone();m.map=atlas;m.bumpMap=atlas;m.bumpScale=.07;
 m.color.set('#e7e8df');m.roughness=.94;m.metalness=.035;
 m.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 forestSurfacePoint;varying vec3 forestSurfaceNormal;')
   .replace('#include <begin_vertex>','#include <begin_vertex>\nforestSurfacePoint=position;forestSurfaceNormal=normal;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 forestSurfacePoint;varying vec3 forestSurfaceNormal;')
   .replace('#include <map_fragment>',`
    vec2 forestCell=floor(clamp(vMapUv,vec2(.001),vec2(.999))*2.0)*.5;
    vec3 fw=pow(abs(forestSurfaceNormal),vec3(5.0));fw/=max(.001,fw.x+fw.y+fw.z);
    vec3 sp=forestSurfacePoint*.25;
    vec3 pigment=texture2D(map,forestCell+.02+fract(sp.yz)*.46).rgb*fw.x
     +texture2D(map,forestCell+.02+fract(sp.xz)*.46).rgb*fw.y
     +texture2D(map,forestCell+.02+fract(sp.xy)*.46).rgb*fw.z;
    diffuseColor.rgb*=pigment;
    float forestSurfaceHeight=dot(pigment,vec3(.2126,.7152,.0722));
   `)
   .replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
    float ceramic=(1.0-step(.5,vMapUv.x))*(1.0-step(.5,vMapUv.y));
    roughnessFactor=mix(.95,.68+forestSurfaceHeight*.14,ceramic);
   `)
   .replace('#include <normal_fragment_maps>',`
    normal=perturbNormalArb(-vViewPosition,normal,vec2(dFdx(forestSurfaceHeight),dFdy(forestSurfaceHeight))*.07,faceDirection);
   `);
 };m.customProgramCacheKey=()=> 'forest-continuous-surface-v4';return m;
}

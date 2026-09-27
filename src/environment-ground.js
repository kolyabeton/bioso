import * as T from 'three';
import {environmentSurfaceCode} from './environment-surfaces.js';
import {obstacleHeight,obstacleProfile,obstacleScale} from './architecture-collision.js';
export function environmentGroundShader(shader,profile,stone,materials,tile,world,baked=null,atlas=null,staticShadow=null,geometryShadows=false,bakedNeighbors={},lite=false){
 shader.uniforms.envStone={value:stone};shader.uniforms.envMaterials={value:materials};
 shader.uniforms.envAtlas={value:atlas};
 shader.uniforms.envOrigin={value:new T.Vector2(tile.x,tile.z)};
 const casters=tile.decorations.filter(d=>d.environmentSignature||d.decorationKind==='structure'||d.feature==='thicket').sort((a,b)=>(b.environmentSignature?1:0)-(a.environmentSignature?1:0)).slice(0,8);
 shader.uniforms.envCasters={value:Array.from({length:8},(_,i)=>{const d=casters[i];return d?new T.Vector4(d.x,d.z,(obstacleProfile(d)?.radius??.35)*obstacleScale(d),obstacleHeight(d)):new T.Vector4();})};
 if(baked){
  shader.uniforms.envBakedLight={value:baked};
  shader.uniforms.envBakedWest={value:bakedNeighbors.west||baked};shader.uniforms.envBakedEast={value:bakedNeighbors.east||baked};
  shader.uniforms.envBakedNorth={value:bakedNeighbors.north||baked};shader.uniforms.envBakedSouth={value:bakedNeighbors.south||baked};
  shader.uniforms.envBakedNeighbors={value:new T.Vector4(Number(!!bakedNeighbors.west),Number(!!bakedNeighbors.east),Number(!!bakedNeighbors.north),Number(!!bakedNeighbors.south))};
  shader.uniforms.envBakedFadeEdges={value:new T.Vector4(Number(!!bakedNeighbors.fade?.west),Number(!!bakedNeighbors.fade?.east),Number(!!bakedNeighbors.fade?.north),Number(!!bakedNeighbors.fade?.south))};
 }
 if(staticShadow)shader.uniforms.envStaticShadow={value:staticShadow};
 shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 envPosition;').replace('#include <begin_vertex>','#include <begin_vertex>\nenvPosition=(modelMatrix*vec4(position,1.0)).xyz;');
 shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
 varying vec3 envPosition;uniform sampler2D envStone;uniform sampler2D envMaterials;uniform sampler2D envAtlas;uniform vec2 envOrigin;uniform vec4 envCasters[8];
 ${baked?'uniform sampler2D envBakedLight;uniform sampler2D envBakedWest;uniform sampler2D envBakedEast;uniform sampler2D envBakedNorth;uniform sampler2D envBakedSouth;uniform vec4 envBakedNeighbors;uniform vec4 envBakedFadeEdges;':''}
 ${staticShadow?'uniform sampler2D envStaticShadow;':''}
 ${environmentSurfaceCode(profile,tile,world,{lite})}
 `).replace('#include <color_fragment>',`#include <color_fragment>
 vec2 ep=envPosition.xz;
 vec4 surface=envBlendedSurface(ep);
 diffuseColor.rgb=surface.rgb;float envHeight=surface.a;
 float envVisibility=1.0;
 ${baked?`vec2 envLocal=ep-envOrigin;
 float envVisibilitySum=texture2D(envBakedLight,envLocal*vec2(1.0,-1.0)/128.0+.5).r;
 float envVisibilityWeight=1.0;
 float envWestWeight=envBakedNeighbors.x*smoothstep(22.0,32.0,-envLocal.x);
 float envEastWeight=envBakedNeighbors.y*smoothstep(22.0,32.0,envLocal.x);
 float envNorthWeight=envBakedNeighbors.z*smoothstep(22.0,32.0,-envLocal.y);
 float envSouthWeight=envBakedNeighbors.w*smoothstep(22.0,32.0,envLocal.y);
 envVisibilitySum+=texture2D(envBakedWest,(ep-(envOrigin+vec2(-64.0,0.0)))*vec2(1.0,-1.0)/128.0+.5).r*envWestWeight;
 envVisibilitySum+=texture2D(envBakedEast,(ep-(envOrigin+vec2(64.0,0.0)))*vec2(1.0,-1.0)/128.0+.5).r*envEastWeight;
 envVisibilitySum+=texture2D(envBakedNorth,(ep-(envOrigin+vec2(0.0,-64.0)))*vec2(1.0,-1.0)/128.0+.5).r*envNorthWeight;
 envVisibilitySum+=texture2D(envBakedSouth,(ep-(envOrigin+vec2(0.0,64.0)))*vec2(1.0,-1.0)/128.0+.5).r*envSouthWeight;
 envVisibilityWeight+=envWestWeight+envEastWeight+envNorthWeight+envSouthWeight;
 envVisibility=envVisibilitySum/envVisibilityWeight;
 float envEdgeFade=max(max(envBakedFadeEdges.x*smoothstep(22.0,32.0,-envLocal.x),envBakedFadeEdges.y*smoothstep(22.0,32.0,envLocal.x)),max(envBakedFadeEdges.z*smoothstep(22.0,32.0,-envLocal.y),envBakedFadeEdges.w*smoothstep(22.0,32.0,envLocal.y)));
 envVisibility=mix(envVisibility,1.0,envEdgeFade);`:geometryShadows?'':`
 for(int i=0;i<8;i++){
  vec4 caster=envCasters[i];vec2 delta=ep-caster.xy-vec2(.6,.6)*caster.w;
  vec2 along=vec2(dot(delta,vec2(.707,.707)),dot(delta,vec2(-.707,.707)));
  along/=max(vec2(.01),vec2(caster.z+caster.w*.5,caster.z));
  float shade=(1.0-smoothstep(.62,1.16,length(along)))*step(.1,caster.z);
  ${profile.relief==='roots'||profile.relief==='terraces'?'shade*=.72+.28*smoothstep(.2,.7,envGrain(ep*1.9));':''}
  envVisibility=min(envVisibility,1.0-shade*.76);
 }`}
 ${staticShadow?`vec2 shadowUV=(ep-envOrigin)*vec2(1.0,-1.0)/80.0+.5;float visibility=0.0;
 for(int sx=-1;sx<=1;sx++)for(int sy=-1;sy<=1;sy++)visibility+=texture2D(envStaticShadow,shadowUV+vec2(float(sx),float(sy))*.0008).r/9.0;
 envVisibility=mix(.12,1.0,visibility);
 // Broad broken canopy shade complements the fine baked leaf silhouettes.
 float canopy=envFbm(ep*.105+vec2(11.7,3.2));
 envVisibility*=mix(.30,1.0,smoothstep(.30,.60,canopy));`:''}
 `);
 shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
 vec3 ex=dFdx(-vViewPosition),ey=dFdy(-vViewPosition);
 vec3 erx=cross(ey,normal),ery=cross(normal,ex);float edet=dot(ex,erx);
 normal=normalize(abs(edet)*normal-sign(edet)*(dFdx(envHeight)*erx+dFdy(envHeight)*ery)*${staticShadow?'.3':'.12'});`);
 shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_begin>',T.ShaderChunk.lights_fragment_begin.replace('getDirectionalLightInfo( directionalLight, directLight );','getDirectionalLightInfo( directionalLight, directLight );\ndirectLight.color *= envVisibility;'));
}

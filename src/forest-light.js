import * as T from 'three';
export function createForestUniforms(){return{forestTime:{value:0},forestWind:{value:0},forestHero:{value:new T.Vector2()},forestMotion:{value:1},forestCanopies:{value:Array.from({length:8},()=>new T.Vector4(0,0,0,0))}};}
/** Adds light/depth to the existing atlas pass; no fullscreen buffer or texture. */
export function forestGroundShader(shader,u,ground,materials=ground,authored=true,baked=null,origin=[0,0]){
 Object.assign(shader.uniforms,u);
 shader.uniforms.forestGround={value:ground};
 shader.uniforms.forestMaterials={value:materials};
 if(baked){shader.uniforms.forestBakedLight={value:baked};shader.uniforms.forestTileOrigin={value:new T.Vector2(...origin)};}
 shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 forestPosition;').replace('#include <begin_vertex>','#include <begin_vertex>\nforestPosition=(modelMatrix*vec4(position,1.0)).xyz;');
 shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
 varying vec3 forestPosition; uniform sampler2D forestGround; uniform sampler2D forestMaterials; uniform vec2 forestHero; uniform float forestTime; uniform float forestWind; uniform float forestMotion;uniform vec4 forestCanopies[8];
 ${baked?'uniform sampler2D forestBakedLight;uniform vec2 forestTileOrigin;':''}
 float forestHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float forestNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(forestHash(i),forestHash(i+vec2(1,0)),f.x),mix(forestHash(i+vec2(0,1)),forestHash(i+vec2(1,1)),f.x),f.y);}
 vec3 forestStone(vec2 uv){
  vec2 f=fract(uv),q=fract(uv+.5);
  float edge=min(min(f.x,1.0-f.x),min(f.y,1.0-f.y));
  return mix(texture2D(forestGround,q).rgb,texture2D(forestGround,f).rgb,smoothstep(.0,.12,edge));
 }
 vec3 forestMaterialSample(vec2 uv,vec2 offset){
  vec2 f=fract(uv),q=fract(uv+.5);float edge=min(min(f.x,1.0-f.x),min(f.y,1.0-f.y));
  return mix(texture2D(forestMaterials,q*.46+offset).rgb,texture2D(forestMaterials,f*.46+offset).rgb,smoothstep(0.0,.14,edge));
 }`)
 .replace('#include <color_fragment>',`#include <color_fragment>
 vec2 fp=forestPosition.xz;
 vec2 stoneUV=fp*${authored?'.07':'.11'};
 vec3 paving=forestStone(stoneUV);
 vec3 forestSoil=forestMaterialSample(fp*.28,vec2(.52,.52));
 vec3 bedrock=forestMaterialSample(fp*.085+vec2(.32,.18),vec2(.02,.52));
 float forestPatch=forestNoise(fp*.085)+forestNoise(fp*.22)*.22;
 float brokenEdge=forestNoise(fp*.8)*.12;
 float stonePatch=smoothstep(.38,.62,forestPatch+brokenEdge);
 vec2 localForest=mod(fp+32.0,64.0)-32.0;
 float pathCoverage=1.0-smoothstep(3.0,7.0,abs(localForest.x-sin(localForest.y*.13)*1.2));
 ${authored?'stonePatch=max(stonePatch,pathCoverage*.86);':''}
 float rockPatch=smoothstep(.73,.95,forestPatch-brokenEdge);
 diffuseColor.rgb=mix(forestSoil*.85,paving,stonePatch);
 diffuseColor.rgb=mix(diffuseColor.rgb,bedrock,rockPatch*.68);
 ${baked?`float beyondForest=max(abs(fp.x-forestTileOrigin.x),abs(fp.y-forestTileOrigin.y))-32.0;
 diffuseColor.rgb=mix(diffuseColor.rgb,forestSoil*.72,smoothstep(.5,9.0,beyondForest));`:''}
 // Remove the warm photographic cast before applying the real warm key light.
 // Keep this correction exclusive to the authored/PBR Forest, not mission atlases.
 ${baked?`float stoneLuma=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
 diffuseColor.rgb=mix(vec3(stoneLuma),diffuseColor.rgb,.56)*vec3(.94,1.0,1.07);
 diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.16,.165,.16),.12);`:''}
 vec3 forestBaseColor=diffuseColor.rgb;
 ${baked?'float forestBakedVisibility=texture2D(forestBakedLight,(fp-forestTileOrigin)*vec2(1.0,-1.0)/128.0+.5).r;':''}
 // Nonperiodic canopy light: broad sun openings with a fine leaf edge, no sine stripes.
 float drift=forestTime*.016*forestMotion;
 float canopy=forestNoise(fp*.07+vec2(drift,0))*.72+forestNoise(fp*.3+vec2(drift*.8,0))*.28;
 float light=${authored?'.62+smoothstep(.33,.62,canopy)*.38':'smoothstep(.33,.62,canopy)'};
 float luminance=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
 diffuseColor.rgb=mix(vec3(luminance),diffuseColor.rgb,.83);
 diffuseColor.rgb*=mix(vec3(.53,.65,.74),vec3(1.25,1.12,.89),light);
 float castShadow=0.0;
 for(int i=0;i<8;i++){
  vec4 canopyCaster=forestCanopies[i];
  vec2 shadowPoint=fp-canopyCaster.xy-vec2(.68,.72)*canopyCaster.w;
  float radius=max(.1,canopyCaster.z);
  float silhouette=1.0-smoothstep(radius*.48,radius*1.16+forestNoise(fp*.85)*.8,length(shadowPoint));
  float leafBreaks=${authored?'.42+.58*smoothstep(.24,.7,forestNoise(fp*2.2+vec2(drift,0)))':'1.0'};
  castShadow=max(castShadow,silhouette*leafBreaks*step(.1,canopyCaster.z));
 }
 diffuseColor.rgb*=mix(vec3(1),vec3(.51,.61,.7),castShadow*.72);
 float distanceFill=smoothstep(6.0,33.0,forestHero.y-fp.y)*.13;
 diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.28,.34,.37),distanceFill);
 ${baked?'diffuseColor.rgb=forestBaseColor;':''}`);
 if(baked){
  // Only the direct sun is shadowed; hemisphere fill keeps shade cool and readable.
  shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_begin>',T.ShaderChunk.lights_fragment_begin.replace('getDirectionalLightInfo( directionalLight, directLight );','getDirectionalLightInfo( directionalLight, directLight );\ndirectLight.color *= forestBakedVisibility;'));
  shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nvBumpMapUv=position.xz*.07;');
 }
}
/** Wind and nearby-player bending share uniforms across all forest plant batches. */
export function forestPlantMaterial(material,u){
 const m=material.clone();m.roughness=1;m.metalness=0;m.normalMap=m.metalnessMap=m.roughnessMap=m.emissiveMap=null;m.emissiveIntensity=0;m.color?.multiply(new T.Color('#a0a58d'));
 m.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,u);
  shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
 uniform float forestTime;uniform float forestWind;uniform float forestMotion;uniform vec2 forestHero;`)
  .replace('#include <project_vertex>',`#include <project_vertex>
 #ifdef USE_INSTANCING
 vec3 forestAnchor=(modelMatrix*instanceMatrix*vec4(0.0,0.0,0.0,1.0)).xyz;
 vec2 away=forestAnchor.xz-forestHero;
 float reaction=exp(-dot(away,away)*.22);
 float bend=max(0.0,transformed.y+.4)*length(instanceMatrix[1].xyz)*.085*forestMotion;
 vec2 sway=vec2(.87,.49)*(sin(forestTime*1.9+forestAnchor.x*.4+forestAnchor.z*.25)*.4+.6)*forestWind;
 vec3 offset=vec3((sway+away/max(length(away),.1)*reaction*.9).x,0.0,(sway+away/max(length(away),.1)*reaction*.9).y)*bend;
 mvPosition.xyz+=(viewMatrix*vec4(offset,0.0)).xyz;
 gl_Position=projectionMatrix*mvPosition;
 #endif`);
 };m.customProgramCacheKey=()=> 'forest-wind-v1';return m;
}

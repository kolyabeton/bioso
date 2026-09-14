import * as T from 'three';

// One light-space depth bake per streamed cell. Static scenery receives its own
// shadows, including vertical walls and raised terrain; no per-frame shadow pass.
export const ENVIRONMENT_SUN = Object.freeze({x:-45,y:58,z:-35});
const SIZE=1024;
export function bakeEnvironmentLight(...args){const steps=lightBakeSteps(...args);let step;do{step=steps.next();}while(!step.done);return step.value;}
export async function bakeEnvironmentLightAsync(renderer,group,tile,options,work){
 const steps=lightBakeSteps(renderer,group,tile,{...options,incremental:true});
 let stage='lighting-prepare';
 try{while(true){const step=await work(Object.assign(()=>steps.next(),{workLabel:stage}));if(step.done)return step.value;stage=step.value?.stage||'lighting-prepare';
  if(step.value?.compile)await work(Object.assign(()=>renderer.compileAsync(step.value.compile,step.value.camera),{workLabel:'lighting-compile'}));
 }}catch(error){steps.return();throw error;}
}
function* lightBakeSteps(renderer,group,tile,{sun=ENVIRONMENT_SUN,skipReceiver=null,incremental=false}={}){
 const target=new T.WebGLRenderTarget(SIZE,SIZE,{depthBuffer:true,stencilBuffer:false,minFilter:T.NearestFilter,magFilter:T.NearestFilter});
 target.texture.colorSpace=T.NoColorSpace;target.texture.generateMipmaps=false;
 const scene=new T.Scene(),camera=new T.OrthographicCamera(-53,53,53,-53,1,240);
 camera.position.set(tile.x+sun.x*1.5,sun.y*1.5,tile.z+sun.z*1.5);
 camera.lookAt(tile.x,0,tile.z);camera.updateMatrixWorld();
 const matrix=new T.Matrix4().set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1).multiply(camera.projectionMatrix).multiply(camera.matrixWorldInverse);
 const materials=[];group.updateMatrixWorld(true);
 const originals=[];group.traverse(o=>{if(o.isMesh)originals.push(o);});
 let complete=false;try{
 for(const o of originals){
  if(!o.visible||o.name.includes('shadow')||o.userData.decor)continue;
  const source=Array.isArray(o.material)?o.material:[o.material];
  if(source.some(m=>!m.isMeshStandardMaterial))continue;
  const depth=source.map(m=>{
   const d=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,side:T.DoubleSide,map:m.alphaTest>0?m.map:null,alphaTest:m.alphaTest});
   if(m.alphaTest>0&&m.emissiveMap===m.map){
    d.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
     if(max(diffuseColor.r,max(diffuseColor.g,diffuseColor.b))<.035)discard;`);};
   }
   materials.push(d);return d;
  });
  const material=Array.isArray(o.material)?depth:depth[0];
  const mesh=o.isInstancedMesh?new T.InstancedMesh(o.geometry,material,o.count):new T.Mesh(o.geometry,material);
  if(o.isInstancedMesh)mesh.instanceMatrix=o.instanceMatrix.clone();
  mesh.matrix.copy(o.matrixWorld);mesh.matrixAutoUpdate=false;mesh.frustumCulled=false;scene.add(mesh);yield;
 }
 scene.updateMatrixWorld(true);
 if(incremental&&renderer.compileAsync)for(const mesh of scene.children)yield {compile:mesh,camera};
 const draws=incremental&&scene.children.length?scene.children:[scene];let first=true;
 for(const draw of draws){
  yield {stage:'lighting-draw:'+draw.name};
  const previous=renderer.getRenderTarget(),color=renderer.getClearColor(new T.Color()),alpha=renderer.getClearAlpha(),auto=renderer.autoClear;
  try{renderer.setRenderTarget(target);renderer.setClearColor(0xffffff,1);renderer.autoClear=false;if(first){renderer.clear();first=false;}renderer.render(draw,camera);}
  finally{renderer.setRenderTarget(previous);renderer.setClearColor(color,alpha);renderer.autoClear=auto;}
  yield;
 }
 const tuned=new Set();
 group.traverse(o=>{if(!o.isMesh||o===skipReceiver)return;for(const m of Array.isArray(o.material)?o.material:[o.material]){
  if(!m.isMeshStandardMaterial||tuned.has(m))continue;tuned.add(m);
  const compile=m.onBeforeCompile,key=m.customProgramCacheKey();
  m.onBeforeCompile=shader=>{
   compile(shader,renderer);
   shader.uniforms.cellSunDepth={value:target.texture};shader.uniforms.cellSunMatrix={value:matrix};
   shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform mat4 cellSunMatrix;varying vec4 cellSunCoord;')
    .replace('#include <project_vertex>',`#include <project_vertex>
     vec4 cellPoint=vec4(transformed,1.0);
     #ifdef USE_INSTANCING
      cellPoint=instanceMatrix*cellPoint;
     #endif
     cellSunCoord=cellSunMatrix*modelMatrix*cellPoint;`);
   shader.fragmentShader=shader.fragmentShader.replace('#include <packing>',`#include <packing>
    uniform sampler2D cellSunDepth;varying vec4 cellSunCoord;
    float cellSunVisibility(){
     vec3 q=cellSunCoord.xyz/cellSunCoord.w;
     if(q.x<=0.0||q.y<=0.0||q.x>=1.0||q.y>=1.0||q.z>=1.0)return 1.0;
     float visibility=0.0;
     float bias=.00055+min(.0015,abs(dFdx(q.z))+abs(dFdy(q.z)));
     for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){
      float depth=unpackRGBAToDepth(texture2D(cellSunDepth,q.xy+vec2(float(x),float(y))/${SIZE}.0));
      visibility+=step(q.z-bias,depth)/9.0;
     }
     return mix(.055,1.0,visibility);
    }`);
   // Ground already expands this chunk for its material-height shading.
   shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_begin>',T.ShaderChunk.lights_fragment_begin)
    .replace('getDirectionalLightInfo( directionalLight, directLight );','getDirectionalLightInfo( directionalLight, directLight );\ndirectLight.color *= cellSunVisibility();');
  };
  m.customProgramCacheKey=()=>key+'-cell-depth-v1';m.needsUpdate=true;
 }});
 complete=true;return target;
 }finally{scene.traverse(o=>{if(o.isInstancedMesh)o.dispose();});materials.forEach(m=>m.dispose());if(!complete)target.dispose();}
}

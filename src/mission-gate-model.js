import * as T from 'three';
import {fittedModel} from './asset-models.js';

function ceramicLeafMaterial(source,width){
 const material=source.clone();
 material.name='arch-gate-ceramic-leaves';
 material.onBeforeCompile=shader=>{
  shader.uniforms.gateWidth={value:width};
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float gateWidth; varying vec3 gatePosition;')
   .replace('#include <begin_vertex>','#include <begin_vertex>\ngatePosition=position/gateWidth;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
   varying vec3 gatePosition;
   float ceramicGateLeaf(){
    float x=abs(gatePosition.x),top=.575+.055*(1.0-smoothstep(0.0,.235,x));
    return (1.0-step(.235,x))*step(.055,gatePosition.y)*(1.0-step(top,gatePosition.y));
   }
   vec2 gateCeramicUV(){
    // Existing cream ceramic island in the authored 512px gate atlas.
    // Mirror its interior to keep wear continuous without introducing the landscape.
    vec2 uv=vec2((gatePosition.x+.235)/.47,(gatePosition.y-.055)/.575);
    uv=1.0-abs(mod(uv*vec2(2.0,3.0),2.0)-1.0);
    return (vec2(382.5,120.5)+uv*vec2(37.0,15.0))/512.0;
   }`);
  // All PBR channels sample the same original ceramic region. Keep the authored
  // colour, roughness, metalness, normals and emission response rather than overriding them.
  for(const [chunk,uv] of [['map_fragment','vMapUv'],['roughnessmap_fragment','vRoughnessMapUv'],['metalnessmap_fragment','vMetalnessMapUv'],['normal_fragment_maps','vNormalMapUv'],['emissivemap_fragment','vEmissiveMapUv']]){
   const prefix=chunk==='map_fragment'?'float gateLeaf=ceramicGateLeaf(); vec2 gateUV=gateCeramicUV();\n':'';
   shader.fragmentShader=shader.fragmentShader.replace('#include <'+chunk+'>',prefix+T.ShaderChunk[chunk].replaceAll(uv,'mix('+uv+',gateUV,gateLeaf)'));
  }
 };
 material.customProgramCacheKey=()=> 'arch-gate-authored-ceramic-v2';
 return material;
}

// Split the authored mesh at its centre seam, retaining UVs, normals and PBR material.
// Intersection vertices interpolate every attribute; triangles are never discarded at the cut.
export function bisectGateGeometry(geometry){
 const source=geometry.index?geometry.toNonIndexed():geometry,keys=Object.keys(source.attributes);
 const components=Object.fromEntries(keys.map(k=>[k,source.attributes[k].itemSize]));
 const outputs=[{},{}];for(const output of outputs)for(const key of keys)output[key]=[];
 const vertex=i=>Object.fromEntries(keys.map(key=>{const a=source.attributes[key];return[key,Array.from({length:a.itemSize},(_,c)=>a.getComponent(i,c))];}));
 const mix=(a,b,t)=>Object.fromEntries(keys.map(key=>[key,a[key].map((v,c)=>v+(b[key][c]-v)*t)]));
 for(let i=0;i<source.attributes.position.count;i+=3){
  const triangle=[vertex(i),vertex(i+1),vertex(i+2)];
  for(const [slot,side] of [-1,1].entries()){
   const polygon=[];
   for(let j=0;j<3;j++){
    const a=triangle[j],b=triangle[(j+1)%3],insideA=a.position[0]*side>=0,insideB=b.position[0]*side>=0;
    if(insideA)polygon.push(a);
    if(insideA!==insideB)polygon.push(mix(a,b,-a.position[0]/(b.position[0]-a.position[0])));
   }
   for(let j=1;j<polygon.length-1;j++)for(const v of [polygon[0],polygon[j],polygon[j+1]])for(const key of keys)outputs[slot][key].push(...v[key]);
  }
 }
 if(source!==geometry)source.dispose();
 return outputs.map(output=>{const g=new T.BufferGeometry();for(const key of keys)g.setAttribute(key,new T.Float32BufferAttribute(output[key],components[key]));g.normalizeNormals();g.computeBoundingBox();g.computeBoundingSphere();return g;});
}

export function prepareGateModel(template,width){
 const fitted=fittedModel(template,{size:width,anchor:'bottom'});fitted.updateMatrixWorld(true);
 const halves=[new T.Group(),new T.Group()],owned=[],materials=new Map();
 const paint=source=>{if(!materials.has(source))materials.set(source,ceramicLeafMaterial(source,width));return materials.get(source);};
 fitted.traverse(mesh=>{
  if(!mesh.isMesh)return;
  const geometry=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld),parts=bisectGateGeometry(geometry);geometry.dispose();
  const material=Array.isArray(mesh.material)?mesh.material.map(paint):paint(mesh.material);
  parts.forEach((geometry,i)=>{owned.push(geometry);const copy=new T.Mesh(geometry,material);copy.name='arch-gate';copy.userData.assetId='arch-gate';halves[i].add(copy);});
 });
 return{halves,dispose(){owned.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}

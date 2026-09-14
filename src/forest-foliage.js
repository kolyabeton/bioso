import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {forestPlantMaterial} from './forest-light.js';

// Leaf sprays occupy real angled geometry, not camera-facing bush billboards.
// One geometry/material batch per tile; collider footprints remain authoritative.
export function forestFoliageGeometry(fern=false){
 const parts=[];
 for(let i=0;i<(fern?9:24);i++){
  const angle=i*2.39996,ring=fern?0:i%3,cell=fern?1:[0,2,3][i%3];
  const width=fern?.58:.48, height=fern?.8:.58+ring*.15;
  const g=new T.PlaneGeometry(width,height,1,3);g.translate(0,height/2,0);
  const p=g.attributes.position,uv=g.attributes.uv;
  for(let v=0;v<p.count;v++){
   const t=p.getY(v)/height;
   p.setZ(v,Math.sin(t*Math.PI*.7)*(fern?.38:.15));
   uv.setXY(v,cell%2*.5+.012+uv.getX(v)*.476,(cell<2?.5:0)+.012+uv.getY(v)*.476);
  }
  g.rotateX(fern?-.82:-.58-ring*.16);g.rotateY(angle);
  g.translate(Math.cos(angle)*(fern?.03:ring*.1),fern?0:(i%4)*.09,Math.sin(angle)*(fern?.03:ring*.1));
  parts.push(g);
 }
 const result=mergeGeometries(parts);parts.forEach(g=>g.dispose());result.computeVertexNormals();return result;
}
export function forestFoliageMaterial(map,uniforms){
 const base=new T.MeshStandardMaterial({map,side:T.DoubleSide,alphaTest:.45,roughness:1,color:'#ffffff'});
 const material=forestPlantMaterial(base,uniforms);base.dispose();
 material.color.set('#ffffff');
 // Soft source-colour fill keeps reverse-facing leaf cards readable.
 material.emissive.set('#a0aa91');material.emissiveMap=map;material.emissiveIntensity=.6;
 const wind=material.onBeforeCompile;
 material.onBeforeCompile=shader=>{
  wind(shader);
  // Explicit black-key source: reject background before depth writes.
  // No colour-key white fringes and no transparent sorting pass.
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
   float foliageMax=max(sampledDiffuseColor.r,max(sampledDiffuseColor.g,sampledDiffuseColor.b));
   float leafMask=smoothstep(.008,.035,foliageMax);
   diffuseColor.a*=leafMask;
  `);
 };
 material.customProgramCacheKey=()=> 'forest-foliage-sprays-v2';return material;
}

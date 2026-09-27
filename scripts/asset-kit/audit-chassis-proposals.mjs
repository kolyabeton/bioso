// Offline proposal verification. Does not register or modify game assets.
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
import {stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const canonical=await io.read(new URL('../../public/assets/kit/leg-worker.glb',import.meta.url).pathname);
const images=new Set(canonical.getRoot().listTextures().map(t=>hash(t.getImage())));
const sourceMaterial=canonical.getRoot().listMaterials()[0];
const mapKinds=['BaseColor','MetallicRoughness','Normal','Occlusion','Emissive'];
const results=[];
for(const argument of process.argv.slice(2)){
 const path=resolve(argument),doc=await io.read(path),root=doc.getRoot();
 const hullNodes=root.listNodes().filter(n=>/^(demolition|regulator|sentinel|assembler)-steel$/.test(n.getName()));
 let boundaryEdges=0,nonmanifoldEdges=0,degenerateHullTriangles=0;
 for(const node of hullNodes)for(const primitive of node.getMesh().listPrimitives()){
  const positions=primitive.getAttribute('POSITION'),values=positions.getArray();
  const point=i=>Array.from(values.slice(i*3,i*3+3)).map(v=>Math.round(v*1e5)).join(',');
  const indices=primitive.getIndices()?.getArray()??Array.from({length:positions.getCount()},(_,i)=>i),edges=new Map();
  for(let i=0;i<indices.length;i+=3){
   const points=[point(indices[i]),point(indices[i+1]),point(indices[i+2])];
   if(new Set(points).size!==3){degenerateHullTriangles++;continue;}
   for(let j=0;j<3;j++){const edge=[points[j],points[(j+1)%3]].sort().join('|');edges.set(edge,(edges.get(edge)??0)+1);}
  }
  for(const count of edges.values()){if(count===1)boundaryEdges++;else if(count!==2)nonmanifoldEdges++;}
 }
 const materials=root.listMaterials().filter(m=>['Aged ivory ceramic','Oxidised brass','Rusted inner mechanism'].includes(m.getName()));
 const pbrMaps=materials.map(m=>({material:m.getName(),maps:mapKinds.filter(kind=>m['get'+kind+'Texture']()),matchCanonicalSlots:mapKinds.every(kind=>{const a=m['get'+kind+'Texture'](),b=sourceMaterial['get'+kind+'Texture']();return a&&b?hash(a.getImage())===hash(b.getImage()):a===b;})}));
 const result={file:path,bytes:(await stat(path)).size,triangles:root.listMeshes().flatMap(m=>m.listPrimitives()).reduce((sum,p)=>sum+(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3,0),hullNodes:hullNodes.length,boundaryEdges,nonmanifoldEdges,degenerateHullTriangles,finiteAttributes:root.listAccessors().every(a=>Array.from(a.getArray()).every(Number.isFinite)),allImagesCanonical:root.listTextures().every(t=>images.has(hash(t.getImage()))),pbrMaps,automaticHeadSuppressed:/-v3\.glb$/.test(path)};
 result.pass=result.hullNodes===1&&result.boundaryEdges===0&&result.nonmanifoldEdges===0&&result.degenerateHullTriangles===0&&result.finiteAttributes&&result.allImagesCanonical&&new Set(result.pbrMaps.map(m=>m.material)).size===3&&result.pbrMaps.every(m=>m.matchCanonicalSlots)&&result.automaticHeadSuppressed;
 results.push(result);
}
console.log(JSON.stringify(results,null,2));
if(!results.length||results.some(r=>!r.pass))process.exitCode=1;

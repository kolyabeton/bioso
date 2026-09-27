// Validate the shipped binary payloads, not just the generator's report.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {ORGANS} from '../../src/catalog.js';
import {ORGAN_MODELS} from '../../src/asset-models.js';
import {EQUIPMENT_SURFACE_RECTS} from '../../src/equipment-surface.js';
const kit=new URL('../../public/assets/kit/',import.meta.url),io=new NodeIO().registerExtensions(ALL_EXTENSIONS),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const atlas=(await io.read(new URL('leg-worker.glb',kit).pathname)).getRoot().listMaterials()[0];
const sourceMaps=Object.fromEntries(['BaseColor','MetallicRoughness','Normal','Occlusion'].map(slot=>[slot,atlas['get'+slot+'Texture']()]).filter(([,t])=>t).map(([slot,t])=>[slot,hash(t.getImage())]));
const legacy=(await io.read(new URL('organ-slime.glb',kit).pathname)).getRoot().listMaterials().find(m=>m.getName()==='Olive tendon sheath');
const manifest=JSON.parse(await readFile(new URL('manifest.json',kit),'utf8'));assert.deepEqual(Object.keys(ORGAN_MODELS).sort(),Object.keys(ORGANS).sort());const result=[],geometryOwners=new Map();
assert.equal(new Set(Object.values(ORGAN_MODELS).map(ids=>ids[0])).size,Object.keys(ORGANS).length,'Every organ must resolve to its own asset');
for(const key of Object.keys(ORGANS)){
 const id=ORGAN_MODELS[key][0],bytes=await readFile(new URL(id+'.glb',kit)),doc=await io.readBinary(bytes),root=doc.getRoot();assert.equal(manifest.filter(e=>e.id===id).length,1);assert.equal(manifest.find(e=>e.id===id).bytes,bytes.length);
 const geometryHash=createHash('sha256');
 let triangles=0,vertices=0,materialChecks=0;const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 for(const mesh of root.listMeshes())for(const p of mesh.listPrimitives()){
  const position=p.getAttribute('POSITION'),normal=p.getAttribute('NORMAL'),uv=p.getAttribute('TEXCOORD_0');assert.ok(position&&normal,id+' requires positions and normals');assert.equal(position.getCount(),normal.getCount());if(uv)assert.equal(position.getCount(),uv.getCount());vertices+=position.getCount();
  for(let i=0;i<position.getCount();i++){const a=position.getElement(i,[]),n=normal.getElement(i,[]);for(let c=0;c<3;c++){assert.ok(Number.isFinite(a[c])&&Number.isFinite(n[c]));min[c]=Math.min(min[c],a[c]);max[c]=Math.max(max[c],a[c]);}assert.ok(Math.hypot(...n)>.9);}
  geometryHash.update(Buffer.from(position.getArray().buffer,position.getArray().byteOffset,position.getArray().byteLength));
  const indices=p.getIndices();if(indices){assert.equal(indices.getCount()%3,0);for(const i of indices.getArray())assert.ok(i>=0&&i<position.getCount());}triangles+=(indices?.getCount()||position.getCount())/3;
  const material=p.getMaterial(),kind=Object.keys(EQUIPMENT_SURFACE_RECTS).find(k=>root.listNodes().some(n=>n.getMesh()===mesh&&n.getName().endsWith('-'+k)));
  if(kind){assert.ok(uv,id+' textured material requires UVs');for(const [slot,digest]of Object.entries(sourceMaps))assert.equal(hash(material['get'+slot+'Texture']().getImage()),digest,id+' PBR '+slot);const windows=EQUIPMENT_SURFACE_RECTS[kind];for(let i=0;i<uv.getCount();i++){const [u,v]=uv.getElement(i,[]);assert.ok(windows.some(([x,y,w,h])=>u>=x/512-1e-6&&u<=(x+w)/512+1e-6&&v>=y/512-1e-6&&v<=(y+h)/512+1e-6),id+' atlas UV escapes '+kind); }materialChecks++;}
  if(material.getName()==='Existing olive tendon sheath')assert.equal(hash(material.getBaseColorTexture().getImage()),hash(legacy.getBaseColorTexture().getImage()));
 }
 const dimensions=max.map((v,i)=>v-min[i]);assert.ok(dimensions.every(d=>d>.1&&d<1.5));assert.ok(triangles>=1000&&triangles<15000);assert.ok(materialChecks>=2);assert.ok(root.listNodes().some(n=>n.getExtras().equipmentKey===key));
 const geometrySha256=geometryHash.digest('hex');assert.ok(!geometryOwners.has(geometrySha256),key+' duplicates geometry of '+geometryOwners.get(geometrySha256));geometryOwners.set(geometrySha256,key);
 result.push({key,id,geometrySha256,status:'PASS',triangles,vertices,dimensions,materialChecks,sha256:hash(bytes),bytes:bytes.length});
}
const report={status:'PASS',models:result.length,totalBytes:result.reduce((s,r)=>s+r.bytes,0),maxTriangles:Math.max(...result.map(r=>r.triangles)),checks:['all catalog organs resolve to unique assets and geometry','unique manifest entry and exact bytes','finite positions and unit normals','triangle indices within vertices','UVs inside canonical atlas windows','source PBR textures byte-identical','legacy olive texture byte-identical','portable bounds','embedded equipment metadata'],results:result};
await writeFile(new URL(process.argv.find(a=>a.startsWith('--out='))?.slice(6)||'../../docs/proof/organ-models-20260914/validation.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,models:report.models,totalBytes:report.totalBytes,maxTriangles:report.maxTriangles,checks:report.checks},null,2));

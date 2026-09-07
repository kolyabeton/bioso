import {readFile,writeFile} from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {CATALOG,BODIES} from '../../src/catalog.js';
import {createRun} from '../../src/game.js';
import {createPart} from '../../src/assembly.js';
import {creatureModel} from '../../src/game-view.js';
import {partModelId} from '../../src/asset-models.js';
const cache=new Map();globalThis.ProgressEvent??=class {};
async function load(id){if(!cache.has(id))cache.set(id,(async()=>{const b=await readFile(new URL(`../../public/assets/kit/${id}.glb`,import.meta.url)),n=b.readUInt32LE(12),j=JSON.parse(b.subarray(20,20+n));j.buffers=[{byteLength:b.readUInt32LE(20+n),uri:'data:application/octet-stream;base64,'+b.subarray(28+n).toString('base64')}];delete j.images;delete j.textures;delete j.materials;for(const m of j.meshes)for(const p of m.primitives)delete p.material;return(await new GLTFLoader().parseAsync(JSON.stringify(j),'')).scene;})());return cache.get(id);}
const report={createdAt:new Date().toISOString(),catalog:Object.entries(CATALOG).map(([key,d])=>({key,name:d.name,kind:d.kind,model:partModelId({key,setId:key==='reactor'?'bastion':'wanderer'}),mount:d.kind==='organ'?'internal (portable GLB on ground)':'exterior'})),assemblies:[]};
for(const body of [...Object.keys(BODIES),'six-leg-review']){
 const s=createRun(),key=body==='six-leg-review'?'rootwalker':body,d=BODIES[key];s.body=createPart(s,key);s.body.setId=key==='reactor'?'bastion':key;s.arms=Array.from({length:d.arms},(_,i)=>createPart(s,['harpoon','rocket','fangs','whip'][i]));s.legs=Array.from({length:body==='six-leg-review'?6:d.legs},(_,i)=>createPart(s,['spring','runner','plated','root','universal','runner'][i]));s.organs=[];
 const root=creatureModel(s,{load});await root.userData.modelsReady;root.updateMatrixWorld(true);const assets=[],connectors=[];
 root.traverse(o=>{if(o.userData.assetId){assets.push({id:o.userData.assetId,matrix:o.children[0].matrixWorld.toArray()});}if(o.name.startsWith('mounting-')&&o.isMesh)connectors.push({name:o.name,positions:Array.from(o.geometry.attributes.position.array),indices:o.geometry.index?Array.from(o.geometry.index.array):null,matrix:o.matrixWorld.toArray(),color:o.material.color.toArray()});});
 report.assemblies.push({body,arms:s.arms.length,legs:s.legs.length,assets,connectors});
}
await writeFile(new URL('../../proof/equipment-mounts/catalog-and-assemblies.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(`${report.catalog.length} catalog items; ${report.assemblies.length} assembled review specimens.`);

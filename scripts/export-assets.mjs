import {mkdir,writeFile} from 'node:fs/promises';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {assetFactories} from '../src/kit.js';

// Minimal browser FileReader adapter for Three's exporter in Node. No browser process.
globalThis.FileReader=class{
  readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;this.onloadend?.();});}
  readAsDataURL(blob){blob.arrayBuffer().then(result=>{this.result=`data:${blob.type};base64,${Buffer.from(result).toString('base64')}`;this.onloadend?.();});}
};
const out=new URL('../public/assets/models/',import.meta.url);await mkdir(out,{recursive:true});
const exporter=new GLTFExporter(),manifest=[];
for(const [name,factory] of Object.entries(assetFactories)){
  const root=factory();root.traverse(o=>{o.userData={};});root.updateMatrixWorld(true);
  const data=await exporter.parseAsync(root,{binary:true,onlyVisible:true});
  await writeFile(new URL(name+'.glb',out),Buffer.from(data));
  manifest.push({name,file:name+'.glb',bytes:data.byteLength,units:'metres',up:'Y',source:'src/kit.js',animation:'rigid modular hierarchy; no baked animation clips'});
}
await writeFile(new URL('manifest.json',out),JSON.stringify(manifest,null,2));
console.log(`Exported ${manifest.length} GLB assets, ${Math.round(manifest.reduce((s,a)=>s+a.bytes,0)/1024)} KB total.`);

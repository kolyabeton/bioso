import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import sharp from 'sharp';
import {ARM_MODELS,partModelId} from '../src/asset-models.js';
import {partArt} from '../src/ui/molecules.js';

const kit=new URL('../public/assets/kit/',import.meta.url);
async function glb(file){
 const bytes=await readFile(new URL(file,kit)),length=bytes.readUInt32LE(12);
 assert.equal(bytes.readUInt32LE(0),0x46546c67);
 assert.equal(bytes.readUInt32LE(8),bytes.length);
 return{bytes,json:JSON.parse(bytes.subarray(20,20+length)),bin:bytes.subarray(28+length)};
}
async function imagePixels(asset){
 return Promise.all(asset.json.images.map(async image=>{
  const view=asset.json.bufferViews[image.bufferView],start=view.byteOffset||0;
  return(await sharp(asset.bin.subarray(start,start+view.byteLength)).ensureAlpha().raw().toBuffer()).toString('base64');
 }));
}
test('shotgun v2 is registered and keeps the original equipment wear textures',async()=>{
 assert.deepEqual(ARM_MODELS.shotgun,['arm-shotgun-v2']);
 assert.equal(partModelId({key:'shotgun'}),'arm-shotgun-v2');
 const asset=await glb('arm-shotgun-v2.glb');
 const manifest=JSON.parse(await readFile(new URL('manifest.json',kit)));
 assert.equal(manifest.find(entry=>entry.id==='arm-shotgun-v2')?.bytes,asset.bytes.length);
 const names=new Set(asset.json.nodes.map(node=>node.name));
 for(const name of ['arm-shotgun-v2','shotgun-forearm','shotgun-breech','shotgun-muzzle'])assert.ok(names.has(name),name);
 const originalPixels=new Set((await Promise.all(['arm-needle.glb','arm-fangs.glb'].map(async file=>imagePixels(await glb(file))))).flat());
 const pixels=await imagePixels(asset);assert.equal(pixels.length,5);
 for(const texture of pixels)assert.ok(originalPixels.has(texture),'texture pixels must come from the shipped equipment library');
});
test('shared shotgun UI art uses the new transparent model render',async()=>{
 assert.match(partArt('shotgun'),/items\/shotgun-arm-v3\.png/);
 const file=new URL('../public/assets/ui/items/shotgun-arm-v3.png',import.meta.url);
 const metadata=await sharp(await readFile(file)).metadata();
 assert.equal(metadata.width,640);assert.equal(metadata.height,640);assert.equal(metadata.hasAlpha,true);
 const {data}=await sharp(await readFile(file)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 assert.equal(data[3],0,'icon background must be transparent');
 assert.ok(data.some((value,index)=>index%4===3&&value>0),'icon must contain a visible model');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import sharp from 'sharp';
import {ARM_MODELS,LEG_MODELS} from '../src/asset-models.js';
import {partArt} from '../src/ui/molecules.js';

test('swarm equipment has dedicated transparent inventory icons and GLBs',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../public/assets/kit/manifest.json',import.meta.url)));
 for(const [key,id,icon,map]of [['swarmLeg','leg-swarmLeg-icon-v2','swarm-leg-v1',LEG_MODELS],['drone','arm-drone-icon-v1','drone-arm-v1',ARM_MODELS]]){
  assert.deepEqual(map[key],[id]);assert.ok(partArt(key).includes(`/assets/ui/items/${icon}.png`));
  const png=await readFile(new URL(`../public/assets/ui/items/${icon}.png`,import.meta.url));
  const meta=await sharp(png).metadata(),pixels=await sharp(png).raw().toBuffer();
  assert.equal(meta.hasAlpha,true);assert.equal(meta.width,768);assert.equal(pixels[3],0);
  const bytes=await readFile(new URL(`../public/assets/kit/${id}.glb`,import.meta.url));
  assert.equal(bytes.readUInt32LE(8),bytes.length);assert.equal(manifest.find(m=>m.id===id).bytes,bytes.length);
  const doc=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));
  assert.equal(doc.meshes.length,4);assert.ok(doc.images.length>0);assert.ok(doc.images.every(i=>Number.isInteger(i.bufferView)));
  assert.ok(doc.materials.some(m=>/ivory ceramic/.test(m.name)));
  const triangles=doc.meshes.flatMap(m=>m.primitives).reduce((sum,p)=>sum+doc.accessors[p.indices].count/3,0);
  assert.ok(triangles<=12000,`${id}: ${triangles}`);
 }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {parseAst} from 'rollup/parseAst';
import {Document} from '@gltf-transform/core';
import sharp from 'sharp';
import {rewriteAssetUrls, rewriteAssetModule} from '../scripts/asset-build/urls.mjs';
import {assertBudget, imageProfile, modelIO, compressModel, webpImage} from '../scripts/asset-build/assets.mjs';
import {verifyModel} from '../scripts/asset-build/verify.mjs';
import {assetCssPlugin} from '../scripts/asset-build/urls.mjs';
import {build} from 'vite';
import {mkdtemp,mkdir,writeFile,rm,realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const urls = {
  '/assets/ui/abilities/fire.0.png': '/assets/ui/abilities/fire.0.png.webp',
  '/assets/ui/achievements/first-v1.jpg': '/assets/ui/achievements/first-v1.jpg.webp',
  '/assets/ui/logo.png': '/assets/ui/logo.png.webp',
};
test('asset URLs preserve query strings, fragments, surrounding HTML and unknown resources', () => {
  assert.equal(rewriteAssetUrls('<img src="/assets/ui/logo.png?v=2#x"><i style="background:url(/assets/unknown.png)">', urls), '<img src="/assets/ui/logo.png.webp?v=2#x"><i style="background:url(/assets/unknown.png)">');
});
test('build transform resolves dynamic templates, concatenations, nested HTML and static values', () => {
  const source = `const id='fire.0', achievement='first';return [\`<img src="/assets/ui/abilities/\${id}.png">\`, '/assets/ui/achievements/'+achievement+'-v1.jpg', {logo:'/assets/ui/logo.png'}, \`<div>\${['x'].map(x=>\`<img src="/assets/ui/logo.png">\`).join('')}</div>\`];`;
  const module = `function sample(){${source}}`;
  const transformed = rewriteAssetModule(module, parseAst(module), urls).code.replace(/^import[^\n]+\n/, '');
  parseAst(transformed);
  const result = new Function('__biosoAssetUrls', transformed + ';return sample();')(value => rewriteAssetUrls(value, urls));
  assert.deepEqual(result, ['<img src="/assets/ui/abilities/fire.0.png.webp">', '/assets/ui/achievements/first-v1.jpg.webp', {logo:'/assets/ui/logo.png.webp'}, '<div><img src="/assets/ui/logo.png.webp"></div>']);
});
test('size gate allows over 100 MB and enforces the itch.io extracted limit', () => {
  assert.doesNotThrow(() => assertBudget(99_999_999));
  assert.doesNotThrow(() => assertBudget(100_000_000));
  assert.doesNotThrow(() => assertBudget(500_000_000));
  assert.throws(() => assertBudget(500_000_001), /size limit/);
});
test('Vite rewrites URLs inside nested CSS imports, including custom properties', async()=>{
  const root=await realpath(await mkdtemp(join(tmpdir(),'bioso-css-test-')));
  try{
    await mkdir(join(root,'public/assets/ui'),{recursive:true});
    await writeFile(join(root,'public/assets/ui/logo.png.webp'),'test');
    await writeFile(join(root,'index.html'),'<link rel="stylesheet" href="/main.css"><main>Test</main>');
    await writeFile(join(root,'main.css'),'@import "./nested.css";');
    await writeFile(join(root,'nested.css'),':root{--material:url("/assets/ui/logo.png")}main{background:var(--material)}');
    const output=await build({root,configFile:false,logLevel:'silent',css:{postcss:{plugins:[assetCssPlugin(urls)]}},build:{write:false}});
    const css=output.output.find(item=>item.fileName.endsWith('.css')).source;
    assert.match(css,/logo\.png\.webp/);assert.doesNotMatch(css,/logo\.png["')]/);
  }finally{await rm(root,{recursive:true,force:true});}
});
test('atlas coordinates and logos retain original dimensions; icons fit the mobile budget', async () => {
  assert.deepEqual(imageProfile('/assets/ui/parts-atlas-transparent-v1.png'), {lossless:true});
  assert.deepEqual(imageProfile('/assets/ui/bioso-wordmark-v1.png'), {lossless:true});
  const input = await sharp({create:{width:1254,height:627,channels:4,background:{r:40,g:80,b:30,alpha:0.5}}}).png().toBuffer();
  const output = await webpImage(input, imageProfile('/assets/ui/abilities/fire.0.png'));
  const metadata = await sharp(output).metadata();
  assert.equal(metadata.width,384); assert.equal(metadata.height,192); assert.equal(metadata.hasAlpha,true);
});
test('desktop menu build retains the source resolution and decoded pixels', async () => {
  const input = new URL('../public/assets/ui/menu-art-desktop-v1.png', import.meta.url);
  const source = sharp(input.pathname);
  const output = await webpImage(await source.toBuffer(), imageProfile('/assets/ui/menu-art-desktop-v1.png'));
  const original = await source.ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const decoded = await sharp(output).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  assert.equal(decoded.info.width, original.info.width);
  assert.equal(decoded.info.height, original.info.height);
  assert.ok(decoded.data.equals(original.data), 'desktop background pixels must remain lossless');
});
test('Meshopt retains vertex attributes, winding and node transforms; data maps are untouched', async () => {
  const io = await modelIO(), doc = new Document(), buffer = doc.createBuffer();
  const positions = new Float32Array([0.1234567,0,0, 1,0,0, 0,1,0]);
  const indices = new Uint16Array([0,1,2]);
  const normalImage = await sharp({create:{width:16,height:16,channels:3,background:{r:128,g:128,b:255}}}).png().toBuffer();
  const normal = doc.createTexture('normal').setImage(normalImage).setMimeType('image/png');
  const material = doc.createMaterial().setNormalTexture(normal);
  const primitive = doc.createPrimitive().setAttribute('POSITION',doc.createAccessor().setType('VEC3').setArray(positions).setBuffer(buffer)).setIndices(doc.createAccessor().setType('SCALAR').setArray(indices).setBuffer(buffer)).setMaterial(material);
  const node = doc.createNode('triangle').setMesh(doc.createMesh().addPrimitive(primitive)).setTranslation([1,2,3]);
  doc.createScene().addChild(node);
  const output = await compressModel(io, await io.writeBinary(doc));
  const decoded = await io.readBinary(output), mesh = decoded.getRoot().listMeshes()[0].listPrimitives()[0];
  const actual = Array.from(mesh.getIndices().getArray());
  assert.ok([[0,1,2],[1,2,0],[2,0,1]].some(x=>x.join()===actual.join()));
  assert.deepEqual(decoded.getRoot().listNodes()[0].getTranslation(),[1,2,3]);
  await verifyModel(doc,decoded,'test triangle');
  assert.ok(decoded.getRoot().listExtensionsRequired().some(x=>x.extensionName==='EXT_meshopt_compression'));
});

test('asset template wrapping preserves compact keyword boundaries in ability art',()=>{
  const module='function art(id){return`<img src="/assets/ui/abilities/${id}.png">`;}';
  const transformed=rewriteAssetModule(module,parseAst(module),urls).code.replace(/^import[^\n]+\n/,'');
  const result=new Function('__biosoAssetUrls',transformed+';return art("fire.0");')(value=>rewriteAssetUrls(value,urls));
  assert.equal(result,'<img src="/assets/ui/abilities/fire.0.png.webp">');
  assert.doesNotMatch(transformed,/return__biosoAssetUrls/);
});

test('unindexed triangles share only identical complete vertices, preserving UV and morph seams',async()=>{
 const io=await modelIO(),doc=new Document(),buffer=doc.createBuffer(),accessor=(array,type)=>doc.createAccessor().setType(type).setArray(new Float32Array(array)).setBuffer(buffer);
 const positions=[0,0,0,1,0,0,1,1,0,0,0,0,1,1,0,0,1,0],uv=[0,0,1,0,1,1,0,0,1,1,0,1];
 const a=doc.createPrimitive().setAttribute('POSITION',accessor(positions,'VEC3')).setAttribute('TEXCOORD_0',accessor(uv,'VEC2'));
 const b=a.clone();const morph=new Array(18).fill(0);morph[9]=.2;b.addTarget(doc.createPrimitiveTarget().setAttribute('POSITION',accessor(morph,'VEC3')));
 doc.createScene().addChild(doc.createNode().setMesh(doc.createMesh().addPrimitive(a))).addChild(doc.createNode().setMesh(doc.createMesh().addPrimitive(b).setWeights([.4])));
 const decoded=await io.readBinary(await compressModel(io,await io.writeBinary(doc)));
 assert.deepEqual(decoded.getRoot().listMeshes().map(m=>m.listPrimitives()[0].getAttribute('POSITION').getCount()),[4,5]);
 await verifyModel(doc,decoded,'indexed exact geometry');
});

test('relative export resolves the real interpolated SVG atlas href', async()=>{
 const {readFile}=await import('node:fs/promises');
 const module=await readFile(new URL('../src/ui/molecules.js',import.meta.url),'utf8');
 const atlas='/assets/ui/parts-atlas-transparent-v1.png';
 const transformed=rewriteAssetModule(module,parseAst(module),{[atlas]:'.'+atlas+'.webp'}).code;
 assert.match(transformed,/__biosoAssetUrls\(/);
 assert.equal(rewriteAssetUrls(`<image href="${atlas}" clip-path="url(#part-1)"/>`,{[atlas]:'.'+atlas+'.webp'}),`<image href=".${atlas}.webp" clip-path="url(#part-1)"/>`);
});

test('release compression includes atlas and material textures, retaining dimensions and valid manifest', async()=>{
 const {compressBuild}=await import('../scripts/compress-build.mjs');
 const {readFile}=await import('node:fs/promises');
 const {createHash}=await import('node:crypto');
 const root=await mkdtemp(join(tmpdir(),'bioso-compression-'));
 try{
  await writeFile(join(root,'index.html'),'<main>build</main>');
  const pixels=Buffer.alloc(256*256*4);
  let seed=123456;
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){const i=(y*256+x)*4;for(let c=0;c<3;c++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;pixels[i+c]=80+(seed>>>24)%64;}pixels[i+3]=x;}
  const input=await sharp(pixels,{raw:{width:256,height:256,channels:4}}).webp({lossless:true}).toBuffer();
  await mkdir(join(root,'assets/model-textures'),{recursive:true});
  const urls=['/parts-atlas-transparent-v1.png.webp','/assets/model-textures/normal.webp'];
  for(const url of urls)await writeFile(join(root,url),input);
  await writeFile(join(root,'asset-manifest.json'),JSON.stringify({entries:[{url:urls[0]}],generated:[{url:urls[1]}]}));
  await compressBuild(root);
  const manifest=JSON.parse(await readFile(join(root,'asset-manifest.json'),'utf8'));
  for(const entry of [...manifest.entries,...manifest.generated]){
   const bytes=await readFile(join(root,entry.url)),meta=await sharp(bytes).metadata();
   assert.ok(bytes.length<input.length*.95,'texture must actually be compressed');
   assert.equal(meta.width,256);assert.equal(meta.height,256);assert.equal(meta.hasAlpha,true);
   assert.equal(entry.bytes,bytes.length);assert.equal(entry.hash,createHash('sha256').update(bytes).digest('hex'));
  }
 }finally{await rm(root,{recursive:true,force:true});}
});

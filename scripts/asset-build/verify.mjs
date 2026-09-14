import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import sharp from 'sharp';
import {hash, filesIn, modelIO, sizeReport, assertBudget} from './assets.mjs';

function meshShape(document) {
  const root = document.getRoot();
  return {
    nodes: root.listNodes().map(node => ({name:node.getName(), matrix:node.getMatrix(), children:node.listChildren().map(child=>root.listNodes().indexOf(child)), mesh:root.listMeshes().indexOf(node.getMesh()), skin:root.listSkins().indexOf(node.getSkin())})),
    scenes:root.listScenes().map(scene=>scene.listChildren().map(node=>root.listNodes().indexOf(node))),
    materials:root.listMaterials().map(m=>({name:m.getName(), color:m.getBaseColorFactor(), metallic:m.getMetallicFactor(), roughness:m.getRoughnessFactor(), emissive:m.getEmissiveFactor(), alpha:m.getAlphaMode(), cutoff:m.getAlphaCutoff(), doubleSided:m.getDoubleSided()})),
    skins:root.listSkins().length, animations:root.listAnimations().length,
  };
}

function checkAccessor(a, b, label) {
  assert.equal(b?.getType(),a?.getType(),label);
  assert.equal(b?.getNormalized(),a?.getNormalized(),label);
  assert.deepEqual(b?.getArray(),a?.getArray(),label);
}

function triangleSignatures(primitive) {
  const semantics=primitive.listSemantics().sort(), accessors=[...semantics.map(s=>primitive.getAttribute(s)),...primitive.listTargets().flatMap(target=>target.listSemantics().sort().map(s=>target.getAttribute(s)))];
  const vertices=Array.from({length:accessors[0].getCount()},(_,i)=>accessors.map(a=>Array.from(a.getArray().slice(i*a.getElementSize(),(i+1)*a.getElementSize())).join(',')).join('|'));
  const indices=primitive.getIndices()?.getArray()??vertices.map((_,i)=>i), triangles=[];
  for(let i=0;i<indices.length;i+=3) {
    const corners=[vertices[indices[i]],vertices[indices[i+1]],vertices[indices[i+2]]];
    triangles.push([0,1,2].map(shift=>[0,1,2].map(c=>corners[(c+shift)%3]).join(';')).sort()[0]);
  }
  return triangles.sort();
}

export async function verifyModel(source, output, label) {
  assert.deepEqual(meshShape(output),meshShape(source),`${label}: scene/material structure`);
  const before=source.getRoot().listMeshes(), after=output.getRoot().listMeshes();
  assert.equal(after.length,before.length,label);
  before.forEach((mesh,i)=>{
    const primitives=mesh.listPrimitives(), decoded=after[i].listPrimitives();
    assert.equal(decoded.length,primitives.length,label);
    primitives.forEach((p,j)=>{
      const q=decoded[j];
      assert.equal(q.getMode(),p.getMode(),label);
      assert.deepEqual(q.listSemantics().sort(),p.listSemantics().sort(),label);
      for(const semantic of p.listSemantics()) {
        assert.equal(q.getAttribute(semantic).getType(),p.getAttribute(semantic).getType(),label);
        assert.equal(q.getAttribute(semantic).getNormalized(),p.getAttribute(semantic).getNormalized(),label);
      }
      const a=p.getIndices()?.getArray(), b=q.getIndices()?.getArray();
      if(p.getMode()===4){
        assert.equal(b?.length??q.getAttribute('POSITION').getCount(),a?.length??p.getAttribute('POSITION').getCount(),`${label}: triangle count`);
        assert.deepEqual(triangleSignatures(q),triangleSignatures(p),`${label}: exact triangle attributes and winding`);
      } else {
        checkAccessor(p.getIndices(),q.getIndices(),`${label}: indices`);
        for(const semantic of p.listSemantics()) checkAccessor(p.getAttribute(semantic),q.getAttribute(semantic),`${label}: ${semantic}`);
      }
      assert.equal(q.listTargets().length,p.listTargets().length,label);
      p.listTargets().forEach((target,t)=>{const decoded=q.listTargets()[t];assert.deepEqual(decoded.listSemantics().sort(),target.listSemantics().sort(),`${label}: morph semantics`);for(const semantic of target.listSemantics()){const a=target.getAttribute(semantic),b=decoded.getAttribute(semantic);assert.equal(b.getType(),a.getType());assert.equal(b.getNormalized(),a.getNormalized());if(p.getMode()!==4)checkAccessor(a,b,`${label}: morph ${semantic}`);}});
    });
  });
  const a=source.getRoot().listMaterials(),b=output.getRoot().listMaterials();
  for(let i=0;i<a.length;i++) for(const getter of ['getNormalTexture','getMetallicRoughnessTexture','getOcclusionTexture']) {
    const original=a[i][getter](),decoded=b[i][getter]();
    assert.equal(!!decoded,!!original,`${label}: ${getter}`);
    if(original) assert.deepEqual(await sharp(decoded.getImage()).ensureAlpha().raw().toBuffer(),await sharp(original.getImage()).ensureAlpha().raw().toBuffer(),`${label}: ${getter} exact pixels`);
  }
  const originalAnimations=source.getRoot().listAnimations(), decodedAnimations=output.getRoot().listAnimations();
  originalAnimations.forEach((animation,i)=>{
    const samplers=animation.listSamplers(), decoded=decodedAnimations[i].listSamplers();
    assert.equal(decoded.length,samplers.length,label);
    samplers.forEach((sampler,j)=>{checkAccessor(sampler.getInput(),decoded[j].getInput(),label);checkAccessor(sampler.getOutput(),decoded[j].getOutput(),label);assert.equal(decoded[j].getInterpolation(),sampler.getInterpolation(),label);});
  });
}

export async function verifyAssets(root, output) {
  const manifest=JSON.parse(await readFile(join(output,'asset-manifest.json'),'utf8'));
  const sources=(await filesIn(join(root,'public'))).filter(path=>!path.endsWith('/.DS_Store')).map(path=>path.slice(join(root,'public').length)).sort();
  assert.deepEqual(Object.keys(manifest.urls).sort(),sources,'All public resources must have a manifest entry');
  const io=await modelIO();
  let models=0,images=0,audio=0;
  for(const entry of manifest.entries) {
    const source=await readFile(join(root,'public',entry.source)), bytes=await readFile(join(output,entry.url));
    assert.equal(hash(source),entry.sourceHash,`Original changed during/after build: ${entry.source}`);
    assert.equal(hash(bytes),entry.hash,`Output changed: ${entry.url}`);
    assert.equal(bytes.length,entry.bytes,entry.url);
    if(entry.source.endsWith('.glb')) {
      const original=await io.readBinary(source),decoded=await io.read(join(output,entry.url));
      await verifyModel(original,decoded,entry.source);
      for(const texture of decoded.getRoot().listTextures()) await sharp(texture.getImage()).raw().toBuffer();
      models++;
    } else if(/\.(png|jpe?g|webp)$/i.test(entry.source)) {
      await sharp(bytes).raw().toBuffer();images++;
    } else if(/\.(mp3|wav|ogg)$/i.test(entry.source)) {
      assert.deepEqual(bytes,source,`Audio content changed: ${entry.source}`);audio++;
    }
  }
  for(const entry of manifest.generated??[]) {
    const bytes=await readFile(join(output,entry.url));
    assert.equal(hash(bytes),entry.hash,entry.url);
    assert.equal(bytes.length,entry.bytes,entry.url);
  }
  const report=await sizeReport(output);assertBudget(report.bytes);
  return {...report,verified:{resources:manifest.entries.length,models,images,audio,originalsUnchanged:true}};
}

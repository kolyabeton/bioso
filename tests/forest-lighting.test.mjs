import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import {forestGroundShader,createForestUniforms} from '../src/forest-light.js';
import {forestSurfaceMaterial} from '../src/forest-surface.js';
import {forestPlacements} from '../src/forest-placements.js';
import {assembleBiomeWorld} from '../src/biome-world.js';

test('baked visibility affects direct sunlight only, preserving ambient fill',()=>{
 const shader={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};
 const atlas=new T.Texture(),bake=new T.Texture();
 forestGroundShader(shader,createForestUniforms(),atlas,atlas,true,bake,[256,0]);
 assert.equal(shader.uniforms.forestBakedLight.value,bake);
 assert.deepEqual(shader.uniforms.forestTileOrigin.value.toArray(),[256,0]);
 assert.match(shader.fragmentShader,/directLight.color \*= forestBakedVisibility/);
 assert.doesNotMatch(shader.fragmentShader,/irradiance\s*\*=\s*forestBakedVisibility/);
 assert.match(shader.vertexShader,/vBumpMapUv=position.xz/);
 assert.match(shader.fragmentShader,/128\.0\+\.5/);
 assert.match(shader.fragmentShader,/beyondForest/);
 atlas.dispose();bake.dispose();
});
test('outer forest breaks the tree row without intruding into playable ground',()=>{
 const w=assembleBiomeWorld(12),t=w.tiles[5],placements=forestPlacements(t,w);
 const trees=[...placements].filter(([id])=>id.startsWith('forest-tree-')).flatMap(([,as])=>as).filter(p=>p.d.forestEdge);
 assert.equal(trees.length,8);
 assert.ok(new Set(trees.map(p=>p.d.x)).size>=6,'varying depth, not a straight row');
 assert.ok(new Set(trees.map(p=>Array.isArray(p.scale)?p.scale[1]:p.scale)).size>=6);
 assert.ok(trees.some(p=>p.d.x>w.bounds.maxX+20),'distant tree groups');
 for(const anchors of placements.values())for(const p of anchors.filter(p=>p.d.forestEdge))assert.ok(p.d.x>w.bounds.maxX);
 const inner=w.tiles[16];
 assert.ok([...forestPlacements(inner,w).values()].every(as=>as.every(p=>!p.d.forestEdge)),'tile seams stay open');
});
test('legacy forest shader does not depend on authored tile lighting',()=>{
 const shader={uniforms:{},vertexShader:T.ShaderLib.basic.vertexShader,fragmentShader:T.ShaderLib.basic.fragmentShader};
 forestGroundShader(shader,createForestUniforms(),null,null,false);
 assert.equal(shader.uniforms.forestBakedLight,undefined);
 assert.doesNotMatch(shader.fragmentShader,/forestBakedVisibility|stoneLuma/);
});
test('reused material atlas projects continuously while retaining vertex AO',()=>{
 const source=new T.MeshStandardMaterial({vertexColors:true}),atlas=new T.Texture();
 const material=forestSurfaceMaterial(source,atlas);
 assert.equal(material.vertexColors,true);assert.equal(material.map,atlas);assert.equal(material.bumpMap,atlas);
 const shader={vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};
 material.onBeforeCompile(shader);
 assert.match(shader.fragmentShader,/forestSurfacePoint/);
 assert.match(shader.fragmentShader,/roughnessFactor=mix/);
 assert.equal(source.map,null);
 material.dispose();source.dispose();atlas.dispose();
});
test('every authored forest placement and its static lightmap are seed-independent',()=>{
 const baseline=assembleBiomeWorld(12);
 const signature=w=>w.tiles.filter(t=>t.biome==='forest').map(t=>({index:t.index,placements:[...forestPlacements(t,w)]}));
 for(const seed of [1,42,709])assert.deepEqual(signature(assembleBiomeWorld(seed)),signature(baseline));
 for(const t of baseline.tiles.filter(t=>t.biome==='forest')){
  const bytes=fs.readFileSync(new URL(`../public/assets/biomes/forest-living/light-tile-${t.index}-v4.webp`,import.meta.url));
  assert.equal(bytes.toString('ascii',8,12),'WEBP');assert.ok(bytes.length<300000);
 }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {ENVIRONMENT_PROFILES,ENVIRONMENT_MODULES,environmentId,environmentHeight,environmentProfile} from '../src/environment-profiles.js';
import {environmentBlendWeights} from '../src/environment-surfaces.js';
import {environmentGroundShader} from '../src/environment-ground.js';
import * as T from 'three';
import {assembleBiomeWorld,localHeight} from '../src/biome-world.js';
import {createWorldRun} from '../src/world-run.js';
import {terrainBuffers} from '../src/biome-view.js';
import {ENVIRONMENT_MODEL_BOUNDS} from '../src/environment-model-bounds.js';
import {modelPoints,hull} from '../scripts/obstacle-footprints.mjs';

test('all five mission identities also exist in the mixed survival map',()=>{
 const ids=Object.keys(ENVIRONMENT_PROFILES);
 for(const seed of [1,12,42]){
  const w=assembleBiomeWorld(seed);
  assert.deepEqual([...new Set(w.tiles.map(environmentId))].sort(),ids.sort());
 }
 for(const mission of ['garden','quarantine','core','nursery','mother']){
  const s=createWorldRun(undefined,mission,12);
  assert.ok(ids.includes(s.world.environmentId));
  assert.ok(s.world.tiles.every(t=>environmentId(t)===s.world.environmentId));
  assert.ok(s.world.tiles.every(t=>t.decorations.every(d=>d.model||d.feature)),'no whole-landmark image planes');
 }
});
test('new environment module collisions match normalized Blender exports',()=>{
 for(const [id,profile] of Object.entries(ENVIRONMENT_MODEL_BOUNDS)){
  const p=modelPoints(id);
  assert.deepEqual(profile.hull,hull(p.map(v=>[v.x,v.z])),id);
  assert.equal(profile.height,Math.max(...p.map(v=>v.y)),id);
 }
});
test('five side reliefs are distinct, central mission combat and seams remain flat',()=>{
 const signatures=[];
 for(const environmentId of Object.keys(ENVIRONMENT_PROFILES)){
  const t={environmentId,biome:ENVIRONMENT_PROFILES[environmentId].biome,index:1};
  const sample=[];
  for(let z=-32;z<=32;z+=2){
   for(const x of [-4.5,0,4.5])assert.equal(environmentHeight(t,x,z),0);
   assert.equal(environmentHeight(t,32,z),0);
   assert.equal(environmentHeight(t,-32,z),0);
   sample.push(environmentHeight(t,18,z).toFixed(3));
  }
  assert.ok(sample.some(h=>Number(h)>.2));signatures.push(sample.join(','));
 }
 assert.equal(new Set(signatures).size,5);
});
test('terrain vertices use the same height source as collision and preserve portals',()=>{
 for(const mode of ['garden','quarantine','core','nursery','mother']){
  const s=createWorldRun(undefined,mode,12),t=s.world.tiles[0],p=terrainBuffers(t).ground.positions;
  assert.ok(p.some((v,i)=>i%3===1&&v>.2));
  for(let i=0;i<p.length;i+=3)assert.ok(Math.abs(p[i+1]-localHeight(t,p[i]-t.x,p[i+2]-t.z))<.002);
 }
});
test('each of five survival families owns all three modules, including a full nursery set',()=>{
 assert.equal(ENVIRONMENT_MODULES.length,15);
 for(const seed of [0,1,12,42]){
  const w=assembleBiomeWorld(seed);
  for(const id of Object.keys(ENVIRONMENT_PROFILES)){
   const kinds=new Set(w.tiles.filter(t=>environmentId(t)===id&&t.kind!=='transition').map(t=>t.kind));
   assert.deepEqual([...kinds].sort(),['clearing','grove','meadow'],id);
  }
  assert.equal(w.tiles.filter(t=>environmentId(t)==='brood-nursery').length,3);
 }
});
test('material weights agree on both sides of every edge, including corners',()=>{
 const w=assembleBiomeWorld(12);
 for(const a of w.tiles)for(const b of w.neighbors(a))for(const along of [-32,-28,0,28,32]){
  const x=a.cx===b.cx?a.x+along:(a.x+b.x)/2,z=a.cz===b.cz?a.z+along:(a.z+b.z)/2;
  const left=environmentBlendWeights(a,w,x,z),right=environmentBlendWeights(b,w,x,z);
  for(const id of new Set([...Object.keys(left),...Object.keys(right)]))assert.ok(Math.abs((left[id]||0)-(right[id]||0))<1e-10,`${a.id}/${b.id}/${id}`);
 }
});
test('the active shared ground path preserves baked direct lighting and binds the new atlas',()=>{
 const w=assembleBiomeWorld(12),tile=w.tiles[4],bake=new T.Texture(),atlas=new T.Texture();
 const shader={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};
 environmentGroundShader(shader,environmentProfile(tile),null,null,tile,w,bake,atlas);
 assert.equal(shader.uniforms.envBakedLight.value,bake);assert.equal(shader.uniforms.envAtlas.value,atlas);
 assert.match(shader.fragmentShader,/directLight.color \*= envVisibility/);
 assert.doesNotMatch(shader.fragmentShader,/irradiance\s*\*=\s*envVisibility/);
 assert.match(shader.fragmentShader,/128\.0\+\.5/);assert.match(shader.fragmentShader,/envBlendedSurface/);
});
test('neighbor lightmaps feather reciprocal forest shadows across tile seams',()=>{
 const w=assembleBiomeWorld(12),tile=w.tiles[4],bake=new T.Texture(),east=new T.Texture(),south=new T.Texture();
 const shader={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};
 environmentGroundShader(shader,environmentProfile(tile),null,null,tile,w,bake,null,null,false,{east,south,fade:{west:true,north:true}});
 assert.equal(shader.uniforms.envBakedEast.value,east);assert.equal(shader.uniforms.envBakedSouth.value,south);
 assert.equal(shader.uniforms.envBakedWest.value,bake);assert.deepEqual(shader.uniforms.envBakedNeighbors.value.toArray(),[0,1,0,1]);
 assert.deepEqual(shader.uniforms.envBakedFadeEdges.value.toArray(),[1,0,1,0]);
 assert.match(shader.fragmentShader,/smoothstep\(22\.0,32\.0,envLocal\.x\)/);
 assert.match(shader.fragmentShader,/envVisibilitySum\/envVisibilityWeight/);
 assert.match(shader.fragmentShader,/mix\(envVisibility,1\.0,envEdgeFade\)/);
 bake.dispose();east.dispose();south.dispose();
});

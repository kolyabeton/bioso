import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import {ENVIRONMENT_STORY_PROPS} from '../src/environment-story-props.js';
import {environmentMetalMaterial} from '../src/environment-metal.js';
import {createWorldRun} from '../src/world-run.js';
import {assembleBiomeWorld} from '../src/biome-world.js';
import {ENVIRONMENT_MODEL_BOUNDS} from '../src/environment-model-bounds.js';

test('ten distinct shipped props, two reference silhouettes per family, with collision bounds',()=>{
 const ids=Object.values(ENVIRONMENT_STORY_PROPS).flat();assert.equal(new Set(ids).size,10);
 const manifest=JSON.parse(fs.readFileSync(new URL('../public/assets/kit/manifest.json',import.meta.url)));
 for(const id of ids){assert.ok(manifest.some(m=>m.id===id));assert.ok(ENVIRONMENT_MODEL_BOUNDS[id]?.hull.length>3);}
 for(const mode of ['garden','quarantine','core','nursery','mother']){
  const s=createWorldRun(undefined,mode,12),tile=s.world.tiles[0];
  assert.deepEqual(new Set(tile.decorations.filter(d=>d.storyProp).map(d=>d.model)),new Set(ENVIRONMENT_STORY_PROPS[tile.environmentId]));
  assert.ok(s.world.findPath({x:0,z:28},{x:0,z:-28},1.92).length);
 }
});
test('survival gets companion props without changing authored Forest lightmap placements',()=>{
 const w=assembleBiomeWorld(12);
 for(const t of w.tiles){const props=t.decorations.filter(d=>d.storyProp);assert.equal(props.length,t.biome==='forest'?0:2);}
});
test('shared metal wear retains vertex AO without loading another texture',()=>{
 const source=new T.MeshStandardMaterial({vertexColors:true}),m=environmentMetalMaterial(source);
 const shader={vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};m.onBeforeCompile(shader);
 assert.equal(m.map,null);assert.equal(m.vertexColors,true);assert.match(shader.fragmentShader,/metalNoise/);assert.match(shader.fragmentShader,/roughnessFactor=mix/);
 m.dispose();source.dispose();
});

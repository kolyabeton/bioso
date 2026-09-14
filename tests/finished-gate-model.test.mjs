import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {prepareFinishedGateModel} from '../src/finished-gate-model.js';
import {createInteractionHighlight} from '../src/vfx/interaction-highlight.js';
import {createGameplayModulesView} from '../src/gameplay-modules/view.js';
import {createWorldRun} from '../src/world-run.js';
import {stageDungeonReview} from '../src/dungeon-review-state.js';
import {architectureGLB} from './helpers/architecture-glb.mjs';

test('finished real gate uses the shared ceramic texture and greenery moves with each leaf',()=>{
 const source=architectureGLB('arch-gate'),original=source.children[0].material,gate=prepareFinishedGateModel(source,12);
 for(const [i,half] of gate.halves.entries()){
  const leaf=half.getObjectByName('arch-gate'),fittings=half.getObjectByName('arch-gate-greenery');
  assert.equal(half.getObjectByName('arch-gate-brass-fittings'),undefined);assert(fittings);assert.equal(leaf.material.userData.sourceTexture,'/assets/textures/chassis-ceramic-v3.png');
  assert.notEqual(leaf.material.map,original.map);
  const shader={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};
  leaf.material.onBeforeCompile(shader);
  assert(shader.fragmentShader.includes('finishedGateUV()'));assert(!shader.fragmentShader.includes('gateCeramicUV'));
  const before=new T.Box3().setFromObject(fittings);assert(i?before.min.x>0:before.max.x<0);
  half.position.x=(i?1:-1)*4.6;half.updateMatrixWorld(true);
  const opened=new T.Box3().setFromObject(fittings);assert(i?opened.min.x>4.5:opened.max.x< -4.5);
 }
 gate.dispose();assert.equal(source.children[0].material,original);
});

test('interaction highlight preserves custom gate shaders and restores their materials on disposal',()=>{
 const gate=prepareFinishedGateModel(architectureGLB('arch-gate'),10),root=new T.Group();root.add(...gate.halves);
 const mesh=root.getObjectByName('arch-gate'),original=mesh.material,highlight=createInteractionHighlight(root);
 highlight.setModel(root);assert.notEqual(mesh.material,original);
 assert.equal(mesh.material.onBeforeCompile,original.onBeforeCompile);
 assert.equal(mesh.material.customProgramCacheKey(),original.customProgramCacheKey());
 highlight.dispose();assert.equal(mesh.material,original);gate.dispose();
});

test('lair event loads the finished gate and late loads cannot resurrect a removed entrance',async()=>{
 const s=createWorldRun(undefined,'survival',20317);stageDungeonReview(s,'roots');
 const source=architectureGLB('arch-gate'),view=createGameplayModulesView(new T.Scene(),{load:async()=>source});
 view.update(s);await new Promise(resolve=>setImmediate(resolve));
 assert(view.root.getObjectByName('arch-gate-greenery'));
 const mesh=view.root.getObjectByName('arch-gate');assert.equal(mesh.material.customProgramCacheKey(),'arch-gate-ceramic-rust-ivy-v2');
 let disposed=false;mesh.geometry.addEventListener('dispose',()=>disposed=true);view.dispose();assert(disposed);
 let finish;const retired=createGameplayModulesView(new T.Scene(),{load:()=>new Promise(resolve=>finish=resolve)});
 retired.update(s);retired.reset();finish(source);await new Promise(resolve=>setImmediate(resolve));
 assert.equal(retired.root.children.length,0);retired.dispose();
});

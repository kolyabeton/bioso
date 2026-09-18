import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import {MISSIONS} from '../src/catalog.js';
import {BOSS_MODEL_IDS,bossModelId,fittedBossModel,createBossModelView} from '../src/boss-model-view.js';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function source(){const root=new T.Group();const mesh=new T.Mesh(new T.BoxGeometry(2,4,3),new T.MeshStandardMaterial());mesh.position.set(0,2,0);mesh.userData.motionRole='leg-0';root.add(mesh);return root;}
const enemy=(id=1)=>({id,kind:'boss',bossDesignId:BOSS_MODEL_IDS[0],hp:100,radius:1.7,x:0,y:2,z:0});
test('all mission design IDs resolve to bounded, textured production GLBs',()=>{
 assert.deepEqual(MISSIONS.map(m=>m.bossId),BOSS_MODEL_IDS);
 for(const id of BOSS_MODEL_IDS){const b=fs.readFileSync(new URL(`../public/assets/kit/${id}.glb`,import.meta.url));assert.equal(b.toString('ascii',0,4),'glTF');assert.equal(b.readUInt32LE(8),b.length);const g=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12)));assert.ok(g.images.every(i=>Number.isInteger(i.bufferView)));assert.ok(!g.cameras?.length);assert.ok(g.nodes.some(n=>n.extras?.motionRole==='body'));const total=g.nodes.filter(n=>n.mesh!==undefined).reduce((n,node)=>n+g.meshes[node.mesh].primitives.reduce((a,p)=>a+g.accessors[p.indices].count/3,0),0);assert.ok(total<80000,id+': '+total);assert.ok(g.meshes.length<=30);}
 assert.equal(bossModelId({...enemy(),kind:'elite'}),null);assert.equal(bossModelId({...enemy(),bossDesignId:undefined}),null);
});
test('fitting preserves proportions, facing and floor origin without changing the template',()=>{
 const template=source(),model=fittedBossModel(template),b=new T.Box3().setFromObject(model),d=b.getSize(new T.Vector3());assert.ok(Math.abs(b.min.y)<1e-8);assert.ok(d.y<=1.85+1e-8);assert.ok(Math.abs(d.x/d.z-2/3)<1e-8);assert.equal(template.children[0].position.y,2);assert.equal(model.rotation.y,0);
});
test('loading uses fallback, swaps exactly once, animates only from movement, respects pause, and resets',async()=>{
 const scene=new T.Scene(),template=source(),view=createBossModelView(scene,{load:async()=>template}),e=enemy(),player={x:0,z:5};
 assert.deepEqual(view.update([e],player,0),[e]);await flush();assert.deepEqual(view.update([e],player,0),[]);assert.equal(view.count(),1);
 e.x=.2;view.update([e],player,.1);const root=scene.getObjectByName('boss-asset:'+e.bossDesignId),leg=root.userData.motionParts[0].object;const angle=leg.rotation.x;assert.notEqual(angle,0);
 view.update([e],player,.1);assert.equal(leg.rotation.x,angle);assert.ok(new T.Box3().setFromObject(root).min.y>=e.y-1e-8);
 view.update([e],player,.2,1,true);assert.ok(Math.abs(leg.rotation.x)<1e-8);assert.equal(template.children[0].rotation.x,0);
 view.update([{...e,hp:0}],player,.3);assert.equal(view.count(),0);view.reset();view.dispose();assert.equal(scene.children.length,0);
});
test('failed GLB loads retain the regular renderer and late loads cannot resurrect disposed bosses',async()=>{
 const scene=new T.Scene(),e=enemy();const v=createBossModelView(scene,{load:async()=>{throw Error('offline');}});v.update([e],{x:0,z:5},0);await flush();assert.deepEqual(v.update([e],{x:0,z:5},1),[e]);assert.deepEqual(v.info().bossModelFailures,[e.bossDesignId]);v.dispose();
 let release;const delayed=createBossModelView(scene,{load:()=>new Promise(r=>{release=r;})});delayed.update([e],{x:0,z:5},0);await Promise.resolve();delayed.dispose();release(source());await flush();assert.equal(scene.children.length,0);
});
test('boss models render simulation facing even when the player moves behind them',async()=>{
 const scene=new T.Scene(),view=createBossModelView(scene,{load:async()=>source()}),e={...enemy(),bossCombat:{facing:.25}},player={x:0,z:-10};
 view.update([e],player,0);await flush();view.update([e],player,0);
 const model=scene.getObjectByName('boss-asset:'+e.bossDesignId);assert.equal(model.rotation.y,.25);
 e.bossCombat.facing=.3;view.update([e],{x:-10,z:0},.1);assert.equal(model.rotation.y,.3);
 delete e.bossCombat;e.facing=.4;view.update([e],player,.2);assert.equal(model.rotation.y,.4);view.dispose();
});

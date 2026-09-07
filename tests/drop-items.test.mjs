import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createRun} from '../src/game.js';
import {createPart,drop,autoPickup,pickup,stats} from '../src/assembly.js';
import {createGroundItemsView} from '../src/ground-items-view.js';
import {partModelId} from '../src/asset-models.js';
test('discard installed or stored items once, preserve identity, and allow pickup',()=>{
 const s=createRun(),arm=s.arms[0],before=stats(s).weight;
 arm.upgrades.damage=2;assert(drop(s,arm.id));assert.equal(s.arms[0],null);
 assert.equal(s.ground[0].part,arm);assert(stats(s).weight<before);assert.equal(drop(s,arm.id),false);
 autoPickup(s);assert.equal(s.ground.length,1);assert(pickup(s,s.ground[0].id));assert.equal(s.inventory[0],arm);
 assert.equal(arm.upgrades.damage,2);assert(drop(s,arm.id));assert.equal(drop(s,s.body.id),false);
});
test('ground meshes use part assets and are removed on pickup and reset',async()=>{
 const s=createRun(),scene=new T.Scene(),ids=[];
 const view=createGroundItemsView(scene,async id=>{ids.push(id);return new T.Mesh(new T.BoxGeometry(1,2,1),new T.MeshBasicMaterial());});
 const parts=['claws','universal','wanderer','digestion'].map(key=>createPart(s,key));
 view.update(parts.map((part,id)=>({id,part,x:id,y:0,z:0})));await Promise.resolve();
 assert.deepEqual(ids,parts.map(partModelId));assert.equal(scene.children.length,4);
 assert(scene.children.every(g=>g.children.length===2&&g.getObjectByName('interaction-highlight')?.visible));
 const highlights=scene.children.map(g=>g.getObjectByName('interaction-highlight'));let disposed=0;
 for(const fx of highlights)fx.children[0].geometry.addEventListener('dispose',()=>disposed++);
 view.update(parts.map((part,id)=>({id,part,x:id,y:0,z:0})),1,2,true);
 assert(highlights.every(fx=>fx.getObjectByName('interaction-pointer').visible&&!fx.children.find(o=>o.isPoints).visible));
 view.update([]);assert.equal(scene.children.length,0);
 assert.equal(disposed,4);
 view.update([{id:8,part:parts[0],x:0,z:0}]);view.reset();await Promise.resolve();assert.equal(scene.children.length,0);
});

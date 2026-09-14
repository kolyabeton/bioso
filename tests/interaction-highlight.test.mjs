import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createInteractionHighlight} from '../src/vfx/interaction-highlight.js';
import {createGameplayModulesView} from '../src/gameplay-modules/view.js';

test('highlight animates deterministically, respects reduced motion, restores shared material and disposes once',()=>{
 const parent=new T.Group(),original=new T.MeshStandardMaterial({emissive:0x102030}),mesh=new T.Mesh(new T.BoxGeometry(),original);parent.add(mesh);
 const fx=createInteractionHighlight(parent,{particleCount:24});fx.setModel(mesh);
 assert.notEqual(mesh.material,original);const base=original.emissive.clone(),points=fx.root.children.find(o=>o.isPoints);
 const pointer=fx.root.getObjectByName('interaction-pointer');
 fx.update({time:1});const rotation=pointer.rotation.y;const before=[...points.geometry.attributes.position.array];assert.ok(fx.root.visible);
 fx.update({time:2});assert.notEqual(pointer.rotation.y,rotation);assert.notDeepEqual([...points.geometry.attributes.position.array],before);assert.ok(original.emissive.equals(base));
 fx.update({time:1});assert.deepEqual([...points.geometry.attributes.position.array],before);
 fx.update({reducedMotion:true});assert.ok(fx.root.visible);assert.equal(points.visible,false);assert.equal(pointer.rotation.y,0);assert.equal(pointer.visible,true);
 fx.update({visible:false});assert.equal(fx.root.visible,false);assert.ok(mesh.material.emissive.equals(base));
 let disposed=0;points.geometry.addEventListener('dispose',()=>disposed++);fx.dispose();fx.dispose();assert.equal(disposed,1);assert.equal(mesh.material,original);assert.equal(parent.children.length,1);
 mesh.geometry.dispose();original.dispose();
});

test('event highlight follows availability, distance and outcome without changing simulation state',()=>{
 const view=createGameplayModulesView(new T.Scene(),{load:()=>Promise.resolve(null)}),n={type:'altar_speed',state:'ready',x:0,y:0,z:0};
 const s={time:0,world:{flat:false},player:{x:0,z:0},encounters:{nodes:[n]}};view.update(s);const fx=view.root.children[0].getObjectByName('interaction-highlight');assert.equal(fx.visible,false);
 s.time=180;view.update(s);assert.equal(fx.visible,true);
 for(const state of ['active','complete','failed']){n.state=state;view.update(s);assert.equal(fx.visible,false);}
 n.state='reward';view.update(s);assert.equal(fx.visible,true);
 s.player.x=30;view.update(s);assert.equal(fx.visible,false);s.player.x=0;s.dead=true;view.update(s);assert.equal(fx.visible,false);
 view.dispose();
});

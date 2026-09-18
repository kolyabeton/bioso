import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createConsumableFxView} from '../src/consumable-fx-view.js';

test('sleep indicators track wake, death, expiry, culling and reduced motion',()=>{
 const scene=new T.Scene(),view=createConsumableFxView(scene),camera=new T.PerspectiveCamera();
 const e={id:1,hp:10,x:0,z:0,pickupSleepUntil:5},s={player:{x:0,z:0},enemies:[e]};
 view.update(s,camera,1,.1);assert.equal(view.info().sleepIndicators,1);assert.equal(view.info().consumableFxInstances,4);
 view.update(s,camera,1,0,true);assert.equal(view.info().consumableFxInstances,1);
 e.pickupSleepUntil=0;view.update(s,camera,1,.1);assert.equal(view.info().sleepIndicators,0);
 e.pickupSleepUntil=5;e.hp=0;view.update(s,camera,1,.1);assert.equal(view.info().sleepIndicators,0);
 e.hp=10;view.update(s,camera,5,.1);assert.equal(view.info().sleepIndicators,0);
 view.update(s,camera,1,.1,false,()=>false);assert.equal(view.info().sleepIndicators,0);
 view.dispose();assert.equal(scene.children.length,0);
});
test('bonus effects animate, pause, expire, cap bursts and reset without reallocating',()=>{
 const scene=new T.Scene(),view=createConsumableFxView(scene),camera=new T.PerspectiveCamera(),s={player:{x:0,z:0},enemies:[]};
 view.event({type:'pickup',kind:'sleep',x:0,z:0});view.update(s,camera,0,.1);
 const mesh=scene.getObjectByName('consumable-vfx'),before=mesh.instanceMatrix.array.slice();assert(mesh.count>0);
 view.update(s,camera,0,0);assert.deepEqual(mesh.instanceMatrix.array,before);
 view.update(s,camera,0,.1);assert.notDeepEqual(mesh.instanceMatrix.array,before);
 view.update(s,camera,1,1);assert.equal(mesh.count,0);
 for(let i=0;i<1000;i++)view.event({type:'enemy-damage',source:'consumable',x:0,z:0});view.update(s,camera,1,.1);assert(mesh.count<=512);
 view.reset();assert.equal(mesh.count,0);view.dispose();assert.equal(scene.children.length,0);
});

test('new effects expire, share a bounded pool and reduced motion clears them',()=>{
 const scene=new T.Scene(),view=createConsumableFxView(scene),camera=new T.PerspectiveCamera(),s={player:{x:0,z:0},enemies:[],consumables:{}};
 const hero=new T.Group(),arm=new T.Group();hero.userData.arms=new Map([[1,arm]]);arm.position.set(1,1,0);hero.add(arm);
 for(const type of ['consumable-attract','consumable-recharge','consumable-parasite','shield'])view.event({type,kind:'consumable',source:1,x:0,y:0,z:0,tx:2,ty:1,tz:2,origins:[{x:5,z:5}]});
 view.update(s,camera,0,.1,false,()=>true,hero);assert(view.info().consumableFxInstances>0);view.update(s,camera,0,0,true);assert.equal(view.info().consumableFxInstances,0);
 view.event({type:'shield',kind:'consumable',x:0,z:0});view.update(s,camera,2,2);assert.equal(view.info().consumableFxInstances,0);view.dispose();
});

test('shield expiry dissolves once and pauses with combat time',()=>{
 const scene=new T.Scene(),view=createConsumableFxView(scene),camera=new T.PerspectiveCamera(),s={player:{x:0,z:0},enemies:[],consumables:{shieldCharges:1,shieldUntil:1}};
 view.update(s,camera,.5,.1);s.consumables.shieldCharges=0;view.update(s,camera,1,.1);assert(view.info().consumableFxInstances>0);
 const mesh=scene.getObjectByName('consumable-vfx'),matrices=mesh.instanceMatrix.array.slice();view.update(s,camera,1,0);assert.deepEqual(mesh.instanceMatrix.array,matrices);
 view.update(s,camera,2,1);assert.equal(mesh.count,0);view.update(s,camera,3,1);assert.equal(mesh.count,0);view.dispose();
});

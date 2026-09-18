import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createBossMechanicsView} from '../src/boss-mechanics-view.js';

test('moving support and command nodes render as linked assemblies aimed at their owner',()=>{
 for(const role of ['support','command']){
  const scene=new T.Scene(),view=createBossMechanicsView(scene),boss={id:1,hp:100,x:0,y:0,z:0},partState={id:2,hp:20,maxHp:20,kind:'boss-part',role,bossOwner:1,x:5.5,y:0,z:3.8};
  view.update({time:0,enemies:[boss,partState]});
  const part=scene.getObjectByName(`boss-weakpoint:${role}:2`),link=part.getObjectByName('support-link');
  assert.ok(part.getObjectByName('support-foot'));
  assert.equal(link.children.filter(o=>o.name.startsWith('support-strut-')).length,2);
  assert.ok(part.userData.supportMount.x<0);
  assert.ok(part.userData.supportMount.z<0);
  assert.equal(part.getObjectByName('support-load-indicator').geometry.type,'CylinderGeometry');
  view.dispose();assert.equal(scene.children.length,0);
 }
});

test('stationary root weakpoints keep the existing free-standing core silhouette',()=>{
 const scene=new T.Scene(),view=createBossMechanicsView(scene),boss={id:1,hp:100,x:0,y:0,z:0},root={id:2,hp:20,maxHp:20,kind:'boss-part',role:'root',bossOwner:1,x:2,y:0,z:2};
 view.update({time:0,enemies:[boss,root]});
 const part=scene.getObjectByName('boss-weakpoint:root:2');
 assert.equal(part.getObjectByName('support-link'),undefined);
 assert.equal(part.userData.core.geometry.type,'IcosahedronGeometry');
 view.dispose();
});

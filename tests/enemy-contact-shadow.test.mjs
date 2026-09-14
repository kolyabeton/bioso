import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createEnemyContactShadows,ENEMY_CONTACT_SHADOW_CAPACITY} from '../src/enemy-contact-shadow.js';

test('enemy contacts are batched, ground-aligned and controlled by the high-quality gate',()=>{
 const scene=new T.Scene(),view=createEnemyContactShadows(scene),world={heightAt:(x,z)=>x*.1-z*.05};
 const enemies=[{id:1,x:4,y:.2,z:2,hp:10,radius:.8,kind:'normal'},{id:2,x:-2,y:2,z:1,hp:10,radius:1.2,kind:'boss',flying:true}];
 view.update(enemies,world,false,1);const mesh=scene.getObjectByName('environment-enemy-contacts');assert.equal(mesh.visible,false);assert.equal(mesh.count,0);
 view.update(enemies,world,true,1);assert.equal(mesh.visible,true);assert.equal(mesh.count,2);assert.deepEqual(view.info(),{enemyContactShadows:2,enemyShadowsEnabled:true});
 const grounded=new T.Matrix4(),flying=new T.Matrix4(),groundScale=new T.Vector3(),flyingScale=new T.Vector3();mesh.getMatrixAt(0,grounded);mesh.getMatrixAt(1,flying);grounded.decompose(new T.Vector3(),new T.Quaternion(),groundScale);flying.decompose(new T.Vector3(),new T.Quaternion(),flyingScale);
 assert.ok(Math.abs(new T.Vector3().setFromMatrixPosition(grounded).y-(world.heightAt(4,2)+.035))<1e-6);assert.ok(flyingScale.x>groundScale.x);assert.ok(flyingScale.y<groundScale.y);
 view.reset();assert.equal(mesh.count,0);view.dispose();assert.equal(scene.children.length,0);
});

test('enemy contact capacity is hard bounded',()=>{
 const scene=new T.Scene(),view=createEnemyContactShadows(scene),world={heightAt:()=>0},enemies=Array.from({length:ENEMY_CONTACT_SHADOW_CAPACITY+30},(_,id)=>({id,x:id,z:0,hp:1,radius:.8}));
 view.update(enemies,world,true);assert.equal(view.info().enemyContactShadows,ENEMY_CONTACT_SHADOW_CAPACITY);view.dispose();
});

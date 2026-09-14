import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createEnemyDeathView,ENEMY_DEATH_DURATION,ENEMY_DEATH_CAPACITY,ENEMY_DEBRIS_PER_DEATH} from '../src/enemy-death-view.js';
import {createRun,hurtEnemy,spawnEnemy} from '../src/game.js';

test('lethal damage publishes the visual snapshot before simulation removes the enemy',()=>{
 const s=createRun(undefined,'survival',123);s.events=[];const enemy=spawnEnemy(s,'elite',{x:3,z:4});enemy.y=2;enemy.role=enemy.assemblyRole='armored';
 hurtEnemy(s,enemy,1e9,0,'rocket',true);const death=s.events.find(e=>e.type==='death');
 assert.deepEqual({target:death.target,x:death.x,y:death.y,z:death.z,radius:death.radius,role:death.role,kind:death.kind,source:death.source},{target:enemy.id,x:3,y:2,z:4,radius:enemy.radius,role:'armored',kind:'elite',source:'rocket'});
});

test('enemy separates into moving parts and leaves no corpse or permanent stain',()=>{
 const scene=new T.Scene(),view=createEnemyDeathView(scene);view.event({type:'death',target:9,x:3,y:2,z:4,radius:1,role:'fast',kind:'normal'});view.update(0);
 const chunks=scene.getObjectByName('enemy-body-debris'),heads=scene.getObjectByName('enemy-head-debris'),limbs=scene.getObjectByName('enemy-limb-debris'),before=new T.Matrix4(),after=new T.Matrix4(),debrisColor=new T.Color();chunks.getMatrixAt(0,before);
 assert.equal(chunks.count,2);assert.equal(limbs.count,4);assert.deepEqual(view.info(),{enemyDeaths:1,enemyDebris:ENEMY_DEBRIS_PER_DEATH});
 for(const mesh of [chunks,heads,limbs]){mesh.getColorAt(0,debrisColor);assert.ok(debrisColor.r>.85&&debrisColor.g>.8&&debrisColor.b>.7,'death debris stays warm ceramic');assert.equal(mesh.material.name,'enemy-death-ceramic');assert.equal(mesh.material.map.name,'enemy-death-ceramic-worn');assert.equal(mesh.material.map.userData.source,'/assets/ui/materials/ceramic-worn-v1.jpg');assert.ok(mesh.material.roughness>.8&&mesh.material.metalness<.1);}
 view.update(.45);chunks.getMatrixAt(0,after);assert.notDeepEqual(after.elements,before.elements);
 let footprint=0,largest=0;for(const mesh of [chunks,heads,limbs])for(let i=0;i<mesh.count;i++){const matrix=new T.Matrix4(),position=new T.Vector3(),scale=new T.Vector3();mesh.getMatrixAt(i,matrix);matrix.decompose(position,new T.Quaternion(),scale);footprint=Math.max(footprint,Math.hypot(position.x-3,position.z-4)+Math.max(scale.x,scale.z));largest=Math.max(largest,scale.x,scale.y,scale.z);}assert.ok(footprint<1,'settled pile stays inside the enemy footprint');assert.ok(largest<.5,'death pieces stay smaller than the enemy body');
 view.update(ENEMY_DEATH_DURATION);assert.equal(chunks.count,0);assert.equal(limbs.count,0);assert.deepEqual(view.info(),{enemyDeaths:0,enemyDebris:0});
 view.dispose();assert.equal(scene.children.length,0);
});

test('death aftermath has a hard cap and reduced motion still shows separated parts',()=>{
 const scene=new T.Scene(),view=createEnemyDeathView(scene);
 for(let i=0;i<ENEMY_DEATH_CAPACITY+12;i++)view.event({type:'death',target:i+1,x:i,z:0,radius:.5,role:'mass',kind:'normal'});
 view.update(0,{reducedMotion:true});assert.deepEqual(view.info(),{enemyDeaths:ENEMY_DEATH_CAPACITY,enemyDebris:ENEMY_DEATH_CAPACITY*ENEMY_DEBRIS_PER_DEATH});
 assert.equal(scene.getObjectByName('enemy-body-debris').count,ENEMY_DEATH_CAPACITY*2);view.dispose();
});

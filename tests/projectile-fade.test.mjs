import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createProjectileAfterglow,projectileOpacity,enableProjectileFade,setProjectileOpacity} from '../src/projectile-fade.js';
import {createEnemyProjectileView} from '../src/enemy-projectile-view.js';
import {createHarpoonView} from '../src/harpoon-view.js';
import {createRocketBeeView} from '../src/rocket-bee-view.js';
import {createEffectsView} from '../src/systems/effects-view.js';
import {createOrganicProjectileView} from '../src/organic-projectile-view.js';
import {CHASSIS_MATERIALS} from '../src/creature-materials.js';

test('organic bodies preserve 3D flight and afterglow across bounded pool reuse without mutating shared glass',()=>{
 const scene=new T.Scene(),view=createOrganicProjectileView(scene,1),sharedColor=CHASSIS_MATERIALS.glass.color.getHex();
 const shots=['seed','acid'].map(key=>({w:{key},x:2,y:3,z:4,dx:1,dy:1,dz:1,presentationAge:.05}));
 view.update([...shots,shots[0]],q=>q.y);
 for(const key of ['seed','acid']){
  const mesh=scene.getObjectByName(`player-projectile-${key}-body`),matrix=new T.Matrix4(),position=new T.Vector3(),rotation=new T.Quaternion(),scale=new T.Vector3();
  assert.equal(mesh.count,1);assert.equal(mesh.geometry.getAttribute('projectileAlpha').getX(0),.5);
  mesh.getMatrixAt(0,matrix);matrix.decompose(position,rotation,scale);
  assert.deepEqual(position.toArray(),[2,3,4]);assert.ok(new T.Vector3(0,0,1).applyQuaternion(rotation).dot(new T.Vector3(1,1,1).normalize())>.999);
 }
 view.update(shots.map(({presentationAge,...shot})=>shot),q=>q.y);
 assert.equal(scene.getObjectByName('player-projectile-acid-body').geometry.getAttribute('projectileAlpha').getX(0),1);
 assert.equal(CHASSIS_MATERIALS.glass.color.getHex(),sharedColor);
 view.reset();assert.ok(scene.children.every(mesh=>mesh.count===0));view.dispose();assert.equal(scene.children.length,0);
});

test('active shots remain fully visible to range; stopped bodies fade before their stationary traces',()=>{
 const shot={mode:'projectile',life:.01,damage:10,speed:18,travel:8};assert.equal(projectileOpacity(shot),1);
 assert.equal(projectileOpacity({...shot,presentationAge:.05}),.5);
 assert.equal(projectileOpacity({...shot,presentationAge:.10}),0);
 assert.equal(projectileOpacity({...shot,presentationAge:.125},true),.5);
 assert.equal(projectileOpacity({...shot,presentationAge:.25},true),0);
 assert.equal(shot.life,.01);
});
test('removed shots leave bounded frozen view copies without extending damage or rocket explosions',()=>{
 const view=createProjectileAfterglow(2),shots=[1,2,3].map(id=>({id,x:id,y:1,z:0,life:1,mode:'projectile'}));
 view.update(shots,0);shots[2].x=10;
 const remnants=view.update([],1);assert.equal(remnants.length,2);assert.equal(remnants[1].x,10);assert.equal(remnants[1].presentationAge,0);
 assert.equal(shots[2].presentationAge,undefined);assert.equal(view.update([] ,1.125)[1].x,10);
 assert.equal(view.update([],1.25).length,0);
 view.update([{id:4,mode:'rocket'}],2);assert.equal(view.update([],3).length,0);
 view.update(shots,4);view.reset();assert.equal(view.update([],5).length,0);
 view.update(shots,6);assert.equal(view.update([],0).length,0,'new run clock must clear previous projectiles');
 view.update(shots,7,'forest');assert.equal(view.update([],8,'dungeon').length,0,'world transitions must not leave traces in the new world');
});
test('returning shots and recycled ids do not produce overlapping afterglows',()=>{
 const view=createProjectileAfterglow(),shot={id:1,mode:'projectile',returnable:true};
 view.update([shot],0);assert.equal(view.update([{...shot,returning:true}],1).length,1);
 assert.equal(view.update([],2).length,1);const reborn={...shot};assert.deepEqual(view.update([reborn],2.1),[reborn]);
});
test('instance alpha preserves material shader hooks and is independent per slot; resized pools restore opaque slots',()=>{
 const mesh=new T.InstancedMesh(new T.SphereGeometry(),new T.MeshStandardMaterial(),2);
 mesh.material.onBeforeCompile=s=>s.fragmentShader='// original\n'+s.fragmentShader;
 enableProjectileFade(mesh);setProjectileOpacity(mesh,0,.5);setProjectileOpacity(mesh,1,1);
 const shader={vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};mesh.material.onBeforeCompile(shader);
 assert.ok(shader.fragmentShader.includes('// original'));assert.ok(shader.fragmentShader.includes('diffuseColor.a*=vProjectileAlpha'));
 assert.ok(shader.vertexShader.includes('vProjectileAlpha=projectileAlpha'));assert.equal(mesh.material.depthWrite,false);
 assert.deepEqual([...mesh.geometry.getAttribute('projectileAlpha').array],[.5,1]);
 mesh.instanceMatrix=new T.InstancedBufferAttribute(new Float32Array(4*16),16);setProjectileOpacity(mesh,3,.2);
 assert.equal(mesh.geometry.getAttribute('projectileAlpha').getX(0),.5);assert.equal(mesh.geometry.getAttribute('projectileAlpha').getX(2),1);
 mesh.geometry.dispose();mesh.material.dispose();mesh.dispose();
});
test('every hostile layer fades together and slots return to full opacity when reused',()=>{
 const scene=new T.Scene(),view=createEnemyProjectileView(scene,2);
 for(const reduced of [false,true]){
  view.update(['seed','needle','legacy'].flatMap(key=>[.05,null].map((presentationAge,id)=>({key,id,presentationAge,x:0,y:1,z:0,dx:1,dz:0,life:1,travel:3}))),0,reduced);
  for(const mesh of scene.getObjectByName('enemy-projectiles').children){
   if(!mesh.count)continue;const alpha=mesh.geometry.getAttribute('projectileAlpha');assert.ok(Math.abs(alpha.getX(0)-(/-(trail|wake|motes)$/.test(mesh.name)?.8:.5))<1e-6,mesh.name);assert.equal(alpha.getX(mesh.count-1),1,mesh.name);
  }
 }
 view.update([{key:'seed',x:0,z:0,dx:1,dz:0,life:2}],1);assert.equal(scene.getObjectByName('enemy-projectile-seed-body').geometry.getAttribute('projectileAlpha').getX(0),1);
 view.dispose();
});
test('harpoon cable, ricochet bee body, wings and engine share expiry opacity',()=>{
 const scene=new T.Scene(),harpoon=createHarpoonView(scene,1),bee=createRocketBeeView(scene,2,{formation:false});
 const shots=[{id:1,x:0,y:1,z:2,dx:0,dz:1,life:0,presentationAge:.05,mode:'projectile'}];
 harpoon.update(shots,q=>q.y,(_,point)=>{point.set(0,1,-2);return true;});bee.update(shots,q=>q.y);
 for(const mesh of scene.children){if(!mesh.count)continue;for(let i=0;i<mesh.count;i++)assert.equal(mesh.geometry.getAttribute('projectileAlpha').getX(i),.5,mesh.name);}
 harpoon.dispose();bee.dispose();
});
test('summon shot fades without altering role marker geometry or simulation lifetime',()=>{
 const scene=new T.Scene(),view=createEffectsView(scene),shot={x:0,y:0,z:0,life:.12,presentationAge:.125,delay:0};
 const s={time:0,enemies:[],hostileShots:[],abilities:{companions:[],summonShots:[shot]},organs:[],arms:[],legs:[],body:{},soul:{}};
 view.update(s);const mesh=scene.getObjectByName('ability-effects').children.find(m=>m.isInstancedMesh&&m.count===1);
 assert.equal(mesh.geometry.getAttribute('projectileAlpha').getX(0),.5);assert.equal(shot.life,.12);view.dispose();
});

test('trail shader cache separates geometry bounds so shell and cone gradients cannot alias',()=>{
 const meshes=[new T.SphereGeometry(1),new T.ConeGeometry(1,1).rotateX(-Math.PI/2)].map(geometry=>enableProjectileFade(new T.InstancedMesh(geometry,new T.MeshBasicMaterial(),1),{trail:true}));
 assert.notEqual(meshes[0].material.customProgramCacheKey(),meshes[1].material.customProgramCacheKey());
 for(const mesh of meshes){mesh.geometry.dispose();mesh.material.dispose();mesh.dispose();}
});

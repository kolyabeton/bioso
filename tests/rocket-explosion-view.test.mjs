import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createRocketExplosionView} from '../src/rocket-explosion-view.js';

test('rocket blast creates a bounded layered 3D explosion from only its own event',()=>{
 const scene=new T.Group(),view=createRocketExplosionView(scene),root=scene.getObjectByName('rocket-explosion-effects');
 assert.ok(root);assert.ok(root.children.length>=8);assert.ok(root.children.filter(child=>child!==root.getObjectByName('rocket-explosion-light')).every(mesh=>mesh.isInstancedMesh));assert.ok(root.getObjectByName('rocket-explosion-light').isPointLight);assert.equal(root.getObjectByName('rocket-explosion-ground-wave'),undefined);
 const fire=root.getObjectByName('rocket-explosion-fire-volumes');assert.ok(fire.material.isMeshBasicMaterial);assert.equal(fire.material.blending,T.AdditiveBlending);assert.equal(fire.material.map,null);assert.ok(fire.geometry.getAttribute('position').count>300);assert.ok(fire.geometry.getAttribute('color'));assert.equal(root.getObjectByName('rocket-explosion-flame-sheets'),undefined);
 assert.equal(view.event({type:'blast',key:'thermal',x:0,z:0}),false);
 assert.equal(view.event({type:'hit',key:'rocket',x:0,z:0}),false);assert.equal(view.count(),0);
 assert.equal(view.event({type:'blast',key:'rocket',x:2,y:3,z:-4,radius:1.5}),true);
 assert.equal(view.event({type:'blast',key:'rocket',x:2.1,y:3,z:-4,radius:1.5}),true);assert.equal(view.count(),1);
 assert.equal(root.getObjectByName('rocket-explosion-hot-fireballs'),undefined);assert.equal(root.getObjectByName('rocket-explosion-fireballs'),undefined);
 view.update(.06,false);let info=view.info();assert.equal(info.active,1);assert.equal(info.flash,1);assert.ok(info.fireballs>=3&&info.fireballs<=5);assert.equal(info.pressure,1);assert.equal(info.rings,0);
 assert.ok(info.sparks>=5);assert.ok(info.debris>=2);assert.ok(info.dust>=2);assert.equal(info.radius,1.5);view.update(.22,false);info=view.info();assert.ok(info.smoke>=1&&info.smoke<=3);
 for(let i=0;i<35;i++)view.update(.1,false);assert.deepEqual(view.info(),{active:0,flash:0,fireballs:0,pressure:0,rings:0,sparks:0,debris:0,smoke:0,dust:0,reducedMotion:false,radius:1.5});
 view.dispose();assert.equal(scene.children.length,0);
});

test('reduced motion preserves the readable blast silhouette with fewer moving pieces',()=>{
 const scene=new T.Group(),view=createRocketExplosionView(scene);view.event({type:'blast',key:'rocket',x:0,z:0,radius:1.5});view.update(.06,true);
 const info=view.info();assert.equal(info.active,1);assert.equal(info.flash,1);assert.ok(info.fireballs>0);assert.equal(info.pressure,1);assert.equal(info.rings,0);assert.equal(info.reducedMotion,true);
 assert.ok(info.sparks>0&&info.sparks<=2);assert.ok(info.debris>0&&info.debris<=1);assert.ok(info.smoke<=1);assert.ok(info.dust>0&&info.dust<=1);
 view.reset();assert.equal(view.count(),0);assert.deepEqual(view.info(),{active:0,flash:0,fireballs:0,pressure:0,rings:0,sparks:0,debris:0,smoke:0,dust:0,reducedMotion:false,radius:1.5});view.dispose();
});

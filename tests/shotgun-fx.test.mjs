import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createShotgunParticles,createShotgunFxView} from '../src/shotgun-fx.js';
import {createBioParticles} from '../src/bio-fx.js';
import {projectileStyle} from '../src/weapon-visuals.js';
import {weaponPose} from '../src/combat-visual.js';
const shot={type:'attack',key:'shotgun',x:2,y:4,z:3,tx:2,tz:8};
test('shotgun uses a short flash, soft smoke and sparse sparks without generic energy particles',()=>{
 const fx=createShotgunParticles(),before=JSON.stringify(shot);fx.event(shot);assert.equal(JSON.stringify(shot),before);
 assert.equal(fx.particles.filter(p=>p.kind==='flash').length,4);assert.ok(fx.particles.every(p=>!p.life||p.y===4));
 fx.step(.08);assert.ok(!fx.particles.some(p=>p.kind==='flash'&&p.life>0));assert.ok(fx.particles.some(p=>p.kind==='smoke'&&p.life>0));fx.step(.6);assert.equal(fx.count(),0);
 const bio=createBioParticles();bio.emit(shot);bio.emit({...shot,type:'hit'});assert.equal(bio.count(),0);
 assert.ok(projectileStyle({w:{key:'shotgun'}}).width<.05);
});
test('shotgun effect pools remain bounded, reduced motion clears them and reset disposes live instances',()=>{
 const scene=new T.Scene(),fx=createShotgunFxView(scene);for(let i=0;i<200;i++)fx.event(shot);assert.ok(fx.count()<=96);fx.update(.02);assert.ok(scene.children.some(m=>m.count>0));
 for(const mesh of scene.children)for(const n of mesh.instanceMatrix.array)assert.ok(Number.isFinite(n));
 fx.configure('low',true);fx.event(shot);fx.update(.01);assert.equal(fx.count(),0);assert.ok(scene.children.every(m=>m.count===0));fx.configure('low',false);fx.event(shot);fx.reset();assert.equal(fx.count(),0);fx.dispose();assert.equal(scene.children.length,0);
});
test('shotgun kick snaps back quickly and settles independently from reload',()=>{
 assert.ok(weaponPose({key:'shotgun',attackAge:.02}).retract>.3);assert.equal(weaponPose({key:'shotgun',attackAge:.3}).retract,0);
 assert.ok(weaponPose({key:'shotgun',reloadRemaining:1.6,reloadDuration:3.2}).lift>.5);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createBioParticles,FX_CAPACITY,WEAPON_COLORS} from '../src/bio-fx.js';
import {createBioFxView} from '../src/bio-fx-view.js';
import {createChangeTracker,effectiveReducedMotion,pulse,enterScreen} from '../src/ui/motion.js';

test('HUD updates consume changes once and a new run establishes a fresh baseline',()=>{
 const tracker=createChangeTracker();assert.deepEqual(tracker.sample({hp:3,level:1}),[]);
 assert.deepEqual(tracker.sample({hp:2,level:1}),['hp']);assert.deepEqual(tracker.sample({hp:2,level:1}),[]);
 tracker.reset();assert.deepEqual(tracker.sample({hp:3,level:1}),[]);
});
test('either reduced-motion preference suppresses JS feedback and screen animations',()=>{
 for(const setting of [false,true])for(const system of [false,true])assert.equal(effectiveReducedMotion(setting,system),setting||system);
 const node={ownerDocument:{body:{dataset:{reducedMotion:'true'}}},animate(){assert.fail('motion must be suppressed');}};
 pulse(node);enterScreen(node,node);
});
test('repeat feedback cancels only the previous pulse, preserving unrelated animation',()=>{
 let cancelled=0;const node={ownerDocument:{body:{dataset:{}}},getAnimations:()=>[{id:'bio-feedback',cancel(){cancelled++;}},{id:'other',cancel(){assert.fail();}}],animate:()=>({})};
 pulse(node,'shot');assert.equal(cancelled,1);
});
test('bursts reuse fixed storage; low and reduced motion limit decoration immediately',()=>{
 const fx=createBioParticles(),identities=[...fx.particles];
 for(let i=0;i<1000;i++)fx.emit({type:'hit',killed:true,x:0,z:0});
 assert.ok(fx.count()<=112);assert.equal(fx.particles.length,FX_CAPACITY);assert.ok(fx.particles.every((p,i)=>p===identities[i]));
 fx.configure('low',false);assert.ok(fx.count()<=32);fx.configure('high',true);assert.equal(fx.count(),0);
 fx.emit({type:'blast',x:0,z:0});assert.equal(fx.count(),0);
});
test('pause freezes particles, expiry clears them and restart has no stale effects',()=>{
 const fx=createBioParticles();fx.emit({type:'blast',x:1,y:4,z:2});const before=structuredClone(fx.particles);fx.step(0);assert.deepEqual(fx.particles,before);
 fx.step(1);assert.equal(fx.count(),0);fx.emit({type:'level',x:0,z:0});fx.reset();assert.equal(fx.count(),0);
});
test('weapon colors are distinct and arcs connect elevated world endpoints',()=>{
 assert.notEqual(WEAPON_COLORS.acid,WEAPON_COLORS.rocket);
 const fx=createBioParticles();fx.emit({type:'arc',x:0,y:5,z:0,tx:8,tz:0});
 const active=fx.particles.filter(p=>p.life>0);assert.equal(active.length,8);assert.ok(active.every(p=>p.y>5&&p.length>0));
 assert.equal(active[0].x,.5);assert.equal(active.at(-1).x,7.5);
});
test('Three view keeps one draw object and releases geometry/material on disposal',()=>{
 const scene=new T.Scene(),fx=createBioFxView(scene),mesh=scene.children[0];let disposed=0;
 mesh.geometry.addEventListener('dispose',()=>disposed++);mesh.material.addEventListener('dispose',()=>disposed++);
 for(let i=0;i<200;i++){fx.event({type:'hit',x:0,z:0});fx.update(.016);}
 assert.equal(scene.children.length,1);assert.ok(mesh.count<=112);fx.reset();assert.equal(mesh.count,0);fx.dispose();assert.equal(scene.children.length,0);assert.equal(disposed,2);
});

test('survival result fixture works without a mission object',async()=>{
 const {createRun}=await import('../src/game.js');const {prepareReview}=await import('../src/ui/review-fixtures.js');
 const old=globalThis.location;globalThis.location={search:''};
 try {const run=createRun(undefined,'survival',20317);assert.ok(run.mission==null);prepareReview(run,'end');assert.equal(run.won,true);assert.equal(run.level,12);} finally {if(old===undefined)delete globalThis.location;else globalThis.location=old;}
});

test('each melee weapon has a distinct trajectory, with a shield thrust and drill rotation',async()=>{
 const {meleePose}=await import('../src/melee-animation.js');
 const keys=['claws','hammer','drill','whip','fangs'];
 const poses=keys.map(k=>meleePose(k,.45));assert.equal(new Set(poses.map(p=>JSON.stringify(p))).size,5);
 assert.ok(poses[1].extension>1);assert.ok(poses[2].spin>10);assert.equal(poses[1].trail,false);
 for(const key of keys){assert.equal(meleePose(key,.45,1).yaw,-meleePose(key,.45,-1).yaw||0);}
});
test('projectiles differ in silhouette and trail length, independent of simulation stats',async()=>{
 const {PROJECTILE_STYLES,projectileStyle}=await import('../src/weapon-visuals.js');
 assert.equal(new Set(Object.values(PROJECTILE_STYLES).map(p=>[p.width,p.length,p.trail].join(','))).size,5);
 assert.ok(projectileStyle({w:{key:'needle'}}).length>projectileStyle({mode:'acid'}).length);
});
test('melee effects have different spatial patterns and expire in fixed storage',()=>{
 const patterns=[];for(const key of ['claws','hammer','drill','whip','fangs']){
  const fx=createBioParticles();fx.emit({type:'attack',key,x:0,z:0,tx:0,tz:5});
  patterns.push(JSON.stringify(fx.particles.filter(p=>p.life>0).map(p=>[p.x,p.z,p.length])));
  fx.step(1);assert.equal(fx.count(),0);
 }assert.equal(new Set(patterns).size,5);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {BIO_BLOOD_COLORS,ENEMY_BLOOD_COLORS,createBioParticles,FX_CAPACITY,WEAPON_COLORS} from '../src/bio-fx.js';
import {createBioFxView} from '../src/bio-fx-view.js';
import {prepareHitVfxReview} from '../src/hit-vfx-review.js';
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
test('player hit pours varied directional green droplets that fall and settle without allocating beyond the pool',()=>{
 const fx=createBioParticles(),identities=[...fx.particles];fx.emit({type:'player-hit',x:2,y:3,z:4,dx:1,dz:0});const drops=fx.particles.filter(p=>p.life>0);
 assert.equal(drops.length,4);assert.ok(drops.every(p=>p.kind==='blood'&&BIO_BLOOD_COLORS.includes(p.color)&&p.gravity>9&&p.floor===3.025));assert.ok(new Set(drops.map(p=>p.size)).size>=4);assert.ok(drops.reduce((sum,p)=>sum+p.vx,0)>drops.reduce((sum,p)=>sum+Math.abs(p.vz),0));
 let settled=false;for(let i=0;i<14;i++){fx.step(.05);settled||=fx.particles.some(p=>p.life>0&&p.grounded);}assert.ok(settled);assert.ok(fx.particles.every((p,i)=>p===identities[i]));
});
test('enemy death creates a small radial burst of yellow droplets',()=>{
 const fx=createBioParticles();fx.emit({type:'death',target:17,x:2,y:1,z:4,radius:1.2});const drops=fx.particles.filter(p=>p.life>0);
 assert.equal(drops.length,12);assert.ok(drops.every(p=>p.kind==='blood'&&ENEMY_BLOOD_COLORS.includes(p.color)&&p.floor===1.025&&p.size<=.054));
 assert.ok(drops.some(p=>p.vx>0)&&drops.some(p=>p.vx<0)&&drops.some(p=>p.vz>0)&&drops.some(p=>p.vz<0));
});
test('hit VFX review loops the real player-hit event without spawning combatants',()=>{
 const run={hp:2,player:{x:3,y:1,z:4},enemies:[{}],hostileShots:[{}],waves:{credit:0,nextElite:0,nextBoss:0},nextElite:0,nextBoss:0},events=[];let now=100,emitted=[];
 const review=prepareHitVfxReview(run,event=>emitted.push(event),()=>now);review.tick();review.tick();assert.equal(emitted.length,1);assert.deepEqual(emitted[0],{type:'player-hit',hp:2,cause:'review',x:3,y:1,z:4,dx:.707,dz:-.707});
 now+=1100;review.tick();assert.equal(emitted.length,2);assert.equal(run.enemies.length+run.hostileShots.length,0);assert.equal(review.paused,false);
});
test('Three view keeps two pooled draw objects and releases both materials and geometries',()=>{
 const scene=new T.Scene(),fx=createBioFxView(scene),meshes=scene.children;let disposed=0;
 for(const mesh of meshes){mesh.geometry.addEventListener('dispose',()=>disposed++);mesh.material.addEventListener('dispose',()=>disposed++);}
 for(let i=0;i<200;i++){fx.event({type:'hit',x:0,z:0});fx.update(.016);}
 const energy=scene.getObjectByName('bio-energy-particles'),blood=scene.getObjectByName('bio-blood-droplets');assert.equal(scene.children.length,2);assert.ok(energy.count<=112);assert.equal(blood.count,0);
 fx.event({type:'player-hit',x:0,y:0,z:0});fx.update(.016);assert.ok(blood.count>0);assert.equal(blood.material.isMeshStandardMaterial,true);fx.reset();assert.equal(energy.count+blood.count,0);fx.dispose();assert.equal(scene.children.length,0);assert.equal(disposed,4);
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
 assert.equal(new Set(Object.values(PROJECTILE_STYLES).map(p=>[p.width,p.length,p.trail].join(','))).size,7);
 assert.ok(projectileStyle({w:{key:'needle'}}).length>projectileStyle({mode:'acid'}).length);
});
test('melee effects have different spatial patterns and expire in fixed storage',()=>{
 for(const key of ['claws','drill','whip']){const fx=createBioParticles();fx.emit({type:'attack',key,x:0,z:0,tx:0,tz:5});assert.equal(fx.count(),0,'retired particle waves stay removed');}
 const patterns=[];for(const key of ['hammer','fangs']){
  const fx=createBioParticles();fx.emit({type:'attack',key,x:0,z:0,tx:0,tz:5});
  patterns.push(JSON.stringify(fx.particles.filter(p=>p.life>0).map(p=>[p.x,p.z,p.length])));
  fx.step(1);assert.equal(fx.count(),0);
 }assert.equal(new Set(patterns).size,2);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createRun,spawnEnemy,receiveDamage,attack} from '../src/game.js';
import {createPart,stats} from '../src/assembly.js';
import {learn,updateMotion} from '../src/systems/abilities.js';
import {onHit,lightning} from '../src/systems/effects.js';
import {createSoulFxView,SOUL_FX_LIMITS} from '../src/systems/soul-fx-view.js';
const procs=s=>s.events.filter(e=>e.type==='soul-proc').map(e=>e.kind);
test('element visuals follow successful rolls and preserve elevation',()=>{
 const s=createRun(undefined,'survival',8),e=spawnEnemy(s,'normal',{x:2,z:0});e.y=6;
 learn(s,'fire.0');learn(s,'cold.0');learn(s,'cold.3');s.rng=()=>1;onHit(s,e,10,()=>{});assert.deepEqual(procs(s),[]);
 s.rng=()=>0;for(let i=0;i<3;i++)onHit(s,e,10,()=>{});
 assert.ok(procs(s).includes('freeze'));assert.equal(s.events.find(e=>e.type==='soul-proc').y,6);
});
test('revive and movement trigger once; no lightning visual without a target',()=>{
 const s=createRun(undefined,'survival',8);learn(s,'vitality.3');s.hp=1;s.health.armorSpent=stats(s).armor;receiveDamage(s,1);assert.deepEqual(procs(s),['revive']);
 learn(s,'motion.3');updateMotion(s,2,true);updateMotion(s,2,true);assert.equal(procs(s).filter(k=>k==='running').length,1);
 s.events=[];lightning(s,{damage:10,range:10},()=>{});assert.deepEqual(procs(s),[]);
});
test('effect pool is bounded, pause preserves age, reset clears all visuals',()=>{
 const scene=new T.Scene(),view=createSoulFxView(scene);
 for(let i=0;i<100;i++)view.event({type:'soul-proc',kind:'burn',x:i,y:4,z:0});
 assert.equal(view.count(),24);view.update(0);assert.equal(view.count(),24);view.update(2);assert.equal(view.count(),0);
 view.event({type:'soul-proc',kind:'revive',x:0,y:0,z:0});view.reset();assert.equal(view.count(),0);view.dispose();assert.equal(scene.children.length,0);
});

test('persistent status follows current targets, stops spawning on expiry and stays within budget',()=>{
 const scene=new T.Scene(),view=createSoulFxView(scene),s=createRun(undefined,'survival',8);
 const e=spawnEnemy(s,'normal',{x:2,z:0});e.burn={until:2,dps:1};
 view.update(.1,false,s);assert.ok(view.info().particles>0);
 const frozen=view.info().particles;view.update(0,false,s);assert.equal(view.info().particles,frozen);
 e.x=5;for(let i=0;i<20;i++)view.update(.1,false,s);assert.ok(view.info().particles<=1536);
 s.time=3;view.update(3,false,s);assert.equal(view.info().particles,0);
 assert.equal(scene.getObjectByName('soul-activation-effects').children.filter(o=>o.isMesh).length,2);view.dispose();
});

test('persistent fire becomes denser with accumulated burn stacks',()=>{
 const scene=new T.Scene(),view=createSoulFxView(scene),s=createRun(undefined,'survival',8),e=spawnEnemy(s,'normal',{x:2,z:0});
 const flames=()=>scene.getObjectByName('soul-activation-effects').children.filter(o=>o.isMesh).reduce((sum,o)=>sum+Array.from({length:o.geometry.instanceCount},(_,i)=>o.geometry.attributes.data.getX(i)).filter(type=>type===9).length,0);
 e.burn={until:4,dps:2,count:1,stacks:[{until:4,dps:2}]};view.update(.1,false,s);const single=flames();
 view.reset();e.burn={until:4,dps:10,count:5,stacks:Array.from({length:5},()=>({until:4,dps:2}))};view.update(.1,false,s);assert.ok(flames()>single);view.dispose();
});

test('body fire follows a moving elevated target between emissions and clears on death',()=>{
 const scene=new T.Scene(),view=createSoulFxView(scene),s=createRun(undefined,'survival',8),e=spawnEnemy(s,'normal',{x:2,z:0});
 e.y=6;e.burn={until:4,dps:2,count:1};view.update(.01,false,s);
 const batch=scene.getObjectByName('soul-activation-effects').children.find(o=>o.isMesh&&o.geometry.attributes.data.getX(0)===9);
 assert.ok(batch);assert.equal(batch.material.depthTest,true);
 const a=batch.geometry.attributes,old={x:a.center.getX(0),y:a.center.getY(0),z:a.center.getZ(0)};
 assert.ok(old.y>6);e.x+=3;e.y+=2;e.z-=1;view.update(.01,false,s);
 assert.ok(Math.abs(a.center.getX(0)-old.x-3)<.001);assert.ok(Math.abs(a.center.getZ(0)-old.z+1)<.001);
 assert.ok(a.center.getY(0)>old.y+2);e.hp=0;view.update(.01,false,s);assert.equal(batch.geometry.instanceCount,0);view.dispose();
});

test('real extra shots and echo report actual direction without extra gameplay RNG',()=>{
 const s=createRun(undefined,'survival',8);s.arms=[createPart(s,'seed')];learn(s,'projectiles.0');
 const target=spawnEnemy(s,'normal',{x:3,z:0});target.hp=1000;
 let rolls=0;s.rng=()=>{rolls++;return .5;};attack(s,0);
 const multi=s.events.find(e=>e.kind==='multishot');assert.equal(multi.count,s.shots.length);assert.equal(multi.tx,target.x);
 s.events=[];attack(s,0,undefined,s.arms[0]);const echo=s.events.find(e=>e.kind==='echo');assert.equal(echo.tz,target.z);
 const before=rolls,view=createSoulFxView(new T.Scene());view.event(echo);view.update(.1,false,s);assert.equal(rolls,before);view.dispose();
});

test('volatile uses shared flame and smoke buffers, respects elevation, pause and cleanup',()=>{
 const scene=new T.Scene(),view=createSoulFxView(scene),s=createRun(undefined,'survival',8);
 const e=spawnEnemy(s,'normal',{x:2,z:0});e.y=6;e.volatile=true;e.fuseRemaining=.7;
 view.update(.1,false,s);assert.ok(view.info().particles>0);
 const batches=scene.getObjectByName('soul-activation-effects').children.filter(o=>o.isMesh);
 const types=batches.flatMap(b=>Array.from({length:b.geometry.instanceCount},(_,i)=>b.geometry.attributes.data.getX(i)));
 assert.ok(types.includes(0));assert.ok(types.includes(7));
 const n=view.info().particles;view.update(0,false,s);assert.equal(view.info().particles,n);
 e.hp=0;view.update(2,false,s);assert.equal(view.info().particles,0);
 view.event({type:'volatile-blast',x:2,y:6,z:0,radius:3.2});view.update(.1);
 assert.ok(view.info().particles>20);
 for(const b of batches)for(let i=0;i<b.geometry.instanceCount;i++)assert.ok(b.geometry.attributes.center.getY(i)>=6);
 view.update(3);assert.equal(view.info().particles,0);view.reset();view.dispose();
});

test('volatile pressure pop covers the damage radius within .12 seconds and remains low',()=>{
 const scene=new T.Scene(),view=createSoulFxView(scene);
 view.event({type:'volatile-blast',x:0,y:4,z:0,radius:3.2});view.update(.12);
 const batches=scene.getObjectByName('soul-activation-effects').children.filter(o=>o.isMesh);
 let footprint=0,outerDust=0;
 for(const b of batches){const a=b.geometry.attributes;for(let i=0;i<b.geometry.instanceCount;i++){
  assert.ok(a.center.getY(i)<4.6,'blast stays close to ground');
  if(a.data.getX(i)===8){footprint++;assert.ok(Math.abs(a.extent.getX(i)-6.4)<.001);}
  if(a.data.getX(i)===1&&Math.hypot(a.center.getX(i),a.center.getZ(i))>2)outerDust++;
 }}
 assert.equal(footprint,1);assert.ok(outerDust>=8);view.update(.7);assert.equal(view.info().particles,0);view.dispose();
});

test('all new ability VFX use bounded pools, merge bursts, and retain reduced-motion cues',()=>{
 const scene=new T.Scene(),view=createSoulFxView(scene),kinds=['focus','rupture','guardian','neuralweb','countershell-charge','countershell','sporeplant','sporebrood','overgrowth','cryotrail'];
 assert.deepEqual(SOUL_FX_LIMITS,{highParticles:1536,lowParticles:512,abilitySources:24,groundTrails:64,mergeSeconds:.12});view.configure('low');
 for(const [i,kind] of kinds.entries()){const e={type:'soul-proc',kind,x:i,y:2,z:0,tx:i+2,ty:2,tz:1,radius:2.5,level:5};view.event(e);view.event(e);}
 assert.equal(view.count(),kinds.length);view.update(.05,true);assert.ok(view.info().particles>0);assert.ok(view.info().particles<=SOUL_FX_LIMITS.lowParticles);
 assert.equal(scene.getObjectByName('soul-activation-effects').children.filter(o=>o.isMesh).length,2);view.dispose();
});

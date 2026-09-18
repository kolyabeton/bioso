import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createDeathView,needsDeathAnimation,DEATH_DURATION} from '../src/death-view.js';
import {creatureModel} from '../src/game-view.js';
import {createRun,step} from '../src/game.js';
import {createPart,stats} from '../src/assembly.js';
import {receiveHit} from '../src/systems/health.js';

test('a lethal hit delays results, separates actual equipped parts and freezes gameplay',async()=>{
 const s=createRun(undefined,'survival',123),scene=new T.Scene(),hero=creatureModel(s);await hero.userData.modelsReady;scene.add(hero);
 const view=createDeathView(scene),st=stats(s);s.hp=1;s.health.armorSpent=st.armor;receiveHit(s,st);step(s,.02);
 assert.equal(s.dead,true);assert.equal(view.pending(s),true);
 const before={time:s.time,kills:s.kills,xp:s.xp,player:{...s.player}};
 view.update(s,hero,0);assert.equal(hero.visible,false);
 const debris=scene.getObjectByName('player-death'),limb=debris.children.find(o=>o.name.startsWith('arm-'));
 assert.ok(limb);const start=limb.position.clone();view.update(s,hero,.7);assert.ok(limb.position.distanceTo(start)>.3);
 for(let i=0;i<180;i++){step(s,.02,{x:1,z:0});view.update(s,hero,.02);}
 assert.equal(view.pending(s),false);assert.equal(view.info().elapsed,DEATH_DURATION);
 assert.deepEqual({time:s.time,kills:s.kills,xp:s.xp,player:{...s.player}},before);
 for(const part of debris.children.filter(o=>o.name!=='departing-soul'))assert.ok(new T.Box3().setFromObject(part).min.y>=-.001);
 view.reset();assert.equal(hero.visible,true);assert.equal(debris.children.length,0);assert.equal(view.info().active,false);
});

test('pause preserves the death pose and reduced motion still reaches a readable fallen state',async()=>{
 const s=createRun();s.hp=0;s.dead=true;const scene=new T.Scene(),hero=creatureModel(s);await hero.userData.modelsReady;scene.add(hero);
 const view=createDeathView(scene);view.update(s,hero,.4,{reducedMotion:true});const parts=scene.getObjectByName('player-death');
 const pose=parts.children.map(o=>o.position.toArray());view.update(s,hero,10,{paused:true,reducedMotion:true});assert.equal(view.info().elapsed,.4);assert.deepEqual(parts.children.map(o=>o.position.toArray()),pose);
 view.update(s,hero,3,{reducedMotion:true});assert.equal(view.pending(s),false);assert.ok(parts.children.length>2);
});

test('nonlethal hits, revival and mission failure do not disassemble a living creature',()=>{
 const s=createRun();s.rng=()=>1;receiveHit(s,stats(s));assert.equal(needsDeathAnimation(s),false);
 s.hp=1;s.health.invulnerableUntil=0;assert.equal(receiveHit(s,{...stats(s),revive:true}),'revived');assert.equal(needsDeathAnimation(s),false);
 s.dead=true;assert.equal(needsDeathAnimation(s),false);
});

test('loaded body/head and varied limb assemblies keep shared materials and late loads out of debris',async()=>{
 for(const key of ['wanderer','bastion','hecaton']){
  const s=createRun();s.body=createPart(s,key);s.arms=[createPart(s,'seed'),createPart(s,'claws')];s.legs=[createPart(s,'runner'),createPart(s,'root')];
  const template=new T.Group(),material=new T.MeshStandardMaterial(),geometry=new T.BoxGeometry(1,1,1),mockMesh=new T.Mesh(geometry,material);mockMesh.name='mock-steel';template.add(mockMesh);
  let disposed=0;material.addEventListener('dispose',()=>disposed++);geometry.addEventListener('dispose',()=>disposed++);
  const scene=new T.Scene(),hero=creatureModel(s,{load:async()=>template});await hero.userData.modelsReady;scene.add(hero);hero.position.set(7,2,4);hero.rotation.y=.8;hero.scale.setScalar(1.3);s.player.y=2;s.hp=0;s.dead=true;
  const view=createDeathView(scene);view.update(s,hero,0);const debris=scene.getObjectByName('player-death');assert.ok(debris.children.some(o=>o.name.startsWith('asset:body-')));
  const count=debris.children.length;hero.add(new T.Mesh(geometry,material));view.update(s,hero,3);assert.equal(debris.children.length,count);
  view.dispose();assert.equal(disposed,0);assert.equal(hero.visible,true);assert.equal(scene.getObjectByName('player-death'),undefined);
 }
});

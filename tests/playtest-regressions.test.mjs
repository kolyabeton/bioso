import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {projectedOnScreen} from '../src/render-culling.js';
import {tickModularAttack} from '../src/systems/enemy-combat.js';
import {createRun,step,spawnEnemy} from '../src/game.js';
import {createPart,readProfile,newProfile,stats} from '../src/assembly.js';
import {createProfileStorage} from '../src/profile-storage.js';

test('a fatal instant strike cannot be undone by the thirtieth fang hit in the same frame',()=>{
  const s=createRun(undefined,'survival',77);
  s.world={walkable:()=>true};
  s.arms=[createPart(s,'fangs'),null];
  s.hp=1;s.health.missing=2;s.health.vampireHits=29;
  s.health.armorSpent=stats(s).armor;
  const enemy=spawnEnemy(s,'normal',{x:0,z:1});
  enemy.hp=100;enemy.speed=0;enemy.damage=1;
  enemy.enemyAttack.readyAt=0;
  step(s,1/60);
  assert.equal(s.health.hits,1);
  assert.equal(s.hp,0);
  assert.equal(s.dead,true);
});

test('corrupt profile keys cannot enter the loot pool through inherited object properties',()=>{
  const profile=readProfile({getItem:()=>JSON.stringify({version:1,unlocked:['toString','constructor','__proto__','seed','shield'],achievements:[]})});
  assert.deepEqual(profile.unlocked,[...newProfile().unlocked,'seed','shield']);
  const s=createRun(profile);
  assert.throws(()=>createPart(s,'constructor'),/Unknown part/);
});

test('failed profile writes retain session unlocks and report failure until a successful retry',()=>{
  let unavailable=true,persisted=null;const notices=[];
  const storage={getItem:()=>null,setItem:(key,value)=>{if(unavailable)throw Error('Quota exceeded');persisted=value;}};
  const store=createProfileStorage(storage,{notify:text=>notices.push(text)});
  store.profile.unlocked.push('shield');
  assert.equal(store.save(),false);
  assert.equal(store.saved,false);
  assert.ok(store.profile.unlocked.includes('shield'));
  assert.equal(persisted,null);
  assert.equal(notices.length,1);
  unavailable=false;
  assert.equal(store.save(),true);
  assert.equal(store.saved,true);
  assert.ok(JSON.parse(persisted).unlocked.includes('shield'));
  assert.deepEqual(readProfile({getItem:()=>persisted}),store.profile);
});
test('screen culling keeps the index-zero enemy and friendly projectile',()=>{
 const camera=new T.OrthographicCamera(-10,10,10,-10,.1,100),projected=new T.Vector3();
 camera.position.set(0,10,10);camera.lookAt(0,0,0);camera.updateProjectionMatrix();camera.updateMatrixWorld();
 const enemies=[{x:0,y:0,z:0},{x:1,y:0,z:0}],shots=[{x:0,y:1,z:1}],onScreen=e=>projectedOnScreen(camera,projected,e);
 assert.deepEqual(enemies.filter(onScreen),enemies);assert.deepEqual(shots.filter(onScreen),shots);
});

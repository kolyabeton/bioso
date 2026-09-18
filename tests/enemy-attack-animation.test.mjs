import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {enemyWeaponPose,enemyAttackRecovery} from '../src/enemy-attack-animation.js';
import {ENEMY_WEAPONS,SURVIVAL_BOSS_ATTACKS,tickModularAttack} from '../src/systems/enemy-combat.js';
import {ENEMY_RECIPES,assembleEnemy} from '../src/systems/enemy-assembly.js';
import {enemyVisualParts,createEnemyAssemblyView} from '../src/enemy-assembly-view.js';
import {ARM_MODELS} from '../src/asset-models.js';
import {createRun,spawnEnemy} from '../src/game.js';
function fixture(key='claws',kind='elite'){
 const s=createRun(undefined,'survival',42);s.world={walkable:()=>true};const e=spawnEnemy(s,kind,{x:0,z:1});e.recipeId='animation-fixture';e.assembly=assembleEnemy({...ENEMY_RECIPES[0],weapons:[key,'claws']});e.enemyAttack.readyAt=0;
 let hits=0;tickModularAttack(s,e,s.player,()=>hits++);return{s,e,w:e.enemyAttack.warning,hits};
}
const magnitude=p=>Object.values(p).reduce((n,x)=>n+Math.abs(x),0);
test('ordinary and elite direct strikes release immediately while their large areas wind up',()=>{
 for(const kind of ['normal','elite'])for(const key of Object.keys(ENEMY_WEAPONS)){
  const {s,e,w,hits}=fixture(key,kind),mode=ENEMY_WEAPONS[key].mode,contactOnly=kind==='normal'&&mode==='sector',immediate=!['area','acid'].includes(mode);if(contactOnly){assert.equal(w,null);assert.equal(hits,0);assert.equal(e.attackPose,undefined);assert.equal(magnitude(enemyWeaponPose(e,0,s.time)),0);continue;}if(immediate){assert.equal(w,null);assert.equal(hits,mode==='shot'?0:1);assert.equal(s.hostileShots.length,mode==='shot'?1:0);assert.ok(magnitude(enemyWeaponPose(e,0,s.time))>.1);assert.equal(magnitude(enemyWeaponPose(e,0,s.time+enemyAttackRecovery(key)+.01)),0);continue;}assert.ok(w);const middle=enemyWeaponPose(e,0,w.started+(w.at-w.started)*.65);assert.ok(magnitude(middle)>.05,`${kind}/${key}`);
  assert.equal(magnitude(enemyWeaponPose(e,1,w.at-.01)),0,'inactive arm must stay at rest');s.time=w.at;tickModularAttack(s,e,s.player,()=>{});assert.ok(magnitude(enemyWeaponPose(e,0,w.at))>.1);
  assert.equal(magnitude(enemyWeaponPose(e,0,w.at+enemyAttackRecovery(key)+.01)),0);
 }
});
test('every survival boss move has a readable wind-up pose',()=>{
 for(const [recipeId,deck]of Object.entries(SURVIVAL_BOSS_ATTACKS))for(const [index,move]of deck.entries()){
  const s=createRun(undefined,'survival',42);s.world={walkable:()=>true};const e=spawnEnemy(s,recipeId==='mother'?'final':'boss',{x:0,z:1});e.recipeId=recipeId;e.hp=index===2?e.maxHp*.6:e.maxHp;e.enemyAttack={index,readyAt:0,warning:null};tickModularAttack(s,e,s.player,()=>{});const w=e.enemyAttack.warning;assert.equal(w.bossAction,move.bossAction);assert.ok(w.at>w.started);assert.ok(magnitude(enemyWeaponPose(e,w.slot,w.at-.01))>.05,`${recipeId}/${move.bossAction}`);s.time=w.at;tickModularAttack(s,e,s.player,()=>{});assert.equal(s.events.filter(event=>event.type==='enemy-strike').at(-1)?.bossAction,move.bossAction);
 }
});
test('warned area contact pose coincides with its resolution without an animation restart',()=>{
 for(const key of ['hammer','acid']){const {s,e,w}=fixture(key),before=enemyWeaponPose(e,0,w.at);let hits=0;s.time=w.at;tickModularAttack(s,e,s.player,()=>hits++);assert.equal(hits,key==='acid'?0:1);if(key==='acid')assert.equal(s.enemyAcidPools.length,1);const after=enemyWeaponPose(e,0,w.at);for(const name of Object.keys(before))assert.ok(Math.abs(before[name]-after[name])<1e-8,`${key}/${name}`);}
});
test('weapon poses are distinct and independent of render rate; frozen/dead enemies stop',()=>{
 const signatures=[];for(const key of Object.keys(ENEMY_WEAPONS)){const {e,w}=fixture(key),t=w?w.at-.01:e.attackPose.at,p=enemyWeaponPose(e,0,t);signatures.push(JSON.stringify(p));assert.deepEqual(enemyWeaponPose(e,0,t),p);e.frozenUntil=t+1;assert.equal(magnitude(enemyWeaponPose(e,0,t)),0);e.frozenUntil=0;e.hp=0;assert.equal(magnitude(enemyWeaponPose(e,0,t)),0);}
 assert.equal(new Set(signatures).size,8);
});
test('reduced motion retains readable attacks while suppressing the drill spin',()=>{
 const {e}=fixture('drill'),t=e.attackPose.at,p=enemyWeaponPose(e,0,t,true);assert.equal(p.spin,0);assert.ok(p.z>.1);assert.ok(p.z<enemyWeaponPose(e,0,t).z);
});
test('instant claw contact keeps its horizontal aim and returns without barrel spin',()=>{
 const {e}=fixture('claws'),at=e.attackPose.at;const arm=t=>enemyVisualParts(e,t).find(p=>p.asset===ARM_MODELS.claws[0]),a=arm(at),b=arm(at+enemyAttackRecovery('claws')*.8);
 assert.equal(a.rotationOrder,'YXZ');assert.ok(Math.abs(a.rotation[1])>.5);assert.ok(Math.abs(b.rotation[1])<Math.abs(a.rotation[1]));assert.ok(a.position[2]>b.position[2]);
});
test('animated instances reuse the same geometry and pools throughout the full attack',async()=>{
 const {s,e}=fixture('claws','elite'),source=new T.Group();source.add(new T.Mesh(new T.BoxGeometry(1,2,1),new T.MeshStandardMaterial()));const scene=new T.Scene(),view=createEnemyAssemblyView(scene,{load:async()=>source}),at=e.attackPose.at,recovery=enemyAttackRecovery('claws');
 view.update([e],s.player,0);await Promise.resolve();view.update([e],s.player,.1);const pools=view.info().enemyMeshPools;
 for(let i=0;i<180;i++)view.update([e],s.player,at+recovery*i/180);
 assert.equal(view.info().enemyMeshPools,pools);view.dispose();
});

test('sleeping enemies stop their leg cycle and resume after waking',()=>{
 const {e}=fixture('claws','normal');e.pickupSleepUntil=5;
 const legs=time=>enemyVisualParts(e,time).filter(p=>p.asset.startsWith('leg-')).map(p=>p.rotation);
 assert.deepEqual(legs(1),legs(2));e.pickupSleepUntil=0;assert.notDeepEqual(legs(1),legs(2));
});

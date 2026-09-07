import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {enemyWeaponPose,enemyAttackRecovery} from '../src/enemy-attack-animation.js';
import {ENEMY_WEAPONS,tickModularAttack} from '../src/systems/enemy-combat.js';
import {ENEMY_RECIPES,assembleEnemy} from '../src/systems/enemy-assembly.js';
import {enemyVisualParts,createEnemyAssemblyView} from '../src/enemy-assembly-view.js';
import {createRun,spawnEnemy} from '../src/game.js';
function fixture(key='claws',kind='normal'){
 const s=createRun(undefined,'survival',42);s.world={walkable:()=>true};const e=spawnEnemy(s,kind,{x:0,z:1});e.assembly=assembleEnemy({...ENEMY_RECIPES[0],weapons:[key,'claws']});e.enemyAttack.readyAt=0;
 tickModularAttack(s,e,s.player,()=>{});return{s,e,w:e.enemyAttack.warning};
}
const magnitude=p=>Object.values(p).reduce((n,x)=>n+Math.abs(x),0);
test('all eight weapons wind up, strike and recover for normal, elite and boss enemies',()=>{
 for(const kind of ['normal','elite','boss'])for(const key of Object.keys(ENEMY_WEAPONS)){
  const {s,e,w}=fixture(key,kind);if(kind==='boss'&&ENEMY_WEAPONS[key].mode==='shot'){assert.equal(w,null);assert.equal(s.hostileShots.length,1);assert.ok(magnitude(enemyWeaponPose(e,0,s.time))>.1);continue;}assert.ok(w);const middle=enemyWeaponPose(e,0,w.started+(w.at-w.started)*.65);assert.ok(magnitude(middle)>.05,`${kind}/${key}`);
  assert.equal(magnitude(enemyWeaponPose(e,1,w.at-.01)),0,'inactive arm must stay at rest');s.time=w.at;tickModularAttack(s,e,s.player,()=>{});assert.ok(magnitude(enemyWeaponPose(e,0,w.at))>.1);
  assert.equal(magnitude(enemyWeaponPose(e,0,w.at+enemyAttackRecovery(key)+.01)),0);
 }
});
test('melee contact pose coincides with the damage tick without an animation restart',()=>{
 for(const key of ['claws','fangs','drill','whip','hammer','acid']){const {s,e,w}=fixture(key),before=enemyWeaponPose(e,0,w.at);let hits=0;s.time=w.at;tickModularAttack(s,e,s.player,()=>hits++);assert.equal(hits,1);const after=enemyWeaponPose(e,0,w.at);for(const name of Object.keys(before))assert.ok(Math.abs(before[name]-after[name])<1e-8,`${key}/${name}`);}
});
test('weapon poses are distinct and independent of render rate; frozen/dead enemies stop',()=>{
 const signatures=[];for(const key of Object.keys(ENEMY_WEAPONS)){const {e,w}=fixture(key),t=w.at-.01,p=enemyWeaponPose(e,0,t);signatures.push(JSON.stringify(p));assert.deepEqual(enemyWeaponPose(e,0,t),p);e.frozenUntil=t+1;assert.equal(magnitude(enemyWeaponPose(e,0,t)),0);e.frozenUntil=0;e.hp=0;assert.equal(magnitude(enemyWeaponPose(e,0,t)),0);}
 assert.equal(new Set(signatures).size,8);
});
test('reduced motion retains readable attacks while suppressing the drill spin',()=>{
 const {e,w}=fixture('drill'),t=w.at-.03,p=enemyWeaponPose(e,0,t,true);assert.equal(p.spin,0);assert.ok(p.z>.1);assert.ok(p.z<enemyWeaponPose(e,0,t).z);
});
test('claw swings change horizontal aim instead of spinning around the barrel axis',()=>{
 const {e,w}=fixture('claws');const arm=t=>enemyVisualParts(e,t).find(p=>p.asset==='arm-claw'),a=arm(w.at*.65),b=arm(w.at);
 const direction=p=>new T.Vector3(0,-1,0).applyEuler(new T.Euler(...p.rotation,p.rotationOrder));assert.ok(direction(a).x*direction(b).x<0);assert.ok(b.position[2]>a.position[2]);
});
test('animated instances reuse the same geometry and pools throughout the full attack',async()=>{
 const {s,e,w}=fixture('hammer','boss'),source=new T.Group();source.add(new T.Mesh(new T.BoxGeometry(1,2,1),new T.MeshStandardMaterial()));const scene=new T.Scene(),view=createEnemyAssemblyView(scene,{load:async()=>source});
 view.update([e],s.player,0);await Promise.resolve();view.update([e],s.player,.1);const pools=view.info().enemyMeshPools;
 for(let i=0;i<90;i++)view.update([e],s.player,w.at*i/90);s.time=w.at;tickModularAttack(s,e,s.player,()=>{});for(let i=0;i<90;i++)view.update([e],s.player,w.at+i/100);
 assert.equal(view.info().enemyMeshPools,pools);view.dispose();
});

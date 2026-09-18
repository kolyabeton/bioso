import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {readBossGeometry} from './helpers/boss-glb.mjs';
import {BOSS_MODEL_IDS,createBossModelView} from '../src/boss-model-view.js';
import {moveCreature} from '../src/gameplay-modules/event-collision.js';
import {navigateEnemy} from '../src/world-navigation.js';
import {ignoresBossObstacles} from '../src/boss-traversal.js';
import {createRun,spawnEnemy} from '../src/game.js';
import {setupMissionBoss,tickMissionBoss} from '../src/systems/mission-bosses.js';

const giant=()=>({kind:'boss',id:1,hp:100,radius:14,x:-12,y:0,z:0});
const state=()=>({time:0,mode:'survival',level:30,world:{heightAt:(x,z)=>Math.abs(x)<=30&&Math.abs(z)<=30?Math.max(0,x*.2):null,walkable:()=>false,canMove:()=>false,findPath:()=>assert.fail('giants must not search around obstacles')},encounters:{nodes:[{id:'gate',type:'dungeon_roots',x:0,z:0,state:'ready',unlockLevel:1}],active:null}});
test('giant bosses walk through scenery and event buildings and follow the ground',()=>{
 const s=state(),e=giant();moveCreature(s,e,24,0);assert.equal(e.x,12);assert.equal(e.y,s.world.heightAt(e.x,e.z));
 const small={...giant(),radius:4.4};moveCreature(s,small,24,0);assert.equal(small.x,-12);
 assert.equal(ignoresBossObstacles({...giant(),kind:'elite'}),false);
 assert.equal(ignoresBossObstacles({...giant(),kind:'final',radius:6}),true);
});
test('giants take the direct route without A* and cannot leave terrain or cross gaps',()=>{
 const s=state(),e=giant();e.path=[{x:-20,z:20}];navigateEnemy(s,e,{x:12,z:0},24,1);assert.equal(e.x,12);assert.equal(e.z,0);assert.equal(e.path,null);
 moveCreature(s,e,50,0);assert.equal(e.x,30);assert.equal(e.y,6);
 const gap=state();gap.world.heightAt=x=>Math.abs(x)<1?null:0;const other=giant();moveCreature(gap,other,24,0);assert.ok(other.x<=-1);
});
test('boss support targets settle at their own terrain height',()=>{
 const s=createRun(),e=spawnEnemy(s,'boss',{x:0,z:0});s.world={heightAt:(x,z)=>x*.1+z*.2,walkable:()=>true};setupMissionBoss(s,e,'boss-scrap-leviathan');
 for(const q of s.enemies.filter(q=>q.bossOwner===e.id))assert.equal(q.y,s.world.heightAt(q.x,q.z));
 e.bossCombat.facing=Math.PI/2;const q=s.enemies.find(q=>q.bossOwner===e.id);tickMissionBoss(s,q,0,()=>{});assert.equal(q.y,s.world.heightAt(q.x,q.z));
});
test('production boss meshes stay above relief during movement, turning, impact and freeze',async()=>{
 const radii=[3.6,14,9,4.4,6],point=new T.Vector3();
 for(let i=0;i<5;i++){
  const source=readBossGeometry(BOSS_MODEL_IDS[i]),scene=new T.Scene(),view=createBossModelView(scene,{load:async()=>source}),world={heightAt:(x,z)=>Math.max(0,(x-40)*.18+(z-80)*.08)};
  const e={...giant(),bossDesignId:BOSS_MODEL_IDS[i],radius:radii[i],x:40,z:80,y:0,bossCombat:{facing:0,phase:1},visualHeight:i===2?10:undefined};
  view.update([e],{x:45,z:90},0,1,false,world);await new Promise(r=>setImmediate(r));
  for(let j=0;j<8;j++){
   e.x=40+j*.15;e.y=world.heightAt(e.x,e.z);e.bossCombat.facing=j*.25;e.attackPose={at:.1,bossAction:'crush'};e.frozenUntil=j===7?10:0;
   view.update([e],{x:45,z:90},j*.1,1,j===6,world);
   const model=scene.getObjectByName('boss-asset:'+e.bossDesignId);model.updateMatrixWorld(true);
   let minimum=Infinity;
   model.traverseVisible(mesh=>{if(!mesh.isMesh)return;const positions=mesh.geometry.attributes.position;for(let k=0;k<positions.count;k++){point.fromBufferAttribute(positions,k).applyMatrix4(mesh.matrixWorld);minimum=Math.min(minimum,point.y-world.heightAt(point.x,point.z));}});
   assert.ok(minimum>=-1e-5,`${e.bossDesignId} frame ${j}: ${minimum}`);
  }
  view.dispose();
 }
});

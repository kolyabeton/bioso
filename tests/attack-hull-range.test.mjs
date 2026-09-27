import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,attack,spawnEnemy} from '../src/game.js';
import {createPart,weaponStats} from '../src/assembly.js';
import {CATALOG,WEAPONS} from '../src/catalog.js';
import {bodyRadius} from '../src/elevation.js';
import {createSpatialIndex} from '../src/spatial-index.js';

const bodies=Object.keys(CATALOG).filter(key=>CATALOG[key].kind==='body');
for(const key of Object.keys(WEAPONS).filter(key=>key!=='drone'))test(`${key}: hull-relative acquisition and damage across every chassis`,()=>{
 for(const body of bodies)for(const indexed of [false,true])for(const offset of [-.01,.01]){
  const s=createRun(undefined,'survival',123);s.world={walkable:()=>true,lineClear:()=>true};s.player={x:0,y:0,z:0,facing:0};s.body=createPart(s,body,5);s.arms=[createPart(s,key)];s.organs=[];s.enemies=[];s.encounters={nodes:[]};s.events=[];s.rng=()=>.99;
  const p=s.arms[0],w=weaponStats(s,p),melee=['sector','area','contact'].includes(w.mode);
  const e=spawnEnemy(s,'normal',{x:0,z:1});e.y=0;e.radius=.5;e.hp=e.maxHp=100000;e.armor=0;
  e.z=w.range+(melee?e.radius:bodyRadius(s))+offset;
  if(indexed)s.enemySpatial=createSpatialIndex(s.enemies);
  attack(s,0);
  const fired=s.events.some(event=>event.source===p.id&&['attack','melee-windup'].includes(event.type));
  assert.equal(fired,offset<0,`${body}, indexed=${indexed}, offset=${offset}`);
  assert.equal(weaponStats(s,p).range,w.range);
  if(offset>0)continue;
  if(s.shots.length){assert.ok(s.shots[0].life*s.shots[0].speed>=e.z);continue;}
  if(['whip','hammer','shieldArm'].includes(key)){s.time+=.3;attack(s,0);}
  assert.ok(e.hp<e.maxHp,`${body}: ${key} must hit after acquiring target`);
 }
});

test('synchronized volley uses hull reach and still respects visibility',()=>{
 const s=createRun();s.world={walkable:()=>true,lineClear:()=>false};s.player={x:0,y:0,z:0,facing:0};s.arms=[createPart(s,'needle'),createPart(s,'needle')];s.organs=[createPart(s,'commonNerve')];s.enemies=[];s.encounters={nodes:[]};
 const e=spawnEnemy(s,'normal',{x:0,z:weaponStats(s,s.arms[0]).range+bodyRadius(s)-.01});e.y=0;e.hp=10000;
 s.enemySpatial=createSpatialIndex(s.enemies);attack(s,0);assert.equal(s.shots.length,0);
 s.world.lineClear=()=>true;s.attackQueryCache=null;attack(s,0);assert.equal(s.shots.length,2);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createRun,hurtEnemy,spawnEnemy,step} from '../src/game.js';
import {createPart,stats} from '../src/assembly.js';
import {armorRemaining,receiveHit} from '../src/systems/health.js';
import {spawnRecoveryDrop,tickRecoveryDrops} from '../src/systems/recovery-drops.js';
import {createRecoveryDropsView} from '../src/recovery-drops-view.js';
const spawn=(s,kind,position=s.player)=>{s.rng=()=>kind==='armor'?.01:.2;return spawnRecoveryDrop(s,position);};
test('only elite deaths roll once; ordinary enemies and objectives drop no recovery',()=>{
 const s=createRun();s.rng=()=>.01;const normal=spawnEnemy(s,'normal',{x:6,z:0});hurtEnemy(s,normal,1e6);assert.equal(s.recoveryDrops.length,0);const elite=spawnEnemy(s,'elite',{x:6,z:0});hurtEnemy(s,elite,1e6);assert.equal(s.recoveryDrops.length,1);hurtEnemy(s,elite,1e6);hurtEnemy(s,{kind:'objective',hp:1,x:0,z:0},2);assert.equal(s.recoveryDrops.length,1);
});
test('elite recovery distribution uses the raised thirty-percent budget',()=>{
 const s=createRun(undefined,'survival',123),counts={armor:0,health:0};for(let i=0;i<10000;i++){const q=spawnRecoveryDrop(s,s.player);if(q)counts[q.kind]++;}assert(counts.armor>1050&&counts.armor<1350);assert(counts.health>1650&&counts.health<1950);
});
test('armor repairs spent plates once and never grants unequipped armor',()=>{
 const s=createRun();spawn(s,'armor');tickRecoveryDrops(s,stats(s));assert.equal(s.recoveryDrops.length,1);
 s.organs[0]=createPart(s,'armor');const st=stats(s);receiveHit(s,st);assert.equal(armorRemaining(s,st.armor),st.armor-.5);tickRecoveryDrops(s,st);assert.equal(armorRemaining(s,st.armor),st.armor);assert.equal(s.recoveryDrops.length,0);tickRecoveryDrops(s,st);assert.equal(s.health.armorSpent,0);
 s.health.armorSpent=20;spawn(s,'armor');tickRecoveryDrops(s,st);assert.equal(armorRemaining(s,st.armor),1);
});
test('red health pickup heals through the actual simulation and stays at full HP',()=>{
 const s=createRun(),st=stats(s);spawn(s,'health');step(s,.01);assert.equal(s.recoveryDrops.length,1);s.health.armorSpent=st.armor;receiveHit(s,st);step(s,.01);assert.equal(s.hp,st.hp);assert.equal(s.health.missing,0);assert.equal(s.recoveryDrops.length,0);
});
test('range, floors, occlusion, healing suppression and death prevent collection',()=>{
 const s=createRun();s.hp=1;const q=spawn(s,'health',{x:4,z:0});tickRecoveryDrops(s,stats(s));assert.equal(s.hp,1);
 q.x=0;q.y=3;tickRecoveryDrops(s,stats(s));assert.equal(s.hp,1);
 q.y=0;s.world.heightAt=()=>0;s.world.lineClear=()=>false;tickRecoveryDrops(s,stats(s));assert.equal(s.hp,1);
 s.world.lineClear=()=>true;s.encounters={active:{type:'infection',x:0,z:0,radius:5}};tickRecoveryDrops(s,stats(s));assert.equal(s.hp,1);assert.equal(s.recoveryDrops.length,1);
 s.encounters.active=null;s.dead=true;tickRecoveryDrops(s,stats(s));assert.equal(s.hp,1);assert.equal(s.recoveryDrops.length,1);
 s.dead=false;s.hp=0;tickRecoveryDrops(s,stats(s));assert.equal(s.hp,0);
});
test('consumables expire on combat time and land on the world surface',()=>{
 const s=createRun();s.world.heightAt=()=>7;const q=spawn(s,'health',{x:4,y:10,z:0});assert.equal(q.y,7);s.time=121;tickRecoveryDrops(s,stats(s));assert.equal(s.recoveryDrops.length,0);
});
test('view shows distinct shapes and removes picked up objects and resets',()=>{
 const scene=new T.Scene(),view=createRecoveryDropsView(scene),camera=new T.PerspectiveCamera();const items=[{id:1,kind:'armor',x:0,z:0},{id:2,kind:'health',x:1,z:0}];view.update(items,camera);assert.equal(scene.children.length,2);assert.equal(scene.children[0].children[0].geometry.type,'CylinderGeometry');assert.equal(scene.children[1].children[0].geometry.type,'CircleGeometry');view.update(items.slice(1),camera);assert.equal(scene.children.length,1);view.reset();assert.equal(scene.children.length,0);view.dispose();
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {tickSymbionts} from '../src/systems/symbionts.js';
function fixture(){return{time:0,world:{},player:{x:0,z:0},enemies:[{id:'enemy',hp:100,x:8,z:0,radius:.5}],abilities:{companions:[{x:0,z:0,cooldown:0,attacks:0}]}};}
function advance(s,n,strike=()=>{},b={}){for(let i=0;i<n;i++){s.time+=.05;tickSymbionts(s,.05,b,strike);}}
test('flies to the target before striking, retreats, and never fires remotely',()=>{
 const s=fixture(),hits=[];advance(s,5,c=>hits.push(c.x));assert.equal(hits.length,0);assert.ok(s.abilities.companions[0].x>1);
 advance(s,60,c=>{hits.push(c.x);assert.ok(Math.abs(c.x-8)<=1.15);});assert.ok(hits.length>=2);
 const c=s.abilities.companions[0];assert.ok(c.x>4);assert.ok(c.attacks>=2);
});
test('dead or out-of-leash targets are abandoned and bees return without teleporting',()=>{
 const s=fixture();advance(s,20);const c=s.abilities.companions[0],old=c.x;s.enemies[0].hp=0;
 advance(s,1,()=>assert.fail('dead target hit'));assert.equal(c.phase,'escort');assert.ok(Math.abs(c.x-old)<=.61);
 advance(s,80);assert.ok(Math.hypot(c.x,c.z)<3);
 s.enemies[0].hp=100;s.enemies[0].x=15;advance(s,20,()=>assert.fail('out of range'));assert.equal(c.target,null);
});
test('occluded enemies are not acquired or hit',()=>{
 const s=fixture();s.world.lineClear=(a,b)=>!(Math.min(a.x,b.x)<4&&Math.max(a.x,b.x)>=4);
 advance(s,100,()=>assert.fail('hit through wall'));assert.ok(s.abilities.companions[0].x<4);
});
test('separate bees prefer different available enemies',()=>{
 const s=fixture();s.enemies.push({id:'other',hp:100,x:8,z:1,radius:.5});s.abilities.companions.push({x:0,z:0,cooldown:0,attacks:0});
 advance(s,1);assert.notEqual(s.abilities.companions[0].target,s.abilities.companions[1].target);
});
test('a companion trapped behind cover returns to its owner and resumes attacking',()=>{
 const s=fixture(),c=s.abilities.companions[0];
 // The owner has gone around a wall; direct return and both axis slides are blocked.
 s.player.x=8;s.enemies[0].x=10;c.x=3.9;c.z=0;
 s.world.lineClear=(a,b)=>!(Math.min(a.x,b.x)<4&&Math.max(a.x,b.x)>=4);
 const hits=[];advance(s,100,(bee,e)=>{hits.push(e.id);assert.ok(Math.hypot(bee.x-e.x,bee.z-e.z)<=1.15);});
 assert.ok(c.x>4,'companion must not remain stranded on the other side');
 assert.ok(hits.length>0,'weapon must resume dealing damage');
});
test('a distant companion is recalled without a remote hit or losing its weapon state',()=>{
 const s=fixture(),c=s.abilities.companions[0];
 Object.assign(c,{x:-100,z:-100,sourcePartId:42,attacks:7,cooldown:.8,phase:'retreat',retreatUntil:999,retreat:{x:-110,z:-110}});
 advance(s,1,()=>assert.fail('recall cannot deal damage'));
 assert.ok(Math.hypot(c.x-s.player.x,c.z-s.player.z)<3);
 assert.equal(c.sourcePartId,42);assert.equal(c.attacks,7);assert.ok(c.cooldown>0);
 assert.equal(c.target,null);assert.equal(c.phase,'escort');assert.equal(c.retreat,undefined);
 const hits=[];advance(s,80,()=>hits.push(true));assert.ok(hits.length>0);
});

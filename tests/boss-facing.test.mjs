import test from 'node:test';
import assert from 'node:assert/strict';
import {bossTurnSpeed,turnBossFacing} from '../src/boss-facing.js';
import {angleDelta} from '../src/body-facing.js';
import {createRun,spawnEnemy,step} from '../src/game.js';
import {MISSION_BOSSES,setupMissionBoss,tickMissionBoss} from '../src/systems/mission-bosses.js';

const boss=radius=>({kind:'boss',hp:100,radius,x:0,z:0,facing:0});
test('larger mission hulls have strictly slower turns and take longer to turn around',()=>{
 const sizes=Object.values(MISSION_BOSSES).map(p=>p.radius*2).sort((a,b)=>a-b);
 let previous=Infinity;
 for(const radius of sizes){const e=boss(radius),speed=bossTurnSpeed(e);assert.ok(speed<previous);previous=speed;turnBossFacing(e,{x:0,z:-10},.25,0);assert.ok(Math.abs(e.facing-speed*.25)<1e-9);}
 assert.ok(Math.PI/bossTurnSpeed(boss(14))>5,'leviathan needs over five seconds for a half turn');
 const small=boss(4),large={...boss(4),visualScale:2};assert.ok(bossTurnSpeed(large)<bossTurnSpeed(small));
 assert.ok(bossTurnSpeed({...small,assembly:{body:{key:'rootwalker',tier:1}}})<bossTurnSpeed({...small,assembly:{body:{key:'hunter',tier:1}}}));
});
test('turns use the shortest arc, do not overshoot, and are independent of frame rate',()=>{
 const a=boss(7),b=boss(7),target={x:10,z:0};
 for(let i=0;i<30;i++)turnBossFacing(a,target,1/30,0);
 for(let i=0;i<120;i++)turnBossFacing(b,target,1/120,0);
 assert.ok(Math.abs(a.facing-b.facing)<1e-9);
 a.facing=Math.PI-.01;turnBossFacing(a,{x:-.01,z:-1},.01,0);assert.ok(angleDelta(a.facing,Math.PI-.01)>0);
 turnBossFacing(a,target,10,0);assert.ok(Math.abs(a.facing-Math.PI/2)<1e-9);
 for(const blocked of [{frozenUntil:10},{pickupSleepUntil:10},{hp:0}]){const e={...boss(4),...blocked};turnBossFacing(e,target,1,1);assert.equal(e.facing,0);}
 const paused=boss(4);turnBossFacing(paused,target,0,1);assert.equal(paused.facing,0);
 const ordinary={...boss(1),kind:'normal'};turnBossFacing(ordinary,target,1,1);assert.equal(ordinary.facing,0);
});
test('mission pursuit and return home turn gradually; telegraphs and dash headings stay locked',()=>{
 const s=createRun(),e=spawnEnemy(s,'boss',{x:0,z:0});setupMissionBoss(s,e,'boss-scrap-leviathan');e.bossCombat.facing=0;e.bossCombat.readyAt=Infinity;s.player={x:5,z:0};
 tickMissionBoss(s,e,.1,()=>{});assert.ok(Math.abs(e.bossCombat.facing-bossTurnSpeed(e)*.1)<1e-9);
 const before=e.bossCombat.facing;e.enemyAttack.warning={at:100,dx:0,dz:1};tickMissionBoss(s,e,.1,()=>{});assert.equal(e.bossCombat.facing,before);
 e.enemyAttack.warning=null;tickMissionBoss(s,e,.1,()=>{},{x:-30,z:0});assert.ok(e.bossCombat.facing<before);
 e.bossCombat.dash={dx:0,dz:1,left:10};const yaw=e.bossCombat.facing;tickMissionBoss(s,e,.1,()=>{});assert.equal(e.bossCombat.facing,yaw);
});
test('the simulation updates generated boss facing without rotating ordinary enemies',()=>{
 const s=createRun(),e=spawnEnemy(s,'boss',{x:0,z:5});s.enemies=[e];s.arms=[];s.health.invulnerableUntil=Infinity;e.facing=0;e.speed=0;e.enemyAttack.readyAt=Infinity;e.territory=null;
 step(s,.05);assert.ok(Math.abs(e.facing)>0);assert.ok(Math.abs(e.facing)<=bossTurnSpeed(e)*.05+1e-9);
});

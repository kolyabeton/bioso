import test from 'node:test';
import assert from 'node:assert/strict';
import {raceScenario,runRace} from './helpers/race-playtest.mjs';
import {createWorldRun} from '../src/world-run.js';
import {prepareRace,tickRace} from '../src/systems/events/race.js';
import {clearSegment} from '../src/world-navigation.js';
import {waypointTarget,setWaypoint} from '../src/systems/waypoint.js';
import {beginEncounter,step} from '../src/game.js';
import {claimEncounter} from '../src/systems/encounters.js';
import {autoPickup,createPart} from '../src/assembly.js';

test('one race on survival map, complete obstacle route to far side, identical budget across builds',()=>{
 for(const seed of [1,2,3,42,71,20317]){
  const {s,n}=raceScenario(seed),{n:slow}=raceScenario(seed,'slow'),p=n.race;
  assert.equal(s.encounters.nodes.filter(n=>n.type==='race').length,1);
  assert.equal(n.unlockLevel,21);assert.equal(p.limit,slow.race.limit);assert.deepEqual(p.finish,slow.race.finish);
  assert.ok(p.path.slice(1).every((q,i)=>clearSegment(s.world,p.path[i],q,2.4)));
  const farthest=Math.max(...s.world.tiles.flatMap(t=>t.safe).map(q=>Math.hypot(q.x-p.start.x,q.z-p.start.z)));
  assert.ok(Math.hypot(p.finish.x-p.start.x,p.finish.z-p.start.z)>=farthest*.9);
  assert.equal(s.enemies.filter(e=>e.challengeId===n.id).length,0);
 }
 const mission=createWorldRun(undefined,'garden',42);assert.equal(mission.encounters.nodes.some(n=>n.type==='race'),false);
});

test('fast build finishes the route after a short stop while the slow build times out',()=>{
 for(const seed of [1,2,3,42,71,20317]){
  const fast=runRace(seed,'fast',{combat:false,extraStop:5}),slow=runRace(seed,'slow',{combat:false});
  assert.equal(fast.state,'reward',JSON.stringify(fast));assert.equal(fast.dead,false);assert.equal(fast.packs,3);
  assert.equal(slow.state,'failed',JSON.stringify(slow));assert.equal(slow.dead,false);assert.ok(slow.remaining>3);
 }
});

test('race keeps survival clock and normal waves paused; its packs spawn once and navigation cannot replace finish',()=>{
 const {s,n}=raceScenario(42),normalCount=s.metrics.spawned,credit=s.waves.credit;
 const p=n.race.packs[0];Object.assign(s.player,{x:p.x,z:p.z,y:0});step(s,.05);
 const count=n.members.length;assert.ok(count>0);assert.equal(s.metrics.spawned,normalCount+count);assert.equal(s.time,480);assert.equal(s.waves.credit,credit);
 step(s,.05);assert.equal(n.members.length,count);assert.ok(s.encounters.active);
 setWaypoint(s,{x:0,z:0});assert.equal(waypointTarget(s).x,n.race.finish.x);
 assert.equal(beginEncounter(s,n.id),false);
});

test('arrival requires live creature, reachability and deadline; reward is claimed once at finish',()=>{
 const {s,n}=raceScenario(42),start={...n.race.start};
 n.elapsed=n.race.limit-.05;Object.assign(s.player,n.race.finish);tickRace(s,n,.05);
 assert.equal(n.state,'reward');assert.equal(s.encounters.active,null);
 Object.assign(s.player,start);assert.equal(claimEncounter(s,n.id,0),false);
 Object.assign(s.player,n.race.finish);assert.equal(claimEncounter(s,n.id,0),true);assert.equal(claimEncounter(s,n.id,0),false);assert.equal(beginEncounter(s,n.id),false);
 const late=raceScenario(42);late.n.elapsed=late.n.race.limit;Object.assign(late.s.player,late.n.race.finish);tickRace(late.s,late.n,.01);assert.equal(late.n.state,'failed');
 const dead=raceScenario(42);dead.s.dead=true;Object.assign(dead.s.player,dead.n.race.finish);tickRace(dead.s,dead.n,0);assert.equal(dead.n.state,'failed');
});

test('incomplete routes are unavailable, and race auto-equips nearby gear into free slots',()=>{
 const {s,n}=raceScenario(42),other={type:'race',x:0,z:0};
 const blocked={...s,world:{...s.world,walkable:()=>false}};assert.equal(prepareRace(blocked,other),null);assert.equal(other.raceUnavailable,true);
 s.arms[0]=null;s.legs[0]=null;s.organs[0]=null;
 s.ground=['seed','runner','shield'].map((key,index)=>({id:90000+index,x:s.player.x,y:0,z:s.player.z,part:createPart(s,key)}));const inventory=s.inventory.length;
 assert.equal(autoPickup(s).length,3);assert.equal(s.ground.length,0);assert.equal(s.inventory.length,inventory);
 assert.equal(s.arms[0].key,'seed');assert.equal(s.legs[0].key,'runner');assert.equal(s.organs[0].key,'shield');assert.equal(n.state,'active');
});

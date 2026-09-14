import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,beginEncounter,spawnEnemy,step} from '../src/game.js';
import {createWorldRun} from '../src/world-run.js';
import {tickChallenge} from '../src/systems/events/challenges.js';
import {spawnSealedEnemies} from '../src/systems/events/sealed-pressure.js';

function fixture(tier=1){
 const s=createRun(undefined,'survival',19);
 s.world={walkable:()=>true,chunk:()=>({cx:0,cz:0,lair:{x:999,z:999}})};
 s.player={x:0,y:0,z:0};s.time=300;s.arms=[];s.enemies=[];s.rng=()=>.99;
 const n={id:'sealed',type:'sealed',state:'ready',x:0,y:0,z:0,radius:7,challengeTier:tier};
 s.encounters={nodes:[n],active:null};
 assert(beginEncounter(s,n.id));
 return{s,n,spawn:(...args)=>spawnEnemy(s,...args)};
}

test('clearing the first pack in the real game loop brings reinforcements within 0.6s',()=>{
 const {s,n}=fixture();const first=[...n.members];
 for(const e of s.enemies)e.hp=0;
 for(let i=0;i<6;i++)step(s,.1);
 assert.equal(s.time,300);assert.equal(n.state,'active');
 assert(s.enemies.length>=3);assert(s.enemies.every(e=>e.challengeId===n.id&&!first.includes(e.id)));
 const elapsed=n.elapsed,count=n.members.length;s.pending=1;step(s,10);
 assert.equal(n.elapsed,elapsed);assert.equal(n.members.length,count);
});

test('continuous clears receive growing packs throughout 45 seconds, then spawning ends',()=>{
 for(const tier of [1,2,3]){
  const {s,n,spawn}=fixture(tier),counts=[0,0,0];let emptyFor=0,maxEmpty=0,last=n.members.length;
  for(let i=0;i<449;i++){
   s.enemies=[];tickChallenge(s,.1,spawn);
   const spawned=n.members.length-last;last=n.members.length;
   counts[Math.min(2,Math.floor(n.elapsed/15))]+=spawned;
   emptyFor=spawned?0:emptyFor+.1;maxEmpty=Math.max(maxEmpty,emptyFor);
   assert.equal(n.state,'active');
  }
  assert(maxEmpty<=.6);assert(counts[0]>=60);assert(counts[1]>counts[0]);assert(counts[2]>counts[1]);
  assert(s.enemies.every(e=>e.kind==='normal'));assert.equal(s.normalSpawnCount,n.members.length);
  n.members.push(...spawnSealedEnemies(s,n,1,spawn));
  const count=n.members.length;tickChallenge(s,.1,spawn);
  assert.equal(n.members.length,count);assert.equal(n.state,'active');
  s.enemies=[];tickChallenge(s,0,spawn);assert.equal(n.state,'reward');assert.equal(s.encounters.active,null);
  tickChallenge(s,10,spawn);assert.equal(n.members.length,count);
 }
});

test('pressure grows with enemies still alive, remains capped and does not bank a spawn backlog',()=>{
 for(const tier of [1,2,3]){
  const {s,n,spawn}=fixture(tier),initial=n.members.length;
  for(let i=0;i<440;i++){
   // Simulate enemies moving off the emergence ring without killing them.
   for(const e of s.enemies){e.x=0;e.z=1;}
   tickChallenge(s,.1,spawn);
   assert(s.enemies.length<=8+tier*4+Math.min(2,Math.floor(n.elapsed/15))*2);
  }
  assert(n.members.length>initial);assert.equal(s.enemies.length,12+tier*4);
  s.enemies=[];tickChallenge(s,.6,spawn);
  assert(s.enemies.length<=4+tier);
 }
});

test('reinforcements use the central area, preserve tier health and retry obstructed spawns',()=>{
 const {s,n,spawn}=fixture(3);s.enemies=[];s.player.x=5;s.world.walkable=(x,z)=>z<0;
 tickChallenge(s,1.5,spawn);assert(s.enemies.length>0);
 for(const e of s.enemies){assert(e.z<0);assert(Math.hypot(e.x,e.z)<=3.2+1e-8);assert(Math.hypot(e.x-5,e.z)>=3);assert.equal(e.maxHp,e.hp);}
 s.enemies=[];s.world.walkable=()=>false;tickChallenge(s,1.5,spawn);assert.equal(s.enemies.length,0);assert.equal(n.state,'active');
 s.world.walkable=()=>true;tickChallenge(s,.6,spawn);assert(s.enemies.length>0);assert(s.enemies.some(e=>e.x===n.x&&e.z===n.z));
});

test('actual survival arenas keep spawning across seeds and all three tiers',()=>{
 for(let seed=1;seed<=8;seed++){
  const s=createWorldRun(undefined,'survival',seed);s.time=300;s.level=25;s.enemies=[];
  for(const n of s.encounters.nodes.filter(n=>n.type==='sealed')){
   s.player={x:n.x,y:n.y,z:n.z};s.encounters.active=null;s.enemies=[];
   assert(beginEncounter(s,n.id),`${seed}/${n.challengeTier} starts`);
   s.enemies=[];tickChallenge(s,1.5,(...args)=>spawnEnemy(s,...args));
   assert(s.enemies.length>=3,`${seed}/${n.challengeTier} refills`);
   for(const e of s.enemies){assert(s.world.walkable(e.x,e.z,e.radius));assert(Math.hypot(e.x-n.x,e.z-n.z)<=3.2+1e-8);assert(Math.hypot(e.x-s.player.x,e.z-s.player.z)>=3);}
  }
 }
});

test('ordinary survival spawns retain the every-30th elite promotion',()=>{
 const {s}=fixture();s.normalSpawnCount=29;
 assert.equal(spawnEnemy(s,'normal',{x:0,z:5}).kind,'elite');
});

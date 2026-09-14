import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorldRun} from '../src/world-run.js';
import {territoryTarget,bossEngaged,BOSS_HABITAT_DISTANCE} from '../src/systems/territories.js';
import {MISSION_BOSSES,setupMissionBoss} from '../src/systems/mission-bosses.js';
import {createRun,spawnEnemy,step} from '../src/game.js';
import {biomeMapMarkers} from '../src/ui/map.js';
import {ENCOUNTERS,availableEncounter,discoverEncounters,challengeAllowed} from '../src/systems/encounters.js';
import {tickWaves} from '../src/systems/waves.js';

test('five fixed reachable bosses are visible immediately and do not hunt from across map',()=>{
 const s=createWorldRun(undefined,'survival',12),bosses=s.enemies.filter(e=>e.habitat);
 assert.equal(bosses.length,5);assert.equal(new Set(bosses.map(e=>e.x+','+e.z)).size,5);
 assert.equal(biomeMapMarkers(s).filter(m=>m.habitat).length,5);
 for(const e of bosses){assert.ok(s.world.walkable(e.x,e.z,e.radius));assert.equal(territoryTarget(s,e,s.player),e.territory.home);assert.equal(bossEngaged(e),false);}
});
test('all five habitats occupy separated map areas across world seeds',()=>{
 for(const seed of [1,12,42,917,20317,20260913]){
  const s=createWorldRun(undefined,'survival',seed),bosses=s.enemies.filter(e=>e.habitat);
  assert.equal(bosses.length,5,`seed ${seed}: all bosses remain available`);
  for(const [i,boss] of bosses.entries())for(const other of bosses.slice(i+1)){
   const d=Math.hypot(boss.x-other.x,boss.z-other.z);
   assert.ok(d>=BOSS_HABITAT_DISTANCE,`seed ${seed}: ${boss.bossName}/${other.bossName} at ${d} m`);
   assert.ok(d>boss.territory.leash+other.territory.leash+boss.radius+other.radius+8);
  }
 }
});
test('production boss AI stays home, fights locally and cancels attacks to return without healing',()=>{
 for(const id of Object.keys(MISSION_BOSSES)){
  const s=createRun(undefined,'survival',12);
  s.world={flat:true,walkable:()=>true,lineClear:()=>true};s.encounters={nodes:[],active:null};
  s.bossHabitats=[];s.waves.credit=-Infinity;s.waves.nextElite=Infinity;s.arms=[];s.health.invulnerableUntil=Infinity;
  s.player={x:100,y:0,z:0};
  const e=spawnEnemy(s,'boss',{x:0,z:0},'mass',480,{introductory:false});setupMissionBoss(s,e,id);e.habitat=true;
  const advance=seconds=>{for(let i=0;i<seconds*20;i++){step(s,.05);s.events=[];}};
  advance(10);
  assert.equal(e.x,0,id);assert.equal(e.z,0,id);assert.equal(e.territory.state,'idle',id);
  assert.deepEqual(e.bossCombat.counts,{},id);assert.equal(s.hostileShots.length,0,id);
  s.player.x=10;advance(4);
  assert.equal(e.territory.state,'engaged',id);
  assert.ok(Object.keys(e.bossCombat.counts).length>0,id);
  e.hp*=.9;const hp=e.hp;
  if(e.speed>0)e.x=20;
  e.bossCombat.dash={dx:1,dz:0,left:14};e.enemyAttack.warning={at:s.time+1};
  s.player.x=100;step(s,.05);
  assert.equal(e.bossCombat.dash,null,id);assert.equal(e.enemyAttack.warning,null,id);
  const counts={...e.bossCombat.counts};advance(80);
  assert.ok(Math.hypot(e.x,e.z)<=e.radius+.7,`${id} returned home`);
  assert.equal(e.territory.state,'idle',id);assert.equal(e.hp,hp,id);assert.deepEqual(e.bossCombat.counts,counts,id);
  assert.ok(!s.enemies.some(q=>q.kind==='boss-drone'&&q.hp>0),id);
  s.player.x=10;advance(4);assert.equal(e.territory.state,'engaged',id);
  assert.ok(Object.values(e.bossCombat.counts).reduce((a,b)=>a+b,0)>Object.values(counts).reduce((a,b)=>a+b,0),id);
 }
});
test('a minute of the real survival simulation leaves distant habitat bosses in their own areas',()=>{
 const s=createWorldRun(undefined,'survival',20317),bosses=s.enemies.filter(e=>e.habitat);
 s.arms=[];s.waves.credit=-Infinity;s.waves.nextElite=Infinity;s.health.invulnerableUntil=Infinity;
 for(let i=0;i<1200;i++){step(s,.05);s.events=[];}
 for(const e of bosses){
  assert.equal(e.territory.state,'idle',e.bossName);
  assert.ok(Math.hypot(e.x-e.territory.home.x,e.z-e.territory.home.z)<.01,e.bossName);
  assert.equal(e.enemyAttack?.warning??null,null,e.bossName);
  if(e.bossCombat)assert.deepEqual(e.bossCombat.counts,{},e.bossName);
 }
});
test('elite engages, disengages, returns and can be fought again without healing',()=>{
 const s=createWorldRun(undefined,'survival',12),e=spawnEnemy(s,'elite',{x:0,z:0});e.hp-=10;const hp=e.hp;
 s.player={x:5,z:0};assert.equal(territoryTarget(s,e,s.player),s.player);
 e.x=15;s.player.x=60;e.windup={at:10};assert.equal(territoryTarget(s,e,s.player),e.territory.home);assert.equal(e.windup,null);
 s.player.x=14;assert.equal(territoryTarget(s,e,s.player),e.territory.home);
 e.x=0;s.player.x=5;assert.equal(territoryTarget(s,e,s.player),s.player);assert.equal(e.hp,hp);
});
test('simulation actually returns an elite across flat tile boundaries',()=>{
 const s=createWorldRun(undefined,'survival',12);s.enemies=[];s.arms=[];s.nextElite=1e9;s.rng=()=>.99;
 const e=spawnEnemy(s,'elite',{x:0,z:0});e.x=70;e.territory.state='returning';s.player={x:240,y:0,z:240};
 for(let i=0;i<1200;i++){s.waves.credit=0;step(s,.05);}
 assert.ok(Math.hypot(e.x,e.z)<2,`returned to ${e.x}, ${e.z}`);assert.equal(e.territory.state,'idle');
});
test('public encounters are visible from level one but entry requires their level',()=>{
 const s=createWorldRun(undefined,'survival',12),publicNodes=s.encounters.nodes.filter(n=>ENCOUNTERS[n.type].kind!=='secret');
 assert.deepEqual(biomeMapMarkers(s).filter(m=>m.type).map(m=>m.id).sort(),publicNodes.map(n=>n.id).sort());
 assert.ok(biomeMapMarkers(s).filter(m=>m.type).every(m=>m.locked));
 assert.ok(!biomeMapMarkers(s).some(m=>m.type==='membrane'));
 s.time=3600;
 for(const n of publicNodes){
  const level=n.unlockLevel||ENCOUNTERS[n.type].recommended;
  s.player={x:n.x,y:n.y,z:n.z};s.level=level-1;
  assert.equal(availableEncounter(s,n),false);
  if(ENCOUNTERS[n.type].kind==='challenge')assert.equal(challengeAllowed(s,n),false);
  s.level=level;assert.equal(availableEncounter(s,n),true);
  assert.equal(biomeMapMarkers(s).find(m=>m.id===n.id).locked,false);
  if(ENCOUNTERS[n.type].kind==='challenge')assert.equal(challengeAllowed(s,n),true);
 }
 discoverEncounters(s);const count=s.events.length;discoverEncounters(s);assert.equal(s.events.length,count);
});
test('elite schedule depends only on time and habitat bosses do not duplicate',()=>{
 const s=createWorldRun(undefined,'survival',12),calls=[];s.level=4;
 tickWaves(s,0,(...args)=>calls.push(args));assert.equal(calls.length,0);
 s.time=180;tickWaves(s,0,(...args)=>calls.push(args));assert.equal(calls.filter(a=>a[0]==='elite').length,1);
 s.level=20;tickWaves(s,0,(...args)=>calls.push(args));assert.equal(calls.length,1);
 s.time=480;tickWaves(s,0,(...args)=>calls.push(args));assert.ok(!calls.some(a=>a[0]==='boss'));
});
test('half of live wave elites leave their map territory to hunt the player',()=>{
 const s=createRun(undefined,'survival',12);s.world={flat:true,walkable:()=>true,lineClear:()=>true};s.enemies=[];s.bossHabitats=[];
 let z=8;const spawn=(kind,position,role,threat,options)=>spawnEnemy(s,kind,position||{x:0,z:z++},role,threat,options);
 for(const time of [180,360,540,740]){s.time=time;tickWaves(s,0,spawn);}
 const elites=s.enemies.filter(e=>e.waveElite&&e.hp>0),pursuers=elites.filter(e=>e.territory.pursuit),residents=elites.filter(e=>!e.territory.pursuit);
 assert.equal(elites.length,4);assert.equal(pursuers.length,2);assert.equal(residents.length,2);
 s.player={x:280,y:0,z:280};
 assert.equal(territoryTarget(s,pursuers[0],s.player),s.player);assert.equal(pursuers[0].territory.state,'engaged');
 assert.equal(territoryTarget(s,residents[0],s.player),residents[0].territory.home);
 pursuers[0].hp=0;s.time=940;tickWaves(s,0,spawn);
 const replacement=s.enemies.at(-1);assert.equal(replacement.waveElite,true);assert.equal(replacement.territory.pursuit,true);
});
test('an allowed automatic elite joins the wave pursuit split',()=>{
 const s=createRun(undefined,'survival',12);s.world={flat:true,walkable:()=>true,lineClear:()=>true};s.enemies=[];s.bossHabitats=[];s.normalSpawnCount=29;s.time=120;s.nextElite=Infinity;s.waves.credit=1;
 tickWaves(s,0,(kind,position,role,threat,options)=>spawnEnemy(s,kind,position||{x:0,z:8},role,threat,options));
 const promoted=s.enemies.find(e=>e.waveElite);assert.equal(promoted.kind,'elite');assert.equal(promoted.territory.pursuit,true);
});

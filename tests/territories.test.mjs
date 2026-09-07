import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorldRun} from '../src/world-run.js';
import {territoryTarget,bossEngaged} from '../src/systems/territories.js';
import {spawnEnemy,step} from '../src/game.js';
import {biomeMapMarkers} from '../src/ui/map.js';
import {ENCOUNTERS,availableEncounter,discoverEncounters,challengeAllowed} from '../src/systems/encounters.js';
import {tickWaves} from '../src/systems/waves.js';

test('five fixed reachable bosses are visible immediately and do not hunt from across map',()=>{
 const s=createWorldRun(undefined,'survival',12),bosses=s.enemies.filter(e=>e.habitat);
 assert.equal(bosses.length,5);assert.equal(new Set(bosses.map(e=>e.x+','+e.z)).size,5);
 assert.equal(biomeMapMarkers(s).filter(m=>m.habitat).length,5);
 for(const e of bosses){assert.ok(s.world.walkable(e.x,e.z,e.radius));assert.equal(territoryTarget(s,e,s.player),e.territory.home);assert.equal(bossEngaged(e),false);}
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

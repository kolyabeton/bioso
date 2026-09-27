import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorldRun} from '../src/world-run.js';
import {beginEncounter,step,hurtEnemy} from '../src/game.js';
import {DUNGEON_SCENARIOS,stageDungeonReview,dungeonReviewProof,clearDungeonReview,leaveDungeonReview} from '../src/dungeon-review-state.js';
import {insideDungeonLayout} from '../src/dungeon-layout.js';
import {containChallenge} from '../src/systems/events/challenges.js';
import {filteredMapMarkers} from '../src/ui/map.js';
import {atlasSelection} from '../src/ui/map-atlas.js';

for(const [key,scenario] of Object.entries(DUNGEON_SCENARIOS)){
 test(`${key}: real map entry, frozen survival timer, exit and resume preserve enemies`,()=>{
  const s=createWorldRun(undefined,'survival',20317),overworld=s.world,n=stageDungeonReview(s,key),overworldEnemies=n.overworldLayer.enemies;
  assert.equal(n.members.length,scenario.count);assert.equal(s.encounters.active,n);
  assert.equal(s.health.invulnerableUntil,Infinity);
  assert.equal(s.world.missionLine,true);assert.equal(s.world.environmentId,key==='roots'?'root-forest':'quiet-scrapyard');assert.equal(s.world.tiles[0].decorations.length,0);
  assert(n.aggroZones.length>=3);assert(n.aggroZones.every(zone=>zone.members.length>=3&&zone.members.length<=5));assert.equal(n.aggroZones.flatMap(zone=>zone.members).length,scenario.count);
  assert(n.aggroZones.every(zone=>zone.state==='idle'));
  const dungeonMarkers=filteredMapMarkers(s);assert.equal(dungeonMarkers.length,n.aggroZones.length+1);assert.equal(dungeonMarkers.filter(marker=>marker.dungeonZone).length,n.aggroZones.length);assert.equal(dungeonMarkers.at(-1).type,key==='roots'?'altar_organs':'altar');
  assert.match(atlasSelection(s,dungeonMarkers[0].id).access,/Группа [3-5] · агро 8 м/);
  const layout=dungeonReviewProof(s,n).layout;
  assert.deepEqual(layout,{nodes:17,edges:20,branches:6,deadEnds:2,loops:4,extent:64*1.8});
  const reached=new Set([0]);for(let pass=0;pass<n.tunnelGraph.nodes.length;pass++)for(const edge of n.tunnelGraph.edges)if(reached.has(edge.from)||reached.has(edge.to)){reached.add(edge.from);reached.add(edge.to);}
  assert.equal(reached.size,n.tunnelGraph.nodes.length,'the whole tunnel graph is connected');
  const hub=n.tunnelGraph.nodes[2],directions=n.tunnelGraph.edges.filter(e=>e.from===2||e.to===2).map(e=>{const q=n.tunnelGraph.nodes[e.from===2?e.to:e.from],d=Math.hypot(q.x-hub.x,q.z-hub.z);return{x:(q.x-hub.x)/d,z:(q.z-hub.z)/d};});
  assert(directions.length>=4);assert(directions.some((a,i)=>directions.some((b,j)=>i!==j&&a.x*b.x+a.z*b.z<-.5)),'the main junction sends tunnels in different directions');
  assert(insideDungeonLayout(n.tunnelGraph,s.player,.55));
  assert(n.members.every(id=>{const enemy=s.enemies.find(e=>e.id===id);return enemy.edgeId!=null&&insideDungeonLayout(n.tunnelGraph,enemy,enemy.radius);}), 'every elite starts inside a tunnel branch');
  for(let i=0;i<40;i++)step(s,.05);
  assert(n.aggroZones.every(zone=>zone.state==='idle'),'all packs wait at their points before the player enters an aggro zone');
  assert.equal(dungeonReviewProof(s,n).remaining,scenario.count,'dormant packs cannot be targeted from another zone');
  Object.assign(s.player,n.aggroZones[0]);step(s,.05);
  assert.equal(n.aggroZones[0].state,'engaged');assert(n.aggroZones.slice(1).every(zone=>zone.state==='idle'),'only the entered pack engages');
  assert(n.aggroZones[0].members.every(id=>{const e=s.enemies.find(e=>e.id===id);return !e.dungeonDormant&&e.territory.state==='engaged';}));
  const old={...s.player};s.player.x+=30;s.player.z+=30;containChallenge(s,old);assert.deepEqual(s.player,old,'visible tunnel walls contain the player');
  const members=[...n.members];hurtEnemy(s,s.enemies.find(e=>e.id===members[0]),1e12);
  s.pending=0;s.xpDrops=[];
  for(let i=0;i<20;i++)step(s,.05);
  assert.equal(s.time,scenario.time);assert(n.elapsed>.9);
  assert(leaveDungeonReview(s,n));assert.equal(n.state,'paused');assert.equal(s.encounters.active,null);assert.equal(s.world,overworld);assert.equal(s.enemies,overworldEnemies);assert(filteredMapMarkers(s).every(marker=>!marker.dungeonZone));
  assert(beginEncounter(s,n.id));assert.deepEqual(n.members,members);assert.equal(s.world.missionLine,true);
  assert.equal(dungeonReviewProof(s,n).remaining,scenario.count-1);
 });
 test(`${key}: clear produces one real item per elite and completes on exit`,()=>{
  const s=createWorldRun(undefined,'survival',20317),n=stageDungeonReview(s,key);
  assert(clearDungeonReview(s,n));assert(n.cleared);
  assert.equal(dungeonReviewProof(s,n).remaining,0);
  assert.equal(s.ground.filter(p=>p.dungeonLoot).length,scenario.count);
  assert(clearDungeonReview(s,n));assert.equal(s.ground.filter(p=>p.dungeonLoot).length,scenario.count);
  assert(leaveDungeonReview(s,n));assert.equal(n.state,'complete');assert.equal(beginEncounter(s,n.id),false);
 });
}

test('dungeon render readiness releases the frame loop and permits a walking round trip',async()=>{
 const T=await import('three'),{createBiomeView}=await import('../src/biome-view.js'),{exitDungeon}=await import('../src/game.js');
 for(const key of Object.keys(DUNGEON_SCENARIOS)){
  const s=createWorldRun(undefined,'survival',20317),n=stageDungeonReview(s,key),scene=new T.Scene(),view=createBiomeView(scene);
  view.update(s);
  assert(s.streaming.ready.has(s.world.tileAt(s.player.x,s.player.z).id),'the frame-loop readiness gate must open without requesting hidden biome tiles');
  assert.equal(view.info().residentTiles,0);
  const walkTo=target=>{
   for(let i=0;i<1200&&Math.hypot(target.x-s.player.x,target.z-s.player.z)>.25;i++){
    const dx=target.x-s.player.x,dz=target.z-s.player.z,d=Math.hypot(dx,dz);step(s,.025,{x:dx/d,z:dz/d});
   }
   assert(Math.hypot(target.x-s.player.x,target.z-s.player.z)<.3,`can walk to ${target.id} in ${key}`);
  };
  // Walk the first junction and a side branch, then back to the real exit.
  for(const id of [1,2,3,2,1,0]){const target=n.tunnelGraph.nodes[id];walkTo(id===n.tunnelGraph.entrance?{...target,z:target.z-3.65}:target);}
  assert(n.elapsed>0,'dungeon combat simulation advances');assert.equal(s.time,DUNGEON_SCENARIOS[key].time);
  const remaining=dungeonReviewProof(s,n).remaining;
  assert(exitDungeon(s,n.id));assert.equal(dungeonReviewProof(s,n).remaining,remaining,'outside proof reads saved dungeon enemies');
  const outsideTime=s.time;step(s,.05);assert(s.time>outsideTime,'survival clock resumes outside');
  assert(beginEncounter(s,n.id));view.update(s);assert(s.streaming.ready.has(s.world.tiles[0].id));walkTo(n.tunnelGraph.nodes[1]);
  view.dispose();
 }
});

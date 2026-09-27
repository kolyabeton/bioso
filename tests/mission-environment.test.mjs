import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from 'three';
import {createWorldRun,stepWorldRun} from '../src/world-run.js';
import {hurtEnemy} from '../src/game.js';
import {bodyRadius,movePlayer} from '../src/elevation.js';
import {createPart} from '../src/assembly.js';
import {MISSION_ENVIRONMENTS,missionGateClosed,missionGateZ} from '../src/mission-environment.js';
import {skipMissionEvent} from '../src/mission-run.js';
import {createMissionEnvironmentView} from '../src/mission-environment-view.js';
import {architectureGLB} from './helpers/architecture-glb.mjs';
import {obstacleHeight} from '../src/architecture-collision.js';

function clearRoom(s){
 for(const e of s.enemies.filter(e=>e.hp>0&&s.mission.floorsState[s.mission.currentFloor].members.includes(e.id)))hurtEnemy(s,e,1e12);
 s.pending=0;s.xpDrops=[];stepWorldRun(s,0);
}
test('last defender unlocks the gate; the fence shoulders remain solid and cannot be dashed through',()=>{
 const s=createWorldRun(undefined,'garden',42);stepWorldRun(s,0);
 const enemies=s.enemies.filter(e=>e.hp>0);
 for(const e of enemies.slice(0,-1))hurtEnemy(s,e,1e12);
 stepWorldRun(s,0);assert.equal(missionGateClosed(s.mission,0),true);
 for(const x of [-7,-3,0,3,7])assert.equal(s.world.canMove({x,z:-28},{x,z:-36},.8),false);
 assert.equal(s.world.solidAt(0,1,-32),true);
 s.player={x:0,z:-28};movePlayer(s,1,0,-8);assert.ok(s.player.z>-32);
 clearRoom(s);assert.equal(missionGateClosed(s.mission,0),false);
 assert.equal(s.world.solidAt(0,1,-32),false);
 assert.equal(s.world.canMove({x:0,z:-28},{x:0,z:-36},1.92),true);
 assert.equal(s.world.walkable(6,-32,.8),false);
 assert.equal(s.world.lineClear({x:0,y:1,z:-28},{x:0,y:1,z:-36}),true);
 movePlayer(s,1,0,-8);assert.ok(s.player.z<-32);
});
test('third-room event keeps its gate closed until resolved, then only the next room can activate',()=>{
 const s=createWorldRun(undefined,'garden',7);
 for(let i=0;i<3;i++){s.player={x:0,z:-i*64};stepWorldRun(s,0);clearRoom(s);}
 assert.equal(s.mission.event.room,3);assert.equal(missionGateClosed(s.mission,2),true);
 assert.equal(s.world.walkable(0,missionGateZ(2),.8),false);
 assert.ok(skipMissionEvent(s,s.mission.event.nodeId));
 assert.equal(missionGateClosed(s.mission,2),false);
 assert.equal(missionGateClosed(s.mission,3),true);
 s.player={x:0,z:-192+20};stepWorldRun(s,0);assert.equal(s.mission.floorsState[3].state,'active');
 assert.equal(missionGateClosed(s.mission,2),true);
 assert.equal(s.world.canMove({x:0,z:missionGateZ(2)-4},{x:0,z:missionGateZ(2)+4},.8),false);
});
test('all mission floors interrupt the centre with sparse cover and keep both large-body bypasses and spawns accessible',()=>{
 for(const mode of ['garden','quarantine','core','nursery','mother'])for(const seed of [1,42,20317]){
  const s=createWorldRun(undefined,mode,seed),environment=MISSION_ENVIRONMENTS[mode];
  assert.equal(s.world.environmentId,environment.id);assert.equal(s.world.environmentName,environment.name);
  const originalBody=s.body,originalPlayer=s.player;s.body=createPart(s,'rootwalker',5);
  assert.equal(bodyRadius(s),1.92);
  for(const floor of s.mission.floorsState)floor.state='cleared';
  for(const tile of s.world.tiles){
   assert.equal(tile.environmentId,environment.id);assert.equal(tile.environmentName,environment.name);assert.equal(tile.biome,environment.biome);
   assert.ok(tile.decorations.some(d=>['landmark','structure','vegetation'].includes(d.decorationKind)));
   assert.ok(tile.decorations.some(d=>d.decorationKind==='cover'&&Number.isFinite(d.rotation)));
   const radius=1.92,bossRoom=tile.index===s.world.tiles.length-1,covers=tile.decorations.filter(d=>d.tacticalCover);
   assert.equal(covers.length,2);
   for(const cover of covers){
    assert.ok(Math.abs(cover.x)<=(bossRoom?5:1));
    assert.equal(s.world.walkable(cover.x,cover.z,.8),false);
    const coverY=Math.min(1,obstacleHeight(cover)*.5);
    assert.equal(s.world.solidAt(cover.x,coverY,cover.z),true);
    assert.equal(s.world.lineClear({x:cover.x,y:coverY,z:cover.z+5},{x:cover.x,y:coverY,z:cover.z-5}),false);
    // Actual maximum-size movement around all four sides, including corners.
    const loop=[{x:cover.x-4.5,z:cover.z+4.5},{x:cover.x+4.5,z:cover.z+4.5},{x:cover.x+4.5,z:cover.z-4.5},{x:cover.x-4.5,z:cover.z-4.5}];
    s.player={...loop[0]};
    for(let i=0;i<loop.length;i++){
     const next=loop[(i+1)%loop.length];
     assert.ok(s.world.canMove(loop[i],next,radius),`${mode}/${seed}/${tile.index}/cover loop ${i}`);
     movePlayer(s,0,next.x-s.player.x,next.z-s.player.z);
     assert.ok(Math.hypot(s.player.x-next.x,s.player.z-next.z)<1e-8,`${mode}/${seed}/${tile.index}/actual movement ${i}`);
    }
   }
   for(let dz=-28;dz<=28;dz++)for(const x of bossRoom?[-12,12]:[-6,6])assert.ok(s.world.walkable(x,tile.z+dz,radius),`${mode}/${seed}/${tile.index}/${x}/${dz}`);
   const start={x:0,z:tile.z+28},goal={x:0,z:tile.z-28},path=s.world.findPath(start,goal,radius);
   assert.deepEqual(path.at(-1),goal,`${mode}/${seed}/${tile.index}/through route`);
   let previous=start;for(const next of path){assert.ok(s.world.canMove(previous,next,radius));previous=next;}
   if(tile.index!==s.world.tiles.length-1)assert.equal(s.world.canMove(start,goal,radius),false);
   for(const [x,dz] of [[0,22],[0,-26],[-6,3],[0,-19],[0,0]])assert.ok(s.world.walkable(x,tile.z+dz,radius),`${mode}/${seed}/${tile.index}/safe ${x}/${dz}`);
  }
  s.body=originalBody;s.player=originalPlayer;s.mission.floorsState[0].state='ready';stepWorldRun(s,0);
  assert.ok(s.mission.floorsState[0].members.length>0);
  assert.equal(s.mission.floorsState[0].members.length,s.enemies.length);
  for(const e of s.enemies)assert.ok(s.world.walkable(e.x,e.z,e.radius),`${mode}/${seed}/${e.id}`);
 }
});
test('five bosses own five deterministic scenery profiles and distinct boss rooms',()=>{
 const modes=['garden','quarantine','core','nursery','mother'],environmentIds=new Set(),roomSignatures=new Set(),bossSignatures=new Set();
 for(const mode of modes){
  const environment=MISSION_ENVIRONMENTS[mode],s=createWorldRun(undefined,mode,42),room=s.world.tiles[0],boss=s.world.tiles.at(-1);
  environmentIds.add(environment.id);
  assert.equal(s.mission.biome,environment.biome);assert.equal(room.environmentId,environment.id);assert.equal(boss.environmentId,environment.id);
  assert.equal(room.nextBiome,environment.groundBlend);assert.deepEqual(room.groundBlendDirection,environment.groundBlendDirection?[...environment.groundBlendDirection]:undefined);
  assert.equal(room.groundStyle,environment.groundStyle);assert.equal(room.perimeterStyle,environment.perimeterStyle);
  assert.deepEqual(room.ambientVegetation,[...environment.ambientVegetation]);assert.deepEqual(room.edgeVegetation,[...environment.edgeVegetation]);
  const roomModels=room.decorations.filter(d=>['structure','vegetation'].includes(d.decorationKind)).map(d=>d.model);
  const bossModels=boss.decorations.filter(d=>['structure','vegetation'].includes(d.decorationKind)).map(d=>d.model);
  for(const id of environment.rooms[0])assert.ok(roomModels.includes(id),`${mode}/${id}`);
  for(const id of environment.bossRoom.models)assert.ok(bossModels.includes(id),`${mode}/boss/${id}`);
  const landmarks=room.decorations.filter(d=>d.decorationKind==='landmark');
  assert.deepEqual(landmarks.map(d=>d.biome),environment.landmark?[environment.landmark]:[]);
  roomSignatures.add(room.decorations.map(d=>`${d.decorationKind}:${d.model||d.feature||d.biome}`).join('|'));
  bossSignatures.add(boss.decorations.map(d=>`${d.decorationKind}:${d.model||d.feature||d.biome}`).join('|'));
 }
 assert.equal(environmentIds.size,5);assert.equal(roomSignatures.size,5);assert.equal(bossSignatures.size,5);
});
test('mission ground treatments and ambient plant palettes stay visually distinct',()=>{
 const ground=new Set(),plants=new Set();
 for(const environment of Object.values(MISSION_ENVIRONMENTS)){
  ground.add([environment.biome,environment.groundStyle,environment.groundBlend||'none'].join(':'));
  plants.add([...environment.ambientVegetation,...environment.buildings].join('|'));
 }
 assert.equal(ground.size,5);
 assert.equal(plants.size,5);
 assert.deepEqual(MISSION_ENVIRONMENTS.quarantine.edgeVegetation,[]);
 assert.ok(!MISSION_ENVIRONMENTS.garden.ambientVegetation.includes('veg-fern'));
 assert.ok(MISSION_ENVIRONMENTS.core.ambientVegetation.includes('veg-fern'));
 assert.ok(MISSION_ENVIRONMENTS.mother.buildings.includes('environment-brood-pod-v2'));
});
test('each mission cycles three authored room compositions without mixing landmarks',()=>{
 for(const mode of Object.keys(MISSION_ENVIRONMENTS)){
  const environment=MISSION_ENVIRONMENTS[mode],s=createWorldRun(undefined,mode,20260909),signatures=s.world.tiles.slice(0,3).map(tile=>tile.decorations.filter(d=>['structure','vegetation'].includes(d.decorationKind)).map(d=>d.model).join('|'));
  assert.equal(new Set(signatures).size,3,mode);
  for(const tile of s.world.tiles)for(const landmark of tile.decorations.filter(d=>d.decorationKind==='landmark'))assert.equal(landmark.biome,environment.landmark,mode);
 }
});
test('every mission environment model exists in the shipped asset library',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../public/assets/kit/manifest.json',import.meta.url),'utf8')),ids=new Set(manifest.map(item=>item.id));
 for(const [mode,environment]of Object.entries(MISSION_ENVIRONMENTS)){
  const referenced=new Set([...environment.buildings,...environment.rooms.flat(),...environment.vegetation.models,...environment.bossRoom.models]);
  for(const id of referenced)assert.ok(ids.has(id),`${mode}/${id}`);
 }
});
test('scrap landmarks use real model collision footprints outside the playable bypass',()=>{
 const s=createWorldRun(undefined,'quarantine',42),tile=s.world.tiles[1];
 const scrap=tile.decorations.find(d=>d.decorationKind==='landmark');
 assert.equal(scrap.biome,'scrapyard');
 assert.equal(scrap.model,'environment-scrap-bank-v1');
 const z=scrap.z;
 assert.equal(s.world.walkable(scrap.x,z,.8),false);
 assert.equal(s.world.walkable(6,z,1.92),true);
 assert.equal(s.world.solidAt(scrap.x,1,z),true);
 s.player={x:6,z};for(let i=0;i<80;i++)movePlayer(s,0,.1,0);
 assert.ok(s.player.x<scrap.x);
});
test('authored gate halves follow simulation state, including reload and survival reset',async()=>{
 const scene=new T.Scene(),view=createMissionEnvironmentView(scene,{load:async id=>architectureGLB(id)}),s=createWorldRun(undefined,'garden',42);
 s.player.z=-25;view.update(s,0);await view.ready();view.update(s,0);
 const gate=scene.getObjectByName('mission-gate-1'),left=gate.getObjectByName('gate-left-leaf');
 const sideFence=scene.getObjectByName('mission-side-fences');
 assert.equal(gate.position.z,-32);assert.equal(left.position.x,0);
 assert.ok(sideFence.children.some(child=>child.name==='mission-side-wall'));
 assert.equal(gate.userData.closed,true);assert.ok(gate.getObjectByName('arch-gate'));assert.ok(gate.getObjectByName('arch-wall-straight'));assert.deepEqual(view.info().missionGateErrors,[]);
 s.mission.floorsState[0].state='cleared';for(let i=0;i<6;i++)view.update(s,.1);
 assert.equal(left.position.x,-4.6);assert.equal(gate.userData.closed,false);
 view.reset();view.update(s,0);assert.equal(scene.getObjectByName('gate-left-leaf').position.x,-4.6);
 view.update({world:{},player:{x:0,z:0}},0);assert.equal(view.info().missionGates,0);
 view.dispose();assert.equal(scene.children.length,0);
});

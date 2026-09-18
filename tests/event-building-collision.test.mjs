import test from 'node:test';
import assert from 'node:assert/strict';
import {movePlayer,bodyRadius} from '../src/elevation.js';
import {eventObstacles,moveCreature} from '../src/gameplay-modules/event-collision.js';
import {obstacleContains} from '../src/architecture-collision.js';
import {EVENT_PRESENTATION} from '../src/gameplay-modules/event-presentation.js';
import {nearEncounter} from '../src/systems/events/proximity.js';

const node=(type='dungeon_roots')=>({id:type,type,x:0,y:0,z:0,state:'ready',unlockLevel:1,dungeon:type.startsWith('dungeon')});
function state(n=node()){
 return {mode:'survival',level:30,time:0,body:{key:'wanderer'},player:{x:0,y:0,z:8},world:{flat:true,heightAt:()=>0,walkable:()=>true,lineClear:()=>true},encounters:{nodes:[n],active:null}};
}
test('all rendered event models stop a player approaching from every side, including a large movement step',()=>{
 for(const type of Object.keys(EVENT_PRESENTATION))for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
  const s=state(node(type));s.player={x:-dx*10,z:-dz*10};
  movePlayer(s,.1,dx*20,dz*20);
  assert.ok(s.player.x*dx+s.player.z*dz<0,type);
  assert.equal(obstacleContains(eventObstacles(s)[0],s.player.x,s.player.z,bodyRadius(s)),false,type);
 }
});
test('gate stops repeated forward input, permits walking around, and remains within interaction range',()=>{
 const s=state();for(let i=0;i<80;i++)movePlayer(s,.025,0,-.2);
 assert.ok(s.player.z>1.6);assert.ok(nearEncounter(s,s.encounters.nodes[0],4));
 const stopped=s.player.z;movePlayer(s,.1,0,-8);assert.equal(s.player.z,stopped);
 movePlayer(s,.1,8,0);movePlayer(s,.1,0,-12);assert.ok(s.player.x>7&&s.player.z<0);
});
test('large bodies can still interact from the front of the gate',()=>{
 const s=state();s.body={key:'bastion',tier:5};movePlayer(s,.1,0,-20);
 assert.ok(nearEncounter(s,s.encounters.nodes[0],4));
});
test('hidden locked events do not leave invisible barriers; completed buildings stay solid',()=>{
 const s=state();s.level=0;movePlayer(s,.1,0,-16);assert.equal(s.player.z,-8);
 s.level=30;s.player.z=8;s.encounters.nodes[0].state='complete';movePlayer(s,.1,0,-16);assert.ok(s.player.z>0);
});
test('spawn and level-up overlaps allow escape but cannot be traversed after leaving',()=>{
 const s=state();s.player.z=0;movePlayer(s,.1,0,8);assert.equal(s.player.z,8);
 movePlayer(s,.1,0,-16);assert.ok(s.player.z>0);
 s.player.z=1;movePlayer(s,.1,0,-2);assert.equal(s.player.z,1);
});
test('inside a dungeon only its visible exit blocks movement',()=>{
 const s=state(),exit={...node('dungeon_catacombs'),x:20};s.encounters.nodes.push(exit);s.encounters.active=exit;
 movePlayer(s,.1,0,-16);assert.equal(s.player.z,-8);
 s.player={x:20,z:8};movePlayer(s,.1,0,-16);assert.ok(s.player.z>0);
});
test('normal, elite, and boss creatures cannot cross event buildings',()=>{
 for(const type of Object.keys(EVENT_PRESENTATION))for(const kind of ['normal','elite','boss'])for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
  const s=state(node(type)),creature={kind,x:-dx*10,z:-dz*10,radius:.8},label=`${type}:${kind}`;
  moveCreature(s,creature,dx*20,dz*20,creature.radius);
  assert.ok(creature.x*dx+creature.z*dz<0,label);
  assert.equal(obstacleContains(eventObstacles(s)[0],creature.x,creature.z,creature.radius),false,label);
 }
});
test('flying creatures may cross event buildings',()=>{
 for(const type of Object.keys(EVENT_PRESENTATION)){
  const s=state(node(type)),creature={kind:'flying',flying:true,x:0,z:10,radius:.4};
  moveCreature(s,creature,0,-20,creature.radius);
  assert.equal(creature.z,-10,type);
 }
});
test('creatures already overlapping a newly available event may only move outward',()=>{
 const s=state(),creature={kind:'elite',x:0,z:0,radius:.8};
 moveCreature(s,creature,0,8,creature.radius);assert.equal(creature.z,8);
 moveCreature(s,creature,0,-16,creature.radius);assert.ok(creature.z>0);
 creature.z=1;moveCreature(s,creature,0,-2,creature.radius);assert.equal(creature.z,1);
});

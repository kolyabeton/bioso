import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorldRun,stepWorldRun} from '../src/world-run.js';
import {hurtEnemy} from '../src/game.js';
import {autoPickup,installed} from '../src/assembly.js';
import {CATALOG} from '../src/catalog.js';

test('room reward appears only after the last defender and stays claimed on return',()=>{
 for(const mode of ['garden','quarantine','core','nursery','mother']){
  const s=createWorldRun(undefined,mode,42),startingWeapon=s.arms[0].key;stepWorldRun(s,0);
  const floor=s.mission.floorsState[0],rewards=()=>s.ground.filter(g=>g.missionRoomLoot);
  assert.equal(floor.roomLootId,null);assert.equal(rewards().length,0);
  // Visiting the former pickup location during combat cannot yield a room reward.
  s.player={x:-6,y:0,z:3};autoPickup(s);assert.equal(rewards().length,0);assert.equal(s.inventory.length,0);
  const defenders=s.enemies.filter(e=>floor.members.includes(e.id));
  for(const enemy of defenders.slice(0,-1))hurtEnemy(s,enemy,1e9);
  s.xpDrops=[];s.pending=0;stepWorldRun(s,0);
  assert.equal(floor.state,'active');assert.equal(floor.roomLootId,null);assert.equal(rewards().length,0);
  s.player={x:0,y:0,z:22};hurtEnemy(s,defenders.at(-1),1e9);s.xpDrops=[];s.pending=0;stepWorldRun(s,0);
  while(floor.state!=='cleared'){
   const descendants=s.enemies.filter(e=>floor.members.includes(e.id)&&e.hp>0);
   assert.ok(descendants.length);
   for(const enemy of descendants)hurtEnemy(s,enemy,1e9);
   s.xpDrops=[];s.pending=0;stepWorldRun(s,0);
  }
  assert.equal(floor.state,'cleared');assert.equal(rewards().length,1);
  const reward=rewards()[0];assert.equal(floor.roomLootId,reward.id);
  assert.equal(reward.part.key,'digestion');
  const firstDrop=s.ground.find(g=>g.missionEliteDrop);
  assert.ok(firstDrop);assert.equal(CATALOG[firstDrop.part.key].kind,'arm');assert.notEqual(firstDrop.part.key,startingWeapon);
  s.player={x:reward.x,y:reward.y,z:reward.z};autoPickup(s);
  assert.ok([...s.inventory,...installed(s)].some(p=>p.id===reward.part.id));assert.equal(rewards().length,0);
  s.player={x:0,y:0,z:-44};stepWorldRun(s,0);s.player={x:0,y:0,z:22};
  for(let i=0;i<3;i++)stepWorldRun(s,0);
  assert.equal(floor.roomLootId,reward.id);assert.equal(rewards().length,0);
 }
});

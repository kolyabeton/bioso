import test from 'node:test';
import assert from 'node:assert/strict';
import {missionRosters} from '../src/mission-rosters.js';
import {createWorldRun,stepWorldRun} from '../src/world-run.js';
import {hurtEnemy} from '../src/game.js';
import {MISSION_ENEMY_MULTIPLIER,skipMissionEvent,MISSION_EIGHTH_FLOOR_ELITES} from '../src/mission-run.js';
import {CATALOG} from '../src/catalog.js';
import {enemyVisualParts} from '../src/enemy-assembly-view.js';

test('every mission floor changes tactic, recipes and enhancement without rerolling a seed',()=>{
 const orders=new Set();
 for(const mode of ['garden','quarantine','core','nursery','mother'])for(let seed=1;seed<=40;seed++){
  const rooms=missionRosters(seed,24,mode);assert.deepEqual(rooms,missionRosters(seed,24,mode));
  orders.add(rooms.map(r=>r.tactic).join(','));
  for(let i=0;i<24;i+=8)assert.equal(new Set(rooms.slice(i,i+8).map(r=>r.tactic)).size,8);
  for(let i=1;i<24;i++){assert.notEqual(rooms[i].tactic,rooms[i-1].tactic);assert.notEqual(rooms[i].signature,rooms[i-1].signature);}
  for(const room of rooms){assert.ok(room.roles.length>=5&&room.roles.length<=12);assert.equal(room.recipeIds.length,room.roles.length);assert.ok(room.recipeIds.every(Boolean));}
 }
 assert.ok(orders.size>1);
});

test('mission identities introduce simple enemies first and all four specialists cumulatively',()=>{
 const garden=missionRosters(42,24,'garden'),all=mode=>new Set(missionRosters(42,24,mode).flatMap(r=>r.recipeIds));
 assert.ok(garden.every(r=>r.roles.every(role=>role==='mass')));assert.ok(!garden.some(r=>r.recipeIds.some(id=>['shield-bearer','divider','mirrorling','puppeteer'].includes(id))));
 assert.ok(all('quarantine').has('shield-bearer'));assert.ok(all('core').has('divider'));assert.ok(all('nursery').has('mirrorling'));assert.ok(all('mother').has('puppeteer'));
});

test('all missions spawn promised roles, flying models and elites through all 24 rooms',()=>{
 for(const mode of ['garden','quarantine','core','nursery','mother'])for(const seed of [1,42,20317]){
  const s=createWorldRun(undefined,mode,seed);s.arms=[];s.health.invulnerableUntil=Infinity;
  for(let i=0;i<24;i++){
   const floor=s.mission.floorsState[i],{roles,recipeIds,eliteRole}=floor.roster;
   s.player={x:0,y:0,z:floor.z+22};stepWorldRun(s,0);
   const defenders=s.enemies.filter(e=>floor.members.includes(e.id));
   // Item 18: every 8th room fields five elites instead of one.
   const eliteCount=(i+1)%8===0?MISSION_EIGHTH_FLOOR_ELITES:1,normalCount=(roles.length+1)*MISSION_ENEMY_MULTIPLIER-1;
   assert.equal(defenders.length,normalCount+eliteCount,`${mode}/${seed}/${i} spawn count`);
   const normalRoles=Array.from({length:normalCount},(_,index)=>roles[index%roles.length]),normalRecipes=Array.from({length:normalCount},(_,index)=>recipeIds[index%recipeIds.length]);
   assert.deepEqual(defenders.map(e=>e.assemblyRole),[...normalRoles,...Array.from({length:eliteCount},()=>eliteRole)]);
   assert.deepEqual(defenders.slice(0,normalCount).map(e=>e.recipeId),normalRecipes);
   assert.equal(defenders.filter(e=>e.kind==='elite'&&e.guaranteedPartDrop).length,eliteCount);
   for(const e of defenders){
    assert.ok(s.world.walkable(e.x,e.z,e.radius));assert.ok(e.enemyAttack);
    const main=CATALOG[e.assembly.arms.find(Boolean).key];assert.ok(main);
    if(e.flying){
     assert.equal(e.flying,true);assert.equal(e.recipeId,'robo-bee');
     assert.equal(enemyVisualParts(e).filter(p=>p.motion==='wing').length,2);
    }
   }
   while(true){const alive=s.enemies.filter(e=>floor.members.includes(e.id)&&e.hp>0&&e.kind!=='elite');if(!alive.length)break;for(const e of alive)hurtEnemy(s,e,1e12);}
   s.pending=0;s.xpDrops=[];stepWorldRun(s,0);assert.equal(floor.state,'active');
   for(const e of s.enemies.filter(e=>floor.members.includes(e.id)&&e.hp>0))hurtEnemy(s,e,1e12);s.pending=0;s.xpDrops=[];stepWorldRun(s,0);
   assert.equal(floor.state,'cleared');assert.ok(floor.roomLootId);
   if(s.mission.event)assert.ok(skipMissionEvent(s,s.mission.event.nodeId));
  }
  assert.equal(s.mission.currentFloor,24);assert.equal(s.mission.complete,false);
  s.player={x:0,y:0,z:s.mission.floorsState[24].z+22};stepWorldRun(s,0);
  assert.ok(s.enemies.some(e=>e.bossCombat&&e.bossDesignId===s.mission.bossId));
 }
});

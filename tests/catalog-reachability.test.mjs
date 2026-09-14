import test from 'node:test';
import assert from 'node:assert/strict';
import {CATALOG,STARTERS,MISSIONS,SURVIVAL_UNLOCKS} from '../src/catalog.js';
import {newProfile} from '../src/assembly.js';
import {createRun,step} from '../src/game.js';
import {META_ACHIEVEMENTS,OVERRUN_PART_UNLOCKS} from '../src/systems/meta-progression.js';
import {encounterDiscoverableKeys} from '../src/systems/encounters.js';
import {unlockCondition} from '../src/ui/adapters.js';

const previousMissionItems=['arc','regen','drill','armor','bastion','plated','rocket','shield','acid','digestion','rootwalker','fangs','chimera'];

test('every atlas item has a reachable in-game unlock source',()=>{
 const profile=newProfile(),sources=new Set([
  ...STARTERS,
  ...MISSIONS.flatMap(m=>m.rewards),
  ...SURVIVAL_UNLOCKS.flatMap(u=>u.rewards),
  ...META_ACHIEVEMENTS.map(a=>a.key),
  ...OVERRUN_PART_UNLOCKS.map(u=>u.key),
  ...encounterDiscoverableKeys(profile),
 ]);
 assert.deepEqual(Object.keys(CATALOG).filter(key=>!sources.has(key)),[]);
 for(const key of Object.keys(CATALOG))assert.notEqual(unlockCondition(key),'',key);
});

test('every survival reward names its complete survival-only condition',()=>{
 for(const unlock of SURVIVAL_UNLOCKS){
  assert.ok(unlock.condition.includes('выживании'),unlock.id);
  for(const key of unlock.rewards)assert.equal(unlockCondition(key),unlock.condition,key);
 }
 const mission=createRun(newProfile(),'garden',77);Object.assign(mission,{elites:10,bosses:2,time:600,level:20,finalDefeated:true});step(mission,0);
 const survivalRewards=new Set(SURVIVAL_UNLOCKS.flatMap(unlock=>unlock.rewards));
 assert.deepEqual(mission.profile.unlocked.filter(key=>survivalRewards.has(key)),[]);
});

test('all former multi-item boss rewards keep explicit deterministic unlocks',()=>{
 const deterministic=new Set([
  ...STARTERS,
  ...MISSIONS.flatMap(m=>m.rewards),
  ...SURVIVAL_UNLOCKS.flatMap(u=>u.rewards),
  ...META_ACHIEVEMENTS.map(a=>a.key),
  ...OVERRUN_PART_UNLOCKS.map(u=>u.key),
 ]);
 assert.deepEqual(previousMissionItems.filter(key=>!deterministic.has(key)),[]);
});

test('survival milestones really unlock their complete configured catalogue set',()=>{
 const s=createRun(newProfile(),'survival',77);Object.assign(s,{elites:10,bosses:2,time:600,level:20,finalDefeated:true});step(s,0);
 const expected=new Set(SURVIVAL_UNLOCKS.flatMap(u=>u.rewards));
 assert.deepEqual([...expected].filter(key=>!s.profile.unlocked.includes(key)),[]);
});

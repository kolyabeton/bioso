import test from 'node:test';
import assert from 'node:assert/strict';
import {MISSIONS,CATALOG,bossPartAvailable} from '../src/catalog.js';
import {newProfile,readProfile,createPart,installed} from '../src/assembly.js';
import {createWorldRun} from '../src/world-run.js';
import {createRun,step,hurtEnemy} from '../src/game.js';
import {skipMissionEvent} from '../src/mission-run.js';
import {generateLoot} from '../src/systems/sets-loot.js';
import {prepareEncounters,discoverEncounters,claimEncounter} from '../src/systems/encounters.js';
import {awardMeta,missionBossVictories,missionAvailable,missionRequirement,starterAllowed,starterSlotAllowed,validLoadout} from '../src/systems/meta-progression.js';
import {unlockCondition} from '../src/ui/adapters.js';

const bossKeys=MISSIONS.flatMap(m=>m.rewards);
function finishMission(s){
 s.arms=[];
 for(let i=0;i<s.mission.floors;i++){
  s.player={x:0,y:0,z:-i*64+20};s.pending=0;s.xpDrops=[];step(s,0);
  const members=s.mission.floorsState[i].members;
  while(true){
   const alive=s.enemies.filter(e=>members.includes(e.id)&&e.hp>0);
   if(!alive.length)break;
   for(const e of alive)hurtEnemy(s,e,1e9);
  }
  s.pending=0;s.xpDrops=[];step(s,0);
  if(s.mission.event)skipMissionEvent(s,s.mission.event.nodeId);
 }
}
test('each boss owns exactly one distinct atlas reward',()=>{
 assert.equal(bossKeys.length,5);assert.equal(new Set(bossKeys).size,5);
 assert.deepEqual(MISSIONS.map(m=>m.rewards),[['hunter'],['bastion'],['rootwalker'],['mirrorGland'],['rocket']]);
 for(const m of MISSIONS){assert.equal(m.floors,25);assert.equal(m.rewards.length,1);assert.ok(CATALOG[m.rewards[0]]);assert.ok(m.rewardTier>=3);assert.ok(unlockCondition(m.rewards[0]).includes(m.bossName));assert.equal(m.starterSlot,undefined);}
});
test('preparation keeps three choices and opens only the organ slot after three bosses',()=>{
 const p=newProfile(),requested={body:'hunter',arm:'pistol',organ:'stabilizer',leg:'runner',arm2:'seed'};
 assert.deepEqual(validLoadout(p,requested),{body:'wanderer',arm:'pistol',organ:null});
 assert.equal(starterSlotAllowed(p,'body'),true);assert.equal(starterSlotAllowed(p,'arm'),true);assert.equal(starterSlotAllowed(p,'organ'),false);assert.equal(starterSlotAllowed(p,'leg'),false);
 p.achievements.push('mission:garden');p.unlocked.push('hunter');assert.deepEqual(validLoadout(p,requested),{body:'hunter',arm:'pistol',organ:null});
 p.achievements.push('mission:quarantine');assert.equal(starterSlotAllowed(p,'organ'),false);
 p.achievements.push('mission:core');assert.equal(missionBossVictories(p),3);assert.equal(starterSlotAllowed(p,'organ'),true);assert.deepEqual(validLoadout(p,requested),{body:'hunter',arm:'pistol',organ:'stabilizer'});
});
test('missions unlock strictly after the preceding mission victory',()=>{
 const p=newProfile();
 assert.deepEqual(MISSIONS.map(m=>missionAvailable(p,m.id)),[true,false,false,false,false]);
 for(let i=0;i<MISSIONS.length-1;i++){
  assert.equal(missionRequirement(MISSIONS[i+1].id),`Пройдите миссию: ${MISSIONS[i].name}`);
  p.achievements.push('mission:'+MISSIONS[i].id);
  assert.equal(missionAvailable(p,MISSIONS[i+1].id),true);
 }
 assert.equal(missionAvailable(p,'unknown'),false);
});
test('actual boss kills unlock one reward immediately, survive reload and do not repeat',()=>{
 for(const m of MISSIONS){
  const s=createWorldRun(newProfile(),m.id,42);finishMission(s);
  assert.ok(s.won);assert.ok(s.mission.rewarded);assert.equal(s.bossRewards?.length||0,0);
  assert.deepEqual(bossKeys.filter(k=>s.profile.unlocked.includes(k)),m.rewards);
  if(m.id==='garden')assert.equal(validLoadout(s.profile,{body:'hunter'}).body,'hunter');
  const physical=[...s.ground,...s.inventory,...installed(s)].filter(g=>bossKeys.includes((g.part??g).key));assert.equal(physical.length,1);assert.equal((physical[0].part??physical[0]).tier,m.rewardTier);
  assert.equal(missionBossVictories(s.profile),1);assert.equal(starterSlotAllowed(s.profile,'organ'),false);
  const saved=readProfile({getItem:()=>JSON.stringify(s.profile)});
  assert.ok(m.rewards.every(k=>saved.unlocked.includes(k)));
  const repeat=createWorldRun(saved,m.id,43);finishMission(repeat);
  assert.equal(repeat.events.filter(e=>e.type==='unlock').length,0);
  assert.equal(saved.achievements.filter(id=>id==='mission:'+m.id).length,1);
 }
});
test('losing an unfinished mission grants no boss unlocks',()=>{
 const s=createWorldRun(newProfile(),'garden',2);step(s,0);s.dead=true;step(s,0);
 assert.ok(bossKeys.every(k=>!s.profile.unlocked.includes(k)));
});
test('closed boss items cannot leak through ordinary, elite, boss or relic loot',()=>{
 const s=createRun(newProfile(),'survival',123);s.time=900;
 for(const source of ['normal','elite','boss'])for(const rarity of ['common','rare','relic'])for(let i=0;i<100;i++){
  assert.ok(!bossKeys.includes(generateLoot(s,createPart,3,source,rarity,false).key));
 }
 s.elites=99;s.level=25;s.finalDefeated=true;s.profile.meta.overruns=10;awardMeta(s,createPart);step(s,0);
 assert.ok(bossKeys.every(k=>!s.profile.unlocked.includes(k)));
});
test('all five unlocked boss items really occur in survival loot',()=>{
 const s=createRun(newProfile(),'survival',321);s.profile.unlocked.push(...bossKeys);
 const seen=new Set();for(let i=0;i<2500;i++)seen.add(generateLoot(s,createPart,3,'elite','rare',false).key);
 for(const key of bossKeys)assert.ok(seen.has(key),key);
});
test('encounter generation, adaptation and claiming respect boss gates',()=>{
 for(const seed of [3,15,31]){
  const s=createRun(newProfile(),'survival',seed);prepareEncounters(s);discoverEncounters(s);
  assert.ok(s.encounters.nodes.length>0);
  for(const n of s.encounters.nodes)assert.ok(n.rewards.every(k=>bossPartAvailable(s.profile,k)),n.id);
 }
 const s=createRun();s.encounters={nodes:[{id:'locked',type:'slab',state:'reward',x:0,z:0,rewards:['rocket']}]};
 assert.equal(claimEncounter(s,'locked',0),false);assert.equal(s.encounters.nodes[0].state,'reward');
 s.profile.unlocked.push('rocket');assert.equal(claimEncounter(s,'locked',0),true);
});
test('legacy victories gain their new reward bundles while existing discoveries remain',()=>{
 const p=newProfile();p.unlocked.push('rocket');p.achievements.push('mission:garden');
 const restored=readProfile({getItem:()=>JSON.stringify(p)});
 for(const key of [...MISSIONS[0].rewards,'rocket'])assert.ok(restored.unlocked.includes(key));
 assert.ok(!restored.unlocked.includes('hecaton'));assert.equal(starterAllowed(restored,'hunter'),true);
 assert.equal(starterSlotAllowed(restored,'body'),true);assert.equal(starterSlotAllowed(restored,'organ'),false);assert.equal(validLoadout(restored,{body:'hunter'}).body,'hunter');
 assert.equal(new Set(restored.unlocked).size,restored.unlocked.length);
});

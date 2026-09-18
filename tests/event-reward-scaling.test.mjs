import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun} from '../src/game.js';
import {createPart} from '../src/assembly.js';
import {claimEncounter} from '../src/systems/encounters.js';
import {encounterRewardTier} from '../src/systems/events/rewards.js';
import {encounterDetail} from '../src/ui/isaac-ui.js';
import {tickMissionFloors} from '../src/mission-run.js';
import {ROMAN} from '../src/catalog.js';

test('event and secret previews match granted ranks at every level boundary',()=>{
 for(const type of ['sealed','infection','hunt','race','membrane','slab','nursery']){
  for(const [level,tier] of [[1,1],[4,1],[5,2],[8,2],[9,3],[12,3],[13,4],[16,4],[17,5],[99,5]]){
   const s=createRun(undefined,'survival',91);s.level=level;
   const n={id:'reward',type,state:'reward',...s.player,rewards:['reflexNerve'],rewardTier:1};
   s.profile.unlocked.push('reflexNerve');s.encounters={nodes:[n],active:null};
   assert.match(encounterDetail(s,n.id),new RegExp(`data-item-tier="${ROMAN[tier]}"`),`${type} level ${level}`);
   assert.equal(claimEncounter(s,n.id,0),true);
   assert.equal(s.ground.at(-1).part.tier,tier);
   assert.equal(claimEncounter(s,n.id,0),false);
  }
 }
});

test('reward scales when collected later and never downgrades a higher event reward',()=>{
 const s=createRun(undefined,'survival',91),n={id:'reward',type:'infection',state:'reward',...s.player,rewards:['reflexNerve'],rewardTier:1};
 s.profile.unlocked.push('reflexNerve');s.encounters={nodes:[n],active:null};s.level=8;
 assert.equal(encounterRewardTier(s,n),2);s.level=9;
 assert.equal(claimEncounter(s,n.id,0),true);assert.equal(s.ground.at(-1).part.tier,3);
 assert.equal(encounterRewardTier(s,{rewardTier:4}),4);
 assert.equal(encounterRewardTier(s,{rewardPart:{tier:5}}),5);
});

test('mission event auto reward scales to level nine and retains its rolled properties',()=>{
 const s=createRun(undefined,'survival',91);s.level=9;
 const part=createPart(s,'reflexNerve',1),n={id:'mission-reward',type:'infection',state:'reward',...s.player,rewards:[part.key],rewardTier:1,rewardPart:part};
 const original=structuredClone(part);
 s.profile.unlocked.push('reflexNerve');s.encounters={nodes:[n],active:null};s.exploration={groups:[]};
 s.mission={event:{nodeId:n.id,room:3},eventHistory:[],floorsState:[],currentFloor:0};
 assert.match(encounterDetail(s,n.id),/data-item-tier="III"/);
 tickMissionFloors(s);
 assert.deepEqual(s.ground.at(-1).part,{...original,tier:3});
 assert.equal(n.claimed,true);
 tickMissionFloors(s);assert.equal(s.ground.length,1);
});

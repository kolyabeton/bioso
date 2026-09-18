import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorldRun,stepWorldRun} from '../src/world-run.js';
import {hurtEnemy,beginEncounter} from '../src/game.js';
import {skipMissionEvent,MISSION_EVENT_PLAN} from '../src/mission-run.js';
import {missionGateClosed,missionGateZ} from '../src/mission-environment.js';
import {encounterDetail} from '../src/ui/isaac-ui.js';

test('every mission event offers decline and opens a traversable gate without a reward',()=>{
 const s=createWorldRun(undefined,'garden',9),types=[];
 for(let index=0;index<24;index++){
  s.player={x:0,y:0,z:-index*64};stepWorldRun(s,0);
  const floor=s.mission.floorsState[index];
  for(const enemy of s.enemies.filter(e=>e.hp>0&&floor.members.includes(e.id)))hurtEnemy(s,enemy,1e12);
  s.pending=0;s.xpDrops=[];stepWorldRun(s,0);
  if(!s.mission.event)continue;
  const node=s.encounters.nodes.find(n=>n.id===s.mission.event.nodeId),gateZ=missionGateZ(index);
  if(node.type==='sealed')assert.equal(node.radius,11);
  types.push(node.type);s.player={x:node.x,y:node.y,z:node.z+2};
  const html=encounterDetail(s,node.id);
  assert.match(html,/data-action="mission-event-skip"[^>]*><span>Отказаться<\/span>/);
  assert.doesNotMatch(html,/>Позже</);
  if(node.kind==='altar'){
   const [body,footer]=html.split('<footer class="ui-screen-footer event-footer">');
   assert.doesNotMatch(body,/data-action="deal-accept"/);
   assert.match(footer,/data-action="deal-accept"[\s\S]*data-action="mission-event-skip"/);
  }
  assert.equal(missionGateClosed(s.mission,index),true);
  assert.equal(s.world.canMove({x:0,z:gateZ+4},{x:0,z:gateZ-4},.8),false);
  assert.equal(skipMissionEvent(s,node.id),true);
  assert.equal(s.mission.event,null);
  assert.match(encounterDetail(s,node.id),/Вы отказались/);
  assert.doesNotMatch(encounterDetail(s,node.id),/Испытание провалено|Время вышло/);
  assert.equal(missionGateClosed(s.mission,index),false);
  assert.equal(s.world.canMove({x:0,z:gateZ+4},{x:0,z:gateZ-4},.8),true);
  assert.equal(s.mission.eventHistory.at(-1).outcome,'skipped');
  assert.equal(s.ground.filter(g=>g.missionEventReward).length,0);
  assert.equal(skipMissionEvent(s,node.id),false);
  assert.equal(beginEncounter(s,node.id),false);
 }
 assert.deepEqual(types,MISSION_EVENT_PLAN.map(p=>p.type));
});

test('active trials keep Continue; survival events keep Later',()=>{
 const s=createWorldRun(undefined,'survival',9),node=s.encounters.nodes.find(n=>n.type==='hunt');
 s.player={x:node.x,y:node.y,z:node.z};node.state='ready';
 assert.match(encounterDetail(s,node.id),/data-action="resume"[^>]*><span>Позже<\/span>/);
 node.missionEvent=true;node.state='active';
 assert.match(encounterDetail(s,node.id),/data-action="resume"[^>]*><span>Продолжить<\/span>/);
 assert.doesNotMatch(encounterDetail(s,node.id),/mission-event-skip/);
});

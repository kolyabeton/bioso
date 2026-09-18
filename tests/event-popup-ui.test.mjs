import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun} from '../src/game.js';
import {createPart,stats} from '../src/assembly.js';
import {encounterDetail,encounterHeaderData} from '../src/ui/isaac-ui.js';
import {EVENTS} from '../src/systems/events/definitions.js';
import {SECRETS} from '../src/systems/secrets/definitions.js';

test('every event, secret and reachable state uses the shared reference popup shell',()=>{
 const s=createRun(undefined,'survival',91);s.level=99;s.time=9999;s.body=createPart(s,'bastion',3);s.hp=stats(s).hp;
 for(const [type,d] of Object.entries({...EVENTS,...SECRETS})){
  const states=d.kind==='altar'?['ready','complete']:d.kind==='secret'?['ready','reward','complete']:['ready','paused','active','reward','complete','failed'];
  for(const state of states){
   const n={id:`popup-${type}-${state}`,type,state,...s.player,radius:d.radius||1.4,recommended:d.recommended||0,unlockLevel:0,rewards:['seed','universal','regen'],rewardTier:1,deals:d.deal?[d.deal]:[],progress:0,claimed:false};
   if(type==='race')n.race={length:40,limit:20};
   s.encounters={nodes:[n],active:state==='active'?n:null};
   const html=encounterDetail(s,n.id);
   const label=`${type}:${state}`;
   assert.match(html,new RegExp(`data-event-type="${type}"`),label);
   assert.match(html,/class="event-popup-panel"/,label);
   assert.match(html,/class="ui-event-detail event-popup-scroll"/,label);
   assert.match(html,/class="event-content"/,label);
   assert.match(html,/class="ui-screen-footer event-footer"/,label);
   assert.doesNotMatch(html,/ваш уровень/,label);
   const header=encounterHeaderData(s,n.id);
   assert.equal(header.name,d.name,label);
   assert.match(header.meta,/Событие|Секрет/,label);
   assert.ok(header.art,label);
  }
 }
});

test('challenge popup offers start without completion warning during a boss and another trial',()=>{
 const s=createRun(undefined,'survival',91);s.level=99;s.time=9999;s.pending=1;
 const n={id:'new-hunt',type:'hunt',state:'ready',...s.player,rewards:['seed'],rewardTier:4};
 s.encounters={nodes:[n],active:{id:'previous',type:'infection',state:'active',progress:12}};
 s.enemies.push({id:999,kind:'boss',hp:100});
 const html=encounterDetail(s,n.id);
 assert.doesNotMatch(html,/Завершите бой/);
 assert.match(html,/data-action="encounter-start"[^>]*><span>Начать<\/span>/);
 const start=html.match(/<button[^>]*data-action="encounter-start"[^>]*>/)?.[0];
 assert.ok(start);assert.doesNotMatch(start,/disabled/);
});

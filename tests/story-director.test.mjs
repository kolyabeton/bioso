import test from 'node:test';
import assert from 'node:assert/strict';
import {STORY_CUES} from '../src/story-cues.js';
import {createStoryDirector,storyCueReady} from '../src/story-director.js';
import {STORY_EVIDENCE} from '../src/story-evidence.js';

const missionRun=(id,{floor=0,boss=false,half=false}={})=>({mode:id,mission:{id,currentFloor:floor,floors:25,bossSpawned:boss,floorsState:Array.from({length:25},(_,index)=>({entered:index===0,state:index<floor?'cleared':'ready'}))},enemies:boss?[{hp:half?40:100,maxHp:100,bossCombat:{},missionRoom:25}]:[],pending:0,bossRewards:[],won:false,dead:false,continued:false});

test('mission revelations unlock in order without invalidating earlier facts',()=>{
  const start=STORY_CUES.filter(cue=>cue.mission==='garden'&&cue.trigger==='mission-start');
  const middle=STORY_CUES.filter(cue=>cue.mission==='garden'&&cue.trigger==='mission-mid');
  const boss=STORY_CUES.filter(cue=>cue.mission==='garden'&&cue.trigger==='mission-boss');
  const run=missionRun('garden');assert.equal(start.every(cue=>storyCueReady(cue,run)),true);assert.equal(middle.some(cue=>storyCueReady(cue,run)),false);
  run.mission.currentFloor=12;assert.equal(middle.every(cue=>storyCueReady(cue,run)),true);assert.equal(boss.some(cue=>storyCueReady(cue,run)),false);
  run.mission.bossSpawned=true;run.enemies.push({hp:100,maxHp:100,bossCombat:{},missionRoom:25});assert.equal(boss.every(cue=>storyCueReady(cue,run)),true);
});

test('the final mission adds the child answer only after the boss reaches half health',()=>{
  const cue=STORY_CUES.find(item=>item.id==='mother-04-child'),run=missionRun('mother',{boss:true});
  assert.equal(storyCueReady(cue,run),false);run.enemies[0].hp=50;assert.equal(storyCueReady(cue,run),true);
});

test('every mission has a complete causal chain through early, middle, boss and half-health beats',()=>{
  for(const mission of ['garden','quarantine','core','nursery','mother']){
    const triggers=new Set(STORY_CUES.filter(cue=>cue.mission===mission).map(cue=>cue.trigger));
    assert.deepEqual([...triggers].sort(),['mission-boss','mission-boss-half','mission-early','mission-mid','mission-start'].sort(),mission);
  }
});

test('director queues each reached cue once and defers while a choice screen is pending',()=>{
  const queued=[],radio={enqueue:cue=>queued.push(cue.id),clear(){queued.length=0;},show(){return true;}},director=createStoryDirector(radio),run=missionRun('garden');
  run.pending=1;director.tick(run);assert.deepEqual(queued,[]);
  const start=STORY_CUES.filter(cue=>cue.mission==='garden'&&cue.trigger==='mission-start').map(cue=>cue.id);
  const later=STORY_CUES.filter(cue=>cue.mission==='garden'&&['mission-early','mission-mid'].includes(cue.trigger)).map(cue=>cue.id);
  run.pending=0;director.tick(run);director.tick(run);assert.deepEqual(queued,start);
  run.mission.currentFloor=12;director.tick(run);assert.deepEqual(queued,[...start,...later]);
});

test('survival waits for play, then reveals the Mother and the counterargument',()=>{
  const start=STORY_CUES.find(cue=>cue.id==='survival-01-child'),pressure=STORY_CUES.find(cue=>cue.id==='survival-wave-01-child'),archive=STORY_CUES.find(cue=>cue.id==='survival-archive-01-child'),boss=STORY_CUES.find(cue=>cue.id==='survival-boss-01-child'),mother=STORY_CUES.find(cue=>cue.id==='survival-final-mother'),reply=STORY_CUES.find(cue=>cue.id==='survival-final-child');
  const run={mode:'survival',time:4,bosses:0,enemies:[]};assert.equal(storyCueReady(start,run),false);run.time=5;assert.equal(storyCueReady(start,run),true);
  run.time=120;assert.equal(storyCueReady(pressure,run),true);run.time=300;assert.equal(storyCueReady(archive,run),true);
  run.bosses=1;assert.equal(storyCueReady(boss,run),true);
  run.enemies=[{kind:'boss',survivalSuperBoss:true,hp:100,maxHp:100}];assert.equal(storyCueReady(mother,run),false);
  run.enemies=[{kind:'final',territory:{state:'idle'},hp:100,maxHp:100}];assert.equal(storyCueReady(mother,run),false);
  run.enemies[0].territory.state='engaged';assert.equal(storyCueReady(mother,run),true);assert.equal(storyCueReady(reply,run),false);run.enemies[0].hp=49;assert.equal(storyCueReady(reply,run),true);
});

test('each boss keeps a distinct processed voice profile',()=>{
  const bosses=STORY_CUES.filter(cue=>cue.voice==='robot');
  assert.deepEqual([...new Set(bosses.map(cue=>cue.speaker))].sort(),['Зеркальный Сборщик','Корневой Собор','Матка','Пастырь Роя','Ртутный Ловчий','Свалочный Левиафан'].sort());
  assert.equal(new Set(bosses.map(cue=>cue.voiceProfile)).size,6);
});

test('a disabled director leaves a manually shown review cue untouched',()=>{
  let cleared=0;const radio={enqueue(){},show(){return true;},clear(){cleared++;}},director=createStoryDirector(radio,{enabled:false});
  assert.equal(director.play('garden-01-child',{duration:0}),true);
  director.tick(missionRun('garden'));
  assert.equal(cleared,0);
});

test('discoveries queue the source first, then an optional private thought, once',()=>{
  const queued=[],radio={enqueue:cue=>queued.push(cue),clear(){},show(){return true;}},director=createStoryDirector(radio);
  const evidence=STORY_EVIDENCE.find(item=>item.id==='garden-launch-key');
  assert.equal(director.discover(evidence),true);assert.deepEqual(queued.map(cue=>cue.id),['evidence:garden-launch-key','thought:garden-launch-key']);
  assert.equal(queued[0].voice,'silent');assert.equal(queued[1].speaker,'Душа · внутренняя связь');assert.equal(director.discover(evidence),false);
});

test('the zero-context exchange belongs to the first mission and never Survival',()=>{
  const cue=STORY_CUES.find(item=>item.id==='awakening-01-child');
  const survival={mode:'survival',time:300,profile:{meta:{storyCues:[]}},enemies:[]};
  assert.equal(storyCueReady(cue,survival),false);
  const run=missionRun('garden');run.profile={meta:{storyCues:[cue.id]}};
  assert.equal(storyCueReady(cue,run),true);
  run.profile.meta.storyCues.push(cue.recordId);assert.equal(storyCueReady(cue,run),false);
});

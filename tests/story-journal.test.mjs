import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorldRun} from '../src/world-run.js';
import {pickup,newProfile,readProfile} from '../src/assembly.js';
import {STORY_EVIDENCE,SURVIVAL_EVIDENCE} from '../src/story-evidence.js';
import {STORY_CUES} from '../src/story-cues.js';
import {journalRecords,journalScreen} from '../src/ui/story-journal.js';
import {BASE_ABILITY_BRANCHES,knownAbilityBranches,recordAbilityDiscovery} from '../src/systems/meta-progression.js';
import {biomeMapMarkers} from '../src/ui/map.js';

test('survival has a long complementary archive without repeating mission records',()=>{
 assert.equal(SURVIVAL_EVIDENCE.length,15);
 assert.equal(new Set(SURVIVAL_EVIDENCE.map(item=>item.id)).size,SURVIVAL_EVIDENCE.length);
 const missionCopy=new Set([...STORY_EVIDENCE.flatMap(item=>[item.title,item.text]),...STORY_CUES.map(item=>item.text)]);
 for(const item of SURVIVAL_EVIDENCE){assert.equal(missionCopy.has(item.title),false);assert.equal(missionCopy.has(item.text),false);}
});

test('each survival run places the next uncollected record and discoveries persist',()=>{
 const profile=newProfile(),first=createWorldRun(profile,'survival',101),item=first.ground.find(entry=>entry.survivalEvidence);
 assert.equal(item.lore.id,SURVIVAL_EVIDENCE[0].id);first.player={x:item.x,y:item.y,z:item.z};assert.equal(pickup(first,item.id),true);
 assert.deepEqual(profile.meta.storyEvidence,[SURVIVAL_EVIDENCE[0].id]);assert.ok(first.events.some(event=>event.type==='profile-progress'));
 const second=createWorldRun(profile,'survival',202),next=second.ground.find(entry=>entry.survivalEvidence);
 assert.equal(next.lore.id,SURVIVAL_EVIDENCE[1].id);
 profile.meta.storyEvidence=SURVIVAL_EVIDENCE.map(entry=>entry.id);
 assert.equal(createWorldRun(profile,'survival',303).ground.some(entry=>entry.survivalEvidence),false);
});

test('the survival record is discoverable as loot on the biome map',()=>{
 const run=createWorldRun(newProfile(),'survival',404),record=run.ground.find(entry=>entry.survivalEvidence);
 const marker=biomeMapMarkers(run).find(entry=>entry.id===record.id);
 assert.equal(marker.mapCategory,'loot');assert.equal(marker.label,'Неизвестная запись');
});

test('journal shows heard dialogue, evidence, and thoughts directly in its cards',()=>{
 const profile=newProfile();profile.meta.storyEvidence=['garden-agronomist-log','survival-fire-census'];profile.meta.storyCues=['garden-01-child'];
 const records=journalRecords(profile);assert.deepEqual(records.map(item=>item.id).sort(),['garden-01-child','garden-agronomist-log','survival-fire-census'].sort());
 const chronology=journalScreen(profile);assert.match(chronology,/После Дня Огня|Список эвакуации/);assert.doesNotMatch(chronology,/История собирается между забегами|ui-journal-record-icon|data-action="journal-entry"|Раздел журнала|>Записи</);
 assert.match(chronology,/Люди спасли детей/);
 assert.match(chronology,/data-action="journal-audio" data-id="garden-01-child"/);
 assert.doesNotMatch(chronology,/data-action="journal-audio" data-id="garden-agronomist-log"/);
});

test('old saves retain journal data and development starts with five branches',()=>{
 const saved={version:1,unlocked:[],achievements:[],meta:{storyEvidence:['survival-fire-census'],storyCues:['garden-01-child'],abilityBranches:['fire']}};
 const profile=readProfile({getItem:()=>JSON.stringify(saved)});assert.deepEqual(profile.meta.storyEvidence,saved.meta.storyEvidence);assert.deepEqual(profile.meta.storyCues,saved.meta.storyCues);
 assert.deepEqual(knownAbilityBranches(newProfile()),[...BASE_ABILITY_BRANCHES]);
 const run={profile:newProfile(),events:[]};assert.equal(recordAbilityDiscovery(run,'fire.0'),true);assert.deepEqual(knownAbilityBranches(run.profile),[...BASE_ABILITY_BRANCHES,'fire']);assert.equal(recordAbilityDiscovery(run,'fire.1'),false);
});

test('completed missions backfill their radio chronology for older saves',()=>{
 const profile=newProfile();profile.achievements.push('mission:garden');
 const records=journalRecords(profile);
 assert.ok(records.some(item=>item.id==='garden-01-child'));
 assert.ok(records.every(item=>item.chapter==='garden'));
});

test('journal preserves conversations and inserts evidence where it was found instead of sorting by id',()=>{
 const profile=newProfile();
 profile.meta.storyEvidence=STORY_EVIDENCE.filter(item=>item.mission==='garden').map(item=>item.id);
 profile.meta.storyCues=STORY_CUES.filter(item=>['global','garden'].includes(item.mission)).map(item=>item.id);
 const ids=journalRecords(profile).map(item=>item.id);
 assert.ok(ids.indexOf('awakening-01-child')<ids.indexOf('garden-01-child'));
 assert.ok(ids.indexOf('garden-early-soul-choice')<ids.indexOf('garden-agronomist-log'));
 assert.ok(ids.indexOf('garden-agronomist-log')<ids.indexOf('garden-02-hunter'));
 assert.ok(ids.indexOf('garden-02-child-network')<ids.indexOf('garden-launch-key'));
 assert.ok(ids.indexOf('garden-launch-key')<ids.indexOf('garden-03-hunter'));
 assert.ok(ids.indexOf('garden-03-hunter')<ids.indexOf('garden-03-soul'));
});

test('the relocated first-mission introduction remains visible after scoped delivery',()=>{
 const cue=STORY_CUES.find(item=>item.id==='awakening-01-child'),profile=newProfile();
 profile.meta.storyCues=[cue.recordId];
 assert.ok(journalRecords(profile).some(item=>item.id===cue.id));
});

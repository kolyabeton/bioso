import test from 'node:test';
import assert from 'node:assert/strict';
import {STORY_EVIDENCE,evidenceForRoom,evidenceCue,thoughtCue,spawnMissionEvidence} from '../src/story-evidence.js';
import {translateText} from '../src/i18n/index.js';

test('each mission hides two contradictory physical clues in optional rooms',()=>{
 assert.equal(STORY_EVIDENCE.length,10);
 for(const mission of ['garden','quarantine','core','nursery','mother']){
  const clues=STORY_EVIDENCE.filter(item=>item.mission===mission);
  assert.deepEqual(clues.map(item=>item.room),[4,16]);
  assert.deepEqual(new Set(clues.map(item=>item.side)),new Set(['human','machine']));
  assert.ok(clues.some(item=>item.kind==='note'||item.kind==='artifact'||item.kind==='trace'));
 }
});

test('mission evidence becomes a highlighted ground object only once',()=>{
 const run={mission:{id:'garden'},ground:[],entityId:20,world:{heightAt:()=>1.5}},floor={index:3,z:-192};
 assert.deepEqual(evidenceForRoom('garden',4).map(item=>item.id),['garden-agronomist-log']);
 assert.deepEqual(spawnMissionEvidence(run,floor),[21]);
 assert.equal(run.ground[0].lore.id,'garden-agronomist-log');assert.equal(run.ground[0].y,1.5);
 run.ground=[];assert.deepEqual(spawnMissionEvidence(run,floor),[]);assert.equal(run.ground.length,0);
});

test('found evidence uses a silent compact cue followed by the Soul reasoning from it',()=>{
 for(const evidence of STORY_EVIDENCE){
  assert.equal(evidenceCue(evidence).voice,'silent');
  assert.equal(thoughtCue(evidence).speaker,'Душа · внутренняя связь');assert.equal(thoughtCue(evidence).icon,'soul');
 }
});

test('clues and reflections have English coverage',()=>{
 const copy=STORY_EVIDENCE.flatMap(item=>[item.title,item.text,item.thought]).filter(Boolean);
 for(const value of copy)assert.doesNotMatch(translateText(value,'en'),/[А-Яа-яЁё]/u,value);
});

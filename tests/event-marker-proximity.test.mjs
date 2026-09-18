import test from 'node:test';
import assert from 'node:assert/strict';
import {visibleEventMarkers} from '../src/ui/event-marker-visibility.js';

const marker=(overrides={})=>({id:'mission-event-3',type:'infection',state:'failed',skipped:true,x:0,y:0,z:0,unlockLevel:1,recommended:1,...overrides});
const state=node=>({mode:'garden',level:1,time:0,player:{x:0,y:0,z:0},world:{flat:false,lineClear:()=>true},encounters:{active:null,nodes:[node]}});

test('ordinary event labels appear only at interaction distance from the building',()=>{
 const node=marker(),s=state(node);
 s.player.x=4.01;assert.deepEqual(visibleEventMarkers(s),[]);
 s.player.x=4;assert.deepEqual(visibleEventMarkers(s),[node]);
});

test('active challenge progress keeps its wider visibility range',()=>{
 const node=marker({state:'active',skipped:false}),s=state(node);s.encounters.active=node;
 s.player.x=21;assert.deepEqual(visibleEventMarkers(s),[node]);
 s.player.x=22;assert.deepEqual(visibleEventMarkers(s),[]);
});

test('active dungeon uses the navigation arrow instead of a world progress label',()=>{
 const node=marker({type:'dungeon_roots',state:'active',skipped:false,dungeon:true}),s=state(node);s.encounters.active=node;
 assert.deepEqual(visibleEventMarkers(s),[]);
});

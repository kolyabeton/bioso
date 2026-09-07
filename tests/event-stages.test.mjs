import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorldRun} from '../src/world-run.js';
import {availableEncounter,discoverEncounters,nearbyEncounters,claimEncounter,openSecret} from '../src/systems/encounters.js';
import {filteredMapMarkers} from '../src/ui/map.js';
import {modulePresentation} from '../src/gameplay-modules/definitions.js';
import {startChallenge} from '../src/systems/events/challenges.js';
const s=createWorldRun(undefined,'survival',71);
test('survival has five secrets and all three trials at levels 5, 15 and 25',()=>{
 assert.equal(s.encounters.nodes.length,19);assert.equal(s.encounters.nodes.filter(n=>['membrane','slab','nursery'].includes(n.type)).length,5);
 for(const type of ['sealed','infection','hunt'])assert.deepEqual(s.encounters.nodes.filter(n=>n.type===type).map(n=>[n.unlockLevel,n.recommended,n.rewardTier]),[[5,5,1],[15,15,2],[25,25,3]]);
});
test('time cannot unlock late trials before their level',()=>{
 const state={...s,time:10000};for(const n of s.encounters.nodes.filter(n=>n.unlockLevel)){state.level=n.unlockLevel-1;assert.equal(availableEncounter(state,n),false);state.level++;assert.equal(availableEncounter(state,n),true);}
});
test('approaching a secret gives no map marker, prompt, discovery or signal; opening enables local reward',()=>{
 const state=structuredClone({...s,world:undefined,rng:undefined}),n=state.encounters.nodes.find(n=>n.type==='slab');state.world={flat:true,walkable:()=>true};state.player={x:n.x,y:n.y,z:n.z};state.time=10000;state.level=25;
 discoverEncounters(state);assert.equal(n.discovered,false);assert(!nearbyEncounters(state).includes(n));assert(!filteredMapMarkers(state).some(m=>m.id===n.id));assert.equal(modulePresentation(n).signal,'off');
 openSecret(state,n);assert(nearbyEncounters(state).includes(n));assert(!filteredMapMarkers(state).some(m=>m.id===n.id));
});
test('higher-tier trials scale enemy health, pursuer count and granted item tier',()=>{
 for(const tier of [1,2,3]){const original=s.encounters.nodes.find(n=>n.type==='infection'&&n.challengeTier===tier),n={...original},state={...s,level:25,time:300,player:{x:n.x,y:n.y,z:n.z},enemies:[],encounters:{nodes:[n],active:null},ground:[],events:[],profile:{unlocked:[]}};let id=0;
 assert(startChallenge(state,n.id,()=>{const e={id:++id,hp:100,maxHp:100,speed:5};state.enemies.push(e);return e;}));assert.equal(state.enemies.length,2+tier);assert.equal(state.enemies[0].hp,800*(1+(tier-1)*1.5));
 n.state='reward';assert(claimEncounter(state,n.id,0));assert.equal(state.ground[0].part.tier,tier);
 }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {abilityCards,eligible} from '../src/systems/progression.js';
import {ABILITIES,FALLBACKS} from '../src/systems/abilities.js';
import {abilityTree,abilityArt} from '../src/ui/ability-tree.js';
import {existsSync} from 'node:fs';
const state=(learned,ids)=>({abilities:{learned},choices:ids.map(id=>({id})),arms:[]});
test('branch final unlocks with either upgrade, never merely previewing',()=>{
 const s=state(['fire.0'],['fire.1']);let card=abilityCards(s)[0];
 assert.equal(card.nodes.find(n=>n.id==='fire.3').state,'locked');
 const html=abilityTree(card,'fire.3');assert.match(html,/Пожар/);assert.match(html,/ИЛИ/);assert.match(html,/Изучено/);
 assert.deepEqual(s.abilities.learned,['fire.0']);
 for(const id of ['fire.1','fire.2'])assert.equal(eligible(state(['fire.0',id],[]),ABILITIES['fire.3']),true);
});
test('synergy shows its own two prerequisite finals and requires both',()=>{
 const s=state(['fire.3'],['thermal']);const card=abilityCards(s)[0];
 assert.deepEqual(new Set(card.nodes.map(n=>n.id)),new Set(['fire.3','cold.3','thermal']));
 assert.equal(eligible(s,ABILITIES.thermal),false);
 assert.equal(eligible(state(['fire.3','cold.3'],[]),ABILITIES.thermal),true);
 assert.match(abilityTree(card),/Нужны обе/);assert.doesNotMatch(abilityTree(card),/Плазма/);
});
test('all ability icons have a deployed unique path; repeatable boosts have no invented tree',()=>{
 for(const id of Object.keys({...ABILITIES,...FALLBACKS})){
 assert.ok(existsSync(new URL('../public/assets/ui/abilities/'+id+'.png',import.meta.url)),id);
 assert.match(abilityArt(id),/\.png/);
 }
 assert.match(abilityTree(abilityCards(state([],['minor.rate']))[0]),/Повторяемое/);
 assert.equal(abilityArt('../../missing'),'');
});

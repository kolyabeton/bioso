import test from 'node:test';
import assert from 'node:assert/strict';
import {abilityCards,eligible,learnedAbilities} from '../src/systems/progression.js';
import {ABILITIES,FALLBACKS,abilityDescriptionAtLevel,abilityLevel,learn} from '../src/systems/abilities.js';
import {abilityTree,abilityArt} from '../src/ui/ability-tree.js';
import {translateText} from '../src/i18n/index.js';
import {existsSync} from 'node:fs';
const state=(learned,ids)=>({abilities:{learned},choices:ids.map(id=>({id})),arms:[]});
test('branch final unlocks with either upgrade, never merely previewing',()=>{
 const s=state(['fire.0'],['fire.1']);let card=abilityCards(s)[0];
 assert.equal(card.nodes.find(n=>n.id==='fire.3').state,'locked');
 const html=abilityTree(card,'fire.3');assert.match(html,/Пожар/);assert.match(html,/ИЛИ/);assert.match(html,/Уровень 1 \/ 5/);
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
test('read-only synergy uses the approved spine without an invented root or learn action',()=>{
 const s=state([],['thermal']),card={...abilityCards(s)[0],readOnly:true};
 const html=abilityTree(card,'thermal');
 assert.match(html,/ui-ability-spine/);assert.match(html,/ui-spine-stop--left/);assert.match(html,/ui-spine-stop--right/);assert.match(html,/ui-spine-stop--final/);
 assert.doesNotMatch(html,/ui-spine-stop--root/);assert.doesNotMatch(html,/Изучить|Выбранный узел/);
});
test('all ability icons resolve to a deployed path; repeatable boosts have no invented tree',()=>{
 for(const id of Object.keys({...ABILITIES,...FALLBACKS})){
 const src=abilityArt(id).match(/src="([^"]+)"/)?.[1];assert.ok(src,id);
 assert.ok(existsSync(new URL('../public'+src,import.meta.url)),id);
 }
 assert.match(abilityTree(abilityCards(state([],['minor.rate']))[0]),/Повторяемое/);
 assert.equal(abilityArt('../../missing'),'');
});
test('ballistic growth shows the effective bonus for the displayed rank',()=>{
 const s=state(['ranged.2'],['ranged.2']);s.abilities.levels={'ranged.2':2};
 assert.match(learnedAbilities(s)[0].description,/до \+45%/);
 assert.match(abilityCards(s)[0].description,/до \+45% → \+60%/);
 assert.match(abilityTree(abilityCards(s)[0]),/до \+60%/);
});
test('choice descriptions show the effective value and compare upgrades',()=>{
 const first=state([],['might.0']);
 assert.equal(abilityCards(first)[0].description,'Урон всего оружия +10%.');
 const second=state(['might.0'],['might.0']);second.abilities.levels={'might.0':1};
 assert.equal(abilityCards(second)[0].description,'Урон всего оружия +10% → +15%.');
 const projectile=state(['projectiles.0'],['projectiles.0']);projectile.abilities.levels={'projectiles.0':1};
 assert.match(abilityCards(projectile)[0].description,/Ещё 1 → 2 снаряда/);
 for(const card of [...abilityCards(first),...abilityCards(second)])assert.doesNotMatch(card.description,/первом уровне/i);
});
test('ability descriptions show rank changes except deliberate plateau ranks',()=>{
 for(const d of Object.values({...ABILITIES,...FALLBACKS})){
  const first=abilityDescriptionAtLevel(d,1),second=abilityDescriptionAtLevel(d,2);
  if(d.maxLevel>1&&!['summons.0'].includes(d.id))assert.notEqual(first,second,d.id);else if(d.maxLevel===1)assert.equal(first,second,d.id);
  for(let rank=1;rank<=d.maxLevel;rank++){
   const text=abilityDescriptionAtLevel(d,rank);
   assert.doesNotMatch(text,/первом уровне|−-/u,`${d.id}@${rank}`);
   assert.doesNotMatch(translateText(text,'en'),/[А-Яа-яЁё]/u,`${d.id}@${rank}`);
  }
 }
});
test('binary mechanics stop at one rank while large discrete effects stop at three',()=>{
 for(const id of ['projectiles.1','projectiles.2','electric.3','vitality.3','plasma','ricochet.0'])assert.equal(ABILITIES[id].maxLevel,1,id);
 for(const id of ['tempo.3','electric.1','cold.3','swarm'])assert.equal(ABILITIES[id].maxLevel,3,id);
 const ricochetBase=abilityDescriptionAtLevel(ABILITIES['ricochet.0'],1);assert.match(ricochetBase,/атака рикошетит.*4 м/);assert.doesNotMatch(ricochetBase,/ближн|снаряд/u);
 assert.match(abilityDescriptionAtLevel(ABILITIES['ricochet.3'],5),/шанс крита вторичного попадания \+25%/);
 const s=state(['ricochet.0'],['ricochet.1']);s.abilities.levels={'ricochet.0':1};const html=abilityTree(abilityCards(s)[0]);
 assert.match(html,/Три независимых направления/);assert.doesNotMatch(html,/Для финала/);
 const migrated=state(['vitality.3'],[]);migrated.abilities.levels={'vitality.3':5};assert.equal(abilityLevel(migrated,'vitality.3'),1);assert.equal(learn(migrated,'vitality.3'),false);
 const capped=state([],[]);capped.abilities.levels={};for(let i=0;i<3;i++)assert.ok(learn(capped,'tempo.3'));assert.equal(learn(capped,'tempo.3'),false);
});
test('current descriptions expose runtime caps and rank-driven mechanics',()=>{
 const at=(id,rank)=>abilityDescriptionAtLevel(ABILITIES[id]||FALLBACKS[id],rank);
 assert.match(at('projectiles.3',5),/6 снарядов.*−60%.*Штрафы суммируются/);
 assert.match(at('fire.0',1),/15%.*отдельный стак/);
 assert.match(at('fire.0',5),/45%.*отдельный стак/);
 assert.match(at('summons.1',5),/\+75%/);assert.doesNotMatch(at('summons.1',5),/Стражевик|Перезарядка/);
 assert.match(at('cold.3',5),/замораживает на 2 с/);
 assert.match(at('overgrowth',5),/\+15%.*максимум \+75%/);
 assert.match(at('minor.damage',5),/\+15%/);
});

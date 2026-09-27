import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun} from '../src/game.js';
import {createPart,stats,equip,unequip} from '../src/assembly.js';
import {receiveHit,heal,tickHealth,healthView,healFromFangsAttack} from '../src/systems/health.js';
import {difficultyBossDamage,difficultyProfile} from '../src/systems/difficulty.js';
import {bodyDamageBonus} from '../src/systems/body-traits.js';
import {learn,ABILITIES,FALLBACKS,abilityDescriptionAtLevel} from '../src/systems/abilities.js';
import {itemInspectorData} from '../src/ui/item-inspector-data.js';
import {healthSegments} from '../src/ui/atoms.js';

test('starting health and half-segment equipment become whole health points',()=>{
 const s=createRun();s.difficulty=50;assert.equal(stats(s).hp,100);assert.equal(s.hp,100);
 assert.equal(itemInspectorData(s,s.body).rows.find(r=>r.label==='Здоровье корпуса').value,'50 HP');
 assert.equal(itemInspectorData(s,s.legs[0]).rows.find(r=>r.label==='Здоровье детали').value,'+13 HP');
 assert.match(healthSegments(healthView(s,100,stats(s).armor,stats(s))),/ui-health-progress/);
 assert.equal(healthView(s,100,stats(s).armor,stats(s)).armorOverlay,12.5);
 s.difficulty=100;assert.equal(stats(s).hp,75);
});

test('direct enemy hits use whole points after difficulty scaling',()=>{
 for(const [difficulty,oldDamage,expected] of [[0,.5,13],[50,1,25],[100,2,50]]){
  const s=createRun();s.difficulty=difficulty;s.hp=stats(s).hp;s.rng=()=>1;
  const st=stats(s);s.health.armorSpent=st.armor;
  assert.equal(receiveHit(s,st,{damage:oldDamage}),'hurt');
  assert.equal(st.hp-s.hp,expected);
  assert.equal(difficultyBossDamage(difficulty),oldDamage);
 }
});

test('ordinary and boss damage stay proportional on each difficulty',()=>{
 for(const [difficulty,ordinary,boss] of [[0,3,13],[50,9,25],[100,13,50]]){
  for(const [damage,expected] of [[.5*difficultyProfile(difficulty).damage,ordinary],[difficultyBossDamage(difficulty),boss]]){
   const s=createRun();s.difficulty=difficulty;s.hp=stats(s).hp;s.rng=()=>1;const st=stats(s);s.health.armorSpent=st.armor;
   assert.equal(receiveHit(s,st,{damage}),'hurt');assert.equal(st.hp-s.hp,expected);
  }
 }
});

test('all body ranks, rarities and half bonuses round only after summing',()=>{
 for(const [rarity,rarityPoints] of [['common',0],['uncommon',25],['rare',50],['relic',75]]){
  for(let rank=1;rank<=5;rank++){
   const s=createRun();s.difficulty=50;s.body.rarity=rarity;s.body.tier=rank;
   assert.equal(stats(s).hp,100+rarityPoints+Math.round((rank-1)*12.5));
  }
 }
 const s=createRun();s.difficulty=50;
 s.legs[0]=createPart(s,'root',1);s.legs[1]=createPart(s,'root',1);
 assert.equal(stats(s).hp,75);
 s.legs[0].tier=2;assert.equal(stats(s).hp,88);
 s.legs[1].tier=2;assert.equal(stats(s).hp,100);
});

test('healing, regeneration and resurrection keep integer HP',()=>{
 const s=createRun();s.rng=()=>1;s.organs[0]=createPart(s,'regen');const st=stats(s);
 s.hp=st.hp-27;s.health.missing=27;heal(s,st.hp);assert.equal(s.hp,st.hp-2);
 for(let i=1;i<=20;i++){s.time=i*.1;tickHealth(s,st);assert.equal(Number.isInteger(s.hp),true);}
 assert.equal(s.hp,st.hp);
 s.organs[0]=createPart(s,'revivalCore');s.health.armorSpent=st.armor;s.health.invulnerableUntil=0;
 assert.equal(receiveHit(s,stats(s),{damage:10}),'revived');assert.equal(s.hp,25);
});

test('full health cannot bank healing and each revival source restores 25 HP',()=>{
 for(const source of ['pickup','core','ability']){
  const s=createRun();s.rng=()=>1;
  if(source==='pickup')(s.consumables??={}).revivalCharges=1;
  if(source==='core')s.inventory.push(createPart(s,'revivalCore'));
  if(source==='ability')learn(s,'vitality.3');
  const st=stats(s);s.hp=st.hp;s.health.armorSpent=st.armor;
  heal(s,st.hp,.7);assert.equal(s.hp,st.hp);assert.equal(s.health.healRemainder,0);
  assert.equal(receiveHit(s,st,{damage:10}),'revived');assert.equal(s.hp,25);
  assert.equal(Number.isInteger(s.health.missing),true);
 }
});

test('equipment changes preserve wounds and a living hero survives a lower maximum',()=>{
 const s=createRun();s.difficulty=50;s.hp=40;s.health.missing=60;
 const root=createPart(s,'root',2);s.inventory.push(root);
 assert.equal(equip(s,root.id,0),true);assert.equal(stats(s).hp,100);assert.equal(s.hp,40);
 assert.equal(unequip(s,'legs',0),true);assert.equal(stats(s).hp,88);assert.equal(s.hp,28);
 s.health.missing=150;assert.equal(equip(s,root.id,0),true);assert.equal(s.hp,13);
});

test('health abilities and organs show converted amounts',()=>{
 const s=createRun();learn(s,'vitality.0');learn(s,'minor.hp');assert.equal(stats(s).hp,150);
 assert.match(abilityDescriptionAtLevel(ABILITIES['vitality.0'],1),/25 HP/);
 assert.match(abilityDescriptionAtLevel(FALLBACKS['minor.hp'],1),/25 HP/);
 const stomach=createPart(s,'reverseStomach',3);assert.equal(itemInspectorData(s,stomach).rows.find(r=>r.label==='Здоровье детали').value,'+50 HP');
});

test('Grasp uses each arm rank and heals on every attack',()=>{
 const s=createRun(),low=createPart(s,'fangs',1),high=createPart(s,'fangs',5),spare=createPart(s,'fangs',1);
 s.arms=[low,high];s.inventory.push(spare);
 const effect=p=>itemInspectorData(s,p).rows.find(r=>r.label==='Эффект').value;
 assert.match(effect(low),/5% максимального HP при атаке/);
 assert.match(effect(high),/9% максимального HP при атаке/);
 assert.match(effect(spare),/5% максимального HP при атаке/);
 const st=stats(s);s.hp=st.hp-25;s.health.missing=25;
 healFromFangsAttack(s,st,low);assert.equal(s.hp,st.hp-20);
 healFromFangsAttack(s,st,high);assert.equal(s.hp,st.hp-11);
 healFromFangsAttack(s,st,low);assert.equal(s.hp,st.hp-6);
 healFromFangsAttack(s,st,high);assert.equal(s.hp,st.hp);
 healFromFangsAttack(s,st,high);assert.equal(s.health.healRemainder,0);
 s.difficulty=100;const hard=stats(s);s.hp=hard.hp-20;s.health.missing=20;
 healFromFangsAttack(s,hard,low);assert.equal(s.hp,hard.hp-17);assert.ok(Math.abs(s.health.healRemainder-.75)<1e-9);
 healFromFangsAttack(s,hard,low);assert.equal(s.hp,hard.hp-13);
});

test('Forester damage still gains five percent per former health segment',()=>{
 const s=createRun();s.body=createPart(s,'rootwalker');s.legs=Array.from({length:6},()=>createPart(s,'universal'));
 const st=stats(s);assert.equal(st.hp,175);assert.ok(Math.abs(bodyDamageBonus(s,st)-.35)<1e-9);
 s.legs[0]=createPart(s,'root');const half=stats(s);
 assert.equal(half.hp,163);assert.ok(Math.abs(bodyDamageBonus(s,half)-.325)<1e-9);
});

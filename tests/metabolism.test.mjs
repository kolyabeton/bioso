import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,chooseUpgrade,addXP,step} from '../src/game.js';
import {createPart,digest,digestionYield} from '../src/assembly.js';
import {ABILITIES,learn,modifiers} from '../src/systems/abilities.js';
import {eligible,rollChoices} from '../src/systems/progression.js';

test('metabolism enters level rewards and either fork unlocks the final',()=>{
 const s=createRun();let offered=false;
 for(let i=0;i<50;i++){rollChoices(s);offered ||= s.choices.some(c=>c.id==='metabolism.0');}
 assert.ok(offered);addXP(s,18);s.choices=[{id:'metabolism.0'}];assert.ok(chooseUpgrade(s,0));
 assert.equal(modifiers(s).biomassYield,.2);
 assert.ok(eligible(s,ABILITIES['metabolism.1']));assert.ok(eligible(s,ABILITIES['metabolism.2']));assert.ok(!eligible(s,ABILITIES['metabolism.3']));
 for(const fork of ['metabolism.1','metabolism.2']){s.abilities.learned=['metabolism.0',fork];assert.ok(eligible(s,ABILITIES['metabolism.3']));}
});

test('recycling bonuses add, scale stomach output, preserve refunds and pay only once',()=>{
 for(const stomach of ['digestion']){
  const s=createRun(),p=createPart(s,'claws',3);p.rarity='rare';p.spent=30;
  s.inventory.push(p);
  assert.equal(digestionYield(s,p.id),false);
  s.organs[0]=createPart(s,stomach);s.organs[0].upgrades.power=2;
  const base=digestionYield(s,p.id);
  for(const id of ['metabolism.0','metabolism.1','metabolism.2','metabolism.3'])assert.ok(learn(s,id));
  assert.equal(modifiers(s).biomassYield,1);
  const amount=digestionYield(s,p.id);
  assert.equal(amount,38);assert.ok(amount>base);
  assert.equal(learn(s,'metabolism.0'),false);
  for(let rank=1;rank<5;rank++)assert.equal(learn(s,'metabolism.1'),true);assert.equal(learn(s,'metabolism.1'),false);assert.ok(Math.abs(modifiers(s).biomassYield-1.4)<1e-9);const ranked=digestionYield(s,p.id);assert.ok(ranked>amount);
  assert.equal(digest(s,p.id),ranked);assert.equal(s.biomass,ranked);assert.equal(digest(s,p.id),false);
 }
});

// Enzymes and Biocatalysis are single-level (item 30), so the branch tops out at +220% rather than +300%.
test('fully ranked metabolism reaches two hundred twenty percent biomass and seventy-five percent XP',()=>{
 const s=createRun();for(const id of ['metabolism.0','metabolism.1','metabolism.2','metabolism.3'])for(let rank=0;rank<5;rank++)learn(s,id);
 assert.ok(Math.abs(modifiers(s).biomassYield-2.2)<1e-9);assert.ok(Math.abs(modifiers(s).xpGain-.75)<1e-9);
});

test('first rank gives 3 biomass for a common rank I part and never replaces a stomach',()=>{
 const s=createRun(),p=createPart(s,'claws');s.inventory.push(p);learn(s,'metabolism.0');
 assert.equal(digest(s,p.id),false);s.organs[0]=createPart(s,'digestion');assert.equal(digestionYield(s,p.id),3);
});

test('XP nodes stack without a stomach and do not change already earned XP',()=>{
 const s=createRun();addXP(s,2);learn(s,'metabolism.0');learn(s,'metabolism.1');
 assert.equal(s.xp,2);assert.equal(modifiers(s).xpGain,.1);addXP(s,4);assert.equal(s.xp,6);
 learn(s,'metabolism.3');assert.equal(modifiers(s).xpGain,.25);assert.equal(s.xp,6);
 addXP(s,3);assert.equal(s.level,2);assert.equal(s.xp,1);assert.equal(s.pending,1);
 const next=createRun(s.profile);addXP(next,4);assert.equal(next.xp,4);assert.equal(next.xpBonusRemainder,0);
});

test('small XP pickups conserve fractional bonuses across levels and match bulk rewards',()=>{
 for(const learned of [['metabolism.0','metabolism.1'],['metabolism.0','metabolism.2','metabolism.3'],['metabolism.0','metabolism.1','metabolism.3']]){
  const small=createRun(),bulk=createRun();for(const s of [small,bulk])s.abilities.learned=[...learned];
  for(let i=0;i<100;i++)addXP(small,1);addXP(bulk,100);
  assert.deepEqual([small.level,small.xp,small.pending],[bulk.level,bulk.xp,bulk.pending]);
  assert.ok(Math.abs(small.xpBonusRemainder-bulk.xpBonusRemainder)<1e-8);assert.ok(Math.abs(small.xp-bulk.xp)<1e-8);
 }
});

test('ground XP is increased once on collection, not each frame',()=>{
 const s=createRun();s.abilities.learned=['metabolism.0','metabolism.1','metabolism.3'];
 s.xpDrops=[{id:++s.entityId,...s.player,value:4}];
 step(s,.01);assert.equal(s.xp,2);assert.equal(s.xpBonusRemainder,.5);assert.equal(s.xpDrops.length,0);
 step(s,.01);assert.equal(s.xp,2);
 for(const value of [NaN,Infinity,-1,0])addXP(s,value);assert.equal(s.xp,2);
});

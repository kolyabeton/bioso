import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun} from '../src/game.js';
import {createPart,digestionYield,digest,upgrade,unequip} from '../src/assembly.js';
import {upgradeCost,ECONOMY} from '../src/systems/balance.js';
const setup=()=>{const s=createRun();s.organs[0]=createPart(s,'digestion');return s;};
/** Sell price is additive — 4 biomass at rank I common, +2 per rank and +2 per rarity step — and a rank I Composter returns 80% of it. */
const price=(tier,rarity)=>ECONOMY.digest[tier]+ECONOMY.digestRarityBonus[rarity];
test('recycling adds rarity and rank on top of a flat base for every kind of part',()=>{
 const s=setup();
 assert.equal(price(2,'uncommon'),8);
 for(const key of ['seed','universal','wanderer','regen'])for(const rarity of ['common','uncommon','rare','relic'])for(let tier=1;tier<=5;tier++){
  const p=createPart(s,key,tier);p.rarity=rarity;s.inventory.push(p);
  assert.equal(digestionYield(s,p.id),Math.floor(price(tier,rarity)*.8));
 }
});
test('a rank I Composter returns eighty percent of the price, and each further rank adds twenty',()=>{
 const s=setup(),p=createPart(s,'seed',2);p.rarity='uncommon';s.inventory.push(p);
 assert.equal(digestionYield(s,p.id),6);
 s.organs[0].tier=2;assert.equal(digestionYield(s,p.id),8);
 s.organs[0].tier=5;assert.equal(digestionYield(s,p.id),12);
});
test('four common parts fund exactly one first upgrade; later improvements cost more',()=>{
 const s=setup();
 for(let i=0;i<4;i++){const p=createPart(s,'seed');s.inventory.push(p);assert.equal(digest(s,p.id),3);}
 assert.equal(s.biomass,upgradeCost(0));assert(upgrade(s,s.arms[0].id,'damage',true));assert.equal(s.biomass,0);assert.equal(upgradeCost(1),18);assert.equal(upgradeCost(2),24);
});
test('fifty percent of actual investment returns, and organ bonuses never multiply that refund',()=>{
 const s=setup(),p=s.arms[0];s.biomass=100;assert(upgrade(s,p.id,'damage',true));assert(upgrade(s,p.id,'damage',true));assert.equal(p.spent,30);assert(unequip(s,'arms',0));assert.equal(digestionYield(s,p.id),18);
 s.body.tier=3;s.organs[0].tier=5;s.organs[0].upgrades.power=10;
 const improved=digestionYield(s,p.id);p.spent=0;assert.equal(improved-digestionYield(s,p.id),15);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun} from '../src/game.js';
import {createPart,digestionYield,digest,upgrade,unequip} from '../src/assembly.js';
import {upgradeCost} from '../src/systems/balance.js';
const setup=()=>{const s=createRun();s.organs[0]=createPart(s,'digestion');return s;};
test('recycling depends on rarity and rank equally for every kind of part',()=>{
 const s=setup();
 for(const key of ['seed','universal','wanderer','regen'])for(const [rarity,mult] of Object.entries({common:1,uncommon:1.5,rare:2,relic:3}))for(let tier=1;tier<=5;tier++){
  const p=createPart(s,key,tier);p.rarity=rarity;s.inventory.push(p);
  assert.equal(digestionYield(s,p.id),[0,6,8,10,12,14][tier]*mult);
 }
});
test('two common parts fund exactly one first upgrade; later improvements cost more',()=>{
 const s=setup();
 for(let i=0;i<2;i++){const p=createPart(s,'seed');s.inventory.push(p);assert.equal(digest(s,p.id),6);}
 assert.equal(s.biomass,upgradeCost(0));assert(upgrade(s,s.arms[0].id,'damage',true));assert.equal(s.biomass,0);assert.equal(upgradeCost(1),18);assert.equal(upgradeCost(2),24);
});
test('only half actual investment returns, and organ bonuses never multiply that refund',()=>{
 const s=setup(),p=s.arms[0];s.biomass=100;assert(upgrade(s,p.id,'damage',true));assert(upgrade(s,p.id,'damage',true));assert.equal(p.spent,30);assert(unequip(s,'arms',0));assert.equal(digestionYield(s,p.id),21);
 s.body.tier=3;s.organs[0].tier=5;s.organs[0].upgrades.power=10;
 const improved=digestionYield(s,p.id);p.spent=0;assert.equal(improved-digestionYield(s,p.id),15);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,receiveDamage} from '../src/game.js';
import {bodyHealth,createPart,stats,swapBody} from '../src/assembly.js';
import {BODIES} from '../src/catalog.js';
import {describePart} from '../src/ui/adapters.js';

test('body health grows independently with rank and rarity for every chassis',()=>{
 const s=createRun();assert.equal(s.hp,2);
 for(const [key,d] of Object.entries(BODIES))for(let tier=1;tier<=5;tier++)for(const [rarity,bonus] of Object.entries({common:0,uncommon:1,rare:2,relic:3})){
  const p=createPart(s,key,tier);p.rarity=rarity;s.body=p;
  assert.equal(bodyHealth(p),d.hp+tier-1+bonus);assert.equal(stats(s).hp,bodyHealth(p));
  assert.ok(describePart(s,p).lines.some(line=>line.includes(`здоровье корпуса ${bodyHealth(p)} дел.`)));
 }
});
test('swapping high quality bodies preserves wounds through repeated swaps',()=>{
 const s=createRun();receiveDamage(s,1);const original=s.body,p=createPart(s,'wanderer',3);p.rarity='rare';s.inventory.push(p);
 assert.ok(swapBody(s,p.id));assert.equal(stats(s).hp,6);assert.equal(s.hp,5);
 assert.ok(swapBody(s,original.id));assert.equal(s.hp,1);
 assert.ok(swapBody(s,p.id));assert.equal(s.hp,5);
});
test('body swap eligibility includes rank and rarity after health deals',()=>{
 const s=createRun();s.isaac={deals:{hpCost:2}};s.body.tier=3;s.hp=stats(s).hp;
 const p=createPart(s,'wanderer');s.inventory.push(p);assert.equal(swapBody(s,p.id),false);
 p.rarity='uncommon';assert.equal(swapBody(s,p.id),true);assert.equal(stats(s).hp,1);
});

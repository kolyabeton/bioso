import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun} from '../src/game.js';
import {createPart,stats,weaponStats,weight,capacity,equip,unequip} from '../src/assembly.js';
import {generateLoot,rollAffixes,affixDescriptions,reloadDuration} from '../src/systems/sets-loot.js';
import {seededRandom} from '../src/simulation.js';
import {CATALOG} from '../src/catalog.js';
test('every part kind rolls distinct affixes by rarity, reproducibly and with variation',()=>{
 for(const key of ['wanderer','seed','universal','regen'])for(const [rarity,count] of Object.entries({common:0,uncommon:1,rare:2,relic:3})){
  const p={key,rarity},a=seededRandom(123),b=seededRandom(123),seen=new Set();
  for(let i=0;i<40;i++){const affixes=rollAffixes(p,a);assert.deepEqual(affixes,rollAffixes(p,b));assert.equal(affixes.length,count);assert.equal(new Set(affixes.map(a=>a.stat)).size,count);assert.equal(affixDescriptions({...p,affixes}).length,count);seen.add(JSON.stringify(affixes));}
  if(count)assert(seen.size>1);
 }
 const s=createRun();s.rng=seededRandom(42);s.profile.unlocked=Object.keys(CATALOG);const kinds=new Set();
 for(let i=0;i<200;i++){const p=generateLoot(s,createPart,1,'boss','relic',false);kinds.add(CATALOG[p.key].kind);assert.equal(p.affixes.length,3);}
 assert.equal(kinds.size,4);
});
test('all generated properties change their actual target statistics',()=>{
 const s=createRun();s.inventory=[];const p=s.arms[0],before=stats(s),w=weaponStats(s,p),oldWeight=weight(p),oldCapacity=capacity(s.body);
 p.affixes=[{stat:'rate',value:.1},{stat:'movement',value:.1},{stat:'armor',value:1},{stat:'pickup',value:.1},{stat:'damage',value:.1},{stat:'reload',value:.1}];
 const after=stats(s),next=weaponStats(s,p);assert.equal(after.armor,before.armor+1);assert.equal(after.rate,before.rate+.1);assert(after.speed>before.speed);assert(after.pickup>before.pickup);assert.equal(next.damage,w.damage*1.1);assert(next.interval<w.interval);assert(reloadDuration(s,p,1)<1);
 p.affixes=[{stat:'weight',value:.12}];assert.equal(weight(p),oldWeight*.88);s.body.affixes=[{stat:'capacity',value:.1}];assert.equal(capacity(s.body),oldCapacity*1.1);
});
test('inventory bonuses are inactive and equip cycles preserve rolled properties',()=>{
 const s=createRun(),p=createPart(s,'regen');p.rarity='relic';p.affixes=[{stat:'rate',value:.1},{stat:'armor',value:1}];const saved=JSON.stringify(p.affixes),before=stats(s);s.inventory.push(p);assert.equal(stats(s).rate,before.rate);assert.equal(stats(s).armor,before.armor);
 assert(equip(s,p.id,0));assert.equal(stats(s).rate,before.rate+.1);assert(unequip(s,'organs',0));assert.equal(stats(s).rate,before.rate);assert.equal(JSON.stringify(p.affixes),saved);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun} from '../src/game.js';
import {createPart,digestionYield,digest,stats} from '../src/assembly.js';
test('digestion quote leaves inventory untouched and matches the actual reward once',()=>{
 {
  const s=createRun();s.organs[0]=createPart(s,'digestion');const p=createPart(s,'bastion');p.spent=36;s.inventory.push(p);
  const before=JSON.stringify(s),amount=digestionYield(s,p.id);assert.equal(JSON.stringify(s),before);assert.ok(amount>0);
  const biomass=s.biomass;assert.equal(digest(s,p.id),amount);assert.equal(s.biomass,biomass+amount);assert.equal(digest(s,p.id),false);
 }
});
test('stomach must still be installed when confirming',()=>{
 const s=createRun(),p=createPart(s,'drill');s.inventory.push(p);assert.equal(digestionYield(s,p.id),false);
 s.organs[0]=createPart(s,'digestion');assert.equal(digestionYield(s,s.organs[0].id),false);s.organs[0]=null;
 assert.equal(digest(s,p.id),false);assert.ok(s.inventory.includes(p));
});

test('equipped arms, legs and organs recycle atomically with the quoted refund and no healing',()=>{
 for(const [group,key] of [['arms','seed'],['legs','plated'],['organs','armor']]){
  const s=createRun();s.organs[0]=createPart(s,'digestion');const p=createPart(s,key);s[group][1]=p;p.spent=30;s.hp=1;
  const before=JSON.stringify(s),amount=digestionYield(s,p.id);assert.equal(JSON.stringify(s),before);assert.ok(amount>=18);
  const biomass=s.biomass;assert.equal(digest(s,p.id),amount);assert.equal(s[group][1],null);assert(!s.inventory.includes(p));assert.equal(s.biomass,biomass+amount);assert.equal(s.hp,1);assert(Number.isFinite(stats(s).weight));assert.equal(digest(s,p.id),false);
 }
});
test('ground loot cannot be recycled by current or legacy calls',()=>{
 const s=createRun();s.organs[0]=createPart(s,'digestion');const p=createPart(s,'seed');s.ground.push({id:99,x:s.player.x,z:s.player.z,part:p,consume:true});
 const before=JSON.stringify(s);assert.equal(digestionYield(s,p.id),false);assert.equal(digestionYield(s,p.id,true),false);assert.equal(digest(s,p.id),false);assert.equal(digest(s,p.id,true),false);assert.equal(JSON.stringify(s),before);
});
test('current body, bound arm and sole stomach remain protected; another stomach permits recycling one',()=>{
 const s=createRun();s.organs[0]=createPart(s,'digestion');s.arms[0].bound=true;
 for(const p of [s.body,s.arms[0],s.organs[0]]){const before=JSON.stringify(s);assert.equal(digestionYield(s,p.id),false);assert.equal(digest(s,p.id),false);assert.equal(JSON.stringify(s),before);}
 const stomach=s.organs[0];s.organs[1]=createPart(s,'digestion');assert.ok(digest(s,stomach.id)>0);assert.equal(s.organs[0],null);assert.equal(digest(s,s.organs[1].id),false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun} from '../src/game.js';
import {createPart,swapBody,equip} from '../src/assembly.js';
import {BODIES} from '../src/catalog.js';
import {organCapacity,slotCount} from '../src/systems/body-slots.js';
import {dealAllowed,takeDeal} from '../src/systems/events/altar.js';
test('organ slots grow with rank and rarity, with a strict tradeoff for armed bodies',()=>{
 const s=createRun();assert.equal(organCapacity(s.body),2);
 for(const [key,d] of Object.entries(BODIES))for(let tier=1;tier<=5;tier++)for(const [rarity,bonus] of Object.entries({common:0,uncommon:1,rare:2,relic:3})){
  const p=createPart(s,key,tier);p.rarity=rarity;
  const expected=key==='broodmother'?3:key==='hecaton'?Math.min(2,d.organs+tier-1+bonus):Math.min(d.arms>=3?3:8,d.organs+tier-1+bonus);
  assert.equal(organCapacity(p),expected);
  assert.equal(slotCount({isaac:{deals:{organs:99}}},p,'organs'),8);
 }
});
test('eight-slot body equips the final slot and moving to four arms preserves surplus organs',()=>{
 const s=createRun(),b=createPart(s,'wanderer',5);b.rarity='rare';s.inventory.push(b);assert(swapBody(s,b.id));assert.equal(s.organs.length,8);
 for(const [i,key] of ['returnNerve','slime','parasite','commonNerve','reverseHeart','shield','regen','digestion'].entries()){const p=createPart(s,key);s.inventory.push(p);assert(equip(s,p.id,i));}
 const organs=s.organs.slice(),small=createPart(s,'hecaton');s.inventory.push(small);assert(swapBody(s,small.id));assert.equal(s.organs.length,1);
 for(const p of organs)assert.equal([...s.organs,...s.inventory].filter(q=>q?.id===p.id).length,1);
});
test('altar cannot sell an organ slot beyond the global cap',()=>{
 const s=createRun();s.body=createPart(s,'rootwalker');s.isaac={deals:{organs:5}};s.organs=Array(8).fill(null);s.hp=3;s.time=180;
 const n={type:'altar_organs',state:'ready',x:s.player.x,y:s.player.y,z:s.player.z,deals:['organs']};assert.equal(dealAllowed(s,n,'organs'),false);
});
test('event slots exceed the many-arm natural cap and persist across body swaps',()=>{
 const s=createRun(),body=createPart(s,'hecaton');body.upgrades={hp:4};s.inventory.push(body);assert(swapBody(s,body.id));s.hp=6;s.time=180;
 assert.equal(s.organs.length,1);
 const nodes=[1,2].map(id=>({id,type:'altar_organs',state:'ready',x:s.player.x,y:s.player.y,z:s.player.z,deals:['organs']}));s.encounters={nodes};
 for(const [i,n] of nodes.entries()){assert(takeDeal(s,n.id,'organs'));assert.equal(s.organs.length,2+i);assert.equal(takeDeal(s,n.id,'organs'),false);}
 const organ=createPart(s,'regen');s.inventory.push(organ);assert(equip(s,organ.id,2));
 for(const key of ['wanderer','chimera']){const next=createPart(s,key);next.upgrades={hp:4};s.inventory.push(next);assert(swapBody(s,next.id));assert.equal(s.organs.length,4);assert(s.organs.some(p=>p?.id===organ.id));assert.equal(s.isaac.deals.organs,2);}
});

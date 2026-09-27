import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun} from '../src/game.js';
import {createPart,swapBody,equip} from '../src/assembly.js';
import {BODIES} from '../src/catalog.js';
import {organCapacity,slotCount} from '../src/systems/body-slots.js';
import {dealAllowed,takeDeal} from '../src/systems/events/altar.js';
test('requested starting mounts match the chassis catalog',()=>{
 for(const [key,organs] of [['wanderer',3],['hecaton',2],['assembler',3]])assert.equal(BODIES[key].organs,organs,key);
 assert.equal(BODIES.hunter.legs,3);
});
test('organ slots grow at ranks three and five, while only legendary rarity adds one slot',()=>{
 const s=createRun();assert.equal(organCapacity(s.body),3);assert.equal(s.organs.length,3);
 for(const [key,d] of Object.entries(BODIES))for(let tier=1;tier<=5;tier++)for(const [rarity,rarityBonus] of Object.entries({common:0,uncommon:0,rare:0,relic:1})){
  const p=createPart(s,key,tier);p.rarity=rarity;
  const cap={broodmother:3,hecaton:2,bastion:5,demolition:3,regulator:4,sentinel:3,assembler:5}[key]??(d.arms>=3?3:8);
  const rankBonus=(tier>=3?1:0)+(tier>=5?1:0),expected=key==='broodmother'?3:Math.min(cap,d.organs+rankBonus+rarityBonus);
  assert.equal(organCapacity(p),expected);
  assert.equal(slotCount({isaac:{deals:{organs:99}}},p,'organs'),8);
 }
});
test('rank-five legendary body equips its sixth natural organ and preserves surplus organs on swap',()=>{
 const s=createRun(),b=createPart(s,'wanderer',5);b.rarity='relic';s.inventory.push(b);assert(swapBody(s,b.id));assert.equal(s.organs.length,6);
 for(const [i,key] of ['returnNerve','slime','parasite','commonNerve','reverseHeart','regen'].entries()){const p=createPart(s,key);s.inventory.push(p);assert(equip(s,p.id,i));}
 const organs=s.organs.slice(),small=createPart(s,'hecaton');s.inventory.push(small);assert(swapBody(s,small.id));assert.equal(s.organs.length,2);
 for(const p of organs)assert.equal([...s.organs,...s.inventory].filter(q=>q?.id===p.id).length,1);
});
test('altar cannot sell an organ slot beyond the global cap',()=>{
 const s=createRun();s.body=createPart(s,'rootwalker');s.isaac={deals:{organs:5}};s.organs=Array(8).fill(null);s.hp=3;s.time=180;
 const n={type:'altar_organs',state:'ready',x:s.player.x,y:s.player.y,z:s.player.z,deals:['organs']};assert.equal(dealAllowed(s,n,'organs'),false);
});
test('event slots exceed the many-arm natural cap and persist across body swaps',()=>{
 const s=createRun(),body=createPart(s,'hecaton');body.upgrades={hp:4};s.inventory.push(body);assert(swapBody(s,body.id));s.hp=6;s.time=180;
 assert.equal(s.organs.length,2);
 const nodes=[1,2].map(id=>({id,type:'altar_organs',state:'ready',x:s.player.x,y:s.player.y,z:s.player.z,deals:['organs']}));s.encounters={nodes};
 for(const [i,n] of nodes.entries()){assert(takeDeal(s,n.id,'organs'));assert.equal(s.organs.length,3+i);assert.equal(takeDeal(s,n.id,'organs'),false);}
 const organ=createPart(s,'regen');s.inventory.push(organ);assert(equip(s,organ.id,2));
 for(const key of ['wanderer','chimera']){const next=createPart(s,key);next.upgrades={hp:4};s.inventory.push(next);assert(swapBody(s,next.id));assert.equal(s.organs.length,key==='wanderer'?5:4);assert(s.organs.some(p=>p?.id===organ.id));assert.equal(s.isaac.deals.organs,2);}
});

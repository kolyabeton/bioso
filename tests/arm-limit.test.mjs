import test from 'node:test';
import assert from 'node:assert/strict';
import {BODIES,MAX_ARMS} from '../src/catalog.js';
import {createRun} from '../src/game.js';
import {createPart,swapBody,equip} from '../src/assembly.js';
import {slotCount,isaacState} from '../src/systems/mutations.js';
import {takeDeal} from '../src/systems/events/altar.js';
import {handPresentation} from '../src/hud-presentation.js';
test('every body and additional arm bonus obey the four-arm maximum',()=>{
 const s=createRun();isaacState(s).deals.arms=2;
 for(const d of Object.values(BODIES)){assert(d.arms<=MAX_ARMS);assert(slotCount(s,d,'arms')<=4);}
 s.inventory.push(createPart(s,'hecaton'));assert(swapBody(s,s.inventory.at(-1).id));assert.equal(s.arms.length,4);assert.equal(handPresentation(s).length,4);
});
test('altar at four arms rejects atomically without charging health or consuming the encounter',()=>{
 const s=createRun();s.time=180;s.body=createPart(s,'hecaton');s.arms=Array.from({length:4},()=>null);
 const n={id:'limit',type:'altar',state:'ready',deals:['arms'],...s.player};s.encounters={nodes:[n]};
 const before=JSON.stringify(s);assert.equal(takeDeal(s,n.id,'arms'),false);assert.equal(JSON.stringify(s),before);
});
test('swapping a legacy six-arm loadout preserves excess weapons in inventory',()=>{
 const s=createRun();s.arms=Array.from({length:6},()=>createPart(s,'seed'));const extra=s.arms.slice(4);const body=createPart(s,'hecaton');s.inventory.push(body);assert(swapBody(s,body.id));assert.equal(s.arms.length,4);for(const p of extra)assert(s.inventory.includes(p));
 const p=createPart(s,'seed');s.inventory.push(p);assert.equal(equip(s,p.id,4),false);
});
test('removed arm deal rejects even below the arm limit without spending health',()=>{
 const s=createRun();s.time=180;
 const n={id:'old-arm-offer',type:'altar',state:'ready',deals:['arms'],...s.player};s.encounters={nodes:[n]};
 const before=JSON.stringify(s);assert.equal(takeDeal(s,n.id,'arms'),false);assert.equal(JSON.stringify(s),before);
});

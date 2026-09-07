import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,step} from '../src/game.js';
import {createPart,autoPickup,drop} from '../src/assembly.js';
const reward=(s,key='drill',x=1,y=0)=>{const part=createPart(s,key);s.ground.push({id:++s.entityId,part,x,y,z:0});return part;};
test('nearby rewards move to inventory exactly once during simulation',()=>{
 const s=createRun(),p=reward(s);step(s,.01,{x:0,z:0});
 assert.equal(s.ground.length,0);assert.equal(s.inventory.filter(q=>q.id===p.id).length,1);
 step(s,.01,{x:0,z:0});assert.equal(s.inventory.filter(q=>q.id===p.id).length,1);
});
test('automatic pickup respects radius and vertical distance',()=>{
 const s=createRun();reward(s,'drill',4);reward(s,'shield',1,10);
 assert.equal(autoPickup(s).length,0);assert.equal(s.ground.length,2);
});
test('manually discarded part waits until the player leaves and returns',()=>{
 const s=createRun(),p=createPart(s,'drill');s.inventory.push(p);drop(s,p.id);
 for(let i=0;i<3;i++)assert.equal(autoPickup(s).length,0);
 s.player.x=s.ground[0].x+4;autoPickup(s);assert.equal(s.ground.length,1);
 s.player.x=0;assert.equal(autoPickup(s).length,1);assert.equal(s.inventory[0].id,p.id);
});
test('pickup accepts multiple parts without silently discarding overweight rewards',()=>{
 const s=createRun();for(let i=0;i<8;i++)reward(s,'rocket');
 assert.equal(autoPickup(s).length,8);assert.equal(s.inventory.length,8);assert.equal(s.ground.length,0);
});

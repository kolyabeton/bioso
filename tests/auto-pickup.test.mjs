import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,step} from '../src/game.js';
import {createPart,autoPickup,drop,installed} from '../src/assembly.js';
import {createWorldRun} from '../src/world-run.js';
const reward=(s,key='drill',x=1,y=0)=>{const part=createPart(s,key);s.ground.push({id:++s.entityId,part,x,y,z:0});return part;};
test('nearby rewards move to inventory exactly once during simulation',()=>{
 const s=createRun(),p=reward(s);step(s,.01,{x:0,z:0});
 assert.equal(s.ground.length,0);assert.equal([...s.inventory,...installed(s)].filter(q=>q.id===p.id).length,1);
 step(s,.01,{x:0,z:0});assert.equal([...s.inventory,...installed(s)].filter(q=>q.id===p.id).length,1);
});
test('automatic pickup respects radius and vertical distance',()=>{
 const s=createRun();reward(s,'drill',4);reward(s,'shield',1,10);
 assert.equal(autoPickup(s).length,0);assert.equal(s.ground.length,2);
});
test('automatic pickup keeps its full horizontal radius on a traversable hill',()=>{
 const s=createWorldRun(undefined,'survival',1),x=-19.5,z=7.5;s.ground=[];
 s.player={x,z,y:s.world.heightAt(x,z)};s.ground.push({id:++s.entityId,part:createPart(s,'drill'),x,z:z+3});
 const groundY=s.world.heightAt(x,z+3);assert.ok(s.world.canMove(s.player,{...s.ground[0],y:groundY},1));assert.ok(Math.abs(s.player.y-groundY)>1);
 assert.equal(autoPickup(s).length,1);assert.equal(s.ground.length,0);
});
test('an explicitly elevated item is not collected from another floor',()=>{
 const s=createWorldRun(undefined,'survival',1),x=-19.5,z=7.5;s.ground=[];
 s.player={x,z,y:s.world.heightAt(x,z)};s.ground.push({id:++s.entityId,part:createPart(s,'drill'),x,z,y:s.player.y+3});
 assert.equal(autoPickup(s).length,0);assert.equal(s.ground.length,1);
});
test('manually discarded part waits until the player leaves and returns',()=>{
 const s=createRun(),p=createPart(s,'drill');s.inventory.push(p);drop(s,p.id);
 for(let i=0;i<3;i++)assert.equal(autoPickup(s).length,0);
 s.player.x=s.ground[0].x+4;autoPickup(s);assert.equal(s.ground.length,1);
 s.player.x=0;assert.equal(autoPickup(s).length,1);assert.ok(installed(s).some(q=>q.id===p.id));
});
test('pickup accepts multiple parts without silently discarding overweight rewards',()=>{
 const s=createRun();for(let i=0;i<8;i++)reward(s,'rocket');
 assert.equal(autoPickup(s).length,8);assert.equal([...s.inventory,...installed(s)].filter(p=>p.key==='rocket').length,8);assert.equal(s.ground.length,0);
});

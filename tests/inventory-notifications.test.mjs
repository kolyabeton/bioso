import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun} from '../src/game.js';
import {autoPickup,createPart,drop,pickup} from '../src/assembly.js';
import {chooseBossReward,queueBossReward} from '../src/systems/sets-loot.js';
import {markInventorySeen,unseenInventoryCount} from '../src/inventory-notifications.js';

test('new inventory badge counts collected items that remain in inventory',()=>{
 const s=createRun();s.world={heightAt:()=>0,walkable:()=>true};s.player={x:0,y:0,z:0};
 s.ground=[0,1].map((x,index)=>({id:index+1,x,y:0,z:0,part:createPart(s,index?'seed':'universal')}));
 assert.equal(autoPickup(s).length,2);assert.equal(unseenInventoryCount(s),1);
 markInventorySeen(s);assert.equal(unseenInventoryCount(s),0);
});

test('items removed before assembly do not remain in the badge count',()=>{
 const s=createRun();s.world={heightAt:()=>0,walkable:()=>true};s.player={x:0,y:0,z:0};const part=createPart(s,'seed');
 s.ground=[{id:1,x:0,y:0,z:0,part}];assert.equal(pickup(s,1),true);assert.equal(unseenInventoryCount(s),1);
 assert.equal(drop(s,part.id),true);assert.equal(unseenInventoryCount(s),0);
});

test('a viewed item does not become new again after drop and pickup',()=>{
 const s=createRun();s.world={heightAt:()=>0,walkable:()=>true};s.player={x:0,y:0,z:0};const part=createPart(s,'seed');
 s.ground=[{id:1,x:0,y:0,z:0,part}];assert.equal(pickup(s,1),true);markInventorySeen(s);
 assert.equal(drop(s,part.id),true);assert.equal(pickup(s,s.ground[0].id),true);assert.equal(unseenInventoryCount(s),0);
});

test('chosen boss reward is new inventory',()=>{
 const s=createRun();s.time=480;queueBossReward(s,createPart,2);
 assert.equal(chooseBossReward(s,0),true);assert.equal(unseenInventoryCount(s),1);
});

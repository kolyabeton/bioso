import test from 'node:test';
import assert from 'node:assert/strict';
import {createMeleeAnimation} from '../src/melee-animation.js';
import {createRun,spawnEnemy,attack} from '../src/game.js';
import {createPart} from '../src/assembly.js';
import {creatureModel} from '../src/game-view.js';
test('both melee hands animate from their own real attack source',()=>{
 const s=createRun(undefined,'survival',123);s.arms=[createPart(s,'claws'),createPart(s,'claws')];const e=spawnEnemy(s,'normal',{x:0,z:2});e.hp=10000;
 attack(s,.01);const a=createMeleeAnimation();for(const event of s.events)a.attack(event,0);
 const first=a.pose(s.arms[0].id,.1,1),second=a.pose(s.arms[1].id,.1,-1);
 assert.ok(first&&second);assert.equal(first.yaw,-second.yaw);assert.notEqual(second.yaw,0);
 const model=creatureModel(s);for(const p of s.arms)assert.ok(model.userData.arms.get(p.id).userData.meleeTrail);
});
test('second-slot melee works alongside a reloading gun and its timing is independent',()=>{
 const a=createMeleeAnimation();assert.equal(a.attack({type:'attack',key:'seed',source:1},0),false);
 a.attack({type:'attack',key:'claws',source:2,x:0,z:0,tx:2,tz:0},0);
 assert.ok(a.pose(2,.1));assert.equal(a.pose(1,.1),null);assert.equal(a.pose(2,.31),null);
});
test('simultaneous hands do not restart each other; pause, removal and restart are clean',()=>{
 const a=createMeleeAnimation(),event={type:'attack',key:'claws',x:0,z:0,tx:0,tz:3};
 a.attack({...event,source:1},0);a.attack({...event,source:2},.1);
 const frozen=a.pose(2,.12);assert.deepEqual(a.pose(2,.12),frozen);
 assert.equal(a.pose(1,.31),null);assert.ok(a.pose(2,.31));a.retain([1]);assert.equal(a.pose(2,.31),null);
 a.attack({...event,source:1},1);a.reset();assert.equal(a.pose(1,1.1),null);
});

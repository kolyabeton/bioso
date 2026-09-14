import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,attack,spawnEnemy} from '../src/game.js';
import {createPart,weaponStats} from '../src/assembly.js';
import {WEAPONS} from '../src/catalog.js';
import {bodySize} from '../src/body-size.js';
import {isMelee} from '../src/systems/weapon-specialization.js';

const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);

test('hero melee weapons start at the body edge and keep their 30% reach increase',()=>{
 for(const [key,definition] of Object.entries(WEAPONS)){
  const state=createRun();
  const part=createPart(state,key);
  near(weaponStats(state,part).range,definition.range*(isMelee(definition)?1.3:1)+(isMelee(definition)?bodySize(state.body).radius:0));
 }
});

test('larger bodies add their full hull radius to melee range without changing ranged weapons',()=>{
 const state=createRun(),claws=createPart(state,'claws'),seed=createPart(state,'seed');
 const smallMelee=weaponStats(state,claws).range,smallRanged=weaponStats(state,seed).range,smallRadius=bodySize(state.body).radius;
 state.body=createPart(state,'rootwalker');
 near(weaponStats(state,claws).range-smallMelee,bodySize(state.body).radius-smallRadius);
 near(weaponStats(state,seed).range,smallRanged);
});

test('hero claws hit beyond their former attack range',()=>{
 const state=createRun();
 state.world={walkable:()=>true,lineClear:()=>true};
 state.rng=()=>.99;
 const target=spawnEnemy(state,'normal',{x:3.5,z:0});
 target.radius=0;
 target.hp=target.maxHp=1000;
 attack(state,0);
 assert.ok(target.hp<target.maxHp);
});

test('Rootwalker melee damage lands beyond its hull instead of inside it',()=>{
 const state=createRun();
 state.world={walkable:()=>true,lineClear:()=>true};
 state.rng=()=>.99;
 state.body=createPart(state,'rootwalker');
 state.arms=[createPart(state,'claws'),null,null,null];
 const hull=bodySize(state.body).radius,weaponReach=WEAPONS.claws.range*1.3;
 const target=spawnEnemy(state,'normal',{x:hull+weaponReach-.01,z:0});
 target.radius=0;
 target.hp=target.maxHp=1000;
 attack(state,0);
 assert.ok(target.hp<target.maxHp);
});

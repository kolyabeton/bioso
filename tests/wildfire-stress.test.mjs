import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,spawnEnemy} from '../src/game.js';
import {learn} from '../src/systems/abilities.js';
import {onHit,onDeath,tickEffects} from '../src/systems/effects.js';
import {prepareStressRun} from '../src/stress-review.js';

test('wildfire converging through 100 deaths preserves unique ignitions and expiry',()=>{
 const s=createRun(undefined,'survival',88);s.world={lineClear:()=>true};s.rng=()=>0;
 learn(s,'fire.0');learn(s,'fire.3');
 const enemies=Array.from({length:101},()=>spawnEnemy(s,'normal',{x:2,z:0}));
 for(const e of enemies)onHit(s,e,10,()=>{});
 for(const e of enemies.slice(0,100)){e.hp=0;onDeath(s,e);}
 const survivor=enemies.at(-1);
 assert.equal(survivor.burn.count,101);
 assert.equal(survivor.burn.dps,202);
 let damage=0;s.time=.1;tickEffects(s,.1,(e,d)=>{if(e===survivor)damage+=d;});
 assert.ok(Math.abs(damage-20.2)<1e-8);
 s.time=10;tickEffects(s,.1,()=>{});assert.equal(survivor.burn,null);
});

test('stress fixture keeps a mobile four-weapon loadout and suppresses scheduled superboss',()=>{
 const s=createRun(undefined,'survival',88),setup=prepareStressRun(s);
 assert.equal(setup.weapons.length,4);assert.equal(setup.percentage,100);
 assert.equal(setup.load.overloaded,false);assert.ok(setup.load.speed>0);
 assert.equal(s.survivalBosses.nextAt,Infinity);
});

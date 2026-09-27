import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,receiveDamage} from '../src/game.js';
import {createPart,swapBody,stats} from '../src/assembly.js';
import {learn} from '../src/systems/abilities.js';
import {cloneForComparison,describePart} from '../src/ui/adapters.js';
import {upgradeCost} from '../src/systems/balance.js';
test('equipment comparison carries ability HP and wounds while isolating the live run',()=>{const live=createRun();live.rng=()=>1;learn(live,'vitality.0');const st=stats(live);live.hp=st.hp;live.health.armorSpent=st.armor;receiveDamage(live,1);const body=createPart(live,'bastion');live.inventory.push(body);const copy=cloneForComparison(live);swapBody(copy,body.id);assert.equal(stats(copy).hp,6);assert.equal(copy.hp,5);assert.equal(live.body.key,'wanderer');assert.equal(live.hp,4);assert.notEqual(copy.abilities,live.abilities);assert.notEqual(copy.health,live.health);});
test('equipment descriptions expose purchase price separately from the effect copy',()=>{const live=createRun(),arm=live.arms[0];arm.upgrades.damage=2;assert.equal(describePart(live,arm).cost,upgradeCost(2));const organ=createPart(live,'regen');assert.equal(describePart(live,organ).cost,upgradeCost(0));assert.ok(describePart(live,organ).lines.every(x=>!x.includes('Цена')));});

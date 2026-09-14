import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,receiveDamage} from '../src/game.js';
import {createPart,swapBody,stats} from '../src/assembly.js';
import {learn} from '../src/systems/abilities.js';
import {cloneForComparison,describePart} from '../src/ui/adapters.js';
import {upgradeCost} from '../src/systems/balance.js';
test('equipment comparison carries ability HP and wounds while isolating the live run',()=>{const live=createRun();learn(live,'vitality.0');const st=stats(live);live.hp=st.hp;live.health.armorSpent=st.armor;receiveDamage(live,1);const body=createPart(live,'bastion');live.inventory.push(body);const copy=cloneForComparison(live);swapBody(copy,body.id);assert.equal(stats(copy).hp,4);assert.equal(copy.hp,3);assert.equal(live.body.key,'wanderer');assert.equal(live.hp,2);assert.notEqual(copy.abilities,live.abilities);assert.notEqual(copy.health,live.health);});
test('equipment descriptions expose real purchase price after a rank changes',()=>{const live=createRun(),arm=live.arms[0];arm.upgrades.damage=2;assert.equal(describePart(live,arm).cost,upgradeCost(2));const organ=createPart(live,'regen');assert.ok(describePart(live,organ).lines.some(x=>x.includes('1 деление')&&x.includes('15')));});

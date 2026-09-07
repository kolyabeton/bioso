import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun} from '../src/game.js';
import {createPart,stats,weaponStats,digestionYield,swapBody} from '../src/assembly.js';
import {bodyBonuses,organEffect,bodyTraitDescription} from '../src/systems/body-traits.js';
import {prepareIsaacAttack,isaacHit,tickIsaacCombat} from '../src/systems/organs/combat.js';
import {tickHealth,receiveHit} from '../src/systems/health.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function organic(){const s=createRun();s.body.tier=3;s.organs=Array(4).fill(null);return s;}
test('chassis bonuses combine and immediately disappear after swapping',()=>{
 const s=createRun(),base=weaponStats(s,s.arms[0]).interval,p=createPart(s,'hecaton');s.inventory.push(p);assert(swapBody(s,p.id));assert.deepEqual(bodyBonuses(s),{speed:.15,rate:.15,organ:0});near(weaponStats(s,s.arms[0]).interval,base/1.15);
 const starter=s.inventory.find(p=>p.key==='wanderer');assert(swapBody(s,starter.id));assert.deepEqual(bodyBonuses(s),{speed:0,rate:0,organ:0});near(weaponStats(s,s.arms[0]).interval,base);
});
test('organ capacity enables 30 percent power; spare bodies and empty slots do not multiply it',()=>{
 const s=createRun();s.inventory.push(createPart(s,'wanderer',5));assert.equal(organEffect(s),1);s.body.tier=3;assert.equal(organEffect(s),1.3);s.organs=[];assert.equal(organEffect(s),1.3);assert.match(bodyTraitDescription(s.body),/эффективность органов \+30%/);
});
test('organ booster scales projectile speed, attack rate, regeneration and biomass but not refunds',()=>{
 const s=organic();s.organs=['stabilizer','accelerator','regen','digestion'].map(k=>createPart(s,k));near(stats(s).projectile,1.39);near(stats(s).rate,.195);near(stats(s).regenDelay,15/1.3);
 const p=createPart(s,'seed');p.spent=20;s.inventory.push(p);assert.equal(digestionYield(s,p.id),17);
});
test('slime and larvae capture organ power on attack, including after a chassis change',()=>{
 const s=organic();s.organs=['slime','parasite'].map(k=>createPart(s,k));const p=s.arms[0];prepareIsaacAttack(s,p,{});prepareIsaacAttack(s,p,{});const w=prepareIsaacAttack(s,p,{});s.body.tier=1;const e={};isaacHit(s,e,100,w);near(e.slimeUntil,3.9);near(e.clutch.damage,52);
});
test('shield recharge and armor capacity use boosted organs without extra HP',()=>{
 const s=organic();s.organs=['shield','armor'].map(k=>createPart(s,k));const st=stats(s);assert.equal(st.armor,2);tickHealth(s,st);near(s.organs[0].shieldReadyAt,12/1.3);s.time=12/1.3;tickHealth(s,st);assert.equal(receiveHit(s,st),'shield');assert.equal(s.organs[0].shieldCharge,0);
});
test('reverse heart impulse uses boosted power without recursively creating pulses',()=>{
 const s=organic();s.isaac={deals:{},pulses:1,larvae:[],slimePools:[]};s.enemies=[{hp:1000,x:1,y:0,z:0}];let total=0;tickIsaacCombat(s,0,(e,d)=>total+=d);near(total,weaponStats(s,s.arms[0]).damage*3.9);assert.equal(s.isaac.pulses,0);
});

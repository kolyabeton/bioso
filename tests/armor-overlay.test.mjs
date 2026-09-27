import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun} from '../src/game.js';
import {createPart,equip,unequip,stats} from '../src/assembly.js';
import {receiveHit,healthView,tickHealth,heal} from '../src/systems/health.js';
import {healthSegments} from '../src/ui/atoms.js';
import {partArt} from '../src/ui/molecules.js';
const near=(a,b,message='')=>assert.ok(Math.abs(a-b)<1e-9,message||`${a} != ${b}`);
const advance=(s,st,seconds,step=.25)=>{for(let t=0;t<Math.round(seconds/step);t++){s.time+=step;tickHealth(s,st);}};
const fixture=()=>{const s=createRun();s.body=createPart(s,'bastion');s.body.setId='hecaton';s.organs=[createPart(s,'armor'),createPart(s,'shield')];s.hp=stats(s).hp;s.organs[1].shieldCharge=1;return s;};
test('shield, two plates, then health; healing does not repair armor but armor plates do over time',()=>{const s=fixture(),st=stats(s),hits=[];for(let i=0;i<7;i++){hits.push(receiveHit(s,st));if(i<6)s.time++;}assert.deepEqual(hits,['shield','armor','armor','armor','armor','armor','hurt']);assert.equal(receiveHit(s,st),'ignored');assert.equal(s.hp,100);assert.equal(healthView(s,st.hp,st.armor).armor,0);heal(s,st.hp);assert.equal(s.hp,125);assert.equal(healthView(s,st.hp,st.armor).armor,0);advance(s,st,20);assert.ok(Math.abs(healthView(s,st.hp,st.armor).armor-.5)<.02,'plates rebuild continuously');assert.equal(receiveHit(s,st),'shield');});
test('equipment removal and reinstallation cannot refill consumed plates',()=>{const s=fixture();s.organs[1]=null;const p=s.organs[0];for(let i=0;i<4;i++){receiveHit(s,stats(s));s.time++;}unequip(s,'organs',0);equip(s,p.id,0);assert.equal(healthView(s,stats(s).hp,stats(s).armor).armor,.5);});
test('armor repair cycle is not reset by hits and only plates rebuild it',()=>{const s=fixture();s.organs=[createPart(s,'armor'),createPart(s,'repairGland')];let st=stats(s);assert.equal(st.armor,2.5);near(st.armorRepairPerSecond,.01,'1% of the pool per second');near(st.armorRepairAmount,.025,'the Repair Kit no longer patches plates');for(let i=0;i<5;i++){assert.equal(receiveHit(s,st),'armor');s.time+=1;}assert.equal(healthView(s,st.hp,st.armor).armor,0);s.time=14.9;assert.equal(receiveHit(s,st),'hurt');tickHealth(s,st);assert.ok(healthView(s,st.hp,st.armor).armor<.1,'a hit does not interrupt repair but nothing is restored yet');advance(s,st,20);assert.ok(Math.abs(healthView(s,st.hp,st.armor).armor-.5)<.05);const capacity=st.armor;s.organs=[createPart(s,'repairGland'),null];st=stats(s);assert.equal(st.armor,1.5);assert.equal(st.armorRepairAmount,0);assert.ok(st.armor<capacity);});
test('armor plate ranks add half a plate while the repair kit adds no armour at all',()=>{const s=createRun();s.body.tier=5;const plate=createPart(s,'armor'),gland=createPart(s,'repairGland');s.organs=[plate,null];for(const [tier,armor]of [[1,1.5],[2,2],[3,2.5],[4,3],[5,3.5]]){plate.tier=tier;assert.equal(stats(s).armor,armor);}s.organs=[gland,null];for(const tier of [1,2,3,4,5]){gland.tier=tier;assert.equal(stats(s).armorRepairPerSecond,0);assert.equal(stats(s).armor,.5);}assert.match(partArt('repairGland'),/repair-gland-v2\.png/);});
test('HUD keeps health cells after a plate is lost and distinguishes shield recharge',()=>{const s=fixture(),st=stats(s);const before=healthSegments(healthView(s,st.hp,st.armor));assert.match(before,/ui-health-progress-armor/);assert.match(before,/125 \/ 125/);assert.match(before,/has-shield/);receiveHit(s,st);s.time++;receiveHit(s,st);const after=healthSegments(healthView(s,st.hp,st.armor));assert.match(after,/ui-health-progress-armor/);assert.match(after,/125 \/ 125/);assert.doesNotMatch(after,/has-shield/);});
test('armor remains bounded by living cells after a capacity change and critical HP is never repaired by armor',()=>{const s=fixture();s.hp=25;const st=stats(s),v=healthView(s,st.hp,st.armor);assert.equal(v.armor,1);assert.match(healthSegments(v),/ui-health-progress-armor/);s.organs[1]=null;assert.equal(receiveHit(s,st),'armor');assert.equal(s.hp,25);});

test('two hits remove the two halves of one plate while preserving underlying health',()=>{const s=fixture();s.organs[1]=null;const st=stats(s);receiveHit(s,st);assert.equal(healthView(s,st.hp,st.armor).armor,2);assert.match(healthSegments(healthView(s,st.hp,st.armor)),/ui-health-progress-armor/);s.time++;receiveHit(s,st);assert.equal(healthView(s,st.hp,st.armor).armor,1.5);assert.match(healthSegments(healthView(s,st.hp,st.armor)),/ui-health-progress-armor/);assert.equal(s.hp,125);});
test('shield perimeter tracks elapsed recharge time and remains complete when ready',()=>{const s=fixture(),st=stats(s);receiveHit(s,st);assert.equal(healthView(s,st.hp).shieldProgress,0);s.time=7.5;tickHealth(s,st);assert.equal(healthView(s,st.hp).shieldProgress,.5);assert.equal(healthView(s,st.hp).shield,false);s.time=15;tickHealth(s,st);assert.equal(healthView(s,st.hp).shieldProgress,1);assert.equal(healthView(s,st.hp).shield,true);});

/** Item 2 (armour half): Plates rebuild armour continuously on the same curve as
 * root legs — 1% of the pool per second, +0.3 points per rank and per upgrade —
 * and several Plates stack. There is no repair cycle left to reset. */
test('plates rebuild armour continuously, stack, and scale with rank and upgrades',()=>{
 const rate=organs=>{const s=createRun();s.body=createPart(s,'bastion');s.organs=organs(s);return stats(s).armorRepairPerSecond;};
 near(rate(s=>[createPart(s,'armor'),null,null,null,null]),.01);
 near(rate(s=>[createPart(s,'armor',3),null,null,null,null]),.016);
 near(rate(s=>[createPart(s,'armor',5),null,null,null,null]),.022);
 near(rate(s=>[createPart(s,'armor'),createPart(s,'armor'),null,null,null]),.02,'two plates stack');
 {const p=createPart({serial:0,seed:1},'armor');p.upgrades.plateCapacity=10;
  const s=createRun();s.body=createPart(s,'bastion');s.organs=[p,null,null,null,null];
  near(stats(s).armorRepairPerSecond,.04,'ten upgrades add three points each');}
 // Hits never interrupt it, and it stops exactly at the pool.
 const s=createRun();s.rng=()=>1;s.body=createPart(s,'bastion');s.organs=[createPart(s,'armor'),null,null,null,null];
 const st=stats(s);
 for(let i=0;i<3;i++){s.time=i;receiveHit(s,st);}
 const wounded=healthView(s,st.hp,st.armor).armor;
 assert.ok(wounded<st.armor);
 advance(s,st,400);
 near(healthView(s,st.hp,st.armor).armor,st.armor,'repair stops at the full pool');
 assert.equal(healthView(s,st.hp,st.armor,st).armorRepairActive,false,'and reports itself finished');
});

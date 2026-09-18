import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun} from '../src/game.js';
import {createPart,stats,upgrade,upgradeOptions,legArmor,unequip} from '../src/assembly.js';
import {receiveHit,tickHealth,healthView} from '../src/systems/health.js';
import {healthSegments} from '../src/ui/atoms.js';
import {itemInspectorData} from '../src/ui/item-inspector-data.js';
import {formatUiNumber} from '../src/ui/adapters.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
function run(key,count=1,tier=1){const s=createRun();s.body=createPart(s,'wanderer');s.body.rarity='common';s.body.setId=null;s.legs=Array.from({length:2},(_,i)=>i<count?createPart(s,key,tier):null);for(const p of s.legs.filter(Boolean)){p.setId=null;p.affixes=[];p.affix=null;p.modifier=null;}s.hp=stats(s).hp;s.biomass=1000;s.rng=()=>1;return s;}
test('plated ranks I through V grant half a segment per rank without percent bonuses',()=>{
 for(let tier=1;tier<=5;tier++){
  const s=run('plated',1,tier),p=s.legs[0],view=itemInspectorData(s,p);
  assert.equal(legArmor(p),tier*.5);assert.equal(stats(s).armor,Math.min(stats(s).hp,.5+tier*.5));
  assert.equal(view.preview.before,`+${formatUiNumber(tier*.5)}`);
  assert.equal(view.preview.after,`+${formatUiNumber((tier+1)*.5)}`);
  assert.equal(view.lines.some(line=>line.includes('%')),false);
 }
 assert.equal(stats(run('plated',2,1)).armor,1.5);assert.equal(stats(run('plated',2,2)).armor,2.5);
});
test('natural and plated half segments each absorb one hit',()=>{
 for(const [count,hits] of [[1,2],[2,3]]){
  const s=run('plated',count),st=stats(s);
  for(let i=0;i<hits;i++){s.time=i;assert.equal(receiveHit(s,st),'armor');assert.equal(s.hp,st.hp);}
  assert.equal(healthView(s,st.hp,st.armor).armor,0);
  s.time=hits;assert.equal(receiveHit(s,st),'hurt');assert.equal(s.hp,st.hp-1);
 }
});
test('a half segment is visible in HUD and removing a leg does not refill spent armor',()=>{
 const s=run('plated',2),st=stats(s);receiveHit(s,st);
 assert.match(healthSegments(healthView(s,st.hp,st.armor)),/is-half-armored/);
 unequip(s,'legs',1);assert.equal(healthView(s,st.hp,stats(s).armor).armor,.5);
 const half=run('plated');assert.match(healthSegments(healthView(half,stats(half).hp,.5)),/is-half-armored/);
});
test('paid plated upgrades add half a segment, retain speed and stop at ten',()=>{
 const s=run('plated'),p=s.legs[0],speed=stats(s).speed;
 assert.equal(upgrade(s,p.id,'speed'),false);
 for(let i=0;i<10;i++){assert.equal(itemInspectorData(s,p).preview.before,`+${formatUiNumber(.5*(i+1))}`);assert(upgrade(s,p.id,'armor',true));assert.equal(legArmor(p),.5*(i+2));assert.equal(stats(s).speed,speed);}
 assert.equal(upgrade(s,p.id,'armor'),false);assert.equal(itemInspectorData(s,p).preview,null);
});
/** Item 2: root legs regenerate continuously instead of shortening the shared
 * cell timer. 1% of maximum health per second, +0.3 points per rank above I and
 * per upgrade, and every installed leg adds its own share. */
test('roots regenerate continuously, retain HP bonus and offer regeneration upgrades',()=>{
 const s=run('root',2,2),p=s.legs[0],st=stats(s);assert.equal(st.hp,4);assert.equal(st.regenPersistsThroughDamage,true);
 // Two rank II legs: (1 + 0.3) each.
 near(st.regenPerSecond,.026);
 // The shared cell timer is the Repairman organ's mechanic and stays off here.
 assert.equal(st.regen,false);
 assert.deepEqual(upgradeOptions(p),['regen']);assert.equal(upgrade(s,p.id,'speed'),false);
 assert.deepEqual(itemInspectorData(s,p).preview,{label:'Регенерация',before:'1,3% здоровья/с',after:'1,6% здоровья/с'});
 assert.equal(itemInspectorData(s,p).rows.find(row=>row.label==='Регенерация').value,'1,3% здоровья/с');
 assert.equal(itemInspectorData(s,p).rows.find(row=>row.label==='Урон').value,'Не сбрасывает таймер');
 s.health.armorSpent=st.armor;receiveHit(s,st);assert.equal(s.hp,3);
 // 2.6% of 4 HP per second closes the missing cell in well under a minute.
 for(let i=1;i<=100;i++){s.time=i*.2;tickHealth(s,st);}
 assert.equal(s.hp,4);
 unequip(s,'legs',0);unequip(s,'legs',1);near(stats(s).regenPerSecond,0);
});
test('every installed root leg stacks its own share and upgrades add three tenths each',()=>{
 for(const [legs,rate] of [[1,.01],[2,.02],[3,.03],[4,.04]]){
  const s=run('root',Math.min(2,legs));
  s.legs=Array.from({length:Math.max(2,legs)},(_,i)=>i<legs?createPart(s,'root'):null);
  near(stats(s).regenPerSecond,rate);
 }
 const s=run('root'),p=s.legs[0];
 for(let i=0;i<10;i++){near(stats(s).regenPerSecond,.01+.003*i);assert(upgrade(s,p.id,'regen',true));}
 // Rank I with ten upgrades: 1 + 3 = 4% per second.
 near(stats(s).regenPerSecond,.04);
 const ranked=run('root',1,5);near(stats(ranked).regenPerSecond,.022);
});
test('root regeneration never overheals and stops while healing is suppressed',()=>{
 const s=run('root',2),st=stats(s);
 s.hp=st.hp;s.health.missing=0;
 for(let i=1;i<=20;i++){s.time=i;tickHealth(s,st);}
 assert.equal(s.hp,st.hp,'a full hero gains nothing');
 s.hp=1;s.health.missing=st.hp-1;s.time=100;tickHealth(s,st);
 const before=s.hp;s.time=101;tickHealth(s,st);assert.ok(s.hp>before,'a wounded hero keeps healing');
});

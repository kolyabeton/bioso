import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun} from '../src/game.js';
import {createPart,stats,upgrade,upgradeOptions,legArmor,unequip} from '../src/assembly.js';
import {receiveHit,tickHealth,healthView} from '../src/systems/health.js';
import {healthSegments} from '../src/ui/atoms.js';
import {itemInspectorData} from '../src/ui/item-inspector-data.js';
function run(key,count=1,tier=1){const s=createRun();s.body=createPart(s,'wanderer');s.body.rarity='common';s.body.setId=null;s.legs=Array.from({length:2},(_,i)=>i<count?createPart(s,key,tier):null);for(const p of s.legs.filter(Boolean)){p.setId=null;p.affixes=[];p.affix=null;p.modifier=null;}s.hp=stats(s).hp;s.biomass=1000;return s;}
test('plated ranks I through V grant half a segment per rank without percent bonuses',()=>{
 for(let tier=1;tier<=5;tier++){
  const s=run('plated',1,tier),p=s.legs[0],view=itemInspectorData(s,p);
  assert.equal(legArmor(p),tier*.5);assert.equal(stats(s).armor,Math.min(stats(s).hp,.5+tier*.5));
  assert.equal(view.preview.before,`+${tier*.5}`);
  assert.equal(view.preview.after,`+${(tier+1)*.5}`);
  assert.equal(view.lines.some(line=>line.includes('%')),false);
 }
 assert.equal(stats(run('plated',2,1)).armor,1.5);assert.equal(stats(run('plated',2,2)).armor,2);
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
 const half=run('plated');assert.match(healthSegments(healthView(half,2,.5)),/is-half-armored/);
});
test('paid plated upgrades add half a segment, retain speed and stop at ten',()=>{
 const s=run('plated'),p=s.legs[0],speed=stats(s).speed;
 assert.equal(upgrade(s,p.id,'speed'),false);
 for(let i=0;i<10;i++){assert.equal(itemInspectorData(s,p).preview.before,`+${.5*(i+1)}`);assert(upgrade(s,p.id,'armor',true));assert.equal(legArmor(p),.5*(i+2));assert.equal(stats(s).speed,speed);}
 assert.equal(upgrade(s,p.id,'armor'),false);assert.equal(itemInspectorData(s,p).preview,null);
});
test('roots heal after fifteen seconds, retain HP bonus and offer regeneration upgrades',()=>{
 const s=run('root',2,2),p=s.legs[0],st=stats(s);assert.equal(st.hp,3);assert.equal(st.regen,true);assert.equal(st.regenDelay,15);
 assert.deepEqual(upgradeOptions(p),['regen']);assert.equal(upgrade(s,p.id,'speed'),false);
 assert.deepEqual(itemInspectorData(s,p).preview,{label:'Регенерация',before:'15 с',after:'14 с'});
 s.health.armorSpent=st.armor;receiveHit(s,st);s.time=14.99;tickHealth(s,st);assert.equal(s.hp,2);s.time=15;tickHealth(s,st);assert.equal(s.hp,3);
 unequip(s,'legs',0);unequip(s,'legs',1);assert.equal(stats(s).regen,false);
});
test('ten root upgrades each remove one second, keep speed and HP, and do not heal immediately',()=>{
 const s=run('root'),p=s.legs[0],speed=stats(s).speed;s.hp=1;
 for(let i=0;i<10;i++){
  assert.equal(stats(s).regenDelay,15-i);assert.equal(itemInspectorData(s,p).preview.after,`${14-i} с`);
  assert(upgrade(s,p.id,'regen',true));assert.equal(s.hp,1);assert.equal(stats(s).speed,speed);
 }
 assert.equal(stats(s).regenDelay,5);assert.equal(upgrade(s,p.id,'regen'),false);
});
test('old root upgrades accelerate regenerator organs; installed roots stack down to half a second',()=>{
 const s=run('root',2,2),[a,b]=s.legs;s.organs=[createPart(s,'regen')];
 a.upgrades.regen=10;assert.equal(stats(s).regenDelay,5);b.upgrades.regen=5;assert.equal(stats(s).regenDelay,.5);
 unequip(s,'legs',0);assert.equal(stats(s).regenDelay,10);
 s.health.armorSpent=stats(s).armor;receiveHit(s,stats(s));const hp=s.hp;s.time=9.99;tickHealth(s,stats(s));assert.equal(s.hp,hp);s.time=10;tickHealth(s,stats(s));assert.equal(s.hp,Math.min(stats(s).hp,hp+1));
});
test('a root upgrade adjusts a pending heal and a new hit restarts the timer',()=>{
 const s=run('root'),p=s.legs[0];receiveHit(s,stats(s));s.time=10;upgrade(s,p.id,'regen');tickHealth(s,stats(s));assert.equal(s.health.regenAt,14);
 s.hp=stats(s).hp;s.health.missing=0;receiveHit(s,stats(s));assert.equal(s.health.regenAt,24);
});

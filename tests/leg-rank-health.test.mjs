import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun} from '../src/game.js';
import {CATALOG} from '../src/catalog.js';
import {createPart,legHealth,legSpeed,stats,weight,equip,unequip,drop,upgrade,upgradeOptions} from '../src/assembly.js';
import {healthView,receiveHit,heal} from '../src/systems/health.js';
import {healthSegments} from '../src/ui/atoms.js';
import {itemInspectorData} from '../src/ui/item-inspector-data.js';
import {heroHealthPoints} from '../src/systems/health-scale.js';
test('leg health curves and rank weight are exposed by every leg inspector',()=>{
 const s=createRun();
 for(const d of Object.values(CATALOG).filter(d=>d.kind==='leg'))for(let tier=1;tier<=5;tier++){
  const expected=d.healthByTier?.[tier-1]??(d.rankStat==='hp'?(tier-1)*.5:0),p=createPart(s,d.key,tier);assert.equal(legHealth(p),expected);
  assert.ok(Math.abs(weight(p)/weight({...p,tier:1})-1.15**(tier-1))<1e-10);
  assert.equal(itemInspectorData(s,p).rows.some(r=>r.label==='Здоровье детали'&&r.value===`+${heroHealthPoints(expected)} HP`),expected>0);
 }
});
test('installed legs stack HP, inventory does not; swapping and removing preserve wounds',()=>{
 const s=createRun();s.legs=[null,null];s.hp=stats(s).hp;const base=stats(s).hp,p=createPart(s,'root',2),q=createPart(s,'root',3);
 s.inventory.push(p,q);assert.equal(stats(s).hp,base);
 s.hp-=1;assert.ok(equip(s,p.id,0));assert.equal(stats(s).hp,base+13);assert.equal(s.hp,base+12);
 assert.ok(equip(s,q.id,1));assert.equal(stats(s).hp,base+38);assert.equal(s.hp,base+37);
 assert.ok(unequip(s,'legs',0));assert.equal(stats(s).hp,base+25);assert.equal(s.hp,base+24);
 assert.ok(drop(s,q.id,{allowLastLeg:true}));assert.equal(stats(s).hp,base);assert.equal(s.hp,base-1);
});
test('rounded HP survives damage and healing in the actual HUD markup',()=>{
 const s=createRun();s.rng=()=>1;s.legs=[null,null];s.hp=stats(s).hp;const base=stats(s).hp,p=createPart(s,'root',2);s.inventory.push(p);equip(s,p.id,0);const st=stats(s);
 assert.equal(s.hp,base+13);assert.equal(healthView(s,st.hp).segments.length,0);
 assert.match(healthSegments(healthView(s,st.hp)),/ui-health-progress/);
 s.health.armorSpent=st.armor;receiveHit(s,st);assert.equal(s.hp,base-12);heal(s,st.hp);assert.equal(s.hp,base+13);
});

test('speed, health and armor ranks improve their assigned attribute plus universal weight',()=>{
 for(const key of ['runner','spring','universal','root','plated']){
  const s=createRun();s.body=createPart(s,'wanderer');s.body.rarity='common';s.body.setId=null;
  s.legs=Array.from({length:2},()=>createPart(s,key));for(const p of s.legs){p.setId=null;p.affixes=[];p.affix=null;p.modifier=null;}
  const before=stats(s),detail=itemInspectorData(s,s.legs[0]);
  for(const p of s.legs)p.tier=5;
  const after=stats(s),next=itemInspectorData(s,s.legs[0]);
  assert.ok(after.weight>before.weight);for(const p of s.legs)assert.ok(Math.abs(weight(p)/weight({...p,tier:1})-1.15**4)<1e-10);
  if(['runner','spring','universal'].includes(key)){
   assert.ok(after.speed>before.speed&&after.speed<=18);assert.equal(after.hp,before.hp+(key==='universal'?75:0));assert.equal(after.armor,before.armor);
   assert.equal(next.rows.some(r=>r.label==='Здоровье детали'),key==='universal');
   assert.notEqual(next.rows[0].value,detail.rows[0].value);
  }else if(key==='root'){
   assert.equal(after.hp,before.hp+100);assert.equal(after.speed,before.speed);assert.equal(after.armor,before.armor);
  }else{
   assert.equal(after.hp,before.hp);assert.equal(after.speed,before.speed);
   assert.notEqual(next.rows.find(r=>r.label==='Броня детали').value,detail.rows.find(r=>r.label==='Броня детали').value);
   // Armor sums without rounding, then respects the health cap.
   s.legs=Array.from({length:4},()=>({...s.legs[0]}));assert.equal(stats(s).armor,stats(s).hp/25);
  }
 }
});

test('universal grants its health curve while upgrades remain movement-speed upgrades',()=>{
 const s=createRun(),health=[.5,.5,1,1,2];
 for(let tier=1;tier<=5;tier++)assert.equal(legHealth(createPart(s,'universal',tier)),health[tier-1]);
 const p=createPart(s,'universal',3),before=legSpeed(p);s.legs[0]=p;
 assert.deepEqual(upgradeOptions(p,s),['speed']);assert.ok(upgrade(s,p.id,'speed'));
 assert.ok(legSpeed(p)>before);assert.equal(legHealth(p),1);
});

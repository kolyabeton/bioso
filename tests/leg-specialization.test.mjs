import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun} from '../src/game.js';
import {createPart,stats,upgrade,unequip,equip} from '../src/assembly.js';
import {receiveHit,tickHealth} from '../src/systems/health.js';
import {itemInspectorData} from '../src/ui/item-inspector-data.js';
function run(key,count=4){const s=createRun();s.body=createPart(s,'bastion');s.legs=Array.from({length:4},(_,i)=>createPart(s,i<count?key:'universal'));s.hp=stats(s).hp;s.biomass=1000;return s;}
test('roots grant regeneration without an organ, stack and improve without changing speed',()=>{
 const s=run('root',1),a=stats(s);assert(a.regen);assert.equal(a.regenDelay,15);
 const four=run('root'),b=stats(four);assert.equal(b.regenDelay,15);
 const speed=b.speed;assert(upgrade(four,four.legs[0].id,'regen',true));assert(stats(four).regenDelay<b.regenDelay);assert.equal(stats(four).speed,speed);
 four.health.armorSpent=stats(four).armor;receiveHit(four,stats(four));const delay=stats(four).regenDelay;four.time=delay-.01;tickHealth(four,stats(four));assert.equal(four.hp,2);four.time=delay;tickHealth(four,stats(four));assert.equal(four.hp,3);
 unequip(s,'legs',0);assert.equal(stats(s).regen,false);
});
test('root upgrade adjusts a pending heal and damage restarts recovery',()=>{
 const s=run('root',1);s.health.armorSpent=stats(s).armor;receiveHit(s,stats(s));s.time=10;upgrade(s,s.legs[0].id,'regen');tickHealth(s,stats(s));assert.equal(s.health.regenAt,stats(s).regenDelay);
 receiveHit(s,stats(s));assert.equal(s.health.regenAt,10+stats(s).regenDelay);
});
test('plated legs add armor capacity; upgrades preserve speed',()=>{const s=run('plated');assert.equal(stats(s).armor,2);for(let i=0;i<4;i++){s.time=i;assert.equal(receiveHit(s,stats(s)),'armor');}assert.equal(s.hp,3);s.time=4;assert.equal(receiveHit(s,stats(s)),'hurt');const before=stats(s);assert(upgrade(s,s.legs[0].id,'armor',true));assert(stats(s).armor>before.armor);assert.equal(stats(s).speed,before.speed);});
test('specialized inspector previews show a real increase and ranks are capped',()=>{
 for(const [key,stat] of [['root','regen'],['plated','armor']]){const s=run(key),p=s.legs[0],v=itemInspectorData(s,p);assert.equal(v.selected,stat);assert.notEqual(v.preview.before,v.preview.after);assert.equal(upgrade(s,p.id,'speed'),false);for(let i=0;i<10;i++)assert(upgrade(s,p.id,stat));assert.equal(upgrade(s,p.id,stat),false);}
});

test('ten paid root upgrades each remove exactly one second and inspector matches combat',()=>{
 const s=run('root',1),p=s.legs[0],speed=stats(s).speed;
 for(let rank=0;rank<10;rank++){
  assert.equal(stats(s).regenDelay,15-rank);
  const view=itemInspectorData(s,p);
  assert.equal(view.preview.before,`${15-rank} с`);
  assert.equal(view.preview.after,`${14-rank} с`);
  assert.equal(view.rows.find(r=>r.label==='Регенерация').value,`1 дел. / ${15-rank} с`);
  const hp=s.hp,biomass=s.biomass;
  assert(upgrade(s,p.id,'regen',true));assert.equal(s.hp,hp);assert(s.biomass<biomass);
 }
 assert.equal(stats(s).regenDelay,5);assert.equal(stats(s).speed,speed);
 assert.equal(upgrade(s,p.id,'regen',true),false);assert.equal(itemInspectorData(s,p).preview,null);
});
test('root upgrades stack on one timer, clamp at half a second and inventory has no effect',()=>{
 const s=run('root',2),[a,b]=s.legs;
 for(let i=0;i<10;i++)assert(upgrade(s,a.id,'regen'));
 assert.equal(stats(s).regenDelay,5);
 for(let i=0;i<5;i++)assert(upgrade(s,b.id,'regen'));
 assert.equal(stats(s).regenDelay,.5);
 unequip(s,'legs',0);assert.equal(stats(s).regenDelay,10);
 assert(equip(s,a.id,0));assert.equal(stats(s).regenDelay,.5);
 s.health.armorSpent=stats(s).armor;s.hp=1;s.health.missing=stats(s).hp-1;
 tickHealth(s,stats(s));s.time=.49;tickHealth(s,stats(s));assert.equal(s.hp,1);
 s.time=.5;tickHealth(s,stats(s));assert.equal(s.hp,2);
 s.time=1;tickHealth(s,stats(s));assert.equal(s.hp,3);
});
test('set and organ bonuses apply before the flat one-second upgrade',()=>{
 const s=run('root',1),p=s.legs[0];s.organs=[createPart(s,'regen')];
 s.body.tier=3;
 for(const q of [s.body,s.arms[0],p])q.setId='rootwalker';
 const before=stats(s).regenDelay;assert(before<10);
 upgrade(s,p.id,'regen');assert.equal(stats(s).regenDelay,before-1);
});
test('armor and shield absorption preserve the timer; health loss resets it',()=>{
 const s=run('root',1);tickHealth(s,stats(s));assert.equal(s.health.regenAt,15);
 s.time=1;assert.equal(receiveHit(s,stats(s)),'armor');assert.equal(s.health.regenAt,15);
 s.organs=[createPart(s,'shield')];s.organs[0].shieldCharge=1;
 s.time=2;assert.equal(receiveHit(s,stats(s)),'shield');assert.equal(s.health.regenAt,15);
 s.health.armorSpent=stats(s).armor;s.time=3;
 assert.equal(receiveHit(s,stats(s)),'hurt');assert.equal(s.health.regenAt,18);
 s.time=17.99;tickHealth(s,stats(s));assert.equal(s.hp,2);
 s.time=18;tickHealth(s,stats(s));assert.equal(s.hp,3);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun} from '../src/game.js';
import {createPart,weaponStats} from '../src/assembly.js';
import {reloadDuration} from '../src/systems/sets-loot.js';
import {itemInspectorData} from '../src/ui/item-inspector-data.js';

const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-9,`${actual} != ${expected}`);
const arms=(s,key,count)=>s.arms=Array.from({length:count},()=>createPart(s,key));

test('each additional installed Marker improves every Marker critical profile',()=>{
 for(let count=1;count<=4;count++){
  const s=createRun();arms(s,'pistol',count);
  for(const p of s.arms){const w=weaponStats(s,p);near(w.crit,.3+.05*(count-1));near(w.critPower,2+.2*(count-1));}
 }
});

test('Marker family bonus counts installed disabled copies but not inventory copies',()=>{
 const s=createRun();arms(s,'pistol',3);s.arms[2].disabled=true;
 near(weaponStats(s,s.arms[0]).crit,.4);near(weaponStats(s,s.arms[0]).critPower,2.4);
 const spare=createPart(s,'pistol');s.inventory.push(spare);
 near(weaponStats(s,spare).crit,.3);near(weaponStats(s,spare).critPower,2);
});

test('each additional installed Spreader speeds reload and tightens every pellet fan',()=>{
 for(let count=1;count<=4;count++){
  const s=createRun();arms(s,'shotgun',count);
  for(const p of s.arms){const w=weaponStats(s,p);near(reloadDuration(s,p,w.reload),2/(1+.1*(count-1)));near(w.pelletSpread,.098*(1-.1*(count-1)));}
 }
});

test('Spreader family bonus counts installed disabled copies but not inventory copies',()=>{
 const s=createRun();arms(s,'shotgun',4);s.arms[3].disabled=true;
 const active=s.arms[0];near(reloadDuration(s,active,2),2/1.3);near(weaponStats(s,active).pelletSpread,.098*.7);
 const spare=createPart(s,'shotgun');s.inventory.push(spare);
 near(reloadDuration(s,spare,2),2);near(weaponStats(s,spare).pelletSpread,.098);
});

test('item details expose both built-in weapon family synergies and effective values',()=>{
 const s=createRun();arms(s,'pistol',3);
 let data=itemInspectorData(s,s.arms[0]);
 assert.equal(data.rows.find(row=>row.label==='Крит')?.value,'40% · ×2,4');
 assert.match(data.rows.find(row=>row.label==='Синергия')?.value,/\+5%.*\+0,2/u);
 arms(s,'shotgun',4);data=itemInspectorData(s,s.arms[0]);
 assert.equal(data.rows.find(row=>row.label==='Перезарядка')?.value,'1,54 с');
 assert.match(data.rows.find(row=>row.label==='Синергия')?.value,/\+10%.*−10%/u);
});

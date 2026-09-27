import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun} from '../src/game.js';
import {startReload,tickWeapons} from '../src/combat-feel.js';
import {createPart,weaponStats} from '../src/assembly.js';
import {reloadDuration} from '../src/systems/sets-loot.js';
import {itemInspectorData} from '../src/ui/item-inspector-data.js';
import {activeEquipmentCards} from '../src/ui/catalog-sets.js';

const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-9,`${actual} != ${expected}`);
const arms=(s,key,count)=>s.arms=Array.from({length:count},()=>createPart(s,key));

test('stabilizer shortens actual reload without changing projectile speed; bonuses stack safely',()=>{
 const s=createRun();arms(s,'shotgun',2);const p=s.arms[0],speed=weaponStats(s,p).speed;
 s.organs=[createPart(s,'stabilizer')];
 near(weaponStats(s,p).speed,speed);near(reloadDuration(s,p,2),1.3);
 p.ammo=0;assert.ok(startReload(s,p));near(p.reloadDuration,1.3);
 tickWeapons(s,1.29);assert.equal(p.ammo,0);tickWeapons(s,.02);assert.equal(p.ammo,2);
 assert.match(itemInspectorData(s,s.organs[0]).rows.find(r=>r.label==='Эффект').value,/−15%/);
 s.organs=Array.from({length:6},()=>createPart(s,'stabilizer',5));near(reloadDuration(s,p,2),.4);
});

test('each installed Marker improves every Marker critical profile',()=>{
 for(let count=1;count<=4;count++){
  const s=createRun();arms(s,'pistol',count);
  for(const p of s.arms){const w=weaponStats(s,p);near(w.crit,.3+.05*count);near(w.critPower,2+.2*count);}
  assert.ok(activeEquipmentCards(s).includes(`Шанс крита +${count*5}%, множитель крита +${(.2*count).toFixed(1)}.`));
 }
});

test('Marker family bonus counts installed disabled copies but not inventory copies',()=>{
 const s=createRun();arms(s,'pistol',3);s.arms[2].disabled=true;
 near(weaponStats(s,s.arms[0]).crit,.45);near(weaponStats(s,s.arms[0]).critPower,2.6);
 const spare=createPart(s,'pistol');s.inventory.push(spare);
 near(weaponStats(s,spare).crit,.3);near(weaponStats(s,spare).critPower,2);
});

test('each installed Spreader speeds reload and tightens every pellet fan',()=>{
 for(let count=1;count<=4;count++){
  const s=createRun();arms(s,'shotgun',count);
  for(const p of s.arms){const w=weaponStats(s,p);near(reloadDuration(s,p,w.reload),2*(1-.1*count));near(w.pelletSpread,.098*(1-.1*count));}
  const html=activeEquipmentCards(s);assert.match(html,new RegExp(`Время перезарядки −${count*10}%, разброс −${count*10}%`));assert.match(html,/ui-learned/);assert.match(html,/shotgun-arm-v3\.png/);
 }
});

test('Spreader family bonus counts installed disabled copies but not inventory copies',()=>{
 const s=createRun();arms(s,'shotgun',4);s.arms[3].disabled=true;
 const active=s.arms[0];near(reloadDuration(s,active,2),2*.6);near(weaponStats(s,active).pelletSpread,.098*.6);
 const spare=createPart(s,'shotgun');s.inventory.push(spare);
 near(reloadDuration(s,spare,2),2);near(weaponStats(s,spare).pelletSpread,.098);
});

test('item details expose both built-in weapon family synergies and effective values',()=>{
 const s=createRun();arms(s,'pistol',3);
 let data=itemInspectorData(s,s.arms[0]);
 assert.equal(data.rows.find(row=>row.label==='Крит')?.value,'45% · ×2,6');
 assert.match(data.rows.find(row=>row.label==='Синергия')?.value,/\+5%.*\+0,2/u);
 arms(s,'shotgun',4);data=itemInspectorData(s,s.arms[0]);
 assert.equal(data.rows.find(row=>row.label==='Время перезарядки')?.value,'1,2 с');
 assert.match(data.rows.find(row=>row.label==='Синергия')?.value,/на 10%.*на 10%/u);
});

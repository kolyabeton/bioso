import {CATALOG} from '../src/catalog.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun} from '../src/game.js';
import {upgrade,createPart} from '../src/assembly.js';
import {itemInspectorData,catalogInspectorData} from '../src/ui/item-inspector-data.js';
test('preview matches paid upgrade without mutating the live run',()=>{
 const s=createRun();s.biomass=1000;const p=s.arms[0];
 for(const stat of ['damage']){
  const before=JSON.stringify(s),model=itemInspectorData(s,p,stat);
  assert.equal(JSON.stringify(s),before);
  assert.equal(upgrade(s,p.id,stat,true),true);
  assert.equal(itemInspectorData(s,p,stat).preview.before,model.preview.after);
 }
});
test('inspector disables unaffordable and exhausted upgrades; inventory cannot upgrade',()=>{
 const s=createRun(),p=s.arms[0];s.biomass=0;assert.equal(itemInspectorData(s,p).disabled,true);
 p.upgrades.damage=10;assert.equal(itemInspectorData(s,p).preview,null);assert.equal(itemInspectorData(s,p).disabled,true);
 const spare=createPart(s,'claws');s.inventory.push(spare);assert.equal(itemInspectorData(s,spare).preview,null);assert.equal(itemInspectorData(s,spare).actionLabel,undefined);
});
test('capacity preview does not heal or change wounds on the live run',()=>{
 const s=createRun();const before=JSON.stringify(s);const model=itemInspectorData(s,s.body,'capacity');assert.equal(JSON.stringify(s),before);assert.equal(model.preview.after,'110');
});
test('rare unmodified organ has no contradictory common label or imaginary upgrade price',()=>{
 const s=createRun(),p=createPart(s,'returnNerve');p.rarity='rare';s.organs[0]=p;
 const m=itemInspectorData(s,p);assert.ok(!m.subtitle.includes('Обычная'));assert.ok(m.lines.some(l=>l.includes('Редкая')));
 assert.ok(m.lines.some(l=>l.includes('Нет совместимого оружия')));assert.equal(m.actionLabel,undefined);assert.equal(m.notice,'Не улучшается за биомассу');
 s.arms[0]=createPart(s,'seed');assert.ok(itemInspectorData(s,p).lines.some(l=>l.startsWith('Действует на:')));
});

test('catalog inspectors describe every base part without actions or run mutations',()=>{
 const s=createRun(),before=JSON.stringify(s);
 for(const key of Object.keys(CATALOG)){
  const model=catalogInspectorData(s,key);
  assert.ok(model.rows.some(r=>r.label==='Вес'));
  assert.equal(model.actionLabel,undefined);
  assert.equal(model.dropLabel,undefined);
  assert.equal(model.preview,undefined);
  assert.equal(model.biomass,undefined);
  assert.equal(model.notice,undefined);
 }
 assert.equal(JSON.stringify(s),before);
});

test('each item category leads with its useful property, before weight',()=>{
 const s=createRun();
 for(const key of Object.keys(CATALOG)){
  const p=createPart(s,key),m=itemInspectorData(s,p),kind=CATALOG[key].kind;
  assert.equal(m.rows.at(-1).label,'Вес',key);
  if(kind==='arm')assert.equal(m.rows[0].label,'Урон',key);
  if(kind==='body'){assert.equal(m.rows[0].label,'Здоровье корпуса');assert.ok(m.rows.some(r=>r.label==='Броня детали'));}
  if(kind==='leg')assert.equal(m.rows[0].label,'Скорость ноги');
  if(kind==='organ')assert.ok(m.primaryEffect?.length,key);
  assert.ok(m.rows.every(r=>r.value!==undefined&&!String(r.value).includes('NaN')),key);
 }
 const p=createPart(s,'plated');assert.equal(itemInspectorData(s,p).rows.find(r=>r.label==='Броня детали').value,'0.25 пласт.');
});


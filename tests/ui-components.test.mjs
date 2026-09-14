import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun} from '../src/game.js';
import {createPart,equip,weaponStats} from '../src/assembly.js';
import {cloneForComparison,comparisonRows} from '../src/ui/adapters.js';
import {readSettings,createSettings,DEFAULT_SETTINGS} from '../src/ui/settings.js';
import {linkButton} from '../src/ui/atoms.js';

test('master sound switch is opt-in, persists, and preserves channel levels',()=>{
  let saved=null;
  const storage={getItem:()=>saved,setItem:(key,value)=>{saved=value;}};
  const settings=createSettings(storage);
  assert.equal(settings.get().soundEnabled,true);
  settings.tick(); // No browser audio globals are available: muted UI must do nothing.
  settings.update('music',45);
  assert.equal(settings.get().soundEnabled,true);
  settings.update('soundEnabled',true);
  assert.equal(readSettings(storage).soundEnabled,true);
  settings.update('soundEnabled',false);
  assert.equal(readSettings(storage).soundEnabled,false);
  assert.equal(settings.get().music,45);
  assert.equal(settings.get().effects,30);
});

test('equipment preview compares actual weapon values without equipping in the live run',()=>{
  const run=createRun(),part=createPart(run,'drill');run.inventory.push(part);
  const before=JSON.stringify(run),preview=cloneForComparison(run);assert.equal(equip(preview,part.id,1),true);
  const rows=comparisonRows(run,preview,{group:'arms',slot:1});
  assert.equal(rows.find(r=>r.label==='Урон руки').after,String(Number(weaponStats(preview,preview.arms[1]).damage.toFixed(1))));
  assert.equal(JSON.stringify(run),before);
});

test('corrupt settings recover and unavailable storage still applies session settings',()=>{
  assert.deepEqual(readSettings({getItem:()=>'{broken'}),DEFAULT_SETTINGS);
  let applied,notice;
  const settings=createSettings({getItem:()=>null,setItem:()=>{throw Error('full');}},{apply:value=>{applied=value;},notify:value=>{notice=value;}});
  settings.update('quality','low');settings.update('effects',120);settings.update('fps',999);
  assert.equal(applied.quality,'low');assert.equal(applied.effects,100);assert.equal(applied.fps,60);assert.ok(notice);
});

test('comparison distinguishes lower damage from faster attacks',()=>{
  const run=createRun(),part=createPart(run,'drill');run.inventory.push(part);
  const preview=cloneForComparison(run);equip(preview,part.id,0);
  const rows=comparisonRows(run,preview,{group:'arms',slot:0});
  assert.equal(rows.find(r=>r.label==='Урон руки').tone,'negative');
  assert.equal(rows.find(r=>r.label==='Скорость атаки').tone,'positive');
  assert.equal(rows.find(r=>r.label==='Вес').tone,'neutral');
});

test('external link button uses safe new-tab attributes',()=>{
  const html=linkButton('Сайт автора',{href:'https://dorosenya.tech/',icon:'exit'});
  assert.match(html,/href="https:\/\/dorosenya\.tech\/"/);
  assert.match(html,/target="_blank"/);
  assert.match(html,/rel="noopener noreferrer"/);
  assert.match(html,/>Сайт автора<\/span>/);
});

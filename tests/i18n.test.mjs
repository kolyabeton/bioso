import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {parseAst} from 'rollup/parseAst';
import {translateText,normalizeLanguage} from '../src/i18n/index.js';
import {createSettings,readSettings,SETTINGS_KEY} from '../src/ui/settings.js';
import {CONSUMABLES,CONSUMABLE_NOTICES} from '../src/systems/consumable-drops.js';

test('all eleven pickups have English and Russian names, details and compact notices',()=>{
  assert.equal(CONSUMABLES.length,11);
  for(const item of CONSUMABLES){
    for(const text of [item.name,item.description,CONSUMABLE_NOTICES[item.kind]]){
      assert.ok(text,item.kind);
      assert.doesNotMatch(translateText(text,'en'),/[А-Яа-яЁё]/u,`${item.kind}: ${text}`);
      assert.equal(translateText(text,'ru'),text);
      assert.deepEqual(translateText(text,'en').match(/\d+/g),text.match(/\d+/g));
    }
    for(const lang of ['en','ru'])assert.ok(translateText(CONSUMABLE_NOTICES[item.kind],lang).length<=36,item.kind);
  }
  assert.equal(translateText('Возрождение · запасной шанс использован'),'Revival · extra chance used');
  assert.equal(translateText('+5 биомассы'),'+5 biomass');
});

test('new and existing profiles default to Russian without losing other settings',()=>{
  assert.equal(readSettings({getItem:()=>null}).language,'ru');
  const old=readSettings({getItem:()=>JSON.stringify({music:35,quality:'high'})});
  assert.equal(old.language,'ru'); assert.equal(old.music,35); assert.equal(old.quality,'high');
  for(const value of [null,42,'de',{},undefined])assert.equal(normalizeLanguage(value),'en');
  assert.equal(readSettings({getItem:()=>'{bad'}).language,'ru');
  assert.equal(readSettings({getItem:()=>{throw Error('blocked');}}).language,'ru');
});

test('language survives reload and remains effective when storage is unavailable',()=>{
  const data=new Map(),storage={getItem:key=>data.get(key),setItem:(key,value)=>data.set(key,value)};
  const settings=createSettings(storage); settings.update('music',25); settings.update('language','ru');
  assert.equal(createSettings(storage).get().language,'ru');
  assert.equal(JSON.parse(data.get(SETTINGS_KEY)).music,25);
  settings.update('language','en'); assert.equal(createSettings(storage).get().language,'en');
  let applied,notice;
  const blocked=createSettings({getItem:()=>null,setItem:()=>{throw Error('full');}},{apply:s=>applied=s,notify:s=>notice=s});
  blocked.update('language','ru'); assert.equal(applied.language,'ru'); assert.ok(notice);
});

test('browser review routes support the mandatory silent mode',()=>{
  const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
  assert.match(main,/review&&params\.get\('sound'\)==='0'\)settings\.update\('soundEnabled',false\)/);
});

test('dynamic stats, units and longest phrases translate without changing values',()=>{
  assert.equal(translateText('УРОВЕНЬ 12 · Урон руки +25% · 1.5с'),'LEVEL 12 · Arm damage +25% · 1.5s');
  assert.equal(translateText('Здоровье 2 из 3. Броня 1 из 2. Щит готов'),'Health 2 of 3. Armor 1 of 2. Shield ready');
  assert.equal(translateText('Биомасса: 120 · Вес 8 из 20'),'Biomass: 120 · Weight 8 of 20');
  assert.equal(translateText('Вход с 5-го уровня · ваш уровень 2'),'Requires level 5 · your level 2');
  assert.equal(translateText('Не хватает 25 биомассы'),'Need 25 more biomass');
  assert.equal(translateText('Нажмите на лишнюю деталь в инвентаре → «Переработать». До улучшения: 5 из 12.'),'Tap a spare part in your inventory → “Digest”. Until upgrade: 5 of 12.');
  assert.equal(translateText('Садовник · Урон руки +25%','ru'),'Садовник · Урон руки +25%');
  assert.equal(translateText('BIOSO · 60 FPS · unknown_identifier'),'BIOSO · 60 FPS · unknown_identifier');
  assert.equal(translateText('СборкаНеизвестная'),'СборкаНеизвестная');
});

test('production copy has English coverage, including catalog data and template fragments',()=>{
  const missed=[];
  function check(value,file){
    for(const match of value.matchAll(/[А-Яа-яЁё]+(?:[ \t,\-—:;.!?()«»/]+[А-Яа-яЁё]+)*/gu)){
      if(/[А-Яа-яЁё]/.test(translateText(match[0])))missed.push(`${file}: ${match[0]}`);
    }
  }
  function walk(node,file){
    if(!node||typeof node!=='object')return;
    if(node.type==='Literal'&&typeof node.value==='string')check(node.value,file);
    if(node.type==='TemplateElement')check(node.value.cooked,file);
    for(const value of Object.values(node))Array.isArray(value)?value.forEach(v=>walk(v,file)):walk(value,file);
  }
  for(const file of readdirSync(new URL('../src/',import.meta.url),{recursive:true})){
    if(!file.endsWith('.js')||/review|qa-|biotech-record|cockpit-test|^i18n\//.test(file))continue;
    walk(parseAst(readFileSync(new URL(`../src/${file}`,import.meta.url),'utf8')),file);
  }
  check(readFileSync(new URL('../index.html',import.meta.url),'utf8'),'index.html');
  assert.deepEqual(missed,[]);
});

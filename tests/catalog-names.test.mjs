import test from 'node:test';
import assert from 'node:assert/strict';
import {CATALOG,BODIES} from '../src/catalog.js';
import {SETS} from '../src/systems/sets/definitions.js';
import {translateText} from '../src/i18n/index.js';

const names={
 reactor:['Электрик','Electrician'],wanderer:['Садовник','Gardener'],hunter:['Высотник','Rigger'],bastion:['Каменщик','Mason'],chimera:['Мойщик','Cleaner'],rootwalker:['Лесник','Forester'],hecaton:['Механик','Mechanic'],broodmother:['Пасечник','Beekeeper'],
 drone:['Опылитель','Pollinator'],harpoon:['Лебёдка','Winch'],pistol:['Маркер','Marker'],claws:['Скребки','Scrapers'],hammer:['Трамбовка','Compactor'],drill:['Бур','Auger'],whip:['Сучкорез','Pruner'],fangs:['Захват','Gripper'],seed:['Сеялка','Seeder'],shotgun:['Рассеиватель','Spreader'],needle:['Инъектор','Injector'],rocket:['Доставщик','Courier'],arc:['Сварочник','Welder'],acid:['Мойка','Washer'],
 spring:['Рессора','Spring'],swarmLeg:['Роевик','Swarmstep'],runner:['Скороход','Runner'],universal:['Универсал','Allrounder'],plated:['Тяжеловоз','Hauler'],root:['Корнеход','Rootwalker'],
 mirrorGland:['Отражатель','Reflector'],reflexNerve:['Сенсор','Sensor'],returnNerve:['Реверсор','Reverser'],slime:['Охладитель','Cooler'],parasite:['Инкубатор','Incubator'],commonNerve:['Синхронизатор','Synchronizer'],reverseHeart:['Насос','Pump'],regen:['Ремонтник','Mender'],shield:['Кожух','Casing'],armor:['Пластины','Plates'],repairGland:['Ремкомплект','Repair Kit'],broodNode:['Контроллер','Controller'],stabilizer:['Стабилизатор','Stabilizer'],digestion:['Компостер','Composter'],accelerator:['Ускоритель','Accelerator'],revivalCore:['Реаниматор','Reanimator'],
};

test('catalog uses the approved short civilian names in both languages',()=>{
 assert.equal(Object.keys(CATALOG).length,44);
 assert.deepEqual(Object.keys(CATALOG),Object.keys(names));
 for(const [key,[russian,english]] of Object.entries(names)){
  assert.equal(CATALOG[key].name,russian,key);
  assert.match(russian,/^[А-ЯЁ][А-Яа-яЁё-]*$/u,key);
  assert.equal(translateText(russian,'en'),english,key);
  assert.equal(translateText(russian,'ru'),russian,key);
 }
 assert.equal(new Set(Object.values(names).map(([russian])=>russian)).size,44);
});

test('every set shares its profession name with its base chassis',()=>{
 assert.deepEqual(new Set(Object.keys(SETS)),new Set(Object.keys(BODIES)));
 for(const key of Object.keys(BODIES))assert.equal(SETS[key].name,BODIES[key].name,key);
});

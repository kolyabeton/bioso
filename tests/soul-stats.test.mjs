import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun} from '../src/game.js';
import {createPart,stats} from '../src/assembly.js';
import {modifiers} from '../src/systems/abilities.js';
import {soulStatGroups,soulStatColumns} from '../src/ui/soul-stats.js';
import {loadoutDps} from '../src/ui/adapters.js';
const rows=s=>Object.fromEntries(soulStatGroups(s,stats(s)).flatMap(g=>g.rows));

test('native weapon parameters and absent bonuses do not become Soul buffs',()=>{
 const s=createRun();s.body=createPart(s,'chimera');s.arms=['pistol','needle'].map(k=>createPart(s,k,5));s.legs=[createPart(s,'runner')];s.organs=[];s.abilities.learned=[];
 const r=rows(s);
 assert.equal(r['Общий урон в сек'],Number(loadoutDps(s).toFixed(1)).toString().replace('.',','));
 assert.equal(r['Базовый крит'],'5%');assert.equal(r['Множитель крита'],'×1,5');
 for(const label of ['Базовый DPS','Интервал атаки','Размер магазина','Время перезарядки','Шанс крита','Урон крита','Бонус опыта','Шанс поджога'])assert.equal(r[label],undefined,label);
 assert.equal(r['Дальний урон'],'+10%');
});

test('global skill and item bonuses combine without weapon rank or base damage',()=>{
 const s=createRun();s.body=createPart(s,'bastion');s.organs=['accelerator','shield','regen','armor'].map(k=>createPart(s,k));s.abilities.learned=['might.0','tempo.0','ranged.1'];
 s.body.affixes=[{stat:'rate',value:.1}];
 const r=rows(s);
 assert.equal(r['Общий урон'],'+10%');assert.equal(r['Скорость атаки'],'+44,5%');assert.equal(r['Перезарядка'],'+20%');
 s.arms=['needle','pistol'].map(k=>createPart(s,k,5));
 assert.equal(rows(s)['Общий урон'],r['Общий урон']);assert.equal(rows(s)['Перезарядка'],r['Перезарядка']);
 s.organs=[];s.body.affixes=[];s.abilities.learned=['might.3'];
 assert.equal(rows(s)['Скорость атаки'],'−10%');
});

test('shared Soul critical bonuses are included in the named base values',()=>{
 const s=createRun();s.abilities.learned=['might.1'];s.abilities.levels={'might.1':1};s.abilities.minor={'minor.critPower':2};
 const r=rows(s);assert.equal(r['Базовый крит'],'10%');assert.equal(r['Множитель крита'],'×1,6');
 assert.equal(r['Шанс крита'],undefined);assert.equal(r['Урон крита'],undefined);
});

test('body stays first, contains health, and omits turn speed',()=>{
 const s=createRun();s.arms=[];s.organs=[];s.legs=[];s.abilities.learned=[];
 const columns=soulStatColumns(s,stats(s));assert.equal(columns[0].title,'Тело');assert.equal(columns[1].title,'Бой');
 assert.equal(columns[1].groups.length,1);assert.deepEqual(Object.fromEntries(columns[1].groups[0].rows),{'Базовый крит':'5%','Множитель крита':'×1,5'});
 assert.ok(columns[0].groups.flatMap(g=>g.rows).some(([label])=>label==='Здоровье'));
 assert.ok(!columns.flatMap(c=>c.groups).flatMap(g=>g.rows).some(([label])=>label==='Поворот'));
 assert.ok(columns.flatMap(c=>c.groups).every(g=>g.rows.length));
});

test('acquired effects preserve combat percentages and absent effects stay hidden',()=>{
 const s=createRun();s.abilities.learned=['fire.0','fire.1','electric.0','electric.2','electric.3'];s.abilities.levels={'fire.0':5,'fire.1':5,'electric.2':5};
 const b=modifiers(s),r=rows(s);
 assert.equal(r['Шанс поджога'],`${Number((b.burnChance*100).toFixed(1))}%`);
 assert.equal(r['Урон горения'],`${Number((20*(1+b.burnDamage)).toFixed(1))}%/с`);
 assert.equal(r['Урон разряда'],`${Number(((.4+b.electricPower)*(1+b.electricDamage)*100).toFixed(1))}%`);
 assert.equal(r['Частота разряда'],'1 / 3 атак');assert.equal(r['Шанс холода'],undefined);
});

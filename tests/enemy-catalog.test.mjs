import test from 'node:test';
import assert from 'node:assert/strict';
import {enemyCatalogEntries,enemyCatalogEntry,enemyCatalogScreen,enemyInspectorData} from '../src/ui/enemy-catalog.js';

test('enemy atlas covers ordinary, mission and boss rosters',()=>{
 assert.equal(enemyCatalogEntries.length,28);
 assert.ok(enemyCatalogEntry('enemy:shield-bearer'));
 assert.ok(enemyCatalogEntry('enemy:puppeteer'));
 assert.ok(enemyCatalogEntry('boss:mother'));
});

test('enemy atlas details expose stats, ability, equipment and hard counters',()=>{
 const screen=enemyCatalogScreen({selected:'enemy:shield-bearer'});
 assert.match(screen,/Базовые характеристики/);
 assert.match(screen,/Щит: получает на 80% меньше урона/);
 assert.match(screen,/Сварочник/);
 assert.match(screen,/урон ×0,5/);
 assert.match(screen,/На лёгком уровне штрафы отключены/);
});

test('enemy atlas uses the item inspector data shape for details',()=>{
 const model=enemyInspectorData(enemyCatalogEntry('enemy:mirrorling'));
 assert.equal(model.name,'Зеркальник');
 assert.equal(model.rows.map(row=>row.label).join(' · '),'Здоровье · Скорость · Броня');
 assert.match(model.primaryEffect,/Отражение/);
 assert.match(model.art,/data-enemy-3d/);
 assert.match(model.lines.join(' '),/Инъектор/);
});

test('enemy atlas grid keeps every entry keyboard reachable',()=>{
 const screen=enemyCatalogScreen();
 assert.equal((screen.match(/data-action="enemy-select"/g)||[]).length,28);
 assert.equal((screen.match(/data-enemy-3d-thumb/g)||[]).length,28);
 assert.match(screen,/Щитоносец/);
 assert.match(screen,/Матка/);
});

test('enemy atlas filters the roster by class',()=>{
 const armored=enemyCatalogScreen({role:'armored'});
 assert.equal((armored.match(/data-action="enemy-select"/g)||[]).length,4);
 assert.match(armored,/4 из 28 существ/);
 const bosses=enemyCatalogScreen({role:'boss'});
 assert.equal((bosses.match(/data-action="enemy-select"/g)||[]).length,5);
});

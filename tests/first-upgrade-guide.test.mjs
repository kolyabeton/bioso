import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,hurtEnemy,spawnEnemy} from '../src/game.js';
import {pickup,equip,digest,upgrade} from '../src/assembly.js';
import {firstUpgradeGuide} from '../src/ui/first-upgrade-guide.js';
test('first boss funds one real upgrade through pickup, equip and two digestions, only once',()=>{
 const s=createRun(undefined,'survival',12);s.enemies=[];
 const boss=spawnEnemy(s,'boss',{x:s.player.x,z:s.player.z});
 hurtEnemy(s,boss,1e9);const loot=s.ground.slice(0,3).map(q=>q.part);assert.equal(loot.filter(p=>p.key==='digestion').length,1);
 for(const q of [...s.ground])assert.ok(pickup(s,q.id));
 assert.match(firstUpgradeGuide(s),/Установите желудок/);
 const organ=s.inventory.find(p=>p.key==='digestion');assert.ok(equip(s,organ.id,0));
 for(const p of loot.filter(p=>p!==organ))assert.ok(digest(s,p.id));
 assert.equal(s.biomass,12);assert.equal(firstUpgradeGuide(s),'');
 assert.ok(upgrade(s,s.arms[0].id,'damage',true));assert.equal(s.biomass,0);assert.equal(firstUpgradeGuide(s),'');
 hurtEnemy(s,boss,1e9);assert.equal(s.ground.length,0);
 const next=spawnEnemy(s,'boss',{x:s.player.x,z:s.player.z});hurtEnemy(s,next,1e9);assert.equal(s.ground.filter(q=>q.part.key==='digestion').length,0);
});

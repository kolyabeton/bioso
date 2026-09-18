import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun} from '../src/game.js';
import {ranks,upgrade,upgradeLimit,weaponStats} from '../src/assembly.js';
import {itemInspectorData} from '../src/ui/item-inspector-data.js';

const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);

test('weapons accept twenty upgrades and reject the twenty-first',()=>{
 const s=createRun(),p=s.arms[0],baseDamage=weaponStats(s,p).damage;s.biomass=2000;
 assert.equal(upgradeLimit(p),20);assert.equal(itemInspectorData(s,p).maxRank,20);
 for(let i=0;i<20;i++)assert.equal(upgrade(s,p.id,'damage',true),true,`upgrade ${i+1}`);
 assert.equal(ranks(p),20);assert.equal(p.spent,1380);assert.equal(s.biomass,620);
 near(weaponStats(s,p).damage,baseDamage*3.4);
 assert.equal(itemInspectorData(s,p).preview,null);
 const before=JSON.stringify(s);assert.equal(upgrade(s,p.id,'damage',true),false);assert.equal(JSON.stringify(s),before);
});

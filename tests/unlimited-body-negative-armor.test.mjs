import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,hurtEnemy,spawnEnemy} from '../src/game.js';
import {capacity,ranks,upgrade,upgradeLimit,upgradeOptions} from '../src/assembly.js';
import {itemInspectorData} from '../src/ui/item-inspector-data.js';

const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-9,`${actual} != ${expected}`);

test('installed bodies stop after ten upgrades',()=>{
 const s=createRun(),p=s.body,start=capacity(p);
 assert.equal(upgradeLimit(p),10);
 for(let i=0;i<10;i++)assert.equal(upgrade(s,p.id,'capacity'),true);
 assert.equal(upgrade(s,p.id,'capacity'),false);
 assert.equal(ranks(p),10);assert.deepEqual(upgradeOptions(p,s),[]);assert.ok(capacity(p)>start);
 s.biomass=1e9;
 const model=itemInspectorData(s,p,'capacity');assert.equal(model.maxRank,10);assert.equal(model.preview,null);assert.equal(model.notice,'Все доступные улучшения получены');
});

test('negative enemy armor increases damage without a minus-one-hundred singularity',()=>{
 const s=createRun(),e=spawnEnemy(s,'normal',{x:0,z:2},'mass',0,{promote:false});e.hp=e.maxHp=1000;
 e.armor=-50;hurtEnemy(s,e,100);near(e.hp,850);
 e.hp=1000;e.armor=-200;hurtEnemy(s,e,100);near(e.hp,700);
});

test('stacked armor reduction and penetration stop at minus twenty percent of base armor',()=>{
 const s=createRun(),e=spawnEnemy(s,'normal',{x:0,z:2},'mass',0,{promote:false});e.hp=e.maxHp=1000;e.armor=100;
 hurtEnemy(s,e,100,1.25);near(e.hp,880);
});

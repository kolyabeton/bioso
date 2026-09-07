import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,step,spawnEnemy,hurtEnemy} from '../src/game.js';
import {createPart,stats} from '../src/assembly.js';
import {describePart} from '../src/ui/adapters.js';
import {itemInspectorData} from '../src/ui/item-inspector-data.js';
import {reloadDuration} from '../src/systems/sets-loot.js';
const fixture=()=>{const s=createRun(undefined,'survival',41);s.player={x:0,z:0};s.legs.forEach(p=>p.setId='hecaton');s.arms[0].setId='chimera';return s;};
test('enemy death creates experience orb; set radius attracts it but does not collect equipment',()=>{
 const s=fixture(),enemy=spawnEnemy(s,'normal',{x:7.5,z:0});enemy.xp=1;hurtEnemy(s,enemy,10000);assert.equal(s.xpDrops.length,1);assert.equal(s.xpDrops[0].value,1);
 assert.equal(stats(s).pickup,7);step(s,.01);assert.equal(s.xpDrops[0].x,7.5);
 s.legs[0].setId='wanderer';assert(Math.abs(stats(s).pickup-8.05)<1e-9);
 s.ground=[{id:999,x:4,z:0,part:createPart(s,'seed')}];step(s,.01);assert(s.xpDrops[0].x<7.5);assert.equal(s.ground.length,1);
 for(let i=0;i<100;i++)step(s,.02);assert.equal(s.xpDrops.length,0);assert.equal(s.xp,1);assert.equal(s.ground.length,1);
});
test('random pickup property activates only when installed and attracts actual orbs',()=>{
 const s=fixture(),p=createPart(s,'regen');p.affixes=[{stat:'pickup',value:.1}];s.inventory.push(p);assert.equal(stats(s).pickup,7);s.organs[0]=p;s.inventory=[];assert(Math.abs(stats(s).pickup-7.7)<1e-9);s.xpDrops=[{id:1,x:7.5,z:0,value:1}];step(s,.02);assert(s.xpDrops[0].x<7.5);
});
test('displayed reload and regeneration use applied affixes, sets and legs',()=>{
 const s=fixture(),p=createPart(s,'seed');p.affixes=[{stat:'reload',value:.1}];s.arms[0]=p;
 assert.equal(itemInspectorData(s,p).rows.find(r=>r.label==='Перезарядка').value,reloadDuration(s,p,1.2).toFixed(2)+' с');
 assert(describePart(s,p).lines.some(l=>l.includes(reloadDuration(s,p,1.2).toFixed(2)+' с')));
 s.organs[0]=createPart(s,'regen');s.legs[0]=createPart(s,'root');assert(describePart(s,s.organs[0]).lines.some(l=>l.includes(stats(s).regenDelay.toFixed(1)+' с')));
});

test('installed body inspector includes event-granted organ mounts',()=>{const s=fixture();s.isaac={deals:{organs:2,arms:0,hpCost:0}};assert(itemInspectorData(s,s.body).rows.find(r=>r.label==='Крепления').value.endsWith('4 органов'));});

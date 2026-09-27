import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun} from '../src/game.js';
import {createPart,autoPickup,digestionYield,digest,stats,equip,unequip,upgrade,drop,installed,upgradeOptions,upgradeLimit} from '../src/assembly.js';
import {reverseStomachHealth,recycleRarities,setRecycleRarity} from '../src/systems/reverse-stomach.js';
import {itemInspectorData} from '../src/ui/item-inspector-data.js';
import {generateLoot} from '../src/systems/sets-loot.js';
const setup=()=>{const s=createRun();s.organs=[createPart(s,'reverseStomach'),createPart(s,'digestion')];s.hp=stats(s).hp;return s;};
const ground=(s,rarity='common',x=0,y=0)=>{const p=createPart(s,'claws');p.rarity=rarity;p.lootSource='normal';s.ground.push({id:++s.entityId,part:p,x,y,z:0});return p;};
test('reverse stomach ranks, upgrades and copies add exact half HP and preserve wounds',()=>{
 const s=createRun(),base=stats(s).hp,p=createPart(s,'reverseStomach',3);s.hp=base-1;s.inventory.push(p);
 assert.equal(reverseStomachHealth(p),2);assert(equip(s,p.id,0));assert.equal(stats(s).hp,base+50);assert.equal(s.hp,base+49);
 assert.deepEqual(upgradeOptions(p,s),['stomachHealth']);assert.equal(upgradeLimit(p),10);
 for(let i=0;i<10;i++)assert(upgrade(s,p.id,'stomachHealth'));
 assert.equal(stats(s).hp,base+175);assert.equal(s.hp,base+174);assert.equal(upgrade(s,p.id,'stomachHealth'),false);
 const info=itemInspectorData(s,p);assert.equal(info.rows.find(r=>r.label==='Здоровье детали').value,'+175 HP');assert.doesNotMatch(info.rows.find(r=>r.label==='Эффект').value,/HP/);
 assert(unequip(s,'organs',0));assert.equal(stats(s).hp,base);assert.equal(s.hp,base-1);
 assert(equip(s,p.id,0));const q=createPart(s,'reverseStomach',5);s.inventory.push(q);assert(equip(s,q.id,1));assert.equal(stats(s).hp,base+250);
});
test('defaults, empty selection, all including legendary and per-instance persistence',()=>{
 const s=setup(),p=s.organs[0];assert.deepEqual(recycleRarities(p),['common']);
 assert(setRecycleRarity(p,'all',true));assert.deepEqual(recycleRarities(p),['common','uncommon','rare','relic']);
 setRecycleRarity(p,'common',false);assert.deepEqual(recycleRarities(p),['uncommon','rare','relic']);
 assert(unequip(s,'organs',0));assert(equip(s,p.id,0));assert.deepEqual(recycleRarities(p),['uncommon','rare','relic']);
 setRecycleRarity(p,'all',false);assert.deepEqual(recycleRarities(p),[]);
 ground(s);assert.equal(autoPickup(s).length,1);assert.equal(s.biomass,0);
});
test('automation requires both installed organs and keeps normal pickup otherwise',()=>{
 for(const keys of [['reverseStomach'],['digestion'],[]]){const s=createRun();s.organs=keys.map(k=>createPart(s,k));ground(s);assert.equal(autoPickup(s).length,1);assert.equal(s.biomass,0);}
 const s=createRun();s.inventory.push(createPart(s,'reverseStomach'));s.organs=[createPart(s,'digestion')];ground(s);assert.equal(autoPickup(s).length,1);
});
test('each rarity uses the exact manual payout, refunds and bonuses without healing or duplication',()=>{
 for(const rarity of ['common','uncommon','rare','relic']){
  const s=setup();s.organs[1].tier=4;s.organs[1].upgrades.power=2;setRecycleRarity(s.organs[0],'all',true);s.hp-=1;
  const p=ground(s,rarity);p.tier=3;p.spent=30;s.inventory.push(p);const quote=digestionYield(s,p.id);s.inventory=[];
  const hp=s.hp;assert.deepEqual(autoPickup(s),[]);assert.equal(s.biomass,quote);assert.equal(s.hp,hp);assert.equal(s.ground.length,0);
  assert.equal(installed(s).some(q=>q.id===p.id),false);assert.equal(s.achievementCounters.recycled,1);assert.equal(s.profile.meta.survivalAchievements.recycled,1);
  assert.equal(p.lootRecorded,true);const sequence=s.lootState.receivedSequence;
  autoPickup(s);assert.equal(s.biomass,quote);assert.equal(s.lootState.receivedSequence,sequence);assert.equal(s.achievementCounters.recycled,1);assert.equal(digest(s,p.id),false);
 }
});
test('filters unite across installed copies and nonmatching loot is picked up',()=>{
 const s=setup(),p=createPart(s,'reverseStomach');setRecycleRarity(p,'all',false);setRecycleRarity(p,'rare',true);s.organs.push(p);
 ground(s);ground(s,'rare');const spare=ground(s,'uncommon');assert.deepEqual(autoPickup(s),[spare]);assert.equal(s.achievementCounters.recycled,2);
});
test('radius, surface reach and discarded part cooldown protect ground loot',()=>{
 const s=setup();ground(s,'common',3);ground(s,'common',4);ground(s,'common',0,10);autoPickup(s);assert.equal(s.ground.length,2);assert.equal(s.achievementCounters.recycled,1);
 s.ground=[];const p=createPart(s,'claws');s.inventory.push(p);assert(drop(s,p.id));const before=s.biomass;
 autoPickup(s);assert.equal(s.ground.length,1);assert.equal(s.biomass,before);
 s.player.x=s.ground[0].x+4;autoPickup(s);assert.equal(s.ground.length,1);s.player.x=0;autoPickup(s);assert.equal(s.ground.length,0);assert(s.biomass>before);
});
test('lore is discovered normally, never recycled',()=>{
 const s=setup();s.ground=[{id:++s.entityId,x:0,y:0,z:0,lore:{id:'stomach-test'}}];autoPickup(s);assert.equal(s.biomass,0);assert.equal(s.ground.length,0);assert.equal(s.storyEvidence[0].id,'stomach-test');
});
test('reverse stomach is available to normal organ loot before discovery',()=>{
 const s=createRun();s.profile.unlocked=[];s.rng=()=>.99999;
 const p=generateLoot(s,createPart,1,'normal','common',false,[],'organ');assert.equal(p.key,'reverseStomach');
});

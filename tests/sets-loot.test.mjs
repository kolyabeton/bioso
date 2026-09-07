import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,step} from '../src/game.js';
import {createPart,stats,weaponStats,weight,pickup} from '../src/assembly.js';
import {seededRandom} from '../src/simulation.js';
import {SETS,LOOT_RULES,normalDrop,rollRarity,recordReward,generateLoot,queueBossReward,chooseBossReward,setCounts,setBonuses,partMeta,hitSetMultiplier,reloadDuration} from '../src/systems/sets-loot.js';
const set=(s,id)=>{for(const p of [s.body,...s.arms,...s.legs,...s.organs].filter(Boolean))p.setId=id;};
test('80th normal kill and eighth received reward guarantees are independent',()=>{
 const s=createRun();s.rng=()=>.5;for(let i=0;i<79;i++)assert.equal(normalDrop(s),false);assert.equal(normalDrop(s),true);assert.equal(s.lootState.normalMisses,0);
 const p=createPart(s,'seed');for(let i=0;i<7;i++)recordReward(s,p);assert.equal(rollRarity(s),'rare');recordReward(s,{...p,rarity:'rare'});assert.equal(rollRarity(s),'common');
});
test('quality probability rows sum to100; relic gate and fifth boss pity',()=>{
 for(const w of Object.values(LOOT_RULES.weights))assert.equal(w.reduce((a,b)=>a+b),100);
 const s=createRun();s.rng=()=>.9999;assert.equal(rollRarity(s),'rare');s.time=480;assert.equal(rollRarity(s),'relic');s.rng=()=>0;
 for(let i=0;i<4;i++)recordReward(s,{...createPart(s,'seed'),rarity:'rare'},'boss');assert.equal(rollRarity(s,'boss'),'relic');recordReward(s,{...createPart(s,'commonNerve'),rarity:'relic'});assert.equal(s.lootState.bossMisses,0);
});
test('boss offers share quality, block simulation and award exactly one; no replay',()=>{
 const s=createRun();s.time=480;queueBossReward(s,createPart,2);assert.equal(s.bossRewards[0].options.length,3);assert.equal(new Set(s.bossRewards[0].options.map(p=>p.rarity)).size,1);
 const before=s.time;step(s,.02);assert.equal(s.time,before);assert.equal(chooseBossReward(s,-1),false);assert(chooseBossReward(s,1));assert.equal(s.inventory.length,1);assert.equal(s.bossRewards.length,0);assert.equal(chooseBossReward(s,1),false);
});
test('set bonuses count categories, not duplicate limbs; remove category disables bonus',()=>{
 const s=createRun();s.arms=[];s.organs=[];s.legs=Array.from({length:4},()=>createPart(s,'universal'));set(s,'hecaton');assert.equal(setCounts(s).hecaton,2);assert.equal(setBonuses(s).reload,.08);s.body=null;assert.equal(setCounts(s).hecaton,1);assert.equal(setBonuses(s).reload,0);
});
test('legacy parts keep rank and modifier; generated affixes have one stat; weight is real',()=>{
 const s=createRun(),old={...createPart(s,'seed'),modifier:'light'};delete old.rarity;delete old.setId;assert.equal(partMeta(old).rarity,'common');assert.equal(weight(old),8);
 for(const rarity of ['common','uncommon','rare','relic']){const p=generateLoot(s,createPart,3,'elite',rarity,false);assert.equal(p.tier,3);assert.equal(p.modifier,null);assert.equal(p.affixes.length,({common:0,uncommon:1,rare:1,relic:2})[rarity]);}
});
test('active set and affix effects reach weight, range, reload and healing settings',()=>{
 const s=createRun();s.arms=[createPart(s,'seed')];s.organs=[createPart(s,'shield')];set(s,'bastion');assert.equal(setBonuses(s).shieldDelay,10.8);
 set(s,'hunter');assert.equal(weaponStats(s,s.arms[0]).range,9*1.1);set(s,'rootwalker');assert.equal(setBonuses(s).regenDelay,10);
 set(s,'wanderer');s.abilities.moving=3;s.arms[0].affix={stat:'reload',value:.08};assert.ok(Math.abs(reloadDuration(s,s.arms[0],1.2)-1.2/1.18)<1e-12);assert.equal(stats(s).pickup,7*1.15);
});
test('direct hit bonuses obey cooldown, range and secondary exclusion',()=>{
 const s=createRun();s.organs=[createPart(s,'shield')];set(s,'chimera');s.time=4;const e={x:10,z:0};assert.equal(hitSetMultiplier(s,e,{mode:'sector',partId:1}),1);assert.equal(hitSetMultiplier(s,e,{mode:'projectile',partId:2}),1.12);assert.equal(hitSetMultiplier(s,e,{mode:'sector',partId:1}),1);assert.equal(hitSetMultiplier(s,e,{mode:'projectile',secondary:'echo'}),1);
 set(s,'hecaton');s.time=7;assert.equal(hitSetMultiplier(s,e,{mode:'projectile',partId:1}),1);assert.equal(hitSetMultiplier(s,e,{mode:'projectile',partId:2}),1);assert.equal(hitSetMultiplier(s,e,{mode:'projectile',partId:3}),1.12);
});
test('ground reward advances quality counter only once when received',()=>{
 const s=createRun();s.player={x:0,z:0};const p=createPart(s,'seed');p.lootSource='normal';s.ground=[{id:42,x:0,z:0,part:p}];assert(pickup(s,42));assert.equal(s.lootState.qualityMisses,1);assert(!pickup(s,42));assert.equal(s.lootState.qualityMisses,1);
});
test('10000 normal-drop intervals match truncated-geometric expectation',()=>{
 const s={rng:seededRandom(20260907)},count=10000;let kills=0;for(let i=0;i<count;i++){do{kills++;}while(!normalDrop(s));}
 const expected=(1-.985**80)/.015;assert.ok(Math.abs(kills/count-expected)<.8,`${kills/count} versus ${expected}`);
});
test('fifth exact duplicate prefers another available type and metadata survives cloning',()=>{
 const s=createRun();const p=createPart(s,'seed');s.inventory.push(p);for(let i=0;i<4;i++)recordReward(s,{...p,id:900+i});assert.equal(s.lootState.duplicates,4);s.rng=()=>0;
 const q=generateLoot(s,createPart,2,'normal','common',false);assert.ok(![...s.inventory,s.body,...s.arms,...s.legs].filter(Boolean).some(p=>p.key===q.key));
 const copy=structuredClone(q);assert.equal(copy.setId,q.setId);assert.equal(copy.rarity,q.rarity);assert.equal(copy.visualId,q.visualId);
});

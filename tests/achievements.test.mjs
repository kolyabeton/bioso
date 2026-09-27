import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,step} from '../src/game.js';
import {newProfile,createPart,digest,readProfile} from '../src/assembly.js';
import {awardMeta} from '../src/systems/meta-progression.js';
import {learn} from '../src/systems/abilities.js';
import {ACHIEVEMENTS,NEW_ACHIEVEMENTS,SURVIVAL_ACHIEVEMENTS,achievementArt,achievementById,achievementDone,achievementProgress,trackAchievements,journal,normalizeJournal,earnedThisRun} from '../src/systems/achievements.js';
import {translateText} from '../src/i18n/index.js';
import {existsSync} from 'node:fs';
const run=p=>createRun(p||newProfile(),'survival',42);
const has=(s,id)=>s.profile.achievements.includes('feat:'+id);
test('94 distinct cards retain the original goals and add four all-mode chassis rewards',()=>{
 assert.equal(ACHIEVEMENTS.length,94);assert.equal(NEW_ACHIEVEMENTS.length,12);assert.equal(SURVIVAL_ACHIEVEMENTS.length,50);assert.equal(new Set(ACHIEVEMENTS.map(a=>a.id)).size,94);
 assert.equal(achievementById('meta:mirror').id,'mission:nursery');const p=newProfile();p.achievements.push('meta:mirror');assert.ok(achievementDone(p,achievementById('mission:nursery')));
});
test('pioneer never combines separate runs or counts duplicate events and secrets',()=>{
 const s=run();s.world.tiles=['forest','gardens','city','scrapyard'].map((biome,i)=>({id:i,biome}));s.exploration={visited:new Set([0,1,2,3])};
 s.encounters={nodes:[{type:'infection',state:'reward'},{type:'infection',state:'complete'},{type:'slab',state:'complete'}]};trackAchievements(s);awardMeta(s,createPart);assert.ok(!s.profile.achievements.includes('meta:spring'));
 assert.deepEqual(achievementProgress(s,s.profile,achievementById('meta:spring')),[4,1]);
 const next=run(s.profile);next.world.tiles=[];next.encounters={nodes:[{type:'infection',state:'reward'},{type:'sealed',state:'reward'}]};trackAchievements(next);awardMeta(next,createPart);assert.ok(!next.profile.achievements.includes('meta:spring'));assert.deepEqual(journal(next.profile).best['meta:spring'],[4,1]);
 s.encounters.nodes.push({type:'sealed',state:'reward'});awardMeta(s,createPart);assert.ok(s.profile.achievements.includes('meta:spring'));
});
test('exactly one token is awarded across save/load and subsequent runs',()=>{
 const s=run();s.encounters={nodes:[{type:'infection',state:'reward'}]};trackAchievements(s);assert.ok(has(s,'infection'));assert.equal(s.profile.meta.rerolls,1);trackAchievements(s);assert.equal(s.profile.meta.rerolls,1);
 assert.match(journal(s.profile).dates['feat:infection'],/^\d{4}-\d{2}-\d{2}$/);assert.equal(earnedThisRun(s).length,1);
 const p=readProfile({getItem:()=>JSON.stringify(s.profile)}),next=run(p);next.encounters=s.encounters;trackAchievements(next);assert.equal(p.meta.rerolls,1);assert.equal(earnedThisRun(next).length,0);
});
test('secrets accumulate unique opened types across runs, not discovery alone',()=>{
 const s=run();s.encounters={nodes:[{type:'membrane',state:'ready',discovered:true},{type:'slab',state:'reward'}]};trackAchievements(s);assert.deepEqual(journal(s.profile).secrets,['slab']);
 const next=run(s.profile);next.encounters={nodes:[{type:'membrane',state:'reward'},{type:'nursery',state:'complete'},{type:'slab',state:'complete'}]};trackAchievements(next);assert.ok(has(next,'secrets'));assert.equal(journal(s.profile).secrets.length,3);
});
test('failed/skipped mission events never award; successful history survives retired nodes',()=>{
 const s=run();s.mission={eventHistory:[{type:'hunt',outcome:'failed'},{type:'sealed',outcome:'skipped'},{type:'infection',outcome:'victory'},{type:'altar_speed',outcome:'sacrifice'}]};s.encounters={nodes:[]};trackAchievements(s);assert.ok(!has(s,'hunt'));assert.ok(!has(s,'sealed'));assert.ok(has(s,'infection'));assert.ok(has(s,'contract'));
});
test('recycling counts successful digestion once and starts fresh each run',()=>{
 const s=run();s.organs[0]=createPart(s,'digestion');assert.equal(digest(s,-1),false);
 for(let i=0;i<10;i++){const p=createPart(s,'claws');s.inventory.push(p);assert.ok(digest(s,p.id)>0);assert.equal(digest(s,p.id),false);}
 trackAchievements(s);assert.ok(has(s,'recycle'));assert.equal(s.achievementCounters.recycled,10);assert.equal(run(s.profile).achievementCounters,undefined);
});
test('set requires three categories and includes Reactor; mutation families persist',()=>{
 const s=run();for(const p of [s.body,...s.arms,...s.legs].filter(Boolean))p.setId='reactor';trackAchievements(s);assert.ok(has(s,'set'));
 s.body.setId=s.arms[0].setId=s.legs[0].setId='wanderer';trackAchievements(s);assert.ok(has(s,'set'));
 for(const keys of [['rocket','fangs','parasite'],['arc','shield','stabilizer'],['acid','slime','regen']]){s.arms=keys.map(key=>createPart(s,key));s.legs=[];s.organs=[];trackAchievements(s);}
 assert.ok(has(s,'mutation'));assert.ok(has(s,'natures'));assert.equal(journal(s.profile).mutations.length,3);
});
test('final branches, synergy and per-part upgrades require actual thresholds',()=>{
 const s=run();learn(s,'fire.0');s.arms[0].upgrades.damage=9;trackAchievements(s);assert.ok(!has(s,'evolution'));assert.ok(!has(s,'synergy'));assert.ok(!has(s,'upgrade'));
 learn(s,'fire.3');learn(s,'plasma');s.arms[0].upgrades.damage=10;trackAchievements(s);assert.ok(has(s,'evolution'));assert.ok(has(s,'synergy'));assert.ok(has(s,'upgrade'));
});
test('legacy completions gain no fabricated dates or repeated rewards',()=>{
 const p=newProfile();p.achievements.push('elite1','feat:infection');const s=run(p);trackAchievements(s);assert.equal(journal(p).dates.elite1,undefined);assert.equal(journal(p).dates['feat:infection'],undefined);assert.equal(p.meta.rerolls,0);assert.equal(earnedThisRun(s).length,0);
 assert.deepEqual(normalizeJournal({best:{garbage:[99]},secrets:['slab','slab','bad'],mutations:['hive','bad'],dates:{garbage:'2026-01-01'}}),{best:{},secrets:['slab'],mutations:['hive'],dates:{}});
});
test('malformed saved progress cannot overflow conditions or crash tracking',()=>{
 const p=newProfile();p.meta.journal={best:{'feat:infection':[999,999],'meta:spring':[-1,'bad',100]},secrets:null,mutations:42};
 const restored=readProfile({getItem:()=>JSON.stringify(p)});assert.deepEqual(journal(restored).best['feat:infection'],[1]);assert.deepEqual(journal(restored).best['meta:spring'],[0,0]);assert.doesNotThrow(()=>trackAchievements(run(restored)));
});
test('the game simulation awards a learned final branch without an explicit tracker call',()=>{
 const s=run();learn(s,'fire.3');step(s,.01,{x:0,z:0});assert.ok(has(s,'evolution'));assert.ok(s.events.some(e=>e.type==='unlock'&&e.text.includes('Завершённая эволюция')));
});
test('every achievement has authored art or an explicit reuse mapping and translated copy',()=>{
 for(const a of ACHIEVEMENTS){assert.ok(existsSync('public'+achievementArt(a)),a.id);for(const text of [a.name,a.description,a.lore,...a.conditions.map(c=>c.label)])assert.doesNotMatch(translateText(text,'en'),/[А-Яа-яЁё]/u,`${a.id}: ${text}`);}
});

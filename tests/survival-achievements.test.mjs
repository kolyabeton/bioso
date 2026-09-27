import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,spawnEnemy,hurtEnemy,step,addXP} from '../src/game.js';
import {newProfile,readProfile,createPart,digest} from '../src/assembly.js';
import {CATALOG,partAvailable,SURVIVAL_UNLOCKS,WEAPON_UNLOCKS} from '../src/catalog.js';
import {ACHIEVEMENTS,SURVIVAL_ACHIEVEMENTS,achievementById,achievementProgress,trackAchievements} from '../src/systems/achievements.js';
import {survivalProgress,normalizeSurvivalProgress,recordSurvivalKill} from '../src/systems/survival-achievement-progress.js';
import {SURVIVAL_ITEM_ACHIEVEMENTS} from '../src/systems/survival-unlock-rules.js';
import {SETS} from '../src/systems/sets/definitions.js';
import {FAMILIES} from '../src/systems/sets/mutations.js';
import {xpRequired} from '../src/systems/balance.js';
import {generateLoot,queueBossReward,chooseBossReward} from '../src/systems/sets/loot.js';
import {prepareEncounters,encounterDiscoverableKeys,claimEncounter} from '../src/systems/encounters.js';
import {unlockCondition} from '../src/ui/adapters.js';
const run=(p=newProfile(),mode='survival')=>createRun(p,mode,123);
const saved=p=>readProfile({getItem:()=>JSON.stringify(p)});
const has=(s,id)=>s.profile.achievements.includes('survival:'+id);
const progress=(s,id)=>achievementProgress(s,s.profile,achievementById('survival:'+id));
function set(s,id,{four=false}={}){
 s.body=createPart(s,'wanderer');s.arms=[createPart(s,'pistol')];s.legs=[createPart(s,'universal')];s.organs=four?[createPart(s,'stabilizer')]:[];
 for(const p of [s.body,...s.arms,...s.legs,...s.organs])p.setId=id;
}
function kill(s,kind='normal',source='direct',opts={}){
 const e=spawnEnemy(s,'normal',{x:0,z:5},'mass',0,{promote:false});Object.assign(e,{kind},opts);hurtEnemy(s,e,1e8,0,source,false,'pistol');return e;
}
test('catalog adds exactly 50 goals with four unique item owners and 46 tokens; old thresholds stay intact',()=>{
 assert.equal(ACHIEVEMENTS.length,94);assert.equal(SURVIVAL_ACHIEVEMENTS.length,50);
 assert.equal(new Set(ACHIEVEMENTS.map(a=>a.id)).size,94);
 assert.equal(SURVIVAL_ACHIEVEMENTS.filter(a=>a.reward.tokens===1).length,46);
 assert.deepEqual(Object.fromEntries(SURVIVAL_ACHIEVEMENTS.flatMap(a=>(a.reward.keys||[]).map(k=>[k,a.id]))),{reverseHeart:'survival:level-30',returnNerve:'survival:set-kills-hunter',commonNerve:'survival:set-bosses-hecaton',reflexNerve:'survival:mature-build'});
 assert.deepEqual(WEAPON_UNLOCKS.filter(a=>a.key!=='shieldArm').map(a=>a.goal),[30,60]);assert.equal(SURVIVAL_UNLOCKS.length,14);
 for(const a of SURVIVAL_ACHIEVEMENTS)assert.equal(a.mode,'survival');
});
test('level 20 counts once per run, survives defeat and save/load, and never counts missions',()=>{
 let s=run();s.level=19;trackAchievements(s);assert.equal(survivalProgress(s.profile).level20Runs,0);
 s.level=20;addXP(s,0);trackAchievements(s);trackAchievements(s);assert.equal(survivalProgress(s.profile).level20Runs,1);
 s.dead=true;trackAchievements(s);assert.equal(survivalProgress(s.profile).level20Runs,1);
 s=run(saved(s.profile),'garden');s.level=30;trackAchievements(s);assert.equal(survivalProgress(s.profile).level20Runs,1);assert.ok(!has(s,'level-30'));
 for(let i=0;i<2;i++){s=run(saved(s.profile));s.level=20;trackAchievements(s);}
 assert.ok(has(s,'level20-runs-3'));assert.equal(survivalProgress(s.profile).level20Runs,3);
});
test('kill integration excludes duplicate death, components, objectives, rewardless children and scenery',()=>{
 const s=run();set(s,'hunter');const e=kill(s);hurtEnemy(s,e,1e8);kill(s,'elite','burn');
 for(const opts of [{bossOwner:999},{noRewards:true}])kill(s,'normal','direct',opts);
 kill(s,'objective');kill(s,'normal','environment');
 assert.equal(survivalProgress(s.profile).kills,2);assert.equal(survivalProgress(s.profile).elites,1);assert.equal(survivalProgress(s.profile).setKills.hunter,2);
 const m=run(s.profile,'garden');kill(m);assert.equal(survivalProgress(m.profile).kills,2);
});
test('full set counts categories, snapshots kills on death, and set boss records never combine runs',()=>{
 let s=run();set(s,'hunter');s.legs=[];s.arms.push(createPart(s,'pistol'));s.arms[1].setId='hunter';kill(s);
 assert.equal(survivalProgress(s.profile).setKills.hunter,0);
 set(s,'hunter');kill(s,'boss');kill(s,'boss');trackAchievements(s);assert.deepEqual(progress(s,'set-bosses-hunter'),[2]);
 set(s,'wanderer');kill(s,'boss');assert.deepEqual(progress(s,'set-bosses-hunter'),[2]);
 s=run(saved(s.profile));set(s,'hunter');kill(s,'boss');trackAchievements(s);assert.ok(!has(s,'set-bosses-hunter'));
 kill(s,'boss');kill(s,'boss');trackAchievements(s);assert.ok(has(s,'set-bosses-hunter'));
});
test('multiple full sets and mutations all receive their applicable kill without duplicating the global count',()=>{
 const s=run();s.body=createPart(s,'wanderer');s.body.setId='hunter';
 s.arms=['rocket','fangs','arc'].map(k=>createPart(s,k));s.legs=[createPart(s,'universal')];s.organs=['parasite','shield','stabilizer'].map(k=>createPart(s,k));
 s.arms[0].setId=s.organs[0].setId='hunter';s.arms[1].setId=s.arms[2].setId=s.legs[0].setId=s.organs[1].setId=s.organs[2].setId='hecaton';
 kill(s,'boss');const p=survivalProgress(s.profile);
 assert.equal(p.kills,1);assert.equal(p.bosses,1);assert.equal(p.setKills.hunter,1);assert.equal(p.setKills.hecaton,1);
 assert.equal(p.mutationKills.hive,1);assert.equal(p.mutationKills.conductor,1);assert.equal(p.mutationBosses.hive,1);assert.equal(p.mutationBosses.conductor,1);
});
test('state goals require simultaneous conditions, and only equipped categories count',()=>{
 const s=run();set(s,'hunter');s.level=19;trackAchievements(s);assert.ok(!has(s,'mature-build'));
 s.level=20;trackAchievements(s);assert.ok(has(s,'mature-build'));assert.ok(!has(s,'four-categories'));
 const organ=createPart(s,'stabilizer');organ.setId='hunter';s.inventory.push(organ);trackAchievements(s);assert.ok(!has(s,'four-categories'));
 s.organs=[s.inventory.pop()];trackAchievements(s);assert.ok(has(s,'four-categories'));
 s.arms=['rocket','fangs'].map(k=>createPart(s,k));s.organs=[createPart(s,'parasite')];for(const p of [s.body,...s.arms,...s.legs,...s.organs])p.setId='hunter';
 trackAchievements(s);assert.ok(has(s,'set-mutation'));
});
test('item thresholds issue one ground reward with existing rarity and survive save recovery',()=>{
 let s=run();set(s,'hunter');const p=survivalProgress(s.profile);p.setKills.hunter=499;trackAchievements(s);assert.ok(!s.profile.unlocked.includes('returnNerve'));
 kill(s);trackAchievements(s);assert.ok(has(s,'set-kills-hunter'));assert.equal(s.ground.filter(q=>q.part.key==='returnNerve').length,1);
 s.level=29;trackAchievements(s);assert.ok(!s.profile.unlocked.includes('reverseHeart'));s.level=30;trackAchievements(s);
 const heart=s.ground.find(q=>q.part.key==='reverseHeart').part,sensor=s.ground.find(q=>q.part.key==='reflexNerve').part;
 assert.equal(heart.rarity,'relic');assert.equal(heart.affixes.length,3);assert.equal(sensor.rarity,'common');assert.equal(sensor.affixes.length,0);
 const tokens=s.profile.meta.rerolls;trackAchievements(s);assert.equal(s.profile.meta.rerolls,tokens);assert.equal(s.ground.filter(q=>q.part.key==='reverseHeart').length,1);
 const restored=saved(s.profile);restored.unlocked=restored.unlocked.filter(k=>k!=='reverseHeart');assert.ok(saved(restored).unlocked.includes('reverseHeart'));
 s=run(saved(s.profile));s.level=30;trackAchievements(s);assert.equal(s.ground.filter(q=>q.part.key==='reverseHeart').length,0);
});
test('level rewards arrive with XP immediately and new reward tracking does not consume combat randomness',()=>{
 const s=run();s.level=29;s.xp=xpRequired(29)-1;addXP(s,1);
 assert.equal(s.level,30);assert.ok(has(s,'level-30'));assert.ok(s.ground.some(q=>q.part.key==='reverseHeart'));
 const other=run();set(other,'hunter');other.level=30;other.rng=()=>assert.fail('achievement rewards must not consume combat RNG');
 trackAchievements(other);assert.ok(has(other,'mature-build'));assert.ok(has(other,'level-30'));
});
test('new gates apply to normal, elite, legendary, boss choices and secret/event discovery',()=>{
 const s=run(),keys=Object.keys(SURVIVAL_ITEM_ACHIEVEMENTS);s.time=900;
 for(const source of ['normal','elite','boss'])for(const rarity of ['common','uncommon','rare','relic'])for(let i=0;i<80;i++)assert.ok(!keys.includes(generateLoot(s,createPart,3,source,rarity).key));
 for(let i=0;i<40;i++){queueBossReward(s,createPart,3);assert.ok(s.bossRewards[0].options.every(p=>!keys.includes(p.key)));chooseBossReward(s,0);}
 assert.ok(encounterDiscoverableKeys(s.profile).every(k=>!keys.includes(k)));
 prepareEncounters(s);for(const n of s.encounters.nodes)for(const key of n.rewards)assert.ok(key&&CATALOG[key]&&!keys.includes(key));
 const n={id:'gate-test',type:'slab',state:'reward',x:s.player.x,y:0,z:s.player.z,rewards:['reflexNerve']};s.encounters.nodes.push(n);assert.equal(claimEncounter(s,n.id,0),false);
 s.profile.unlocked.push(...keys);assert.ok(keys.every(k=>partAvailable(s.profile,k)&&encounterDiscoverableKeys(s.profile).includes(k)));
 assert.equal(claimEncounter(s,n.id,0),true);
 const seen=new Set();for(let i=0;i<3000;i++)seen.add(generateLoot(s,createPart,3,'boss','relic',false).key);assert.ok(keys.every(k=>seen.has(k)));
 for(const key of keys)assert.equal(unlockCondition(key),achievementById(SURVIVAL_ITEM_ACHIEVEMENTS[key]).description);
});
test('recycling records only successful survival digestions and persists after defeat',()=>{
 const s=run();s.organs=[createPart(s,'digestion')];assert.equal(digest(s,-1),false);
 const part=createPart(s,'claws');s.inventory.push(part);digest(s,part.id);assert.equal(digest(s,part.id),false);assert.equal(survivalProgress(s.profile).recycled,1);
 const m=run(saved(s.profile),'garden');m.organs=[createPart(m,'digestion')];const p=createPart(m,'claws');m.inventory.push(p);digest(m,p.id);assert.equal(survivalProgress(m.profile).recycled,1);
});
test('legacy unlocks survive, corrupt counters cannot award goals, and mission screens show stored lifetime progress',()=>{
 const p=newProfile();p.unlocked.push(...Object.keys(SURVIVAL_ITEM_ACHIEVEMENTS));p.meta.survivalAchievements={kills:-1,bosses:'100',elites:Infinity,sets:['hunter','hunter','invalid'],setKills:{hunter:NaN,invalid:10000}};
 const restored=saved(p),data=survivalProgress(restored);assert.equal(data.kills,0);assert.equal(data.bosses,0);assert.equal(data.elites,0);assert.deepEqual(data.sets,['hunter']);assert.equal(data.setKills.hunter,0);
 assert.ok(Object.keys(SURVIVAL_ITEM_ACHIEVEMENTS).every(k=>partAvailable(restored,k)));assert.equal(data.level20Runs,0);
 data.kills=9999;const m=run(restored,'garden');assert.deepEqual(progress(m,'kills-10000'),[9999]);trackAchievements(m);assert.equal(data.kills,9999);
 assert.doesNotThrow(()=>normalizeSurvivalProgress(null));
});
test('all 50 are reachable through simulated progress; master excludes itself and awards once',()=>{
 // Functional route through counters, not a pacing or real-player playtest.
 let p=newProfile(),s;
 for(let i=0;i<20;i++){s=run(p);s.level=30;trackAchievements(s);p=saved(s.profile);}
 s=run(p);s.level=30;
 for(const id of Object.keys(SETS)){set(s,id,{four:true});trackAchievements(s);for(let i=0;i<500;i++)recordSurvivalKill(s,{kind:i<3?'boss':'normal'},'direct');trackAchievements(s);}
 for(const [id,m] of Object.entries(FAMILIES)){s.arms=m.keys.slice(0,3).map(k=>createPart(s,k));s.organs=[];for(const part of [s.body,...s.arms,...s.legs])part.setId='hunter';trackAchievements(s);for(let i=0;i<500;i++)recordSurvivalKill(s,{kind:i<3?'boss':'normal'},'direct');trackAchievements(s);}
 const data=survivalProgress(s.profile);while(data.bosses<100)recordSurvivalKill(s,{kind:'boss'},'direct');while(data.elites<500)recordSurvivalKill(s,{kind:'elite'},'direct');while(data.kills<20000)recordSurvivalKill(s,{kind:'normal'},'direct');
 s.organs=[createPart(s,'digestion')];for(let i=0;i<249;i++){const part=createPart(s,'claws');s.inventory.push(part);digest(s,part.id);}trackAchievements(s);assert.ok(!has(s,'master'));
 const last=createPart(s,'claws');s.inventory.push(last);digest(s,last.id);trackAchievements(s);
 assert.equal(SURVIVAL_ACHIEVEMENTS.filter(a=>s.profile.achievements.includes(a.id)).length,50);
 assert.ok(has(s,'master'));assert.ok(Object.keys(SURVIVAL_ITEM_ACHIEVEMENTS).every(k=>s.profile.unlocked.includes(k)));
 const tokens=s.profile.meta.rerolls;trackAchievements(s);assert.equal(s.profile.meta.rerolls,tokens);
 const restored=run(saved(s.profile));trackAchievements(restored);assert.equal(restored.profile.meta.rerolls,tokens);
});

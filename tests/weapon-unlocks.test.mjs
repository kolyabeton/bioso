import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,spawnEnemy,hurtEnemy,attack,step,randomLoot} from '../src/game.js';
import {newProfile,readProfile,createPart} from '../src/assembly.js';
import {validLoadout,starterAllowed,START_WEAPONS} from '../src/systems/meta-progression.js';
import {achievementById,achievementProgress,trackAchievements} from '../src/systems/achievements.js';
import {unlockCondition} from '../src/ui/adapters.js';
const run=p=>createRun(p,'survival',123);
function kill(s,key='pistol',source='direct',options={}){const e=spawnEnemy(s,'normal',{x:0,z:5},'mass',0,{promote:false});Object.assign(e,options);hurtEnemy(s,e,1e8,0,source,false,key);return e;}
const saved=p=>readProfile({getItem:()=>JSON.stringify(p)});
test('preparation includes gated candidates but only unlocked weapons are selectable',()=>{
 const s=run();assert.deepEqual(START_WEAPONS,['pistol','claws','shotgun']);
 for(const key of ['pistol','claws']){assert.equal(s.profile.unlocked.includes(key),true);assert.equal(starterAllowed(s.profile,key),true);assert.equal(validLoadout(s.profile,{arm:key}).arm,key);}
 for(const key of ['shotgun','seed']){assert.equal(s.profile.unlocked.includes(key),false);assert.equal(starterAllowed(s.profile,key),false);assert.equal(validLoadout(s.profile,{arm:key}).arm,'pistol');assert.match(unlockCondition(key),/между забегами/);}
 for(let i=0;i<300;i++)assert.ok(!['shotgun','seed'].includes(randomLoot(s,i%2?'boss':'elite').key));
});
test('pistol kill threshold carries between runs, unlocks the shotgun once and is recoverable from the achievement',()=>{
 const s=run();for(let i=0;i<29;i++)kill(s);assert.equal(s.profile.unlocked.includes('shotgun'),false);trackAchievements(s);
 const next=run(saved(s.profile));assert.deepEqual(achievementProgress(next,next.profile,achievementById('weapon:shotgun')),[29]);
 const e=kill(next);hurtEnemy(next,e,1e8,0,'direct',false,'pistol');trackAchievements(next);
 assert.equal(next.profile.meta.weaponKills.pistol,30);assert.ok(next.profile.achievements.includes('weapon:shotgun'));assert.equal(next.ground.filter(q=>q.part.key==='shotgun').length,1);assert.equal(validLoadout(next.profile,{arm:'shotgun'}).arm,'shotgun');
 for(let i=0;i<5;i++)kill(next);assert.equal(next.ground.filter(q=>q.part.key==='shotgun').length,1);
 const p=saved(next.profile);p.unlocked=p.unlocked.filter(k=>k!=='shotgun');assert.ok(saved(p).unlocked.includes('shotgun'));
});
test('machine gun counts 60 player kills and excludes objectives, summoned children and environment deaths',()=>{
 const s=run();for(const opts of [{kind:'objective'},{bossOwner:999},{noRewards:true}])kill(s,'pistol','direct',opts);kill(s,'pistol','environment');assert.deepEqual(s.profile.meta.weaponKills,{pistol:0,total:0});
 for(let i=0;i<59;i++)kill(s,'claws');assert.equal(s.profile.unlocked.includes('seed'),false);kill(s,'claws');
 assert.equal(s.profile.meta.weaponKills.pistol,0);assert.ok(s.profile.unlocked.includes('seed'));assert.equal(s.ground.filter(q=>q.part.key==='seed').length,1);assert.equal(validLoadout(s.profile,{arm:'seed'}).arm,'pistol');
});
test('actual pistol projectile resolution owns the kill, not the equipped off-hand',()=>{
 const s=run();s.arms=[createPart(s,'pistol'),null];s.rng=()=>.5;const e=spawnEnemy(s,'normal',{x:0,z:3},'mass',0,{promote:false});e.hp=1;e.armor=0;e.speed=0;attack(s,0);
 for(let i=0;i<20&&e.hp>0;i++)step(s,.02,{x:0,z:0});assert.equal(e.hp,0);assert.equal(s.profile.meta.weaponKills.pistol,1);
});
test('legacy unlocked weapons survive migration; malformed new counters cannot bypass gates',()=>{
 const p=newProfile();p.unlocked.push('seed','shotgun','harpoon');p.meta.overruns=1;p.meta.loadout={arm:'harpoon'};delete p.meta.weaponKills;const legacy=saved(p);assert.equal(validLoadout(legacy,{arm:'shotgun'}).arm,'shotgun');assert.equal(validLoadout(legacy,{arm:'seed'}).arm,'pistol');
 assert.ok(legacy.unlocked.includes('harpoon'));assert.equal(validLoadout(legacy).arm,'pistol');assert.equal(validLoadout(legacy,{arm:'harpoon'}).arm,'pistol');
 p.meta.weaponKills={pistol:-3,total:'60',unknown:1e9};assert.deepEqual(saved(p).meta.weaponKills,{pistol:0,total:0});
});

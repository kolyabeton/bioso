import test from 'node:test';import assert from 'node:assert/strict';
import {createRun,spawnEnemy,hurtEnemy,applyStartingLoadout,rerollReward,addXP,attack,step} from '../src/game.js';
import {newProfile,readProfile,createPart,stats,weaponStats} from '../src/assembly.js';
import {meta,validLoadout,starterAllowed,startOverrun,tickOverrun,awardMeta,recordVictory,survivalUnlocked,survivalRequirement,SURVIVAL_UNLOCK_MISSION} from '../src/systems/meta-progression.js';
import {MISSIONS} from '../src/catalog.js';
import {tickExtraParts,springContact} from '../src/systems/extra-parts.js';
import {receiveHit} from '../src/systems/health.js';
import {chooseBossReward} from '../src/systems/sets-loot.js';
import {collectBiomass} from '../src/systems/survival-endgame.js';
const run=()=>{const s=createRun(undefined,'survival',42);s.world={walkable:()=>true};return s;};
const finishFinale=s=>{if(s.bossRewards?.length)assert.ok(chooseBossReward(s,0));collectBiomass(s,10000);step(s,0);step(s,18);assert.equal(s.won,true);};
test('legacy saves migrate and malformed profile currency cannot grant tokens',()=>{const old=newProfile();delete old.meta;const p=readProfile({getItem:()=>JSON.stringify(old)});assert.equal(meta(p).rerolls,0);old.meta={overruns:-5,rerolls:Infinity,wins:'3'};assert.equal(readProfile({getItem:()=>JSON.stringify(old)}).meta.rerolls,0);});
test('old three-slot preparation rejects hidden leg and second-arm tampering',()=>{const p=newProfile();assert.deepEqual(validLoadout(p,{body:'bastion',arm:'pistol',organ:'stabilizer',leg:'runner',arm2:'seed'}),{body:'wanderer',arm:'pistol',organ:null});assert.equal(starterAllowed(p,'stabilizer'),true);for(const id of ['garden','quarantine','core'])p.achievements.push('mission:'+id);p.unlocked.push('hunter','bastion','harpoon');p.meta.overruns=1;const s=run();s.profile=p;applyStartingLoadout(s,{body:'bastion',arm:'harpoon',organ:'stabilizer',leg:'runner',arm2:'seed'});assert.equal(s.arms[0].key,'pistol');assert.equal(s.arms[1],null);assert.equal(s.legs.length,4);assert.ok(s.legs.every(p=>p.key==='universal'));assert.equal(s.organs[0].key,'stabilizer');assert.equal(s.biomass,0);assert.ok(stats(s).speed>0);});
test('fresh survival preparation defaults to the pistol, offers claws and gates shotgun',()=>{const p=newProfile(),choice=validLoadout(p);assert.deepEqual(choice,{body:'wanderer',arm:'pistol',organ:null});for(const arm of ['claws','pistol'])assert.equal(validLoadout(p,{arm}).arm,arm);for(const arm of ['shotgun','seed'])assert.equal(validLoadout(p,{arm}).arm,'pistol');const s=run();applyStartingLoadout(s,choice);assert.deepEqual(s.arms.map(p=>p?.key??null),['pistol',null]);});
test('overrun needs final victory and 30 seconds alive, stakes three victory rerolls and pays six exactly once',()=>{
 const s=run(),spawn=(...a)=>spawnEnemy(s,...a);meta(s.profile).rerolls=3;
 assert.equal(startOverrun(s,spawn),false);s.finalDefeated=s.won=true;recordVictory(s);recordVictory(s);
 assert.equal(meta(s.profile).wins,1);assert.ok(startOverrun(s,spawn));
 tickOverrun(s,29.99,spawn,createPart);assert.equal(meta(s.profile).rerolls,3);
 tickOverrun(s,.01,spawn,createPart);assert.equal(s.overrun.state,'complete');
 assert.ok(s.overrun.guards.every(id=>s.enemies.some(e=>e.id===id&&e.hp>0)));
 assert.equal(meta(s.profile).rerolls,9);assert.equal(s.continued,false);assert.ok(s.inventory.some(p=>p.key==='harpoon'));
 assert.equal(startOverrun(s,spawn),false);tickOverrun(s,100,spawn,createPart);assert.equal(meta(s.profile).rerolls,9);
 const saved=readProfile({getItem:()=>JSON.stringify(s.profile)});assert.equal(meta(createRun(saved).profile).rerolls,9);
});
test('failed overrun loses only this victory reward; partial spawn keeps the three rerolls',()=>{
 const s=run();meta(s.profile).rerolls=7;s.won=s.finalDefeated=true;recordVictory(s);assert.equal(meta(s.profile).rerolls,10);
 let n=0;assert.equal(startOverrun(s,(...a)=>++n===1?spawnEnemy(s,...a):null),false);assert.equal(s.enemies.length,0);assert.equal(meta(s.profile).rerolls,10);
 assert.ok(startOverrun(s,(...a)=>spawnEnemy(s,...a)));assert.equal(meta(s.profile).rerolls,7);
 s.dead=true;tickOverrun(s,40,()=>null,createPart);tickOverrun(s,40,()=>null,createPart);
 assert.equal(s.overrun.state,'failed');assert.equal(meta(s.profile).wins,1);assert.equal(meta(s.profile).rerolls,7);
 assert.equal(readProfile({getItem:()=>JSON.stringify(s.profile)}).meta.rerolls,7);
});
test('actual final-boss victory banks three once; defeat and mission bosses do not pay',()=>{
 const s=run();meta(s.profile).rerolls=7;const boss=spawnEnemy(s,'final',{x:3,z:0});hurtEnemy(s,boss,1e9);
 assert.equal(s.finalDefeated,true);assert.equal(meta(s.profile).rerolls,7);finishFinale(s);assert.equal(meta(s.profile).rerolls,10);recordVictory(s);assert.equal(meta(s.profile).rerolls,10);
 assert.equal(readProfile({getItem:()=>JSON.stringify(s.profile)}).meta.rerolls,10);
 const dead=run();dead.dead=true;recordVictory(dead);assert.equal(meta(dead.profile).rerolls,0);
 const mission=run();mission.mode='garden';mission.won=mission.finalDefeated=true;recordVictory(mission);assert.equal(meta(mission.profile).rerolls,0);
});
test('final boss item rerolls cannot spend the offered stake; previous rerolls remain usable',()=>{
 const s=run();meta(s.profile).rerolls=1;hurtEnemy(s,spawnEnemy(s,'final',{x:3,z:0}),1e9);
 assert.equal(meta(s.profile).rerolls,1);assert.equal(rerollReward(s),true);assert.equal(meta(s.profile).rerolls,0);
 assert.equal(rerollReward(s),false);assert.equal(meta(s.profile).rerolls,0);
 assert.ok(chooseBossReward(s,0));collectBiomass(s,10000);step(s,0);step(s,18);assert.equal(meta(s.profile).rerolls,3);
 s.victoryRerollsSettled=true;assert.equal(startOverrun(s,(...a)=>spawnEnemy(s,...a)),false);
});
test('two rerolls persist and are consumed only for an active choice without losing level',()=>{const s=run();meta(s.profile).rerolls=2;assert.equal(rerollReward(s),false);addXP(s,20);const old=s.choices.map(c=>c.id),pending=s.pending;assert.ok(rerollReward(s));assert.equal(s.pending,pending);assert.notDeepEqual(s.choices.map(c=>c.id),old);assert.equal(meta(s.profile).rerolls,1);const p=readProfile({getItem:()=>JSON.stringify(s.profile)});assert.equal(meta(p).rerolls,1);assert.ok(rerollReward(s));assert.equal(rerollReward(s),false);});
test('achievement rewards are awarded once and real biome types drive exploration goal',()=>{const s=run();s.elites=5;awardMeta(s,createPart);assert.equal(s.inventory.filter(p=>p.key==='mirrorGland').length,0);s.profile.achievements.push('mission:nursery');awardMeta(s,createPart);awardMeta(s,createPart);assert.equal(s.inventory.filter(p=>p.key==='mirrorGland').length,1);s.world.tiles=['gardens','forest','city','scrapyard'].map((biome,i)=>({id:'tile-'+i,biome,kind:'arena'}));s.exploration={visited:new Set(s.world.tiles.map(t=>t.id))};s.encounters={nodes:[{type:'altar',state:'complete'},{type:'infection',state:'complete'}]};awardMeta(s,createPart);assert.ok(s.profile.unlocked.includes('spring'));});
test('mirror no longer intercepts projectiles or retaliates, so shields take the hit',()=>{const s=run();s.organs=[createPart(s,'mirrorGland'),createPart(s,'shield')];s.organs[1].shieldCharge=1;s.rng=()=>.99;const e=spawnEnemy(s,'normal',{x:3,z:0});e.hp=e.maxHp=1000;s.world.lineClear=()=>true;assert.equal(receiveHit(s,stats(s),{cause:'projectile',projectile:{owner:e.id,speed:7}}),'shield');assert.equal(s.shots.length,0);assert.equal(s.organs[1].shieldCharge,0);let hits=0;tickExtraParts(s,.1,()=>hits++);assert.equal(hits,0);assert.equal(s.shots.length,0);});
test('spring charges through sustained movement and one contact leaps in the movement direction',()=>{const s=run();s.legs=[createPart(s,'spring'),createPart(s,'spring')];const base=stats(s).speed;s.motion={x:1,z:0};for(let i=0;i<30;i++){s.time+=.1;tickExtraParts(s,.1,()=>{});}assert.equal(stats(s).speed,base);assert.equal(s.extraParts.springReady,true);const e=spawnEnemy(s,'normal',{x:1,z:0}),from={...s.player};assert.equal(springContact(s,e),true);const leap=s.events.at(-1);assert.equal(leap.type,'spring-leap');assert.deepEqual([leap.x,leap.z],[from.x,from.z]);assert.deepEqual([leap.tx,leap.tz],[s.player.x,s.player.z]);assert.ok(Math.abs(s.player.x-from.x-2.5)<1e-10);assert.equal(s.player.z,from.z);assert.equal(s.extraParts.springReady,false);assert.equal(springContact(s,e),false);assert.ok(s.extraParts.springDodgeUntil>s.time);});

test('spring refuses blocked and hazardous landings instead of teleporting',()=>{const s=run();s.legs=[createPart(s,'spring')];s.extraParts={springReady:true,springReadyAt:0,direction:{x:1,z:0}};s.world.walkable=()=>false;const e=spawnEnemy(s,'normal',{x:1,z:0}),before={...s.player};assert.equal(springContact(s,e),false);assert.deepEqual(s.player,before);assert.equal(s.extraParts.springReady,true);s.world.walkable=()=>true;s.enemyAcidPools=[{x:0,z:0,radius:20,life:1}];assert.equal(springContact(s,e),false);assert.deepEqual(s.player,before);});

test('spring never substitutes a sideways landing when forward is blocked',()=>{const s=run();s.legs=[createPart(s,'spring')];s.extraParts={springReady:true,springReadyAt:0,direction:{x:1,z:0}};s.world.walkable=(x,z)=>Math.abs(x-2.5)>.01||Math.abs(z)>.01;const e=spawnEnemy(s,'normal',{x:1,z:0}),before={...s.player};assert.equal(springContact(s,e),false);assert.deepEqual(s.player,before);assert.equal(s.extraParts.springReady,true);});

test('spring uses current motion instead of a stale charged direction',()=>{const s=run();s.legs=[createPart(s,'spring')];s.extraParts={springReady:true,springReadyAt:0,direction:{x:-1,z:0}};s.motion={x:0,z:4};const e=spawnEnemy(s,'normal',{x:1,z:0});assert.equal(springContact(s,e),true);assert.ok(Math.abs(s.player.x)<1e-10);assert.ok(Math.abs(s.player.z-2.5)<1e-10);});

test('spring cooldown scales from ten to five seconds across five ranks',()=>{for(const [tier,cooldown]of [[1,10],[2,8.75],[3,7.5],[4,6.25],[5,5]]){const s=run();s.legs=[createPart(s,'spring',tier)];s.extraParts={springReady:true,springReadyAt:0,direction:{x:1,z:0}};const e=spawnEnemy(s,'normal',{x:-1,z:0});assert.equal(springContact(s,e),true);assert.equal(s.extraParts.springReadyAt-s.time,cooldown);}});

test('held movement cannot pull the camera target beyond the landing during the spring arc',()=>{const s=createRun();s.legs=[createPart(s,'spring')];s.extraParts={springReady:true,springReadyAt:0,direction:{x:1,z:0}};const e=spawnEnemy(s,'normal',{x:-1,z:0});assert.equal(springContact(s,e),true);s.enemies=[];s.waves.credit=-1e6;s.nextElite=s.waves.nextElite=Infinity;s.nextBoss=s.waves.nextBoss=Infinity;const landing={...s.player};step(s,.2,{x:1,z:0});assert.deepEqual(s.player,landing);step(s,.2,{x:1,z:0});assert.deepEqual(s.player,landing);step(s,.03,{x:1,z:0});assert.ok(s.player.x>landing.x);});
test('reroll prioritizes unseen eligible abilities and boss options remain distinct',()=>{const s=run();meta(s.profile).rerolls=3;addXP(s,20);const old=s.choices.map(c=>c.id);rerollReward(s);assert.ok(s.choices.filter(c=>!old.includes(c.id)).length>=3);s.pending=0;const boss=spawnEnemy(s,'boss',{x:3,z:0});hurtEnemy(s,boss,10000);const rarity=s.bossRewards[0].rarity;assert.ok(rerollReward(s));assert.equal(s.bossRewards.length,1);assert.equal(s.bossRewards[0].rarity,rarity);assert.equal(new Set(s.bossRewards[0].options.map(p=>p.key)).size,3);});

test('starter organs respect their own gates and equip exactly one selected organ',()=>{
 for(const key of ['stabilizer','regen','shield']){
  const s=run();meta(s.profile).overruns=2;
  assert.equal(validLoadout(s.profile,{organ:key}).organ,null);
  s.profile.achievements.push('mission:garden','mission:quarantine','mission:core');
  if(key!=='stabilizer')meta(s.profile).overruns=3;
  const choice=applyStartingLoadout(s,{organ:key});
  assert.equal(choice.organ,key);
  assert.deepEqual(s.organs.filter(Boolean).map(p=>p.key),[key]);
  applyStartingLoadout(s,{organ:null});
  assert.equal(s.organs.filter(Boolean).length,0);
 }
 const s=run();meta(s.profile).overruns=3;s.profile.achievements.push('mission:garden','mission:quarantine','mission:core');
 assert.equal(validLoadout(s.profile,{organ:'digestion'}).organ,null);
});

test('survival is available without any mission victories',()=>{
 const fresh=newProfile();
 assert.equal(survivalUnlocked(fresh),true,'a new profile can reach survival');
 assert.equal(survivalRequirement(),`Пройдите миссию: ${MISSIONS[0].name}`);
 assert.equal(SURVIVAL_UNLOCK_MISSION,MISSIONS[0].id);
 // Mission victories do not affect access.
 const later={...fresh,achievements:['mission:'+MISSIONS[1].id]};
 assert.equal(survivalUnlocked(later),true);
 const cleared={...fresh,achievements:['mission:'+MISSIONS[0].id]};
 assert.equal(survivalUnlocked(cleared),true);
 for(const p of [null,undefined,{},{achievements:null},{achievements:'mission:garden'}])assert.equal(survivalUnlocked(p),true,JSON.stringify(p));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,spawnEnemy} from '../src/game.js';
import {createPart} from '../src/assembly.js';
import {phaseAt,survivalPressureProfile} from '../src/systems/balance.js';
import {survivalWaveSpec} from '../src/systems/survival-cadence.js';
import {ENEMY_RECIPES,assignEnemyAssembly} from '../src/systems/enemy-assembly.js';
import {SURVIVAL_RESPONSE_INTERVAL,survivalResponseBuild,survivalResponseRoster,tickSurvivalResponse} from '../src/systems/survival-response.js';
import {DRONE_HUNTER_REPLACEMENT_DELAY,DRONE_HUNTER_WARNING,tickEnemySpecialist} from '../src/systems/enemy-specialists.js';
import {destroySymbiont} from '../src/systems/symbionts.js';

const near=(actual,expected,epsilon=1e-9)=>assert.ok(Math.abs(actual-expected)<=epsilon,`${actual} != ${expected}`);
const fixture=()=>{const s=createRun(undefined,'survival',42);s.world={flat:true,walkable:()=>true,lineClear:()=>true};s.enemies=[];return s;};

test('post-15 pressure is exact at its boundaries and keeps a hard endless tail',()=>{
 assert.deepEqual(survivalPressureProfile(899),{lateMinutes:0,damage:1,attackRate:1,speed:1,health:1,count:1,live:1,eliteCap:6});
 assert.deepEqual(survivalPressureProfile(900),{lateMinutes:0,damage:1,attackRate:1,speed:1,health:1,count:1,live:1,eliteCap:6});
 const minute16=survivalPressureProfile(960);near(minute16.damage,1.06);near(minute16.attackRate,1.035);near(minute16.speed,1.015);near(minute16.count,1.03);near(minute16.live,1.02);
 const minute30=survivalPressureProfile(1800);near(minute30.damage,3.8);near(minute30.attackRate,1.525);near(minute30.speed,1.225);near(minute30.count,1.45);near(minute30.live,1.3);assert.equal(minute30.eliteCap,11);
 assert.equal(survivalPressureProfile(1980).eliteCap,12);assert.equal(survivalPressureProfile(10000).damage>survivalPressureProfile(3000).damage,true);
 assert.equal(phaseAt(2400).hp,140);assert.equal(phaseAt(2460).hp,140);assert.equal(phaseAt(3000).hp,140);
 for(const difficulty of [0,25,50,75,100])for(const [kind,base] of [['normal',16.0256],['elite',5.47]]){
  near(survivalPressureProfile(900,difficulty,kind).health,1);
  near(survivalPressureProfile(1800,difficulty,kind).health,base**(15/21)*2);
  near(survivalPressureProfile(2160,difficulty,kind).health,base*2**1.6);
  near(survivalPressureProfile(3000,difficulty,kind).health,base**(35/21)*8);
 }
});

test('late waves grow both roster and live cap while preserving the global cap',()=>{
 assert.deepEqual(survivalWaveSpec(0,899),{index:0,packSize:36,liveCap:20,eliteCap:1,elitePulse:false});
 assert.deepEqual(survivalWaveSpec(0,1800),{index:0,packSize:53,liveCap:26,eliteCap:11,elitePulse:false});
 assert.deepEqual(survivalWaveSpec(50,1800),{index:50,packSize:200,liveCap:120,eliteCap:11,elitePulse:false});
 // Every fifth wave has five elites plus one for each three full run minutes.
 assert.equal(survivalWaveSpec(4,179.999).eliteCap,5);
 assert.equal(survivalWaveSpec(4,180).eliteCap,6);
 assert.deepEqual(survivalWaveSpec(4,899),{index:4,packSize:80,liveCap:44,eliteCap:9,elitePulse:true});
 assert.deepEqual(survivalWaveSpec(9,1800),{index:9,packSize:194,liveCap:97,eliteCap:15,elitePulse:true});
});

test('ordinary Survival enemies freeze late damage, speed and attack rate at spawn while bosses stay separate',()=>{
 const s=fixture(),normal=spawnEnemy(s,'normal',{x:0,z:8},'mass',1800,{promote:false}),boss=spawnEnemy(s,'boss',{x:20,z:0},'mass',1800,{introductory:false});
 near(normal.damage,1.9);near(normal.attackRecoveryScale,1/1.525);near(normal.contactInterval,1/1.525);assert.ok(normal.speed>2.15);
 assert.equal(boss.damage,2);assert.equal(boss.attackRecoveryScale,undefined);assert.equal(boss.contactInterval,undefined);
 const lateNormal=spawnEnemy(s,'normal',{x:0,z:16},'mass',2460,{promote:false}),lateBoss=spawnEnemy(s,'boss',{x:24,z:0},'mass',2460,{introductory:false});
 assert.equal(lateNormal.maxHp,Math.round(Math.round(140*1.3)*16.0256**(26/21)*2**2.1));assert.equal(lateBoss.maxHp,Math.round(19000*1.6*1.3));
});

test('response classification covers swarm, ranged, melee and deterministic mixed builds',()=>{
 const s=fixture();s.arms=[createPart(s,'seed'),null];assert.equal(survivalResponseBuild(s),'ranged');
 s.arms=[createPart(s,'claws'),null];assert.equal(survivalResponseBuild(s),'melee');
 s.arms=[createPart(s,'claws'),createPart(s,'seed')];assert.equal(survivalResponseBuild(s),'mixed');
 const a=survivalResponseRoster(s,3,1500),b=survivalResponseRoster(s,3,1500);assert.deepEqual(a,b);assert.equal(a.members.length,5);
 s.abilities.companions=[{id:1},{id:2}];assert.equal(survivalResponseBuild(s),'swarm');assert.equal(survivalResponseRoster(s,0,900).members[0].specialty,'drone-hunter');
});

test('response squads start at 15 minutes, remain mixed and schedule from completed appearance',()=>{
 const s=fixture();s.arms=[createPart(s,'seed'),null];const spawn=(...args)=>spawnEnemy(s,...args);
 s.time=899;tickSurvivalResponse(s,spawn);assert.equal(s.enemies.length,0);
 s.time=900;tickSurvivalResponse(s,spawn);assert.equal(s.enemies.length,3);assert.equal(s.survivalResponse.nextAt,900+SURVIVAL_RESPONSE_INTERVAL);
 const recipes=new Set(s.enemies.map(e=>e.recipeId)),roles=new Set(s.enemies.map(e=>ENEMY_RECIPES.find(r=>r.id===e.recipeId).role));assert.equal(recipes.size,3);assert.ok(roles.size>=2);
 const leader=s.enemies.find(e=>e.survivalResponseLeader);assert.equal(leader.kind,'elite');assert.equal(leader.recipeId,'shield-bearer');assert.equal(s.events.filter(e=>e.type==='survival-response').length,1);
 s.time=s.survivalResponse.nextAt-.01;tickSurvivalResponse(s,spawn);assert.equal(s.enemies.length,3);
 s.time=s.survivalResponse.nextAt;tickSurvivalResponse(s,spawn);assert.equal(s.enemies.length,6);assert.equal(s.survivalResponse.index,2);
});

test('a full cap retains one exact pending response without a catch-up burst or wave mutation',()=>{
 const s=fixture(),foreign=Array.from({length:9},(_,id)=>({id:9000+id,hp:1,x:0,z:0}));s.enemies.push(...foreign);s.time=900;
 s.waves.cadence={index:4,at:800,phase:'main',pack:0,packSize:20,liveCap:6,eliteCap:5,issued:0,packElitesIssued:0,rosters:null};s.waves.eliteWave={index:4,issued:0};const cadence=structuredClone(s.waves.cadence),spawn=(...args)=>spawnEnemy(s,...args);
 tickSurvivalResponse(s,spawn);assert.equal(s.survivalResponse.pending.issued,0);assert.deepEqual(s.waves.cadence,cadence);
 for(let i=0;i<3;i++){foreign[i].hp=0;tickSurvivalResponse(s,spawn);}
 assert.equal(s.survivalResponse.pending,null);assert.equal(s.enemies.filter(e=>e.survivalResponseIndex===0).length,3);assert.equal(s.survivalResponse.index,1);assert.deepEqual(s.waves.cadence,cadence);
 s.time+=1000;tickSurvivalResponse(s,spawn);assert.equal(s.survivalResponse.index,1,'the next full squad stays pending under the cap');
});

test('drone hunter telegraphs once, destroys one companion and enforces a four-second replacement',()=>{
 const s=fixture(),definition=ENEMY_RECIPES.find(r=>r.id==='robo-bee'),hunter=spawnEnemy(s,'elite',{x:0,z:0},'flying',900,{introductory:false});assignEnemyAssembly(s,hunter,900,{missionRole:'flying',missionRecipeId:definition.id});hunter.specialty='drone-hunter';hunter.territory=null;hunter.speed=0;
 const companion={id:77,sourceKey:'colony:1',x:0,y:0,z:.5,hover:1.5};s.abilities.companions=[companion];let killed=0;
 const hunt=target=>{const replacement=destroySymbiont(s,target,{},DRONE_HUNTER_REPLACEMENT_DELAY);killed++;near(replacement.interval,4);near(replacement.readyAt,4.8);};
 assert.equal(tickEnemySpecialist(s,hunter,0,null,hunt),true);assert.equal(killed,0);assert.equal(hunter.specialAttack.at,DRONE_HUNTER_WARNING);assert.equal(s.events.filter(e=>e.type==='enemy-drone-hunt-warning').length,1);
 s.time=.1;assert.equal(tickEnemySpecialist(s,hunter,0,null,hunt),true);assert.equal(hunter.enemyAttack.warning.droneHunter,true);near(hunter.enemyAttack.warning.at,DRONE_HUNTER_WARNING);
 s.time=DRONE_HUNTER_WARNING;assert.equal(tickEnemySpecialist(s,hunter,0,null,hunt),true);assert.equal(killed,1);assert.equal(s.abilities.companions.length,0);assert.equal(s.abilities.companionSummonReadyAt['colony:1'],4.8);
 assert.equal(hunter.enemyAttack.warning,null);
 const ordinary={id:78,sourceKey:'colony:2',x:0,z:0};s.abilities.companions=[ordinary];s.time=10;const replacement=destroySymbiont(s,ordinary);near(replacement.interval,1.2);near(replacement.readyAt,11.2);
});

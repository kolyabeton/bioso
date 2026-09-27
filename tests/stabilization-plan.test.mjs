import test from 'node:test';
import assert from 'node:assert/strict';
import {CATALOG} from '../src/catalog.js';
import {createRun,spawnEnemy,receiveDamage,step,beginEncounter,exitDungeon,hurtEnemy} from '../src/game.js';
import {createWorldRun} from '../src/world-run.js';
import {createPart,stats} from '../src/assembly.js';
import {weaponSustainedDps} from '../src/ui/adapters.js';
import {DEFAULT_SETTINGS,normalizeSettings} from '../src/ui/settings.js';
import {modifiers} from '../src/systems/abilities.js';
import {summonTuning} from '../src/systems/symbionts.js';
import {tickEffects} from '../src/systems/effects.js';
import {enemyBalance,SURVIVAL_PRESSURE,survivalPressureProfile,ACID_PUDDLE_SECONDS,DUNGEON_ELITE_HP_MULTIPLIER} from '../src/systems/balance.js';
import {EVENTS} from '../src/systems/events/definitions.js';
import {tickChallenge} from '../src/systems/events/challenges.js';
import {survivalHordeSchedule,tickSurvivalHordes} from '../src/systems/survival-hordes.js';
import {createDungeonView} from '../src/dungeon-view.js';
import * as T from 'three';

const near=(actual,expected,epsilon=.06)=>assert.ok(Math.abs(actual-expected)<=epsilon,`${actual} ≉ ${expected}`);

test('rank-I sustained weapon DPS matches the stabilization table',()=>{
  const expected={drone:15,harpoon:24.7,pistol:10,claws:20.9,hammer:25,drill:24,whip:20.7,fangs:21.2,seed:21.18,shotgun:18.1,needle:15.2,rocket:15,arc:15,acid:15};
  for(const [key,dps] of Object.entries(expected)){
    const s=createRun(undefined,'survival',12),part=createPart(s,key,1);
    s.arms=[part];s.legs=[createPart(s,'universal'),createPart(s,'universal')];s.organs=[];
    near(weaponSustainedDps(s,part,stats(s)),dps,.11);
  }
  assert.equal(CATALOG.shotgun.damage,5.25);assert.equal(CATALOG.shotgun.range,12);assert.equal(CATALOG.shotgun.reload,2);
  assert.equal(CATALOG.needle.reload,2.3);
  assert.equal(CATALOG.acid.damage,10);assert.equal(ACID_PUDDLE_SECONDS,3);
});

test('Broodmother full build combines five chassis helpers, five from Colony and one from the set',()=>{
  const s=createRun(undefined,'survival',13);s.body=createPart(s,'broodmother',5);
  s.arms=[createPart(s,'drone',5),createPart(s,'acid',5)];
  s.legs=Array.from({length:3},()=>createPart(s,'swarmLeg',5));
  s.organs=[createPart(s,'broodNode',5),createPart(s,'broodNode',5),createPart(s,'regen',5)];
  for(const part of [s.body,...s.arms,...s.legs,...s.organs])part.setId='broodmother';
  s.abilities.learned=['summons.0','summons.1','summons.2','summons.3'];
  s.abilities.levels={'summons.0':5,'summons.1':5,'summons.2':5,'summons.3':5};
  const b=modifiers(s),tuning=summonTuning(s,b);
  assert.deepEqual([CATALOG.broodmother.arms,CATALOG.broodmother.legs,CATALOG.broodmother.organs,CATALOG.broodmother.capacity],[3,4,3,150]);
  assert.equal(tuning.count,12);assert.equal(tuning.search,12);assert.equal(Number(tuning.damage.toFixed(2)),2.47);assert.ok(tuning.rate>=1.9);assert.equal(tuning.contactInvulnerable,true);assert.equal(tuning.replacementInterval,1.2/tuning.rate);
  const elite=spawnEnemy(s,'elite',{x:2,z:0},'mass',900,{promote:false});elite.hp=elite.maxHp=1e9;
  for(let i=0;i<80;i++){s.time+=.1;tickEffects(s,.1,(target,damage)=>target.hp-=damage);}
  assert.equal(s.abilities.companions.length,12);assert.ok(elite.hp<1e9,'helpers attack without hero weapon hits');
  assert.ok(s.abilities.companions.every(companion=>companion.target===elite.id),'the full swarm shares its priority target');
  s.world={walkable:()=>true,lineClear:()=>true,chunk:()=>({cx:0,cz:0,lair:{x:999,z:999}})};elite.hp=elite.maxHp=1e9;elite.speed=0;elite.damage=0;s.nextElite=s.nextBoss=Infinity;
  for(let i=0;i<240;i++)step(s,.05,{x:0,z:0});
  const total=Object.values(s.metrics.damage).reduce((sum,value)=>sum+value,0);
  assert.ok(s.metrics.damage.summon/total>=.7,`summon damage share ${s.metrics.damage.summon/total}`);
});

test('active helpers ignore contact damage and consume only hostile projectiles',()=>{
  const s=createRun(undefined,'survival',17);s.body=createPart(s,'broodmother');s.arms=[createPart(s,'drone')];
  s.body.setId=s.arms[0].setId='broodmother';
  s.world={walkable:()=>true,lineClear:()=>true,chunk:()=>({cx:0,cz:0,lair:{x:999,z:999}})};
  s.nextElite=s.nextBoss=Infinity;s.waves.credit=-Infinity;
  const enemy=spawnEnemy(s,'normal',{x:8,z:0},'mass',0,{promote:false});
  enemy.hp=enemy.maxHp=1e9;enemy.speed=0;enemy.damage=1e6;enemy.enemyAttack.readyAt=Infinity;
  tickEffects(s,0,()=>{});const helper=s.abilities.companions[0];Object.assign(helper,{x:enemy.x,z:enemy.z});
  step(s,.05);assert.ok(enemy.contact<0,'helper must not intercept the enemy contact attack');
  for(let i=0;i<200;i++)step(s,.05);
  assert.equal(s.abilities.companions.length,3);assert.ok(helper.attacks>0);
  assert.ok(s.abilities.companions.every(c=>!('hp' in c)&&!('deadUntil' in c)&&c.phase!=='dead'));
});

test('damage contract uses half armor and HP-only invulnerability',()=>{
  const s=createRun(undefined,'survival',14);assert.equal(stats(s).armor,.5);
  assert.equal(receiveDamage(s,.5),'armor');assert.equal(s.health.invulnerableUntil,0);
  assert.equal(receiveDamage(s,.5),'hurt');assert.equal(s.health.invulnerableUntil,.5);
  assert.equal(receiveDamage(s,.5),'ignored');
});

test('dungeons keep level gates while horde descriptors have finite counts without timestamps',()=>{
  assert.deepEqual([EVENTS.dungeon_roots.recommended,EVENTS.dungeon_catacombs.recommended],[10,17]);
  assert.deepEqual(survivalHordeSchedule(0),{count:36,pattern:'ring'});
  assert.deepEqual(survivalHordeSchedule(1),{count:47,pattern:'pincers'});
  assert.deepEqual(survivalHordeSchedule(2),{count:58,pattern:'perimeter'});
});

test('dungeon presentation is a connected corridor graph with a distinct theme and no rooms',()=>{
  const scene=new T.Scene(),view=createDungeonView(scene),points=Array.from({length:12},(_,i)=>({x:i*3,z:(i%3-1)*4,y:0}));
  view.update({encounters:{active:{id:'roots',type:'dungeon_roots',dungeon:true,entrance:{x:-3,y:0,z:0},tunnels:points}}});
  assert.equal(view.info().dungeonTheme,'overgrown-root-tunnels');assert.ok(view.info().dungeonMeshes>30);
  const names=[];scene.traverse(o=>names.push(o.name));assert.ok(names.includes('dungeon-corridor-floor'));assert.ok(names.includes('dungeon-dead-end'));assert.ok(!names.some(name=>/room|arena/i.test(name)));
  view.reset();assert.equal(view.info().dungeonMeshes,0);
});

test('both survival dungeons spawn wall-health and triple-attack elites, pause time and keep one best-of-three item per elite',()=>{
  for(const [type,level,count,time] of [['dungeon_roots',10,12,900],['dungeon_catacombs',17,18,1500]]){
    const s=createWorldRun(undefined,'survival',20317),node=s.encounters.nodes.find(n=>n.type===type);s.level=level;s.time=time;s.player={x:node.x,y:node.y,z:node.z};
    assert.ok(beginEncounter(s,node.id));assert.equal(node.members.length,count);
    const pressure=survivalPressureProfile(time,s.difficulty,'elite'),baseHp=Math.round(enemyBalance(time,'elite').hp*SURVIVAL_PRESSURE.hp*pressure.health),baseRecovery=1/pressure.attackRate;
    const elites=node.members.map(id=>s.enemies.find(e=>e.id===id));assert.ok(elites.every(e=>e.dungeonElite&&e.damage===1&&e.hp===baseHp*DUNGEON_ELITE_HP_MULTIPLIER&&e.maxHp===baseHp*DUNGEON_ELITE_HP_MULTIPLIER&&e.contactInterval===baseRecovery/3&&e.attackRecoveryScale===baseRecovery/3));
    const pausedAt=s.time;step(s,.05);assert.equal(s.time,pausedAt);
    for(const zone of node.aggroZones){Object.assign(s.player,zone);step(s,.01);}
    for(const enemy of elites)if(enemy.hp>0)hurtEnemy(s,enemy,1e12);
    const carriedDungeonLoot=[...s.ground,...s.inventory.map(part=>({part}))].filter(q=>q.dungeonLoot||q.part?.lootSource==='elite').length;
    assert.ok(carriedDungeonLoot>=count);
    tickChallenge(s,0,()=>null);assert.equal(node.cleared,true);Object.assign(s.player,node.exit);assert.ok(exitDungeon(s,node.id));assert.equal(node.state,'complete');
  }
});

test('new settings default to High/60 and enabled 50 percent audio while preserving old values',()=>{
  assert.deepEqual(DEFAULT_SETTINGS,{difficulty:100,language:'ru',soundEnabled:true,effects:50,music:50,quality:'high',cameraMode:'standard',fps:60,vibration:true,reducedMotion:false,storyEnabled:true});
  assert.deepEqual(normalizeSettings({soundEnabled:false,effects:73,music:11,quality:'low',fps:30}),{difficulty:100,language:'ru',soundEnabled:false,effects:73,music:11,quality:'low',cameraMode:'standard',fps:30,vibration:true,reducedMotion:false,storyEnabled:true});
});

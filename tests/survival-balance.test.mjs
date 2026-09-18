import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,spawnEnemy,addXP,chooseUpgrade,hurtEnemy} from '../src/game.js';
import {enemyBalance,phaseAt,WAVES,WAVE_RULES,MINUTE_SIGNATURES,SURVIVAL_PRESSURE} from '../src/systems/balance.js';
import {tickWaves,waveBudgetBetween,signatureRole,liveWaveElites} from '../src/systems/waves.js';
import {waveRun,openWave,tickWave,members,clearPack,nextWave} from './helpers/survival-wave.mjs';
import {rollChoices} from '../src/systems/progression.js';
import {chooseBossReward} from '../src/systems/sets/loot.js';
import {createPart,newProfile} from '../src/assembly.js';

const flat=seed=>{const s=createRun(undefined,'survival',seed);s.world={flat:true,walkable:()=>true,lineClear:()=>true};s.enemies=[];s.bossHabitats=[];return s;};

test('five authored acts expose exact flow, caps, signatures and a hard cap of 88',()=>{
 assert.deepEqual(WAVES.map(w=>[w.minute,w.rate,w.softCap]),[[0,28,24],[8,40,34],[16,55,46],[24,72,60],[32,92,74],[40,118,74]]);
 assert.deepEqual(WAVES.map(w=>enemyBalance(w.minute*60,'elite').hp),[126,315,585,945,1395,1980]);
 assert.equal(WAVE_RULES.cap,88);assert.deepEqual(Array.from({length:8},(_,i)=>phaseAt(i*60).minuteSignature),MINUTE_SIGNATURES);
});

test('minute cadence spends exactly 10, 65, 23 and 2 percent without changing its total',()=>{
 const rate=phaseAt(0).rate,parts=[[0,10],[10,44],[44,52],[52,60]].map(([a,b])=>waveBudgetBetween(a,b));
 const expected=[.10,.65,.23,.02].map(share=>rate*share);for(let i=0;i<4;i++)assert.ok(Math.abs(parts[i]-expected[i])<1e-9,`${parts[i]} != ${expected[i]}`);
 assert.ok(Math.abs(waveBudgetBetween(0,60)-rate)<1e-9);
});

test('warmup, phase and hard caps discard spawn credit instead of banking debt',()=>{
 const s=flat(1);s.time=30;s.nextElite=1e9;s.enemies=Array.from({length:24},()=>({hp:1}));s.waves.credit=.9;let calls=0;
 tickWaves(s,10,()=>{calls++;});assert.equal(calls,0);assert.equal(s.waves.credit,0);assert.equal(s.waves.softCap,6);
 s.enemies=[];tickWaves(s,.01,()=>{calls++;});assert.equal(calls,0);
 s.time=1940;s.enemies=Array.from({length:120},()=>({hp:1}));s.waves.credit=4;tickWaves(s,1,()=>{calls++;});assert.equal(calls,0);assert.equal(s.waves.credit,0);
});

test('minute accents own 45 percent and unavailable early roles fall back to mass',()=>{
 const p={...phaseAt(60),minuteSignature:'fast'},s=flat(2),roles=[];for(let i=0;i<100;i++){const values=i<45?[.1]:[.9,0];s.rng=()=>values.shift()??0;roles.push(signatureRole(s,p));}assert.equal(roles.filter(role=>role==='fast').length,45);
 s.normalSpawnCount=0;const early=spawnEnemy(s,'normal',{x:0,z:8},'flying',0,{promote:false,wave:true});assert.equal(early.role,'mass');
});

test('finite rosters own elite slots and keep them inside each pack size',()=>{
 const s=openWave(waveRun());
 for(let wave=0;wave<6;wave++){
  // The live cap, not the roster, decides how many stand on the field; every fifth wave is an elite wall.
  assert.equal(members(s).length,20+wave*6);assert.equal(liveWaveElites(s).length,[1,1,2,2,20,3][wave]);nextWave(s);
 }
});

test('five offers contain build, defense and synergy progress and remain seeded',()=>{
 const a=flat(77),b=flat(77);for(const s of [a,b]){s.abilities.learned=['fire.0','fire.3','cold.0','cold.3'];s.abilities.levels={'fire.0':1,'fire.3':1,'cold.0':1,'cold.3':1};rollChoices(s);}
 assert.deepEqual(a.choices,b.choices);assert.equal(a.choices.length,5);assert.equal(new Set(a.choices.map(c=>c.id)).size,5);
 assert.ok(a.choices.some(c=>['melee','fire','cold'].includes(c.id.split('.')[0])));assert.ok(a.choices.some(c=>['vitality','motion'].includes(c.id.split('.')[0])));assert.ok(a.choices.some(c=>c.id==='thermal'));
});

test('a build ability missing from four offer rounds is forced on the fifth',()=>{
 const s=flat(9);s.abilityOfferHistory.misses['melee.0']=4;rollChoices(s);assert.ok(s.choices.some(c=>c.id==='melee.0'));assert.equal(s.abilityOfferHistory.misses['melee.0'],0);
});

test('last level choice grants protection and pushes only ordinary nearby enemies',()=>{
 const s=flat(10),normal=spawnEnemy(s,'normal',{x:1,z:0},'mass',0,{promote:false}),elite=spawnEnemy(s,'elite',{x:2,z:0});addXP(s,18);s.choices=[{id:'might.0'}];
 assert.ok(chooseUpgrade(s,0));assert.equal(s.pending,0);assert.equal(s.health.invulnerableUntil,1.5);assert.ok(normal.x>=3.99);assert.equal(elite.x,2);
});

test('superboss half cap retains finite members and reward protection preserves cadence',()=>{
 const s=waveRun(),boss=spawnEnemy(s,'boss',{x:20,z:0},'mass',1240,{introductory:false});boss.survivalSuperBoss=true;openWave(s,1240);
 assert.equal(s.waves.softCap,11);assert.equal(members(s).length,10);const cadence=structuredClone(s.waves.cadence);
 hurtEnemy(s,boss,1e12);assert.equal(s.reliefUntil,1252);assert.ok(s.bossRewards[0]);s.waves.credit=4;
 assert.ok(chooseBossReward(s,0));assert.equal(s.health.invulnerableUntil,1242);assert.equal(s.waves.credit,.5);assert.deepEqual(s.waves.cadence,cadence);
 tickWave(s);assert.equal(members(s).length,23);assert.equal(s.waves.cadence.packSize,43);
});

test('old profiles need no migration for transient director and offer state',()=>{
 const profile=newProfile();delete profile.abilityOfferHistory;const s=createRun(profile,'survival',12);rollChoices(s);assert.equal(s.profile,profile);assert.equal(s.choices.length,5);assert.ok(s.abilityOfferHistory.rounds.length);
});

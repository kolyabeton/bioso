import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,attack,spawnEnemy} from '../src/game.js';
import {createPart,weaponStats} from '../src/assembly.js';
import {WEAPONS} from '../src/catalog.js';
import {learn,ABILITIES,modifiers} from '../src/systems/abilities.js';
import {eligible,rollChoices} from '../src/systems/progression.js';
import {startReload,tickWeapons} from '../src/combat-feel.js';
import {specializationHit,specializationKill,prepareSpecializationAttack,isMelee} from '../src/systems/weapon-specialization.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('all weapons obey damage and melee critical chance without extra range',()=>{
 for(const [key,d] of Object.entries(WEAPONS).filter(([key])=>key!=='drone')){
  const s=createRun(),p=createPart(s,key),base=weaponStats(s,p);s.arms=[p];learn(s,'might.0');near(weaponStats(s,p).damage/base.damage,1.1);
  learn(s,'melee.0');learn(s,'ranged.0');near(weaponStats(s,p).damage/base.damage,isMelee(d)?1.3:1.25);
  learn(s,'melee.1');near(weaponStats(s,p).crit,base.crit+(isMelee(d)?.1:0));
  learn(s,'ranged.2');near(weaponStats(s,p).crit,base.crit+(isMelee(d)?.1:0));near(weaponStats(s,p).range,base.range);
 }
});
test('combo fourth hit only; target, time, weapon and secondary boundaries',()=>{
 const s=createRun();learn(s,'melee.2');const w=weaponStats(s,s.arms[0]),e={id:1};
 assert.deepEqual(Array.from({length:4},()=>specializationHit(s,e,w)),[1,1,1,1.5]);
 specializationHit(s,e,w);specializationHit(s,e,w);assert.equal(specializationHit(s,{id:2},w),1);s.time=4;assert.equal(specializationHit(s,e,w),1);
 assert.equal(specializationHit(s,e,{...w,secondary:'echo'}),1);assert.equal(specializationHit(s,e,{...w,repeat:true}),1);assert.equal(specializationHit(s,e,{...w,partId:999}),1);
});
test('frenzy accelerates only melee for four seconds and does not stack',()=>{
 const s=createRun(),melee=s.arms[0],ranged=createPart(s,'arc');learn(s,'melee.3');const m=weaponStats(s,melee),r=weaponStats(s,ranged);
 specializationKill(s,m);near(weaponStats(s,melee).interval,m.interval/1.25);near(weaponStats(s,ranged).interval,r.interval);
 specializationKill(s,m);near(weaponStats(s,melee).interval,m.interval/1.25);s.time=4;near(weaponStats(s,melee).interval,m.interval);
});
test('reload speed applies to every charged weapon; full salvo remains ranged-only',()=>{
 for(const [key,d] of Object.entries(WEAPONS).filter(([key,d])=>key!=='drone'&&!isMelee(d)&&d.magazine)){
  const s=createRun(),p=createPart(s,key);s.arms=[p];learn(s,'ranged.1');learn(s,'ranged.3');const w=weaponStats(s,p);
  near(prepareSpecializationAttack(s,p,w).damage,w.damage);p.ammo=0;assert.ok(startReload(s,p));near(p.reloadDuration,d.reload*.8);tickWeapons(s,p.reloadDuration);
  near(prepareSpecializationAttack(s,p,w,true).damage,w.damage);near(prepareSpecializationAttack(s,p,w).damage,w.damage*1.3);near(prepareSpecializationAttack(s,p,w).damage,w.damage);
 }
 for(const [key,d] of Object.entries(WEAPONS).filter(([,d])=>isMelee(d)&&d.magazine)){
  const s=createRun(),p=createPart(s,key);s.arms=[p];learn(s,'ranged.1');learn(s,'ranged.3');const w=weaponStats(s,p);
  p.ammo=0;assert.ok(startReload(s,p));near(p.reloadDuration,d.reload*.8);tickWeapons(s,p.reloadDuration);
  near(prepareSpecializationAttack(s,p,w).damage,w.damage);
 }
});
test('actual attack consumes charged salvo once and direct melee kills trigger frenzy',()=>{
 const s=createRun();s.world={walkable:()=>true,lineClear:()=>true};s.rng=()=>.99;const p=createPart(s,'seed');s.arms=[p];learn(s,'ranged.3');p.ammo=0;startReload(s,p);tickWeapons(s,2);spawnEnemy(s,'normal',{x:5,z:0});attack(s,0);near(s.shots[0].w.damage,weaponStats(s,p).damage*1.3);assert.equal(p.fullSalvoReady,false);
 const m=createRun();m.world={walkable:()=>true,lineClear:()=>true};m.rng=()=>.99;learn(m,'melee.3');const e=spawnEnemy(m,'normal',{x:1,z:0});e.hp=1;attack(m,0);assert.equal(m.specialization.frenzyUntil,4);
});
test('equipment controls specialization offers without permanently locking a branch',()=>{
 const s=createRun();for(let i=0;i<30;i++)assert.ok(rollChoices(s).some(c=>c.id==='melee.0'));
 assert.equal(eligible(s,ABILITIES['ranged.0']),false);s.arms=[createPart(s,'arc')];assert.equal(eligible(s,ABILITIES['ranged.0']),true);assert.equal(eligible(s,ABILITIES['melee.0']),false);
 learn(s,'ranged.0');learn(s,'ranged.2');assert.ok(eligible(s,ABILITIES['ranged.3']));s.arms.push(createPart(s,'claws'));assert.ok(eligible(s,ABILITIES['melee.0']));
});

test('reworked skills retain IDs and preserve projectile effects',()=>{
 const s=createRun(),p=createPart(s,'seed'),base=weaponStats(s,p);
 // Saved runs store these IDs; resolving them must now grant the new bonuses.
 s.abilities.learned=['melee.1','ranged.2','tempo.2','projectiles.2'];
 const b=modifiers(s),w=weaponStats(s,p);
 near(w.range,base.range);near(w.crit,base.crit);near(w.critPower,base.critPower);near(w.speed,base.speed*1.2);assert.equal(b.criticalTempo,true);near(b.criticalTempoReduction,.15);assert.equal(b.splinter,true);assert.equal(b.ballisticGrowth,true);
 for(const a of Object.values(ABILITIES))for(const key of ['range','reach','meleeReach','rangedReach'])assert.equal(a.bonus[key],undefined,a.id+': '+key);
 learn(s,'might.1');learn(s,'might.2');near(weaponStats(s,p).crit,base.crit+.1);near(weaponStats(s,p).critPower,base.critPower);assert.equal(modifiers(s).rupture,true);
 p.upgrades.crit=100;assert.equal(weaponStats(s,p).crit,.75);
});
test('remaining critical chance and multiplier affect actual melee and arc damage',()=>{
 for(const key of ['claws','arc']){
  function hit(learned){const s=createRun();s.world={walkable:()=>true,lineClear:()=>true};s.rng=()=>.12;s.arms=[createPart(s,key)];for(const id of learned)learn(s,id);
   const enemy=spawnEnemy(s,'normal',{x:0,z:1});enemy.hp=enemy.maxHp=10000;enemy.armor=0;attack(s,0);
   return s.events.find(e=>e.type==='enemy-damage'&&e.target===enemy.id);
  }
   const base=hit([]),critical=hit([key==='claws'?'melee.1':'might.1','tempo.2','projectiles.2']);
  assert.equal(base.critical,false);assert.equal(critical.critical,true);near(critical.amount,base.amount*1.5);
 }
});

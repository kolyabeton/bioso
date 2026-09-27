import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,attack,spawnEnemy} from '../src/game.js';
import {createPart,stats,weaponStats} from '../src/assembly.js';
import {ABILITIES,abilityDescriptionAtLevel,learn,modifiers} from '../src/systems/abilities.js';
import {prepareAbilityAttack} from '../src/systems/ability-combat.js';
import {prepareSpecializationAttack} from '../src/systems/weapon-specialization.js';
import {consumeRound} from '../src/combat-feel.js';
import {translateText} from '../src/i18n/index.js';

const run=()=>createRun(undefined,'survival',925);
const equip=(s,key)=>{const arm=createPart(s,key,1);s.arms=[arm,null,null,null];return arm;};
const max=(s,id)=>{while(learn(s,id));};
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-9,`${actual} != ${expected}`);

test('ammo branch has the approved rank caps, curves, and translations',()=>{
 assert.deepEqual(['ammo.0','ammo.1','ammo.2','ammo.3'].map(id=>ABILITIES[id].maxLevel),[5,3,3,1]);
 assert.match(abilityDescriptionAtLevel(ABILITIES['ammo.0'],5),/5 зарядов/);
 assert.match(abilityDescriptionAtLevel(ABILITIES['ammo.1'],3),/35%/);
 assert.match(abilityDescriptionAtLevel(ABILITIES['ammo.2'],3),/35%/);
 for(const id of ['ammo.0','ammo.1','ammo.2','ammo.3'])for(let rank=1;rank<=ABILITIES[id].maxLevel;rank++)assert.doesNotMatch(translateText(abilityDescriptionAtLevel(ABILITIES[id],rank),'en'),/[А-Яа-яЁё]/u,`${id}@${rank}`);
});

test('reserve chambers add one loaded and maximum charge per rank to every magazine weapon',()=>{
 const s=run(),shotgun=equip(s,'shotgun'),seed=createPart(s,'seed',1);s.inventory=[seed];
 assert.equal(shotgun.ammo,2);assert.equal(seed.ammo,12);
 learn(s,'ammo.0');assert.equal(shotgun.ammo,3);assert.equal(seed.ammo,13);
 assert.equal(weaponStats(s,shotgun).magazine,3);assert.equal(weaponStats(s,seed).magazine,13);
 shotgun.affixes=[{stat:'magazine',value:2}];assert.equal(weaponStats(s,shotgun).magazine,5);
 max(s,'ammo.0');assert.equal(modifiers(s).ammoCapacity,5);assert.equal(weaponStats(s,shotgun).magazine,9);
});

test('full load and triple chamber snapshot once from three starting charges',()=>{
 const s=run(),arm=equip(s,'shotgun'),target={id:1,x:2,y:0,z:0};max(s,'ammo.1');max(s,'ammo.2');learn(s,'ammo.3');
 arm.ammo=3;const charged=prepareAbilityAttack(s,arm,{partId:arm.id,mode:'projectile',magazine:3,damage:10,interval:1},target);
 near(charged.damage,20.25);assert.equal(charged.ammoCost,2);near(charged.ammoRefundChance,.35);
 arm.ammo=2;const tail=prepareAbilityAttack(s,arm,{partId:arm.id,mode:'projectile',magazine:3,damage:10,interval:1},target);
 assert.equal(tail.damage,10);assert.equal(tail.ammoCost,undefined);assert.equal(tail.ammoRefundChance,undefined);
 arm.ammo=3;const echo=prepareAbilityAttack(s,arm,{partId:arm.id,mode:'projectile',magazine:3,damage:10,interval:1,repeat:true},target,true);
 assert.equal(echo.damage,10);assert.equal(echo.ammoCost,undefined);assert.equal(echo.ammoRefundChance,undefined);
});

test('reverse feed rolls once per whole volley and refunds exactly what that attack spent',()=>{
 const s=run(),arm=equip(s,'shotgun');learn(s,'ammo.0');max(s,'ammo.2');learn(s,'ammo.3');arm.ammo=3;
 let rolls=0;s.rng=()=>{rolls++;return .34;};consumeRound(s,arm,{ammoCost:2,ammoRefundChance:.35});
 assert.equal(rolls,1);assert.equal(arm.ammo,3);assert.equal(s.events.filter(e=>e.type==='soul-proc'&&e.kind==='ammo-refund').length,1);
 s.rng=()=>{rolls++;return .36;};consumeRound(s,arm,{ammoCost:2,ammoRefundChance:.35});
 assert.equal(rolls,2);assert.equal(arm.ammo,1);
});

test('full salvo multiplies with full load and triple chamber',()=>{
 const s=run(),arm=equip(s,'shotgun'),target={id:1,x:2,y:0,z:0};learn(s,'ranged.3');max(s,'ammo.1');learn(s,'ammo.3');arm.ammo=3;arm.fullSalvoReady=true;
 const salvo=prepareSpecializationAttack(s,arm,{partId:arm.id,mode:'projectile',magazine:3,damage:10,interval:1});
 const charged=prepareAbilityAttack(s,arm,salvo,target);near(charged.damage,10*1.3*1.35*1.5);assert.equal(charged.ammoCost,2);
});

test('real seeder, spreader, and melee attacks spend two rounds only from a three-charge start',()=>{
 for(const [key,z] of [['seed',5],['shotgun',5],['claws',1]]){
  const s=run(),arm=equip(s,key),enemy=spawnEnemy(s,'normal',{x:0,z});enemy.hp=enemy.maxHp=100000;enemy.speed=enemy.damage=0;
  learn(s,'ammo.0');max(s,'ammo.1');learn(s,'ammo.3');s.rng=()=>.99;
  const base=weaponStats(s,arm).damage,before=arm.ammo;attack(s,0);
  assert.equal(arm.ammo,before-2,key);
  if(key==='shotgun')assert.equal(s.shots.length,5);
  if(key!=='claws')assert.ok(s.shots.every(shot=>Math.abs(shot.w.damage-base*1.35*1.5)<1e-9),key);
 }
 const s=run(),arm=equip(s,'seed');learn(s,'ammo.0');max(s,'ammo.1');learn(s,'ammo.3');s.enemies=[];const ammo=arm.ammo;
 attack(s,1,stats(s));assert.equal(arm.ammo,ammo);
});

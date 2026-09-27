import test from 'node:test';
import assert from 'node:assert/strict';
import {difficultyBossDamage,difficultyProfile,difficultyTime,normalizeDifficulty} from '../src/systems/difficulty.js';
import {enemyAttackSpeed,tickModularAttack} from '../src/systems/enemy-combat.js';
import {createRun,spawnEnemy} from '../src/game.js';
import {newProfile,stats} from '../src/assembly.js';
import {createWorldRun} from '../src/world-run.js';
import {enemyBalance,SURVIVAL_PRESSURE,survivalPressureProfile} from '../src/systems/balance.js';
import {createSettings,normalizeSettings} from '../src/ui/settings.js';
import {MISSION_BOSSES,setupMissionBoss,tickMissionBoss} from '../src/systems/mission-bosses.js';

test('difficulty persists, defaults to hard and clamps invalid input',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
 const settings=createSettings(storage);assert.equal(settings.get().difficulty,100);
 settings.update('difficulty',25);assert.equal(createSettings(storage).get().difficulty,25);
 assert.equal(normalizeSettings({difficulty:Infinity}).difficulty,100);
 assert.equal(normalizeDifficulty(-20),0);assert.equal(normalizeDifficulty(120),100);
});
const spawn=(difficulty,time=0,kind='normal')=>{const s=createRun(newProfile(),'survival',123);s.difficulty=difficulty;return spawnEnemy(s,kind,{x:10,z:10},'mass',time,{promote:false,introductory:false});};
test('hard retains existing stats and easy reduces both initial stats and time growth',()=>{
 for(const time of [0,480,1200,2700]){
  const hard=spawn(100,time),p=enemyBalance(time),late=survivalPressureProfile(time,100);
  assert.equal(hard.hp,Math.round(Math.round(p.hp*SURVIVAL_PRESSURE.hp)*late.health));
  assert.equal(hard.damage,p.damage*late.damage);assert.equal(hard.speed,p.speed*SURVIVAL_PRESSURE.speed*late.speed);
  const easy=spawn(0,time),middle=spawn(50,time);
  assert.ok(easy.hp<middle.hp&&middle.hp<hard.hp);assert.ok(easy.damage<middle.damage&&middle.damage<hard.damage);
 }
 assert.equal(difficultyTime({difficulty:0},600),300);
 assert.equal(difficultyProfile(0).growth,.5);
 assert.ok(spawn(0,480).hp/spawn(0).hp<spawn(100,480).hp/spawn(100).hp);
});
test('extra HP and damage growth starts at real minute twenty and doubles by minute thirty at every difficulty',()=>{
 for(const difficulty of [0,25,50,75,100])for(const minute of [19,20,25,30])for(const kind of ['normal','elite']){
  const time=minute*60,statTime=difficultyTime({difficulty},time),profile=difficultyProfile(difficulty);
  const legacy=(kind==='elite'?5.47:16.0256)**(Math.max(0,statTime/60-15)/21);
  const extra=minute<=20?1:minute===25?Math.sqrt(2):2;
  const expected=Math.round(Math.round(enemyBalance(statTime,kind).hp*1.3)*legacy*extra)*profile.stats;
  const enemy=spawn(difficulty,time,kind);
  assert.equal(enemy.hp,expected,`${difficulty}/${minute}/${kind}`);
  const baseDamage=enemyBalance(statTime,kind).damage*(1+.06*(1+Math.max(0,(difficulty-50)/50))*Math.max(0,statTime/60-15))*extra*profile.damage;
  assert.ok(Math.abs(enemy.damage-baseDamage)<1e-9,`${difficulty}/${minute}/${kind} damage`);
 }
});
test('every boss uses the same half, one and two health damage anchors',()=>{
 assert.deepEqual([0,50,100].map(difficultyBossDamage),[.5,1,2]);
});
test('fixed habitats and mission boss stat overrides respect the selected difficulty',()=>{
 const hard=createWorldRun(newProfile(),'survival',20317,100),easy=createWorldRun(newProfile(),'survival',20317,0);
 assert.equal(hard.bossHabitats.length,easy.bossHabitats.length);assert.equal(hard.bossHabitats.length,5);
 for(let i=0;i<5;i++){
  const h=hard.enemies.find(e=>e.id===hard.bossHabitats[i].id),e=easy.enemies.find(e=>e.id===easy.bossHabitats[i].id);
  assert.equal(e.hp,h.hp*.35);assert.equal(e.damage,h.damage*.25);assert.equal(e.armor,0);assert.equal(e.speed,h.speed*(.8*.7)/2);
 }
 const h=spawn(100,0,'boss'),e=spawn(0,0,'boss');
 setupMissionBoss(hard,h,'boss-mercury-hunter');setupMissionBoss(easy,e,'boss-mercury-hunter');
 assert.equal(e.damage,h.damage*.25);assert.equal(e.speed,h.speed*(.8*.7)/2);assert.equal(e.armor,0);assert.equal(h.difficultyAttackRate,2);assert.equal(e.difficultyAttackRate,.7);
});

test('post-fifteen curves hit the approved normal, elite and boss checkpoints',()=>{
 const expected={
  50:{20:[39,537.75,8541],36:[1176,8693.25,16380],40:[2611.5,16834.5,18720]},
  75:{20:[74.375,908.25,11648],36:[3003,17913.875,23205],40:[7371.875,37061.5,27755]},
  100:{20:[141,1491,15392],36:[7579,36381,33280],40:[19789,77844,39520]},
 };
 for(const difficulty of [50,75,100])for(const minute of [20,36,40]){
  const values=['normal','elite','boss'].map(kind=>spawn(difficulty,minute*60,kind).hp);
  assert.deepEqual(values,expected[difficulty][minute],`${difficulty} at ${minute} minutes`);
 }
 const hardBoss=spawn(100,36*60,'boss'),middleBoss=spawn(50,36*60,'boss');
 assert.equal(hardBoss.difficultyAttackRate,2);assert.equal(middleBoss.difficultyAttackRate,1);
 assert.ok(Math.abs(hardBoss.speed/(enemyBalance(36*60,'boss').speed*SURVIVAL_PRESSURE.speed)-2)<1e-9);
 assert.equal(survivalPressureProfile(20*60,50).damage,1.3);assert.equal(survivalPressureProfile(20*60,100).damage,1.6);
 assert.equal(survivalPressureProfile(36*60,100).damage,3.52*2**1.6);
});
test('easy health stays reduced while damage is one quarter and medium and hard stay unchanged',()=>{
 assert.equal(difficultyProfile(0).stats,.5*.7);
 assert.equal(difficultyProfile(0).damage,.25);
 assert.equal(difficultyProfile(25).damage,.5);
 assert.equal(difficultyProfile(50).damage,.75);
 assert.equal(difficultyProfile(100).damage,1);
 assert.equal(difficultyProfile(25).stats,.55);
 assert.equal(difficultyProfile(50).stats,.75);
 assert.equal(difficultyProfile(75).stats,.875);
 assert.equal(difficultyProfile(100).stats,1);
 assert.equal(difficultyProfile(0).rest,50);
 assert.equal(difficultyProfile(50).rest,35);
 assert.equal(difficultyProfile(100).rest,20);
});
test('hard removes one maximum hero HP only across the upper half of the slider',()=>{
 const values=[0,25,50,75,100].map(difficulty=>{const s=createRun(newProfile(),'survival',123);s.difficulty=difficulty;return stats(s).hp;});
 assert.deepEqual(values.slice(0,3),[100,100,100]);assert.equal(values[3],88);assert.equal(values[4],75);
});
test('armor is zero on easy, unchanged on medium and 30 percent stronger on hard',()=>{
 for(const [difficulty,multiplier] of [[0,0],[50,.75],[100,1.3]]){
  assert.equal(difficultyProfile(difficulty).armor,multiplier);
  const elite=spawn(difficulty,0,'elite');assert.equal(elite.armor,15*multiplier);
  const s=createRun(newProfile(),'survival',123);s.difficulty=difficulty;
  for(const [id,p] of Object.entries(MISSION_BOSSES)){
   const b=spawnEnemy(s,'boss',{x:0,z:5},'mass',0,{introductory:false});setupMissionBoss(s,b,id);
   assert.equal(b.armor,p.armor*multiplier,id);
   b.bossCombat.readyAt=Infinity;tickMissionBoss(s,b,0,()=>{});assert.equal(b.armor,p.armor*multiplier,id);
   b.bossCombat.exposedUntil=10;tickMissionBoss(s,b,0,()=>{});assert.equal(b.armor,(p.exposedArmor??p.armor)*multiplier,id);
   b.hp=b.maxHp*.4;tickMissionBoss(s,b,0,()=>{});assert.equal(b.armor,(p.exposedArmor??p.armor)*multiplier,id);
   s.time=20;tickMissionBoss(s,b,0,()=>{});assert.equal(b.armor,p.armor*multiplier,id);s.time=0;
  }
 }
});

test('easy movement and attack rate are another 30 percent slower',()=>{
 for(const value of [0,25,50,75,100]){
  const p=difficultyProfile(value),factor=value<50?.7+.6*value/100:1;
  assert.equal(p.speed,(.8+.2*value/100)*factor);
  assert.equal(p.attackRate,factor);
  assert.equal(spawn(value).difficultyAttackRate,factor);
 }
});

test('easy ranged attacks keep the slower recovery in combat',()=>{
 const delays=[];
 for(const difficulty of [0,50]){
  const s=createRun(newProfile(),'survival',123);s.difficulty=difficulty;s.time=10;
  const e=spawnEnemy(s,'elite',{x:3,z:0},'ranged',0,{promote:false});
  e.enemyAttack.warning={mode:'shot',key:'needle',at:10,recovery:4,range:10,speed:5,x:3,y:0,z:0,dx:1,dz:0};
  tickModularAttack(s,e,s.player,()=>{},true);
  delays.push(e.enemyAttack.readyAt-s.time);
  assert.ok(Math.abs(enemyAttackSpeed(e)/(difficulty===0?.7:1)-3)<1e-10);
 }
 assert.ok(Math.abs(delays[1]/delays[0]-.7)<1e-10);
});

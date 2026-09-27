import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,attack,spawnEnemy,step} from '../src/game.js';
import {createPart,stats,weaponStats,digestionYield,equip,unequip} from '../src/assembly.js';
import {rollAffixes,rollRarity,partAffixes} from '../src/systems/sets-loot.js';
import {gainXP} from '../src/systems/progression.js';
import {CATALOG} from '../src/catalog.js';

function run(){
 const s=createRun(undefined,'survival',91);s.rng=()=>.99;s.arms=[];s.organs=[];s.legs=[];
 s.world.heightAt=()=>0;s.world.lineClear=()=>true;s.world.walkable=()=>true;
 s.waves.credit=-Infinity;s.nextElite=s.nextBoss=Infinity;return s;
}
function part(s,key,affixes=[]){const p=createPart(s,key);p.affixes=affixes.map(([stat,value=1])=>({stat,value}));return p;}
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-7,`${actual} != ${expected}`);

test('weapon rolls exclude old movement, pickup, armor and weight; special pool respects weapon type and rarity',()=>{
 const banned=new Set(['movement','pickup','armor','weight']);
 for(const rarity of ['uncommon','rare','relic'])for(const key of Object.keys(CATALOG).filter(k=>CATALOG[k].kind==='arm')){
  const statsSeen=new Set();for(let i=0;i<100;i++){const rng=()=>((i*.6180339887)%1);for(const affix of rollAffixes({key,rarity},rng)){assert.ok(!banned.has(affix.stat),`${key}: ${affix.stat}`);if(affix.stat==='stationaryDamage')assert.equal(affix.value,.25);statsSeen.add(affix.stat);}}
  if(rarity==='uncommon')assert.ok(![...statsSeen].some(stat=>['burst','homing','rearAttack','woundedFury','closeAssault','doubleKnockback','rangeBoost','stationaryDamage'].includes(stat)));
  if(['shieldArm','drone'].includes(key))assert.ok(![...statsSeen].some(stat=>['burst','homing','rearAttack','woundedFury','closeAssault','doubleKnockback','rangeBoost','stationaryDamage'].includes(stat)));
  if(key==='rocket')assert.ok(!statsSeen.has('homing'));
  if(!CATALOG[key].knockback)assert.ok(!statsSeen.has('doubleKnockback'));
 }
 const old={key:'pistol',affix:{stat:'weight',value:.2}};assert.equal(partAffixes(old)[0].stat,'weight');
});

test('weapon bonuses are local or global and special strengths are fixed',()=>{
 const s=run(),p=part(s,'pistol'),other=part(s,'seed');s.arms=[p,other];const base=weaponStats(s,p),otherBase=weaponStats(s,other);
 p.affixes=[{stat:'rate',value:.05},{stat:'globalDamage',value:.05}];near(weaponStats(s,other).damage,otherBase.damage*1.05);assert.ok(weaponStats(s,other).interval<otherBase.interval);
 p.affixes=[{stat:'localRate',value:.2},{stat:'damage',value:.2}];near(weaponStats(s,p).damage,base.damage*1.2);near(weaponStats(s,other).damage,otherBase.damage);assert.ok(weaponStats(s,p).interval<base.interval);
 p.affixes=[{stat:'rangeBoost',value:.2},{stat:'closeAssault',value:.25},{stat:'doubleKnockback',value:2}];const w=weaponStats(s,p);near(w.range,base.range*1.2*.6);near(w.damage,base.damage*1.25);near(w.knockback,CATALOG.pistol.knockback*2);
});

test('steady stance grants this weapon 25% damage after 3 still seconds and movement resets it',()=>{
 const s=run(),steady=part(s,'pistol',[['stationaryDamage',.25]]),other=part(s,'seed');s.arms=[steady,other];s.legs=[part(s,'universal')];
 const base=weaponStats(s,steady).damage,otherBase=weaponStats(s,other).damage;
 step(s,2.9);near(weaponStats(s,steady).damage,base);
 step(s,.1);near(weaponStats(s,steady).damage,base*1.25);near(weaponStats(s,other).damage,otherBase);
 step(s,.05,{x:1,z:0});near(weaponStats(s,steady).damage,base);
 step(s,3);near(weaponStats(s,steady).damage,base*1.25);
});

test('non-weapon HP, armor, XP, biomass and quality bonuses stack without healing or bypassing relic gate',()=>{
 const s=run(),leg=part(s,'universal',[['maxHp',.1],['armorPct',.1],['xpGain',.1]]),organ=part(s,'digestion',[['biomassYield',.15],['rarityWeight',.15]]);
 s.legs=[part(s,'universal')];const base=stats(s);s.hp=base.hp-20;s.inventory.push(leg);assert.ok(equip(s,leg.id,0));s.organs=[organ];const after=stats(s);assert.ok(Math.abs(after.hp-base.hp*1.1)<1);assert.ok(after.armor<=after.healthDamageBasis);assert.equal(s.hp,base.hp-20);
 s.level=20;const xp=s.xp;gainXP(s,10);assert.equal(s.xp,xp+11);
 const target=part(s,'pistol');s.inventory.push(target);const withBonus=digestionYield(s,target.id);organ.affixes=[];assert.ok(withBonus>=digestionYield(s,target.id));
 assert.ok(unequip(s,'legs',0));assert.equal(s.hp,base.hp-20);
 s.time=479;s.rng=()=>.99999;assert.notEqual(rollRarity(s,'normal'),'relic');assert.equal(rollRarity(s,'boss'),'rare');assert.equal(rollRarity(s,'event'),'rare');
});

test('rear attack fires for projectile, melee, arc, acid and courier without spending a second charge',()=>{
 for(const key of ['pistol','claws','arc','acid','rocket']){
  const s=run(),p=part(s,key,[['rearAttack']]);s.arms=[p];
  for(const x of [2,-3]){const e=spawnEnemy(s,'normal',{x,z:0},'mass',0,{promote:false});e.hp=e.maxHp=100000;e.armor=0;e.speed=e.damage=0;e.enemyAttack.readyAt=Infinity;}
  const before=p.ammo;attack(s,.01);
  assert.equal(s.events.filter(e=>e.type==='attack'&&e.rear).length,1,key);
  if(CATALOG[key].magazine)assert.equal(p.ammo,before-1,key);
  if(['pistol','acid','rocket'].includes(key))assert.ok(s.shots.some(q=>q.w.secondary==='rear'),key);
  else assert.ok(s.enemies[1].hp<100000,key);
 }
});

test('burst is timed separately per equipped arm and is not retriggered by repeat attacks',()=>{
 const s=run(),a=part(s,'pistol',[['burst']]),b=part(s,'seed',[['burst']]);s.arms=[a];
 const e=spawnEnemy(s,'normal',{x:2,z:0},'mass',0,{promote:false});e.hp=e.maxHp=100000;e.armor=0;e.speed=e.damage=0;e.enemyAttack.readyAt=Infinity;
 attack(s,.01);assert.equal(a.affixBurstReadyAt,10);
 s.time=2;s.arms=[b];attack(s,.01);assert.equal(b.affixBurstReadyAt,12);
 s.time=10.1;s.arms=[a];a.cooldown=0;attack(s,.01);assert.ok(a.affixBurstUntil>10.1);assert.equal(b.affixBurstUntil,undefined);
 const ready=a.affixBurstReadyAt;attack(s,0,stats(s),a);assert.equal(a.affixBurstReadyAt,ready);
});

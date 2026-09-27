import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {createRun,spawnEnemy,hurtEnemy,attack,step,randomLoot,applyStartingLoadout} from '../src/game.js';
import {createPart,stats,weaponStats,upgrade,upgradeOptions,upgradeLimit,weight,equip,unequip,readProfile} from '../src/assembly.js';
import {receiveHit} from '../src/systems/health.js';
import {shieldArmReduction,frontalShieldReduction,SHIELD_AURA_RADIUS} from '../src/systems/shield-arm.js';
import {validLoadout,starterAllowed,normalizeMeta} from '../src/systems/meta-progression.js';
import {achievementById,achievementProgress,trackAchievements,achievementArt} from '../src/systems/achievements.js';
import {weaponSustainedDps,comparisonRows,cloneForComparison,unlockCondition} from '../src/ui/adapters.js';
import {itemInspectorData} from '../src/ui/item-inspector-data.js';
import {toggleWeapon} from '../src/combat-feel.js';
import {partModelId} from '../src/asset-models.js';
import {partArt} from '../src/ui/molecules.js';
import {translateText} from '../src/i18n/index.js';
import {WEAPONS,CATALOG} from '../src/catalog.js';
import {slimePace} from '../src/systems/organs/combat.js';

const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function fixture(count=1,tier=1){
 const s=createRun(undefined,'survival',123);s.body=createPart(s,'bastion');
 s.arms=Array.from({length:3},(_,i)=>i<count?createPart(s,'shieldArm',tier):null);
 for(const p of [s.body,...s.arms,...s.legs].filter(Boolean)){p.affixes=[];p.setId=null;p.modifier=null;}
 s.organs=[];s.inventory=[];s.rng=()=>.99;s.player={x:0,y:0,z:0,facing:0};s.hp=stats(s).hp;s.events=[];
 s.world.walkable=()=>true;s.world.lineClear=()=>true;s.world.heightAt=()=>0;
 s.health.armorSpent=10000;s.reliefUntil=Infinity;s.waves.credit=-1e6;s.nextElite=s.nextBoss=Infinity;
 return s;
}
const shot=angle=>({cause:'projectile',dx:-Math.sin(angle),dz:-Math.cos(angle)});
const hit=(s,options)=>receiveHit(s,{...stats(s),armor:0,dodge:0},options);
const save=p=>readProfile({getItem:()=>JSON.stringify(p)});

test('front arc follows incoming travel, includes boundaries and rotates with the body',()=>{
 for(const facing of [0,.7,-Math.PI+.1])for(const offset of [0,Math.PI/3,-Math.PI/3,Math.PI/3+.001,-Math.PI/3-.001,Math.PI]){
  const s=fixture();s.player.facing=facing;near(frontalShieldReduction(s,shot(facing+offset)),Math.abs(offset)<=Math.PI/3?.5:0);
 }
 const s=fixture();near(frontalShieldReduction(s,{...shot(0),source:{x:0,z:-10}}),.5);
 near(frontalShieldReduction(s,{cause:'projectile',projectile:{dx:0,dz:-1},dx:1,dz:0}),.5);
 near(frontalShieldReduction(s,{cause:'projectile'}),0);
});
test('active shields stack 50/80/80 percent independently of rank, upgrades and cooldown',()=>{
 for(const [count,reduction] of [[1,.5],[2,.8],[3,.8]]){
  const s=fixture(count,5);for(const p of s.arms.filter(Boolean)){p.upgrades.damage=20;p.cooldown=5;p.reloadRemaining=5;}
  near(shieldArmReduction(s),reduction);const before=s.hp;assert.equal(hit(s,{damage:1,...shot(0)}),'hurt');near(before-s.hp,reduction===.5?13:5);
 }
 const s=fixture(2);toggleWeapon(s,0);near(shieldArmReduction(s),.5);unequip(s,'arms',1);near(shieldArmReduction(s),0);equip(s,s.inventory[0].id,1);near(shieldArmReduction(s),.5);
});
test('melee, explosions, acid and flank/rear projectiles bypass the arm shield',()=>{
 for(const options of [{cause:'contact'},{cause:'explosion'},{cause:'acid-puddle'},shot(Math.PI/2),shot(Math.PI)]){
  const s=fixture(3),before=s.hp;hit(s,{damage:1,...options});near(before-s.hp,25);
 }
});
test('armor spends fractional plates; full organ, consumable and set blocks remain intact',()=>{
 for(const [count,reduction]of [[1,.5],[2,.8],[3,.8]]){
  const s=fixture(count);s.health.armorSpent=0;const before=s.hp;
  assert.equal(receiveHit(s,{...stats(s),dodge:0},{damage:1,...shot(0)}),'armor');near(s.health.armorSpent,.5*(1-reduction));near(s.hp,before);
 }
 for(const mode of ['organ','consumable','set']){
  const s=fixture(),before=s.hp;s.health.armorSpent=0;
  if(mode==='organ'){s.organs=[createPart(s,'shield')];s.organs[0].shieldCharge=1;}
  if(mode==='consumable')s.consumables={shieldCharges:1,shieldUntil:10};
  if(mode==='set'){for(const p of [s.body,s.arms[0],s.legs[0]])p.setId='bastion';receiveHit(s,{...stats(s),dodge:0},{damage:0});s.time=12;}
  assert.equal(receiveHit(s,{...stats(s),dodge:0},{damage:1,...shot(0)}),'shield',mode);near(s.hp,before);near(s.health.armorSpent,0);assert.ok(!s.events.some(e=>e.type==='shield-reduction'));
 }
});
test('rank and upgrades strengthen the aura without creating an attack',()=>{
 for(let tier=1;tier<=5;tier++){
  const s=fixture(1,tier),p=s.arms[0],base=10+.8*(tier-1);near(weaponStats(s,p).damage,0);near(weaponStats(s,p).auraDps,base);near(weaponSustainedDps(s,p),base);
  assert.deepEqual(upgradeOptions(p,s),['damage']);assert.equal(upgradeLimit(p),20);s.biomass=2000;
  for(let i=0;i<20;i++)assert.ok(upgrade(s,p.id,'damage',true));near(weaponStats(s,p).auraDps,base*3.4);near(weaponStats(s,p).damage,0);assert.equal(upgrade(s,p.id,'damage',true),false);near(shieldArmReduction(s),.5);
 }
 const s=fixture();s.abilities.learned.push('might.0','melee.0','tempo.0');assert.ok(weaponStats(s,s.arms[0]).auraDps>10);near(weaponStats(s,s.arms[0]).damage,0);
 near(weight(fixture().arms[0]),50);near(weight(fixture(1,5).arms[0]),50*1.15**4);
});
test('enabled shield auras stack damage and slowing without creating an attack',()=>{
 const s=fixture(2),inside=spawnEnemy(s,'normal',{x:0,z:2},'mass',0,{promote:false}),fringe=spawnEnemy(s,'normal',{x:SHIELD_AURA_RADIUS-.3,z:0},'mass',0,{promote:false}),outside=spawnEnemy(s,'normal',{x:0,z:8},'mass',0,{promote:false});
 for(const e of [inside,fringe,outside])Object.assign(e,{hp:10000,maxHp:10000,armor:0,speed:0,damage:0});
 s.arms[1].tier=5;attack(s,1);assert.equal(s.events.filter(e=>e.type==='attack'||e.type==='melee-windup').length,0);near(inside.hp,10000);
 step(s,.1,{x:0,z:0});assert.ok(inside.hp<10000);assert.ok(fringe.hp<10000);near(outside.hp,10000);near(inside.shieldAuraSlow,.2);near(slimePace(s,inside),.8);assert.equal(s.events.filter(e=>e.type==='attack'&&e.key==='shieldArm').length,0);
 const first=10000-inside.hp;near(first,s.arms.filter(Boolean).reduce((sum,p)=>sum+weaponStats(s,p).auraDps,0));
 assert.equal(s.events.filter(e=>e.type==='enemy-damage'&&e.source==='shield-aura'&&e.target===inside.id).length,1);
 for(let i=0;i<9;i++)step(s,.1,{x:0,z:0});near(inside.hp,10000-first);
 s.arms[1].disabled=true;const prior=inside.hp;step(s,.1,{x:0,z:0});near(prior-inside.hp,weaponStats(s,s.arms[0]).auraDps);near(inside.shieldAuraSlow,.1);
 s.arms[0].disabled=true;const stopped=inside.hp;step(s,.1,{x:0,z:0});near(inside.hp,stopped);
 const triple=fixture(3),target=spawnEnemy(triple,'normal',{x:0,z:2},'mass',0,{promote:false});
 Object.assign(target,{hp:10000,maxHp:10000,armor:0,speed:0,damage:0});
 step(triple,.1,{x:0,z:0});near(10000-target.hp,30);near(target.shieldAuraSlow,.3);near(slimePace(triple,target),.7);
});
test('Fire boosts aura damage and Cold treats its slow as a shared cold effect',()=>{
 const sample=learned=>{const s=fixture(),e=spawnEnemy(s,'normal',{x:0,z:2},'mass',0,{promote:false});Object.assign(e,{hp:10000,maxHp:10000,armor:0,speed:0,damage:0});s.abilities.learned.push(...learned);step(s,.1,{x:0,z:0});return{s,e,damage:10000-e.hp};};
 const plain=sample([]),fire=sample(['fire.1']),cold=sample(['cold.0','cold.1','cold.2','cold.3']);
 assert.ok(fire.damage>plain.damage,`${fire.damage} <= ${plain.damage}`);
 assert.ok(cold.e.chillHits>=1);assert.ok(slimePace(cold.s,cold.e)<1);
 cold.e.x=12;cold.e.z=12;step(cold.s,.1,{x:0,z:0});assert.ok(slimePace(cold.s,cold.e)<1,'Permafrost must keep shield slow after leaving');
});
test('actual hostile projectile resolution forwards incoming direction to the health pipeline',()=>{
 for(const [direction,expected]of [[-1,13],[1,25]]){
  const s=fixture(),before=s.hp;s.arms[0].cooldown=Infinity;
  s.hostileShots=[{id:999,x:0,y:1,z:-direction*1.1,dx:0,dz:direction,dy:0,speed:10,life:2,damage:1}];
  for(let i=0;i<10&&s.hp===before;i++)step(s,.02,{x:0,z:0});near(before-s.hp,expected);
 }
});
function killShield(s,source='direct',options={}){
 const e=spawnEnemy(s,'normal',{x:0,z:5},'mass',0,{promote:false});Object.assign(e,{recipeId:'shield-bearer',specialty:'shield-bearer',armor:0},options);hurtEnemy(s,e,1e8,0,source,false,'claws');return e;
}
test('shield-bearers accumulate across missions/survival, unlock once at thirty and persist',()=>{
 const s=fixture();s.mode='garden';for(let i=0;i<15;i++)killShield(s,'summon');const next=fixture();next.profile=save(s.profile);for(let i=0;i<14;i++)killShield(next);
 const a=achievementById('weapon:shieldArm');assert.deepEqual(achievementProgress(next,next.profile,a),[29]);assert.ok(!next.profile.unlocked.includes('shieldArm'));assert.ok(!starterAllowed(next.profile,'shieldArm'));
 const e=killShield(next,'summon',{kind:'elite'});hurtEnemy(next,e,1e8);trackAchievements(next);assert.equal(next.profile.meta.shieldBearerKills,30);assert.ok(next.profile.achievements.includes(a.id));assert.equal(next.ground.filter(q=>q.part?.key==='shieldArm').length,1);
 assert.equal(starterAllowed(next.profile,'shieldArm'),true);assert.equal(validLoadout(next.profile,{arm:'shieldArm'}).arm,'pistol');applyStartingLoadout(next,{arm:'shieldArm'});assert.equal(next.arms[0].key,'pistol');
 for(let i=0;i<5;i++)killShield(next);trackAchievements(next);assert.equal(next.ground.filter(q=>q.part?.key==='shieldArm').length,1);const p=save(next.profile);p.unlocked=p.unlocked.filter(k=>k!=='shieldArm');assert.ok(save(p).unlocked.includes('shieldArm'));
});
test('ineligible deaths do not count; old/malformed profiles and loot preserve the achievement gate',()=>{
 const s=fixture();killShield(s,'environment');for(const options of [{bossOwner:1},{noRewards:true},{kind:'objective'},{recipeId:'worker',specialty:null}])killShield(s,'direct',options);assert.equal(s.profile.meta.shieldBearerKills,0);
 for(const shieldBearerKills of [undefined,-1,'30',Infinity])assert.equal(normalizeMeta({shieldBearerKills}).shieldBearerKills,0);
 for(let i=0;i<150;i++)assert.notEqual(randomLoot(s,'boss','arm').key,'shieldArm');s.profile.unlocked.push('shieldArm');assert.equal(randomLoot(s,'normal','arm',Object.keys(WEAPONS).filter(k=>k!=='shieldArm')).key,'shieldArm');
});
test('model, art and inspectors resolve, legacy parts stay unchanged and new copy is translated',()=>{
 const s=fixture(),p=s.arms[0];assert.equal(partModelId(p),'arm-shield');assert.ok(existsSync('public/assets/kit/arm-shield.glb'));assert.match(partArt('shieldArm'),/items\/shield-arm-v1\.png/);assert.ok(existsSync('public/assets/ui/items/shield-arm-v1.png'));assert.notEqual(partArt('shieldArm'),partArt('hammer'));
 const info=itemInspectorData(s,p);assert.deepEqual(info.options,[{key:'damage',label:'Урон ауры'}]);for(const [label,value]of [['Вес','50'],['Защита от снарядов','50% спереди · сектор 120°']])assert.ok(info.rows.some(r=>r.label===label&&r.value===value));assert.ok(info.rows.some(r=>r.label==='Урон ауры'));assert.ok(!info.rows.some(r=>r.label==='DPS'||r.label==='Интервал атак'));
 const before=cloneForComparison(s),after=cloneForComparison(s);after.arms[1]=createPart(s,'shieldArm');assert.ok(comparisonRows(before,after,{group:'arms',slot:1}).some(r=>r.label==='Защита спереди'&&r.before==='50%'&&r.after==='80%'));
 assert.match(unlockCondition('shieldArm'),/30 щитоносцев/);const a=achievementById('weapon:shieldArm');assert.ok(existsSync('public'+achievementArt(a)));
 for(const text of [a.name,a.description,a.lore,a.conditions[0].label,CATALOG.shieldArm.description,...info.rows.flatMap(r=>[r.label,r.value])])assert.doesNotMatch(translateText(text,'en'),/[А-Яа-яЁё]/u,text);
 assert.equal(CATALOG.hammer.damage,50);assert.equal(CATALOG.hammer.weight,24);assert.equal(CATALOG.shield.kind,'organ');
});

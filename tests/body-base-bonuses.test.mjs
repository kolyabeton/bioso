import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,hurtEnemy,spawnEnemy,attack,step} from '../src/game.js';
import {createPart,stats,weaponStats} from '../src/assembly.js';
import {shieldRechargeDelay,tickHealth} from '../src/systems/health.js';
import {reloadDuration} from '../src/systems/sets-loot.js';
import {gainXP} from '../src/systems/progression.js';
import {partPropertyRows} from '../src/ui/adapters.js';
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);

test('Gardener dodge is unconditional, additive and capped independently of Runner and Repair Kits',()=>{
 const s=createRun();s.legs.fill(null);near(stats(s).dodge,.2);
 s.organs[0]=createPart(s,'repairGland');near(stats(s).dodge,.2);
 s.organs[1]=createPart(s,'reflexNerve');near(stats(s).dodge,.3);
 s.isaac={deals:{}};s.abilities.learned=['motion.2'];s.abilities.levels={'motion.2':100};assert.equal(stats(s).dodge<=.7,true);
});

test('Electrician casing and Highrigger critical hits use their fixed body bonuses',()=>{
 const s=createRun(),shield=createPart(s,'shield'),pistol=createPart(s,'pistol');s.organs=[shield];s.arms=[pistol];
 s.body=createPart(s,'reactor');near(shieldRechargeDelay(s,shield),15/1.4);
 s.body=createPart(s,'wanderer');near(shieldRechargeDelay(s,shield),15);
 const normalCrit=weaponStats(s,pistol).critPower;s.body=createPart(s,'hunter');near(weaponStats(s,pistol).critPower,normalCrit*1.25);
});

test('Mechanic shortens each weapon reload by ten percent per full ten percent attack speed bonus',()=>{
 const s=createRun(),pistol=createPart(s,'pistol');s.body=createPart(s,'hecaton');s.arms=[pistol];s.organs=[];
 near(reloadDuration(s,pistol,1.2),1.2);
 pistol.upgrades.rate=1;near(reloadDuration(s,pistol,1.2),1.2);
 s.organs=[createPart(s,'accelerator')];near(reloadDuration(s,pistol,1.2),1.2*.8);
 pistol.upgrades.rate=10;near(reloadDuration(s,pistol,1.2),1.2*.2);
 s.body=createPart(s,'wanderer');near(reloadDuration(s,pistol,1.2),1.2);
});

test('Mason experience keeps fractional gains and Forester heals one percent of max health per second',()=>{
 const s=createRun();s.body=createPart(s,'bastion');s.level=100;s.xp=0;
 for(let i=0;i<10;i++)gainXP(s,1);
 assert.equal(s.xp,11);near(s.xpBonusRemainder,0);
 s.body=createPart(s,'rootwalker');s.organs=[];s.legs=[];const st=stats(s);near(st.regenPerSecond,.01);
 s.hp=st.hp-1;s.time=0;tickHealth(s,st);s.time=1;tickHealth(s,st);near(s.hp,st.hp-1+st.hp*.01);
});

test('Washer acid duration is shown and applied to the puddle spawned by its shot',()=>{
 const s=createRun();s.body=createPart(s,'chimera');s.arms=[createPart(s,'acid')];s.organs=[];s.world.heightAt=()=>0;s.world.lineClear=()=>true;s.world.walkable=()=>true;
 const e=spawnEnemy(s,'normal',{x:4,z:0});e.speed=0;e.damage=0;e.frozenUntil=Infinity;
 assert.equal(partPropertyRows(s.arms[0],s).find(([label])=>label==='Длительность лужи')[1],'4,5 с');
 attack(s,.01);assert.ok(s.shots.some(q=>q.mode==='acid'));
 s.arms=[];for(let i=0;i<100&&!s.puddles.length;i++)step(s,.01);
 assert.ok(s.puddles.length>0);assert.ok(s.puddles[0].life>4.4&&s.puddles[0].life<=4.5);
});

test('Regulator increases damage to enemies frozen by any source only while frozen',()=>{
 const s=createRun();s.body=createPart(s,'regulator');s.arms=[];
 const e=spawnEnemy(s,'normal',{x:3,z:0});e.hp=e.maxHp=1000;e.armor=0;e.speed=0;e.frozenUntil=s.time+2;
 hurtEnemy(s,e,10,0,'acid');near(e.hp,987);
 s.time=3;hurtEnemy(s,e,10,0,'acid');near(e.hp,977);
 s.body=createPart(s,'wanderer');e.frozenUntil=s.time+2;hurtEnemy(s,e,10,0,'acid');near(e.hp,967);
});

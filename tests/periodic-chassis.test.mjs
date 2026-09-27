import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createRun,hurtEnemy,spawnEnemy,attack,step} from '../src/game.js';
import {createPart,upgrade,runnerFireFraction,coolerDamageFraction} from '../src/assembly.js';
import {periodicDamageBonus} from '../src/systems/body-traits.js';
import {prepareIsaacAttack,isaacHit,slimePace,tickCoolerDamage} from '../src/systems/isaac-combat.js';
import {recordRunnerFire,tickRunnerFire} from '../src/systems/runner-fire.js';
import {createFireTrailView} from '../src/fire-trail-view.js';
import {learn} from '../src/systems/abilities.js';
import {onHit,onDeath,tickEffects} from '../src/systems/effects.js';
import {partPropertyRows} from '../src/ui/adapters.js';

const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);
const target=(s,x=1,z=0,hp=1000)=>{const e={id:++s.entityId,x,z,y:0,hp,maxHp:hp,armor:0,radius:.5,kind:'normal',speed:0,born:0,xp:0};s.enemies.push(e);return e;};

test('Washer activates on full biomass thresholds and boosts only periodic damage',()=>{
 const s=createRun();s.body=createPart(s,'chimera');s.arms=[createPart(s,'seed')];s.organs=[];const e=target(s);
 for(const [biomass,bonus] of [[0,0],[49,0],[50,.1],[99,.1],[100,.2],[250,.5],[300,.5]]){
  s.biomass=biomass;near(periodicDamageBonus(s),bonus);e.hp=1000;
  for(const source of ['burn','acid','cooler-dot']){hurtEnemy(s,e,10,0,source);near(e.hp,1000-10*(1+bonus)*(['burn','acid','cooler-dot'].indexOf(source)+1));}
  hurtEnemy(s,e,10,0,'direct');near(e.hp,960-30*bonus);
 }
});

test('Cooler adds ten percent damage per rank and one point per upgrade, then bursts on death',()=>{
 const s=createRun();s.body=createPart(s,'wanderer');s.organs=[createPart(s,'slime',5)];s.arms=[createPart(s,'seed')];s.biomass=1000;
 const p=s.organs[0];for(let i=0;i<10;i++)assert(upgrade(s,p.id,'slimeSlow'));
 near(coolerDamageFraction(p),.6);
 const e=target(s,0,0,50),neighbor=target(s,1,0,100),w=prepareIsaacAttack(s,s.arms[0],{});
 isaacHit(s,e,100,w);near(e.coolerDots[0].dps,12);near(e.slimeSlow,.1);
 s.time=1;tickCoolerDamage(s,1,(enemy,damage,source)=>hurtEnemy(s,enemy,damage,0,source));near(e.hp,38);
 hurtEnemy(s,e,100);near(neighbor.hp,40);assert(s.events.some(event=>event.type==='blast'&&event.key==='cooler'));
 assert.equal(s.isaac?.slimePools?.length||0,0);
});

test('Cooler still bursts when its last damage tick kills the enemy',()=>{
 const s=createRun();s.organs=[createPart(s,'slime')];const e=target(s,0,0,2),neighbor=target(s,1,0,100);
 isaacHit(s,e,100,prepareIsaacAttack(s,s.arms[0],{}));
 s.time=5;tickCoolerDamage(s,5,(enemy,damage,source)=>hurtEnemy(s,enemy,damage,0,source));
 near(neighbor.hp,90);assert(s.events.some(event=>event.type==='blast'&&event.key==='cooler'));
});

test('Cooler counts each weapon hit once for Crystallization and Permafrost extends its slow',()=>{
 const s=createRun();s.organs=[createPart(s,'slime')];learn(s,'cold.0');learn(s,'cold.1');learn(s,'cold.3');s.rng=()=>0;
 const e=target(s),w=prepareIsaacAttack(s,s.arms[0],{});
 for(let i=1;i<=3;i++){
  const added=isaacHit(s,e,100,w);onHit(s,e,100,()=>{},{coldStackAdded:added});
  assert.equal(e.chillHits,i===3?0:i);
 }
 near(e.slimeUntil,7);near(e.frozenUntil,1);
 isaacHit(s,e,100,w);assert.equal(e.chillHits,0);
});

test('Cooler waits until a burrowing target can take damage',()=>{
 const s=createRun();s.organs=[createPart(s,'slime')];learn(s,'cold.0');const e=target(s),w=prepareIsaacAttack(s,s.arms[0],{});
 e.locomotionState={kind:'burrow',phase:'travel'};assert.equal(isaacHit(s,e,100,w),false);assert.equal(e.coolerDots,undefined);
 e.locomotionState.phase='land';assert.equal(isaacHit(s,e,100,w),true);assert.equal(e.coolerDots.length,1);
});

test('Washer puddle counts one cold application per enemy and puddle',()=>{
 const s=createRun();learn(s,'cold.0');learn(s,'cold.3');s.arms=[];s.organs=[];s.rng=()=>1;
 const e=target(s,1,0);s.puddles=[{id:++s.entityId,weaponKey:'acid',x:1,y:0,z:0,radius:2,life:3,slow:.2,damage:0}];
 step(s,.01);assert.equal(e.chillHits,1);
 step(s,.01);assert.equal(e.chillHits,1);
 e.x=5;step(s,.01);e.x=1;step(s,.01);assert.equal(e.chillHits,1);
 s.puddles.push({id:++s.entityId,weaponKey:'acid',x:1,y:0,z:0,radius:2,life:3,slow:.2,damage:0});step(s,.01);assert.equal(e.chillHits,2);
});

test('Washer puddle deals damage only for its remaining lifetime',()=>{
 const s=createRun();s.arms=[];s.organs=[];const e=target(s,1,0,100);
 s.puddles=[{id:++s.entityId,weaponKey:'acid',x:1,y:0,z:0,radius:2,life:.25,slow:.3,damage:10}];
 step(s,.5);near(e.hp,97.5);assert.equal(s.puddles.length,0);
});

test('Permafrost lets Washer slow linger without extending puddle damage',()=>{
 const s=createRun();learn(s,'cold.1');s.arms=[];s.organs=[];const e=target(s,1,0,100);
 s.puddles=[{id:++s.entityId,weaponKey:'acid',x:1,y:0,z:0,radius:2,life:.25,slow:.3,damage:10}];
 step(s,.5);near(e.hp,97.5);near(slimePace(s,e),.7);assert.equal(s.puddles.length,0);
 step(s,1.8);near(e.hp,97.5);near(slimePace(s,e),1);
});

test('Runner leaves a three second fire path using the strongest weapon without overlap stacking',()=>{
 const s=createRun();s.world={heightAt:()=>0,walkable:()=>true,lineClear:()=>true};s.arms=[createPart(s,'seed')];s.legs=[createPart(s,'runner',5),null];s.organs=[];
 near(runnerFireFraction(s.legs[0]),.5);
 const from={x:0,z:0};s.player={x:1.5,z:0};recordRunnerFire(s,from);assert.equal(s.fireTrails.length,2);
 const e=target(s,.75,0,100),dps=s.fireTrails[0].dps;
 tickRunnerFire(s,1,(enemy,damage,source)=>hurtEnemy(s,enemy,damage,0,source));near(e.hp,100-dps);
 tickRunnerFire(s,2,(enemy,damage,source)=>hurtEnemy(s,enemy,damage,0,source));assert.equal(s.fireTrails.length,0);
 for(let i=0;i<10;i++)assert(upgrade(s,s.legs[0].id,'speed'));near(runnerFireFraction(s.legs[0]),.6);
});

test('Runner fire deals damage only for its remaining lifetime',()=>{
 const s=createRun();s.fireTrails=[{id:1,x:1,y:0,z:0,radius:1,life:.25,dps:10}];const e=target(s,1,0,100);
 tickRunnerFire(s,.5,(enemy,amount,source)=>hurtEnemy(s,enemy,amount,0,source));near(e.hp,97.5);assert.equal(s.fireTrails.length,0);
});

test('Runner fire joins nearby samples into a ribbon instead of separate circles',()=>{
 const scene=new T.Scene(),view=createFireTrailView(scene);
 view.update([{id:1,x:0,y:0,z:0,life:3,duration:3},{id:2,x:.75,y:0,z:0,life:3,duration:3}],.1);
 assert.deepEqual(view.info(),{fireTrailPatches:2,fireTrailFlames:1});
 const ground=scene.getObjectByName('runner-fire-trail');assert(ground);assert.equal(ground.geometry.drawRange.count,6);assert.equal(ground.geometry.isInstancedBufferGeometry,undefined);assert(scene.getObjectByName('runner-fire-flames'));
 const positions=ground.geometry.getAttribute('position');assert.notEqual(Math.abs(positions.getZ(0)-positions.getZ(1)),Math.abs(positions.getZ(2)-positions.getZ(5)),'the scorched path must vary in width');
 view.reset();assert.equal(view.info().fireTrailFlames,0);view.dispose();assert.equal(scene.getObjectByName('runner-fire-trail'),undefined);
});

test('Hot Blood multiplies all periodic damage once, independently of Washer biomass',()=>{
 const s=createRun();s.body=createPart(s,'chimera');s.biomass=50;learn(s,'fire.1');const e=target(s);
 for(const source of ['burn','acid','cooler-dot'])hurtEnemy(s,e,10,0,source);
 near(e.hp,1000-3*10*1.1*1.5);
 hurtEnemy(s,e,10,0,'direct');near(e.hp,1000-49.5-10);
 s.body=createPart(s,'wanderer');learn(s,'fire.0');s.rng=()=>0;onHit(s,e,100,()=>{});
 near(e.burn.dps,20);s.time=1;tickEffects(s,1,(enemy,amount,source)=>hurtEnemy(s,enemy,amount,0,source));
 near(e.hp,1000-49.5-10-30);
});

test('Long Smoldering extends burn, Cooler, Washer puddle and Runner trail',()=>{
 const s=createRun();learn(s,'fire.2');s.world={heightAt:()=>0,walkable:()=>true,lineClear:()=>true};s.arms=[createPart(s,'acid')];s.organs=[createPart(s,'slime')];s.legs=[createPart(s,'runner')];
 const e=target(s,4,0);s.rng=()=>0;learn(s,'fire.0');onHit(s,e,10,()=>{});near(e.burn.until,5);
 isaacHit(s,e,100,prepareIsaacAttack(s,s.arms[0],{}));near(e.coolerDots[0].until,7);near(e.slimeUntil,5);
 s.player={x:1.5,z:0};recordRunnerFire(s,{x:0,z:0});near(s.fireTrails[0].life,5);
 assert.match(partPropertyRows(s.legs[0],s)[0][1],/5 с/);
 assert.equal(partPropertyRows(s.arms[0],s)[0][1],'5 с');
 s.player={x:0,z:0};e.x=4;attack(s,.01);assert(s.shots.some(q=>q.mode==='acid'));
 s.arms=[];for(let i=0;i<100&&!s.puddles.length;i++)step(s,.01);
 assert(s.puddles.length>0);assert(s.puddles[0].life>4.9&&s.puddles[0].life<=5);
});

test('Wildfire spreads active burn, Cooler and item field damage without duplicating a source',()=>{
 const s=createRun();learn(s,'fire.3');s.world={heightAt:()=>0,walkable:()=>true,lineClear:()=>true};s.arms=[];s.legs=[];
 const e=target(s,0,0),neighbor=target(s,2,0);e.hp=0;e.burn={stacks:[{dps:2,until:3}],dps:2,until:3};e.coolerDots=[{dps:4,blast:20,until:5}];
 s.puddles=[{id:1,x:0,y:0,z:0,radius:.2,life:2,damage:7}];s.fireTrails=[{id:2,x:0,y:0,z:0,radius:.2,life:2,dps:5}];
 onDeath(s,e);onDeath(s,e);
 assert.equal(neighbor.burn.count,1);assert.equal(neighbor.coolerDots.length,1);
 assert.deepEqual(neighbor.spreadDots.map(dot=>dot.source).sort(),['acid','burn']);
 s.time=1;tickEffects(s,1,(enemy,amount,source)=>hurtEnemy(s,enemy,amount,0,source));
 tickCoolerDamage(s,1,(enemy,amount,source)=>hurtEnemy(s,enemy,amount,0,source));
 near(neighbor.hp,1000-(2+7+5+4));
});

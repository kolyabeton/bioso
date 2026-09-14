import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,spawnEnemy,step} from '../src/game.js';
import {createPart,stats,weaponStats} from '../src/assembly.js';
import {tickEffects} from '../src/systems/effects.js';
import {modifiers} from '../src/systems/abilities.js';
import {summonTuning} from '../src/systems/symbionts.js';

function quietWorld(s){
 s.world={walkable:()=>true,lineClear:()=>true,chunk:()=>({cx:0,cz:0,lair:{x:999,z:999}})};
 s.nextElite=s.nextBoss=s.waves.nextElite=s.waves.nextBoss=Infinity;s.waves.credit=-Infinity;
 s.survivalBosses={nextAt:Infinity,count:0};s.survivalHordes={nextAt:Infinity,count:0,queue:null};s.bossHabitats=[];
}

test('an interceptor is destroyed and its source summons a new drone at the attack interval',()=>{
 const s=createRun(undefined,'survival',410);quietWorld(s);s.body=createPart(s,'broodmother',1);s.arms=[];s.legs=Array.from({length:3},()=>createPart(s,'swarmLeg',5));s.abilities.learned=['summons.2'];s.abilities.levels={'summons.2':5};s.player={x:0,y:0,z:3};s.hp=stats(s).hp;
 tickEffects(s,0,()=>{});const drone=s.abilities.companions[0];Object.assign(drone,{x:0,y:0,z:0,hover:1});
 const hp=s.hp;s.hostileShots.push({x:0,y:1,z:-1,dx:0,dy:0,dz:1,speed:10,life:3,damage:1,key:'test-shell'});
 step(s,.2);
 assert.equal(s.hostileShots.length,0);assert.equal(s.hp,hp);assert.ok(!s.abilities.companions.includes(drone));
 const readyAt=s.abilities.companionSummonReadyAt[drone.sourceKey],interval=summonTuning(s,modifiers(s)).replacementInterval;assert.equal(Number((readyAt-s.time).toFixed(6)),Number(interval.toFixed(6)));assert.ok(interval<1.2);
 assert.ok(s.events.some(e=>e.type==='summon-death'&&e.cause==='intercept'));
 assert.ok(s.events.some(e=>e.type==='blast'&&e.key==='swarm'&&e.defensive));
 s.time=readyAt-.001;tickEffects(s,0,()=>{});assert.equal(s.abilities.companions.filter(c=>c.sourceKey===drone.sourceKey).length,0);
 s.time=readyAt;tickEffects(s,0,()=>{});const replacement=s.abilities.companions.find(c=>c.sourceKey===drone.sourceKey);
 assert.ok(replacement);assert.notEqual(replacement,drone);assert.notEqual(replacement.id,drone.id);assert.equal(replacement.sourceKey,drone.sourceKey);
 assert.equal(replacement.x,s.player.x);assert.equal(replacement.z,s.player.z);assert.ok(s.events.some(e=>e.type==='summon-create'&&e.replacement));
});

test('a kamikaze rocket intercepts a hostile projectile and performs its normal blast',()=>{
 const s=createRun(undefined,'survival',411);quietWorld(s);s.body=createPart(s,'wanderer');s.arms=[];s.player={x:5,y:0,z:5};s.hp=stats(s).hp;
 const enemy=spawnEnemy(s,'normal',{x:0,z:.8},'mass',0,{promote:false});enemy.hp=enemy.maxHp=1000;enemy.speed=0;enemy.contact=Infinity;enemy.enemyAttack.readyAt=Infinity;
 const part=createPart(s,'rocket',1),w=weaponStats(s,part,stats(s));
 s.shots.push({id:++s.entityId,source:part.id,x:0,y:1,z:0,dx:0,dy:0,dz:1,target:enemy.id,life:5,speed:w.speed,w,hit:new Set(),remaining:1,mode:'rocket',distance:5,travel:0});
 s.hostileShots.push({x:0,y:1,z:-1,dx:0,dy:0,dz:1,speed:10,life:3,damage:1,key:'enemy-rocket'});
 const before=enemy.hp;step(s,.2);
 assert.equal(s.hostileShots.length,0);assert.equal(s.shots.length,0);assert.ok(enemy.hp<before);
 assert.ok(s.events.some(e=>e.type==='blast'&&e.key==='rocket'));
});

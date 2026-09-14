import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,spawnEnemy,step} from '../src/game.js';
import {tickModularAttack} from '../src/systems/enemy-combat.js';
import {separateEnemies,decorateLivingEnemy} from '../src/living-combat.js';
import {tickWaves,waveBudgetBetween} from '../src/systems/waves.js';
import {SURVIVAL_CADENCE} from '../src/systems/survival-cadence.js';
import {stats} from '../src/assembly.js';
const run=()=>{const s=createRun(undefined,'survival',321);s.world={walkable:()=>true};s.arms=[];return s;};
test('bosses telegraph their authored moves while an ordinary shooter still fires immediately',()=>{
 for(const kind of ['boss','final']){
  const s=run(),b=spawnEnemy(s,kind,{x:0,z:1},'mass',960);b.enemyAttack.readyAt=0;let hits=0;tickModularAttack(s,b,s.player,()=>hits++);const w=b.enemyAttack.warning;
  assert.ok(w,kind);assert.ok(w.bossAction);assert.ok(w.at>w.started);assert.equal(hits,0);s.time=w.at;tickModularAttack(s,b,s.player,()=>hits++);assert.equal(b.enemyAttack.warning,null);assert.equal(b.attackPose.bossAction,w.bossAction);assert.ok(b.enemyAttack.readyAt>s.time);
 }
 const s=run(),e=spawnEnemy(s,'normal',{x:0,z:6},'ranged',60);e.assembly.arms=[{key:'seed'}];e.enemyAttack.readyAt=0;tickModularAttack(s,e,s.player,()=>{});assert.equal(e.enemyAttack.warning,null);assert.equal(e.attackPose.key,'seed');assert.equal(s.hostileShots.length,1);
});
test('bee crosses ground crowd and damages the player only by touching',()=>{
 const s=run(),b=spawnEnemy(s,'normal',{x:0,z:5},'flying',120),g=spawnEnemy(s,'normal',{x:0,z:5},'mass',120);
 assert.ok(b.flying);assert.ok(Math.abs(b.speed/g.speed-1.45*1.15)<1e-8);separateEnemies(s,.1);assert.equal(b.z,g.z);assert.equal(b.x,g.x);
 g.speed=0;b.enemyAttack.readyAt=100;step(s,.05);assert.ok(b.z<5);assert.equal(g.z,5);
 b.z=0;b.enemyAttack.readyAt=0;s.health.armorSpent=stats(s).armor;step(s,.01);assert.equal(b.enemyAttack.warning,null);assert.equal(b.attackPose,undefined);assert.equal(s.health.hits,1);assert.equal(s.hp,1.5);
});
test('minute signatures enter actual spawn requests',()=>{
 for(const [time,expected]of [[0,'mass'],[60,'fast'],[120,'ranged'],[180,'armored'],[240,'mass'],[300,'flying'],[360,'fast'],[420,'ranged']]){const s=run();s.mode='garden';s.time=time;s.waves.credit=1;s.rng=()=>0;const roles=[];tickWaves(s,0,(kind,pos,role)=>roles.push(role));assert.ok(roles.includes(expected),`${time}/${expected}/${roles}`);}
});
test('volatile stat adjustment happens once',()=>{
 const s=run();s.time=20;const e=spawnEnemy(s,'normal',{x:0,z:5});const hp=e.maxHp;s.livingSpawnSerial=6;decorateLivingEnemy(s,e,true);assert.equal(e.maxHp,Math.round(hp*.6));assert.equal(e.hp,e.maxHp);const speed=e.speed;s.livingSpawnSerial=6;decorateLivingEnemy(s,e,true);assert.equal(e.speed,speed);
});

test('boss-first survival warmup is minimal while missions retain their authored budget',()=>{
 const counts={};
 for(const mode of ['survival','garden']){const s=createRun(undefined,mode,321);s.time=20;let count=0;tickWaves(s,25,()=>count++);counts[mode]=count;}
 assert.equal(counts.garden,Math.floor(waveBudgetBetween(0,20)));assert.equal(counts.survival,Math.floor(20*SURVIVAL_CADENCE.introRate/60));
});

test('ordinary shooter fires immediately once and recovery blocks a repeat',()=>{
 const s=run(),e=spawnEnemy(s,'normal',{x:0,z:6},'ranged',30);
 e.assembly.arms=[{key:'seed'}];e.enemyAttack.readyAt=0;
 tickModularAttack(s,e,s.player,()=>{});const released={...s.hostileShots[0]},readyAt=e.enemyAttack.readyAt;
 assert.equal(e.enemyAttack.warning,null);assert.equal(s.hostileShots.length,1);assert.ok(readyAt>s.time);s.player.x=4;
 s.time=readyAt-.01;tickModularAttack(s,e,s.player,()=>{});assert.equal(s.hostileShots.length,1);assert.equal(s.hostileShots[0].dx,released.dx);assert.equal(s.hostileShots[0].dz,released.dz);
 s.time=readyAt;tickModularAttack(s,e,s.player,()=>{});tickModularAttack(s,e,s.player,()=>{});assert.equal(s.hostileShots.length,2);assert.notEqual(s.hostileShots[1].dx,released.dx);
});

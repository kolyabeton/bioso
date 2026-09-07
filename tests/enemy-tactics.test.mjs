import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,spawnEnemy,step} from '../src/game.js';
import {tickModularAttack} from '../src/systems/enemy-combat.js';
import {separateEnemies,decorateLivingEnemy} from '../src/living-combat.js';
import {tickWaves} from '../src/systems/waves.js';
const run=()=>{const s=createRun(undefined,'survival',321);s.world={walkable:()=>true};s.arms=[];return s;};
test('boss projectile fires immediately with cooldown; ordinary shooter still warns',()=>{
 const s=run(),b=spawnEnemy(s,'boss',{x:0,z:7},'mass',960);b.enemyAttack.readyAt=0;
 tickModularAttack(s,b,s.player,()=>{});assert.equal(s.hostileShots.length,1);assert.equal(b.enemyAttack.warning,null);
 tickModularAttack(s,b,s.player,()=>{});assert.equal(s.hostileShots.length,1);
 const e=spawnEnemy(s,'normal',{x:0,z:6},'ranged',60);e.enemyAttack.readyAt=0;tickModularAttack(s,e,s.player,()=>{});assert.ok(e.enemyAttack.warning);assert.equal(s.hostileShots.length,1);
});
test('bee crosses ground crowd without displacement and can attack player',()=>{
 const s=run(),b=spawnEnemy(s,'normal',{x:0,z:5},'flying',120),g=spawnEnemy(s,'normal',{x:0,z:5});
 assert.ok(b.flying);separateEnemies(s,.1);assert.equal(b.z,g.z);assert.equal(b.x,g.x);
 g.speed=0;b.enemyAttack.readyAt=100;step(s,.05);assert.ok(b.z<5);assert.equal(g.z,5);
 b.z=1;b.enemyAttack.readyAt=0;let hits=0;tickModularAttack(s,b,s.player,()=>hits++);s.time=b.enemyAttack.warning.at;tickModularAttack(s,b,s.player,()=>hits++);assert.equal(hits,1);
});
test('automatic variants enter actual spawn requests after their unlocks',()=>{
 for(const [time,variant,expected]of [[29.99,.01,'mass'],[30,.01,'ranged'],[89.99,.25,'mass'],[90,.25,'fast'],[119.99,.14,'mass'],[120,.14,'flying'],[179.99,.4,'mass'],[180,.4,'armored']]){const s=run();s.time=time;s.waves.credit=1;let i=0;s.rng=()=>i++%2?variant:.5;const roles=[];tickWaves(s,0,(kind,pos,role)=>roles.push(role));assert.ok(roles.includes(expected));}
});
test('volatile stat adjustment happens once',()=>{
 const s=run();s.time=20;const e=spawnEnemy(s,'normal',{x:0,z:5});const hp=e.maxHp;s.livingSpawnSerial=6;decorateLivingEnemy(s,e,true);assert.equal(e.maxHp,Math.round(hp*.6));assert.equal(e.hp,e.maxHp);const speed=e.speed;s.livingSpawnSerial=6;decorateLivingEnemy(s,e,true);assert.equal(e.speed,speed);
});

test('survival pressure emits twenty percent more enemies without changing mission waves',()=>{
 const counts={};
 for(const mode of ['survival','garden']){const s=createRun(undefined,mode,321);s.time=20;let count=0;tickWaves(s,25,()=>count++);counts[mode]=count;}
 assert.equal(counts.garden,20);assert.equal(counts.survival,24);
});

test('ordinary shooter fires twice in 4.3 seconds and retains its full fixed-aim warnings',()=>{
 const s=run(),e=spawnEnemy(s,'normal',{x:0,z:6},'ranged',30);
 e.assembly.arms=[{key:'seed'}];e.enemyAttack.readyAt=0;
 tickModularAttack(s,e,s.player,()=>{});const aim={...e.enemyAttack.warning};
 assert.equal(aim.at-aim.started,.8);s.player.x=4;
 s.time=.79;tickModularAttack(s,e,s.player,()=>{});assert.equal(s.hostileShots.length,0);
 s.time=.8;tickModularAttack(s,e,s.player,()=>{});assert.equal(s.hostileShots.length,1);
 assert.equal(s.hostileShots[0].dx,aim.dx);assert.equal(s.hostileShots[0].dz,aim.dz);
 for(let t=.81;t<=4.3;t+=.01){s.time=t;tickModularAttack(s,e,s.player,()=>{});}
 assert.equal(s.hostileShots.length,2);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,spawnEnemy,step} from '../src/game.js';
import {assembleEnemy,ENEMY_RECIPES} from '../src/systems/enemy-assembly.js';
import {tickModularAttack,enemyAttackRange} from '../src/systems/enemy-combat.js';
import {hitFeedback} from '../src/combat-feel.js';

const run=()=>{const s=createRun(undefined,'survival',321);s.world={walkable:()=>true};s.arms=[];return s;};
const family=e=>{const key=e.assembly.arms[0].key;return ['seed','needle'].includes(key)?'shot':key==='acid'?'acid':'melee';};
const elite=(s,key)=>{const e=spawnEnemy(s,'elite',{x:0,z:8},'mass',180);e.assembly=assembleEnemy(ENEMY_RECIPES.find(r=>r.weapons[0]===key),1,'elite');e.enemyAttack.readyAt=0;return e;};

test('elite keeps both fifteen-percent speed increases over an ordinary mass unit',()=>{
 const s=run(),normal=spawnEnemy(s,'normal',{x:4,z:8},'mass',180,{promote:false}),e=spawnEnemy(s,'elite',{x:0,z:8},'mass',180);
 assert.ok(Math.abs(e.speed/normal.speed-1.15*1.15)<1e-8,`${e.speed}/${normal.speed}`);
});

test('melee elite closes distance through sustained seed knockback',()=>{
 const s=run(),e=elite(s,'claws'),start=e.z;s.waves.credit=-1000;
 for(let i=0;i<80;i++){
  if(i%4===0)hitFeedback(s,e,{knockback:3},{dx:0,dz:1});
  step(s,.05);
 }
 assert.ok(e.z<3,`${start} -> ${e.z}`);
});

test('every three eligible elites include a shooter, acid caster and fighter, including automatic promotions',()=>{
 for(const time of [30,90,180,960,2400]){
  const s=run();s.time=time;s.rng=()=>{throw Error('equipment consumed loot RNG');};
  const elites=Array.from({length:180},()=>spawnEnemy(s,'normal',{x:0,z:8})).filter(e=>e.kind==='elite');
  for(let i=0;i<elites.length;i+=3)assert.deepEqual(elites.slice(i,i+3).map(family).sort(),['acid','melee','shot']);
 }
 const s=run();for(let i=0;i<6;i++)assert.equal(family(spawnEnemy(s,'elite',{x:0,z:8},'mass',29.99)),'melee');
});

test('elite variety is deterministic and ordinary spawns cannot consume its rotation',()=>{
 const a=run(),b=run();
 for(let i=0;i<12;i++){
  for(let j=0;j<3;j++)spawnEnemy(b,'normal',{x:0,z:8},'mass',180,{promote:false});
  assert.equal(family(spawnEnemy(a,'elite',{x:0,z:8},'mass',180)),family(spawnEnemy(b,'elite',{x:0,z:8},'mass',180)));
 }
 const c=run(),d=run();assert.deepEqual(Array.from({length:15},()=>spawnEnemy(c,'elite',{x:0,z:8},'mass',180).recipeId),Array.from({length:15},()=>spawnEnemy(d,'elite',{x:0,z:8},'mass',180).recipeId));
});

for(const key of ['seed','needle'])test(`elite ${key} alternates its shot with a telegraphed acid attack at range`,()=>{
 const s=run(),e=elite(s,key);s.health.invulnerableUntil=Infinity;s.waves.credit=-1000;
 tickModularAttack(s,e,s.player,()=>assert.fail('ranged strike hit without projectile'));assert.equal(s.hostileShots.length,1);assert.equal(e.attackPose.key,key);assert.equal(enemyAttackRange(e,s),9);
 const before=e.z;step(s,.05);assert.equal(e.z,before);s.time=e.enemyAttack.readyAt;
 tickModularAttack(s,e,s.player,()=>{});const acid=e.enemyAttack.warning;assert.equal(acid.key,'acid');s.player.x=4;s.time=acid.at;tickModularAttack(s,e,s.player,()=>assert.fail('locked acid area was dodged'));s.time=e.enemyAttack.readyAt;s.player.x=0;
 tickModularAttack(s,e,s.player,()=>{});assert.equal(s.hostileShots.length,2);assert.equal(e.attackPose.key,key);
});

test('acid elite alternates a dodgeable pool with a direct needle shot',()=>{
 const s=run(),e=elite(s,'acid');let hits=0;
 s.player.x=0;tickModularAttack(s,e,s.player,()=>hits++);const w=e.enemyAttack.warning;assert.equal(w.key,'acid');assert.ok(Math.abs(w.at-s.time-1.3)<1e-8);
 s.player.x=4;s.time=w.at;tickModularAttack(s,e,s.player,()=>hits++);assert.equal(hits,0);assert.equal(s.events.at(-1).mode,'acid');s.time=e.enemyAttack.readyAt;
 tickModularAttack(s,e,s.player,()=>hits++);assert.equal(e.attackPose.key,'needle');assert.equal(s.hostileShots.length,1);
});

test('the elite secondary attack stays cancellable while frozen or occluded',()=>{
 const s=run(),e=elite(s,'seed');tickModularAttack(s,e,s.player,()=>{});
 s.time=e.enemyAttack.readyAt;s.player.z=7;let hits=0;tickModularAttack(s,e,s.player,()=>hits++);assert.equal(e.enemyAttack.warning.key,'acid');
 e.frozenUntil=s.time+2;tickModularAttack(s,e,s.player,()=>hits++);assert.equal(e.enemyAttack.warning,null);assert.equal(s.hostileShots.length,1);
 s.time=e.frozenUntil+1;e.enemyAttack.readyAt=s.time;tickModularAttack(s,e,s.player,()=>hits++,false);assert.equal(e.enemyAttack.warning,null);assert.equal(s.hostileShots.length,1);
});

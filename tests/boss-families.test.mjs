import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorldRun,stepWorldRun} from '../src/world-run.js';
import {spawnEnemy} from '../src/game.js';
import {BOSS_RECIPES} from '../src/systems/enemy-assembly.js';
import {SURVIVAL_FINAL,SURVIVAL_MOTHER_GROWTH_AT} from '../src/systems/balance.js';
import {survivalBossScheduledAt,tickSurvivalBosses} from '../src/systems/survival-bosses.js';
import {MISSIONS} from '../src/catalog.js';
import {bossModelId} from '../src/boss-model-view.js';

test('map bosses retain five different generated bodies and weapons, including the Mother',()=>{
 for(const seed of [1,42,20317]){
  const s=createWorldRun(undefined,'survival',seed),bosses=s.enemies.filter(e=>e.habitat);
  assert.equal(bosses.length,5);assert.equal(new Set(bosses.map(e=>e.assembly.body.key)).size,5);
  assert.deepEqual(bosses.map(e=>e.recipeId),BOSS_RECIPES.map(r=>r.id));
  for(const [i,e] of bosses.entries()){
   assert.equal(e.bossName,BOSS_RECIPES[i].name);assert.equal(e.bossCombat,undefined);
   assert.equal(bossModelId(e),null);assert.equal(e.assembly.body.key,BOSS_RECIPES[i].body);
   assert.deepEqual(e.assembly.arms.filter(Boolean).map(p=>p.key),BOSS_RECIPES[i].weapons);
   assert.ok(s.world.walkable(e.x,e.z,e.radius));assert.equal(e.territory.state,'idle');
  }
  assert.equal(s.enemies.some(e=>e.bossOwner),false);
  const mother=bosses[4];assert.equal(mother.bossName,'Матка');assert.equal(mother.kind,'final');
  assert.equal(mother.maxHp,240000);assert.equal(mother.armor,SURVIVAL_FINAL.armor*1.3);assert.equal(mother.speed,SURVIVAL_FINAL.speed*2);
  assert.equal(mother.recommended,30);
  assert.deepEqual(bosses.map(e=>e.bossLevel),[1,8,16,24,30]);
  assert.ok(bosses.every(e=>e.bossRegenRate===undefined));
 }
});

test('map bosses retain lost health; leaving a habitat never restores them',()=>{
 const s=createWorldRun(undefined,'survival',42),mother=s.enemies.find(e=>e.habitatRank===5),before=mother.maxHp*.5;mother.hp=before;
 for(let second=0;second<90;second++)stepWorldRun(s,1);
 assert.equal(mother.hp,before);
});

test('Orchid keeps closing between attacks instead of freezing at acid range',()=>{
 const s=createWorldRun(undefined,'survival',20317),orchid=s.enemies.find(e=>e.recipeId==='orchid');
 s.enemies=[orchid];s.waves.credit=-1e9;s.survivalBosses={nextAt:Infinity,count:0};s.health.invulnerableUntil=Infinity;s.arms=s.arms.map(()=>null);
 orchid.territory.state='engaged';orchid.enemyAttack.readyAt=Infinity;
 s.player={x:orchid.x+8,y:orchid.y,z:orchid.z};
 const before={x:orchid.x,z:orchid.z};for(let i=0;i<60;i++)stepWorldRun(s,.05);
 assert.ok(Math.hypot(orchid.x-before.x,orchid.z-before.z)>1);
 assert.ok(Math.hypot(orchid.x-s.player.x,orchid.z-s.player.z)<7);
});

test('all five timed waves use mission bosses and leave generated habitats untouched',()=>{
 const s=createWorldRun(undefined,'survival',42),habitats=s.enemies.filter(e=>e.habitat);
 const original=habitats.map(e=>({hp:e.hp,armor:e.armor,speed:e.speed,recipe:e.recipeId}));
 for(let index=0;index<5;index++){
  s.time=survivalBossScheduledAt(index+1);
  // Freeze only the separate Mother's post-30-minute growth for this isolation check.
  habitats[4].post15Stage=Math.max(0,Math.floor((s.time-1800)/60));
  const e=tickSurvivalBosses(s,(...args)=>spawnEnemy(s,...args));
  assert.ok(e?.survivalInvader);assert.equal(e.bossDesignId,MISSIONS[index].bossId);
  assert.equal(e.bossName,MISSIONS[index].bossName);assert.equal(e.assembly,null);
  assert.ok(e.bossCombat);assert.equal(e.territory,null);assert.equal(e.habitat,undefined);
  assert.equal(e.bossRegenRate,undefined);
  assert.equal(e.damage,2);assert.ok(e.maxHp>600);assert.notEqual(e.maxHp,habitats[index].maxHp);
  e.hp=0;
 }
 assert.deepEqual(habitats.map(e=>({hp:e.hp,armor:e.armor,speed:e.speed,recipe:e.recipeId})),original);
});

test('generated Mother retains her own post-30-minute growth without mission support nodes',()=>{
 const s=createWorldRun(undefined,'survival',42),mother=s.enemies.find(e=>e.kind==='final');
 s.survivalBosses={nextAt:Infinity,count:0};s.time=SURVIVAL_MOTHER_GROWTH_AT+60;
 tickSurvivalBosses(s,()=>assert.fail('no wave is scheduled'));
 assert.equal(mother.maxHp,240000*1.1);assert.equal(mother.armor,SURVIVAL_FINAL.armor*1.3+2*1.3);
 assert.equal(mother.speed,SURVIVAL_FINAL.speed*2*1.03);assert.equal(mother.recipeId,'mother');
 assert.equal(mother.bossCombat,undefined);assert.ok(!s.enemies.some(e=>e.bossOwner===mother.id));
});

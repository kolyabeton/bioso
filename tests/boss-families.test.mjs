import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorldRun} from '../src/world-run.js';
import {spawnEnemy} from '../src/game.js';
import {BOSS_RECIPES} from '../src/systems/enemy-assembly.js';
import {SURVIVAL_FINAL} from '../src/systems/balance.js';
import {SURVIVAL_BOSS_INTERVAL,tickSurvivalBosses} from '../src/systems/survival-bosses.js';
import {MISSIONS} from '../src/catalog.js';
import {bossModelId} from '../src/boss-model-view.js';
import {BOSS_REGEN_PERIOD,tickHabitatBossRegeneration} from '../src/systems/territories.js';

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
  assert.equal(mother.maxHp,40000);for(const key of ['armor','speed'])assert.equal(mother[key],SURVIVAL_FINAL[key]);
  assert.equal(mother.recommended,30);
  assert.deepEqual(bosses.map(e=>e.bossLevel),[1,8,16,24,30]);
  assert.deepEqual(bosses.map(e=>e.bossRegenRate),[.01,.02,.03,.04,.05]);
 }
});

test('map bosses regenerate their rank percent of maximum health every minute',()=>{
 const s=createWorldRun(undefined,'survival',42),bosses=s.enemies.filter(e=>e.habitat);
 for(const e of bosses)e.hp=e.maxHp*.25;
 tickHabitatBossRegeneration(s,BOSS_REGEN_PERIOD);
 for(const [index,e] of bosses.entries())assert.ok(Math.abs(e.hp-e.maxHp*(.25+(index+1)/100))<1e-9);
 const mother=bosses[4];mother.hp=mother.maxHp-1;tickHabitatBossRegeneration(s,BOSS_REGEN_PERIOD);assert.equal(mother.hp,mother.maxHp);
 mother.hp=0;tickHabitatBossRegeneration(s,BOSS_REGEN_PERIOD);assert.equal(mother.hp,0);
});

test('Mother outheals sustained low-level chip damage',()=>{
 const s=createWorldRun(undefined,'survival',42),mother=s.enemies.find(e=>e.habitatRank===5);
 for(let second=0;second<60;second++){mother.hp-=20;tickHabitatBossRegeneration(s,1);}
 assert.equal(mother.hp,mother.maxHp);
});

test('all five timed waves use mission bosses and leave generated habitats untouched',()=>{
 const s=createWorldRun(undefined,'survival',42),habitats=s.enemies.filter(e=>e.habitat);
 const original=habitats.map(e=>({hp:e.hp,armor:e.armor,speed:e.speed,recipe:e.recipeId}));
 for(let index=0;index<5;index++){
  s.time=(index+1)*SURVIVAL_BOSS_INTERVAL;
  // Freeze only the separate Mother's post-15-minute growth for this isolation check.
  habitats[4].post15Stage=Math.max(0,Math.floor((s.time-900)/60));
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

test('generated Mother retains her own post-15-minute growth without mission support nodes',()=>{
 const s=createWorldRun(undefined,'survival',42),mother=s.enemies.find(e=>e.kind==='final');
 s.survivalBosses={nextAt:Infinity,count:0};s.time=960;
 tickSurvivalBosses(s,()=>assert.fail('no wave is scheduled'));
 assert.equal(mother.maxHp,40000*1.1);assert.equal(mother.armor,SURVIVAL_FINAL.armor+2);
 assert.equal(mother.speed,SURVIVAL_FINAL.speed*1.03);assert.equal(mother.recipeId,'mother');
 assert.equal(mother.bossCombat,undefined);assert.ok(!s.enemies.some(e=>e.bossOwner===mother.id));
});

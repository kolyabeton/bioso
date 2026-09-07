import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {ENEMY_RECIPES,BOSS_RECIPES,assembleEnemy,validateEnemyRecipe,eligibleRecipes,enemyTier,assignEnemyAssembly} from '../src/systems/enemy-assembly.js';
import {ENEMY_WEAPONS,tickModularAttack,warningHits} from '../src/systems/enemy-combat.js';
import {createRun,spawnEnemy,attack,step} from '../src/game.js';
import {enemyBalance,SURVIVAL_PRESSURE} from '../src/systems/balance.js';
import {createEnemyAssemblyView,enemyVisualParts} from '../src/enemy-assembly-view.js';
import {fittedModel} from '../src/asset-models.js';
import {tickHostileShots} from '../src/systems/waves.js';
const run=()=>{const s=createRun(undefined,'survival',321);s.world={walkable:()=>true};return s;};
function enemy(s,r=ENEMY_RECIPES[0],kind='normal'){const e=spawnEnemy(s,kind,{x:0,z:1.5},r.role||'mass',Math.max(s.time,r.from||0));e.assembly=assembleEnemy(r,e.tier,kind);e.recipeId=r.id;e.speed=0;return e;}
test('16 unique recipes and five bosses fit shared catalog slots and capacity, including elite upgrades',()=>{
 assert.equal(ENEMY_RECIPES.length,16);assert.equal(new Set(ENEMY_RECIPES.map(r=>r.id)).size,16);
 for(const r of [...ENEMY_RECIPES,...BOSS_RECIPES]){assert.ok(validateEnemyRecipe(r),r.id);assert.ok(validateEnemyRecipe(r,'elite'),r.id);for(const p of assembleEnemy(r,1,'elite').arms.filter(Boolean))assert.ok(ENEMY_WEAPONS[p.key]);}
});
test('only time unlocks recipes and tiers, at exact boundaries',()=>{
 for(const [t,n]of [[0,5],[29.99,5],[30,8],[89.99,8],[90,12],[119.99,12],[120,13],[179.99,13],[180,16],[480,16],[960,16]])assert.equal(eligibleRecipes(t).length,n);
 assert.deepEqual([0,480,960,1440,1920,2400].map(enemyTier),[1,2,3,4,5,5]);
 const a=run(),b=run();b.level=99;for(let i=0;i<30;i++)assert.equal(spawnEnemy(a,'normal',{x:0,z:5}).recipeId,spawnEnemy(b,'normal',{x:0,z:5}).recipeId);
});
test('assembly uses its own deterministic stream without consuming RNG, item or entity IDs',()=>{
 const a=run(),b=run();const ids=[a.entityId,a.serial];a.rng=()=>{throw Error('combat RNG consumed');};
 const picks=s=>Array.from({length:80},()=>{const e={kind:'normal',role:'mass',born:0};assignEnemyAssembly(s,e,0);return e.recipeId;});
 assert.deepEqual(picks(a),picks(b));assert.deepEqual([a.entityId,a.serial],ids);assert.equal(new Set(picks(a)).size,5);
});
test('opening assemblies require two ordinary starter claw hits but a critical hit can kill',()=>{
 for(const r of eligibleRecipes(0)){const s=run(),e=spawnEnemy(s,'normal',{x:0,z:1.5});e.recipeId=r.id;e.assembly=assembleEnemy(r);s.rng=()=>.99;assert.deepEqual([e.hp,e.armor,e.speed],[16,0,2.15*1.15]);attack(s,0);assert.equal(e.hp,4,r.id);assert.equal(s.kills,0);attack(s,1);assert.equal(e.hp,0);assert.equal(s.kills,1);const critical=spawnEnemy(s,'normal',{x:0,z:1.5});s.rng=()=>0;attack(s,1);assert.equal(critical.hp,0);}
});
test('actual early spawns keep whole HP and survive one noncritical hit',()=>{
 for(const time of [1,5,10,19.9]){const s=run();s.time=time;s.rng=()=>.99;const e=spawnEnemy(s,'normal',{x:0,z:1.5});assert.equal(e.hp,16);attack(s,0);assert.equal(e.hp,4);}
 const s=run();for(const time of [20,120,400,780]){const e=spawnEnemy(s,'normal',{x:0,z:1.5},'mass',time);assert.ok(Math.abs(e.hp-enemyBalance(time).hp*SURVIVAL_PRESSURE.hp)<=.5);}
});
test('phase budgets are applied once and explicit mission spawning stays legacy',()=>{
 for(const t of [0,480,960,1440,1920,2400])for(const kind of ['normal','elite','boss','final']){
  const s=run();s.introBossId=-1;const e=spawnEnemy(s,kind,{x:0,z:8},'mass',t),b=enemyBalance(t,kind);b.hp=Math.round(b.hp*SURVIVAL_PRESSURE.hp);b.speed*=SURVIVAL_PRESSURE.speed;for(const k of ['hp','speed','armor','xp','radius'])assert.equal(e[k],b[k],`${t}/${kind}/${k}`);
 }
 const s=createRun(undefined,'garden',2);const legacy=spawnEnemy(s,'normal',{x:0,z:2});assert.equal(legacy.assembly,undefined);assert.equal(legacy.hp,12);assert.equal(legacy.speed,2.15);
 const s2=run();assert.deepEqual([480,960,1440,1920].map(t=>spawnEnemy(s2,'boss',{x:0,z:5},'mass',t).recipeId),BOSS_RECIPES.slice(0,4).map(r=>r.id));assert.equal(spawnEnemy(s2,'final',{x:0,z:5}).recipeId,'mother');
});
test('melee warning allows dodge; body contact during recovery deals one damage',()=>{
 const s=run(),e=enemy(s);s.arms=[];s.time=1;e.enemyAttack.readyAt=0;let hits=0;
 tickModularAttack(s,e,s.player,()=>hits++);const w={...e.enemyAttack.warning};assert.equal(hits,0);
 s.time=w.at-.01;tickModularAttack(s,e,s.player,()=>hits++);assert.equal(hits,0);
 s.player.x=10;s.time=w.at;tickModularAttack(s,e,s.player,()=>hits++);assert.equal(hits,0);assert.ok(e.enemyAttack.readyAt>s.time);
 e.x=s.player.x;e.z=s.player.z;step(s,.01);assert.equal(s.health.hits,1);assert.equal(s.hp,1);
});
test('all weapons warn and hit once; bosses alternate installed weapons',()=>{
 for(const r of ENEMY_RECIPES){const s=run(),e=enemy(s,r);e.enemyAttack.readyAt=0;let hits=0;tickModularAttack(s,e,s.player,()=>hits++);const w=e.enemyAttack.warning;assert.ok(w,r.id);s.time=w.at;tickModularAttack(s,e,s.player,()=>hits++);tickModularAttack(s,e,s.player,()=>hits++);if(w.mode==='shot')assert.equal(s.hostileShots.length,1);else assert.equal(hits,1,r.id);}
 const s=run(),e=enemy(s,BOSS_RECIPES[0],'boss');e.enemyAttack.readyAt=0;const keys=[];for(let i=0;i<4;i++){tickModularAttack(s,e,s.player,()=>{});keys.push(e.enemyAttack.warning.key);s.time=e.enemyAttack.warning.at;tickModularAttack(s,e,s.player,()=>{});s.time=e.enemyAttack.readyAt;}assert.deepEqual(keys,['hammer','claws','hammer','claws']);
});
test('freeze cancels warning, pause preserves it, death prevents a strike, return cancels attacks',()=>{
 const s=run(),e=enemy(s);e.enemyAttack.readyAt=0;tickModularAttack(s,e,s.player,()=>{});s.pending=1;const before=JSON.stringify(e.enemyAttack);step(s,3);assert.equal(JSON.stringify(e.enemyAttack),before);s.pending=0;
 e.frozenUntil=2;tickModularAttack(s,e,s.player,()=>assert.fail());assert.equal(e.enemyAttack.warning,null);s.time=3;e.enemyAttack.readyAt=3;tickModularAttack(s,e,s.player,()=>{});e.territory={state:'returning'};tickModularAttack(s,e,s.player,()=>assert.fail());assert.equal(e.enemyAttack.warning,null);
 delete e.territory;e.hp=0;s.time=9;tickModularAttack(s,e,s.player,()=>assert.fail());
});
test('sector sides, fixed acid circle and vertical separation match warning geometry',()=>{
 const w={mode:'sector',x:0,y:0,z:0,dx:0,dz:1,radius:3,angle:1};assert.ok(warningHits(w,{x:0,z:2}));assert.ok(!warningHits(w,{x:2,z:0}));assert.ok(!warningHits(w,{x:0,z:2,y:4}));assert.ok(!warningHits({...w,mode:'acid',radius:2},{x:4,z:0}));
});
test('needle uses its speed and swept collision without hitting twice',()=>{
 const s=run();s.player={x:0,z:0};s.hostileShots=[{x:0,y:1,z:4,dx:0,dz:-1,dy:0,speed:7,life:3}];let hits=0;tickHostileShots(s,1,()=>hits++);tickHostileShots(s,1,()=>hits++);assert.equal(hits,1);assert.equal(s.hostileShots.length,0);
});
test('100 creatures remain modular even with no GLB loader; pools reset cleanly',()=>{
 const s=run(),scene=new T.Scene(),v=createEnemyAssemblyView(scene);s.enemies=[];for(let i=0;i<100;i++){const e=enemy(s,ENEMY_RECIPES[i%15]);e.x=i%10*3;e.z=Math.floor(i/10)*3;}v.update(s.enemies,s.player,0);assert.equal(v.count(),100);assert.ok(v.info().enemyParts>=500);assert.equal(v.info().enemyParts,v.info().enemyFallbackParts);assert.ok(scene.children[0].children.every(p=>p.isInstancedMesh));assert.ok(enemyVisualParts(s.enemies[0]).some(p=>p.asset.startsWith('leg-')));v.reset();assert.equal(v.count(),0);v.dispose();assert.equal(scene.children.length,0);
});
test('loaded detail geometry is shared by instances, not cloned per enemy',async()=>{
 const template=new T.Group(),geometry=new T.BoxGeometry(1,2,1),material=new T.MeshStandardMaterial();template.add(new T.Mesh(geometry,material));
 const s=run(),scene=new T.Scene(),v=createEnemyAssemblyView(scene,{load:async()=>template});for(let i=0;i<100;i++)enemy(s,ENEMY_RECIPES[i%15]);
 v.update(s.enemies,s.player,0);await Promise.resolve();v.update(s.enemies,s.player,1);
 assert.equal(v.info().enemyFallbackParts,0);assert.equal(v.count(),100);assert.ok(scene.children[0].children.filter(p=>p.count).every(p=>p.geometry===geometry&&p.material===material));
 const matrices=scene.children[0].children.filter(p=>p.count).flatMap(p=>Array.from(p.instanceMatrix.array));assert.ok(matrices.every(Number.isFinite));v.dispose();geometry.dispose();material.dispose();
});
test('a warned strike and body contact share invulnerability',()=>{
 const s=run(),e=enemy(s);s.arms=[];e.enemyAttack.readyAt=0;tickModularAttack(s,e,s.player,()=>{});s.time=e.enemyAttack.warning.at;step(s,.01);assert.equal(s.health.hits,1);assert.equal(s.hp,1);
 for(let i=0;i<40;i++)step(s,.01);assert.equal(s.health.hits,1);
});

test('loaded wing animation stays faithful with a bounded cache over twenty minutes',async()=>{
 const geometry=new T.BoxGeometry(1,2,1),material=new T.MeshStandardMaterial(),template=new T.Group();template.add(new T.Mesh(geometry,material));
 const scene=new T.Scene(),s=run(),e=enemy(s,ENEMY_RECIPES.find(r=>r.role==='flying'));
 const view=createEnemyAssemblyView(scene,{load:async()=>template});
 view.update([e],s.player,0);await Promise.resolve();view.update([e],s.player,0);
 const initial=view.info().enemyFittedShapes;
 for(let frame=1;frame<=36000;frame++)view.update([e],s.player,frame/30);
 assert.equal(view.info().enemyFittedShapes,initial);assert.equal(view.info().enemyFallbackParts,0);
 // Compare both wing matrices against the old baked-angle fit, including reduced motion.
 for(const reducedMotion of [false,true]){
  view.update([e],s.player,1200,1,reducedMotion);
  const wings=enemyVisualParts(e,1200,reducedMotion).filter(p=>p.motion==='wing');
  const pool=scene.children[0].children.find(p=>p.count===2&&p.geometry===geometry);
  assert.ok(pool);
  for(const [i,part]of wings.entries()){
   const world=new T.Object3D();world.position.set(e.x,1.1+(reducedMotion?0:Math.sin(1200*6+e.id)*.12),e.z);world.rotation.y=Math.atan2(s.player.x-e.x,s.player.z-e.z);world.scale.setScalar(e.radius);world.updateMatrix();
   const baked=fittedModel(template,{size:part.size,anchor:part.anchor,rotation:part.rotation});baked.position.set(...part.position);baked.updateMatrixWorld(true);
   let expected;baked.traverse(o=>{if(o.isMesh)expected=world.matrix.clone().multiply(o.matrixWorld);});
   const actual=new T.Matrix4();pool.getMatrixAt(i,actual);
   actual.elements.forEach((v,j)=>assert.ok(Math.abs(v-expected.elements[j])<1e-6));
  }
 }
 view.update([],s.player,1201);assert.equal(view.count(),0);view.dispose();geometry.dispose();material.dispose();
});

test('body contact deals one damage and sustained overlap respects the one-second cooldown',()=>{
 const s=run(),e=enemy(s);s.arms=[];e.x=s.player.x;e.z=s.player.z;e.damage=99;e.enemyAttack.readyAt=100;
 step(s,.01);assert.equal(s.hp,1);assert.equal(s.health.hits,1);
 for(let i=0;i<50;i++)step(s,.01);
 assert.equal(s.hp,1);
 for(let i=0;i<51;i++)step(s,.01);
 assert.equal(s.hp,0);assert.equal(s.health.hits,2);
});

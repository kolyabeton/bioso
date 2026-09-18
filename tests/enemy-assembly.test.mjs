import {FRAME_SURFACES} from '../src/creature-frame.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {ENEMY_RECIPES,BOSS_RECIPES,assembleEnemy,validateEnemyRecipe,eligibleRecipes,enemyTier,assignEnemyAssembly} from '../src/systems/enemy-assembly.js';
import {ENEMY_WEAPONS,SURVIVAL_BOSS_ATTACKS,survivalBossAttackDeck,tickModularAttack,warningHits,enemyAttackRange,enemyContactRange,ordinaryContactOnly} from '../src/systems/enemy-combat.js';
import {createRun,spawnEnemy,attack,step} from '../src/game.js';
import {stats} from '../src/assembly.js';
import {enemyBalance,SURVIVAL_PRESSURE,SURVIVAL_FINAL,survivalPressureProfile} from '../src/systems/balance.js';
import {createEnemyAssemblyView,enemyVisualParts,enemyVisualArchetype,enemyVisualRadius,ENEMY_BODY_APPEARANCES} from '../src/enemy-assembly-view.js';
import {fittedModel} from '../src/asset-models.js';
import {tickHostileShots} from '../src/systems/waves.js';
const run=()=>{const s=createRun(undefined,'survival',321);s.world={walkable:()=>true};return s;};
function enemy(s,r=ENEMY_RECIPES[0],kind='normal'){const e=spawnEnemy(s,kind,{x:0,z:1.5},r.role||'mass',Math.max(s.time,r.from||0));e.assembly=assembleEnemy(r,e.tier,kind);e.recipeId=r.id;e.specialty=r.specialty??null;e.speed=0;return e;}
test('23 unique recipes and five bosses fit shared catalog slots and capacity, including elite upgrades',()=>{
 assert.equal(ENEMY_RECIPES.length,23);assert.equal(new Set(ENEMY_RECIPES.map(r=>r.id)).size,23);
 for(const r of [...ENEMY_RECIPES,...BOSS_RECIPES]){assert.ok(validateEnemyRecipe(r),r.id);assert.ok(validateEnemyRecipe(r,'elite'),r.id);for(const p of assembleEnemy(r,1,'elite').arms.filter(Boolean))assert.ok(ENEMY_WEAPONS[p.key]);}
 for(const r of ENEMY_RECIPES){const keys=assembleEnemy(r,1,'elite').arms.filter(Boolean).map(p=>p.key);assert.equal(keys.length,2,r.id);assert.equal(new Set(keys).size,2,r.id);}
});
test('all 23 recipes keep distinct visible assemblies while bosses stay distinct',()=>{
 const s=run(),ordinary=[],signatures=[];
 for(const r of ENEMY_RECIPES){const e=enemy(s,r),archetype=enemyVisualArchetype(e);ordinary.push(archetype);signatures.push(enemyVisualParts(e).map(p=>`${p.asset}:${p.motion||''}`).join('|'));e.kind='elite';assert.equal(enemyVisualArchetype(e),r.specialty?`special:${r.id}`:`recipe:${r.id}`);}
 assert.equal(new Set(ordinary).size,23);assert.equal(new Set(signatures).size,23);
 const bosses=BOSS_RECIPES.map(r=>enemyVisualArchetype(enemy(s,r,'boss')));
 assert.equal(new Set(bosses).size,5);assert.ok(bosses.every(id=>id.startsWith('boss:')));
});
test('each enemy type owns one fixed body silhouette',()=>{
 assert.deepEqual(Object.keys(ENEMY_BODY_APPEARANCES).sort(),ENEMY_RECIPES.map(r=>r.id).sort());
 const signature=appearance=>JSON.stringify([appearance.core,appearance.head,appearance.size??1.25,appearance.stretch??[1,1,1],appearance.addons??[]]);
 assert.equal(new Set(Object.values(ENEMY_BODY_APPEARANCES).map(signature)).size,23);
 for(const r of ENEMY_RECIPES){const normal=enemy(run(),r),elite=enemy(run(),r,'elite'),n=2+(ENEMY_BODY_APPEARANCES[r.id].addons?.length??0);elite.tier=5;elite.assembly=assembleEnemy(r,5,'elite');assert.deepEqual(enemyVisualParts(normal).slice(0,n).map(p=>p.asset),enemyVisualParts(elite).slice(0,n).map(p=>p.asset),r.id);}
});
test('enemy part recipes preserve equipment while the renderer supplies chassis connections',()=>{
 for(const r of ENEMY_RECIPES){const e=enemy(run(),r),parts=enemyVisualParts(e);assert.ok(!parts.some(p=>p.asset==='mounting-joint'||p.asset.startsWith('joint-')),r.id);assert.equal(parts.filter(p=>p.asset.startsWith('leg-')).length,e.flying?0:e.assembly.legs.filter(Boolean).length,r.id);assert.equal(parts.filter(p=>p.asset.startsWith('arm-')).length,e.specialty==='shield-bearer'?1:e.assembly.arms.filter(Boolean).length,r.id);}
});
test('every thirtieth survival spawn is promoted to an elite',()=>{
 const s=run(),kinds=Array.from({length:60},()=>spawnEnemy(s,'normal',{x:0,z:5}).kind);
 assert.equal(kinds.filter(kind=>kind==='elite').length,2);assert.equal(kinds[28],'normal');assert.equal(kinds[29],'elite');assert.equal(kinds[59],'elite');
});
test('only time unlocks recipes and tiers, at exact boundaries',()=>{
 for(const [t,n]of [[0,5],[29.99,5],[30,8],[89.99,8],[90,12],[119.99,12],[120,13],[179.99,13],[180,16],[239.99,16],[240,17],[419.99,17],[420,18],[599.99,18],[600,20],[899.99,20],[900,21],[1199.99,21],[1200,22],[1499.99,22],[1500,23]])assert.equal(eligibleRecipes(t).length,n);
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
 for(const t of [0,480,960,1440,1920,2400])for(const kind of ['normal','elite','boss']){
  const s=run();s.introBossId=-1;const e=spawnEnemy(s,kind,{x:0,z:8},'mass',t),b=enemyBalance(t,kind);b.hp=Math.round(b.hp*SURVIVAL_PRESSURE.hp);b.speed*=SURVIVAL_PRESSURE.speed;if(['normal','elite'].includes(kind)){const pressure=survivalPressureProfile(t);b.hp=Math.round(b.hp*pressure.health);b.speed*=pressure.speed;}for(const k of ['hp','speed','armor','xp','radius'])assert.equal(e[k],b[k],`${t}/${kind}/${k}`);
 }
 const finalRun=run();finalRun.introBossId=-1;const final=spawnEnemy(finalRun,'final',{x:0,z:8},'mass',0);for(const k of ['hp','speed','armor'])assert.equal(final[k],SURVIVAL_FINAL[k],`final/${k}`);assert.equal(final.recommended,SURVIVAL_FINAL.recommendedLevel,'final/recommended');
 const s=createRun(undefined,'garden',2);const legacy=spawnEnemy(s,'normal',{x:0,z:2});assert.equal(legacy.assembly,undefined);assert.equal(legacy.hp,12);assert.equal(legacy.speed,2.15);
 const s2=run();assert.deepEqual([480,960,1440,1920].map(t=>spawnEnemy(s2,'boss',{x:0,z:5},'mass',t).recipeId),BOSS_RECIPES.slice(0,4).map(r=>r.id));assert.equal(spawnEnemy(s2,'final',{x:0,z:5}).recipeId,'mother');
});
test('ordinary direct melee has no separate attack and body contact deals half damage',()=>{
 const s=run(),e=enemy(s);s.arms=[];s.health.armorSpent=stats(s).armor;s.time=1;e.enemyAttack.readyAt=0;let hits=0;
 assert.ok(ordinaryContactOnly(e));assert.equal(tickModularAttack(s,e,s.player,()=>hits++),false);assert.equal(e.enemyAttack.warning,null);assert.equal(e.attackPose,undefined);assert.equal(hits,0);
 e.x=s.player.x;e.z=s.player.z;step(s,.01);assert.equal(s.health.hits,1);assert.equal(s.hp,3.5);assert.equal(e.attackPose,undefined);
});
test('ordinary melee damage begins only when silhouettes touch',()=>{
 const s=run(),e=enemy(s);s.arms=[];s.health.armorSpent=stats(s).armor;e.speed=0;e.enemyAttack.readyAt=0;const contact=enemyContactRange(s,e);e.z=contact+.01;
 step(s,.01);assert.equal(s.health.hits,0);assert.equal(e.attackPose,undefined);
 e.z=contact;step(s,.01);assert.equal(s.health.hits,1);assert.equal(s.hp,3.5);assert.equal(e.attackPose,undefined);
});
test('ordinary enemies keep their direct attacks while survival bosses teach two moves, then unlock a third',()=>{
 for(const r of ENEMY_RECIPES){const s=run(),e=enemy(s,r),key=e.assembly.arms.find(Boolean).key,mode=ENEMY_WEAPONS[key].mode;if(mode==='sector')e.z=enemyAttackRange(e,s);e.enemyAttack.readyAt=0;let hits=0;tickModularAttack(s,e,s.player,()=>hits++);const w=e.enemyAttack.warning;if(['area','acid'].includes(mode)){assert.ok(w,r.id);s.time=w.at;tickModularAttack(s,e,s.player,()=>hits++);tickModularAttack(s,e,s.player,()=>hits++);assert.equal(hits,mode==='acid'?0:1,r.id);if(mode==='acid')assert.equal(s.enemyAcidPools.length,1,r.id);}else if(mode==='shot'){assert.equal(w,null,r.id);assert.equal(s.hostileShots.length,1,r.id);assert.equal(e.attackPose.key,key);tickModularAttack(s,e,s.player,()=>hits++);assert.equal(s.hostileShots.length,1,r.id);}else if(r.specialty){assert.equal(w,null,r.id);assert.equal(hits,1,r.id);assert.equal(e.attackPose.key,key,r.id);}else{assert.equal(w,null,r.id);assert.equal(hits,0,r.id);assert.equal(e.attackPose,undefined,r.id);}}
 for(const r of BOSS_RECIPES){const e={kind:r.id==='mother'?'final':'boss',recipeId:r.id,hp:100,maxHp:100};assert.equal(SURVIVAL_BOSS_ATTACKS[r.id].length,3,r.id);assert.equal(new Set(SURVIVAL_BOSS_ATTACKS[r.id].map(w=>w.bossAction)).size,3,r.id);assert.equal(survivalBossAttackDeck(e).length,2,r.id);e.hp=60;assert.equal(survivalBossAttackDeck(e).length,3,r.id);}
});
test('freeze cancels warning, pause preserves it, death prevents a strike, return cancels attacks',()=>{
 const s=run(),e=enemy(s);e.assembly.arms=[{key:'hammer'}];e.enemyAttack.readyAt=0;tickModularAttack(s,e,s.player,()=>{});s.pending=1;const before=JSON.stringify(e.enemyAttack);step(s,3);assert.equal(JSON.stringify(e.enemyAttack),before);s.pending=0;
 e.frozenUntil=2;tickModularAttack(s,e,s.player,()=>assert.fail());assert.equal(e.enemyAttack.warning,null);s.time=3;e.enemyAttack.readyAt=3;tickModularAttack(s,e,s.player,()=>{});e.territory={state:'returning'};tickModularAttack(s,e,s.player,()=>assert.fail());assert.equal(e.enemyAttack.warning,null);
 delete e.territory;e.hp=0;s.time=9;tickModularAttack(s,e,s.player,()=>assert.fail());
});
test('sector sides, fixed acid circle and vertical separation match warning geometry',()=>{
 const w={mode:'sector',x:0,y:0,z:0,dx:0,dz:1,radius:3,angle:1};assert.ok(warningHits(w,{x:0,z:2}));assert.ok(!warningHits(w,{x:2,z:0}));assert.ok(!warningHits(w,{x:0,z:2,y:4}));assert.ok(!warningHits({...w,mode:'acid',radius:2},{x:4,z:0}));
});
test('needle uses its speed and swept collision without hitting twice',()=>{
 const s=run();s.player={x:0,z:0};s.hostileShots=[{x:0,y:1,z:4,dx:0,dz:-1,dy:0,speed:7,life:3,key:'needle',travel:0}];let hits=0;tickHostileShots(s,1,()=>hits++);tickHostileShots(s,1,()=>hits++);assert.equal(hits,1);assert.equal(s.hostileShots.length,0);
});
test('100 creatures remain modular even with no GLB loader; pools reset cleanly',()=>{
 const s=run(),scene=new T.Scene(),v=createEnemyAssemblyView(scene);s.enemies=[];for(let i=0;i<100;i++){const e=enemy(s,ENEMY_RECIPES[i%15]);e.x=i%10*3;e.z=Math.floor(i/10)*3;}v.update(s.enemies,s.player,0);assert.equal(v.count(),100);assert.ok(v.info().enemyParts>=500);assert.equal(v.info().enemyParts,v.info().enemyFallbackParts);assert.ok(scene.children[0].children.every(p=>p.isInstancedMesh));assert.ok(enemyVisualParts(s.enemies[0]).some(p=>p.asset.startsWith('leg-')));v.reset();assert.equal(v.count(),0);v.dispose();assert.equal(scene.children.length,0);
});
test('cold-loaded enemy weapons use a narrow drive instead of a large spherical placeholder',()=>{
 const s=run(),scene=new T.Scene(),v=createEnemyAssemblyView(scene),orchid=enemy(s,BOSS_RECIPES[2],'boss');v.update([orchid],s.player,0);
 const weaponPools=scene.children[0].children.filter(p=>p.geometry===FRAME_SURFACES.drive.geometry);assert.equal(weaponPools.length,2);
 for(const pool of weaponPools){const matrix=new T.Matrix4(),scale=new T.Vector3();pool.getMatrixAt(0,matrix);matrix.decompose(new T.Vector3(),new T.Quaternion(),scale);const axes=[scale.x,scale.y,scale.z].sort((a,b)=>a-b);assert.ok(axes[2]>axes[0]*4);}
 v.dispose();
});
test('loaded detail geometry is shared by instances, not cloned per enemy',async()=>{
 const template=new T.Group(),geometry=new T.BoxGeometry(1,2,1),material=new T.MeshStandardMaterial();template.add(new T.Mesh(geometry,material));
 const s=run(),scene=new T.Scene(),v=createEnemyAssemblyView(scene,{load:async()=>template});for(let i=0;i<100;i++)enemy(s,ENEMY_RECIPES[i%15]);
 v.update(s.enemies,s.player,0);await Promise.resolve();v.update(s.enemies,s.player,1);
 const active=scene.children[0].children.filter(p=>p.count);assert.equal(v.info().enemyFallbackParts,0);assert.equal(v.count(),100);const surfaces=Object.values(FRAME_SURFACES);assert.ok(active.every(p=>p.isInstancedMesh&&(p.geometry===geometry&&p.material===material||surfaces.some(s=>s.geometry===p.geometry&&s.material===p.material))));assert.equal(active.filter(p=>surfaces.some(s=>s.geometry===p.geometry)).length,5);
 const matrices=active.flatMap(p=>Array.from(p.instanceMatrix.array));assert.ok(matrices.every(Number.isFinite));v.dispose();geometry.dispose();material.dispose();
});
test('a warned strike and body contact share invulnerability',()=>{
 const s=run(),e=enemy(s);s.arms=[];s.health.armorSpent=stats(s).armor;e.assembly.arms=[{key:'hammer'}];e.enemyAttack.readyAt=0;tickModularAttack(s,e,s.player,()=>{});s.time=e.enemyAttack.warning.at;step(s,.01);assert.equal(s.health.hits,1);assert.equal(s.hp,3.5);
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
   const world=new T.Object3D();world.position.set(e.x,1.1+(reducedMotion?0:Math.sin(1200*6+e.id)*.12),e.z);world.rotation.y=Math.atan2(s.player.x-e.x,s.player.z-e.z);world.scale.setScalar(enemyVisualRadius(e));world.updateMatrix();
   const baked=fittedModel(template,{size:part.size,anchor:part.anchor,rotation:part.rotation});baked.position.set(...part.position);baked.updateMatrixWorld(true);
   let expected;baked.traverse(o=>{if(o.isMesh)expected=world.matrix.clone().multiply(o.matrixWorld);});
   const actual=new T.Matrix4();pool.getMatrixAt(i,actual);
   actual.elements.forEach((v,j)=>assert.ok(Math.abs(v-expected.elements[j])<1e-6));
  }
 }
 view.update([],s.player,1201);assert.equal(view.count(),0);view.dispose();geometry.dispose();material.dispose();
});

test('body contact deals half damage and sustained overlap respects the one-second cooldown',()=>{
 const s=run(),e=enemy(s);s.arms=[];s.health.armorSpent=stats(s).armor;e.x=s.player.x;e.z=s.player.z;e.damage=.5;e.enemyAttack.readyAt=100;
 step(s,.01);assert.equal(s.hp,3.5);assert.equal(s.health.hits,1);
 for(let i=0;i<50;i++)step(s,.01);
 assert.equal(s.hp,3.5);
 for(let i=0;i<51;i++)step(s,.01);
 assert.equal(s.hp,3);assert.equal(s.health.hits,2);
});

test('animated puppet and repeated assembly scale reuse a finite set of fitted shapes',async()=>{
 const template=new T.Group(),geometry=new T.BoxGeometry(1,2,1),material=new T.MeshStandardMaterial();template.add(new T.Mesh(geometry,material));
 const s=run(),e=enemy(s,ENEMY_RECIPES.find(r=>r.id==='puppeteer')),scene=new T.Scene(),view=createEnemyAssemblyView(scene,{load:async()=>template});
 e.summonAssembly={started:0,until:2,speed:e.speed};e.specialAttack={kind:'puppeteer',started:0,at:3};
 view.update([e],s.player,0);await Promise.resolve();
 let warmCount=0;
 for(let frame=1;frame<=1800;frame++){
  const time=frame/60;e.summonAssembly={started:Math.floor(time/3)*3,until:Math.floor(time/3)*3+2,speed:e.speed};
  view.update([e],s.player,time);
  if(frame===600)warmCount=view.info().enemyFittedShapes;
 }
 assert.equal(view.info().enemyFittedShapes,warmCount);assert.ok(warmCount<25);
 for(const pool of scene.children[0].children.filter(p=>p.count)){
  assert.deepEqual(pool.instanceMatrix.updateRanges,[{start:0,count:pool.count*16}]);
  assert.ok([...pool.instanceMatrix.array.slice(0,pool.count*16)].every(Number.isFinite));
 }
 view.dispose();geometry.dispose();material.dispose();
});

test('mesh frustum culling retains visible assemblies and skips wholly offscreen geometry',async()=>{
 const scene=new T.Scene(),template=new T.Group(),geometry=new T.BoxGeometry(.7,2,1.3),material=new T.MeshStandardMaterial();template.add(new T.Mesh(geometry,material));
 const view=createEnemyAssemblyView(scene,{load:async()=>template}),e=enemy(run()),camera=new T.PerspectiveCamera(50,1,.1,100);
 camera.position.set(0,6,12);camera.lookAt(0,1,0);camera.updateMatrixWorld();
 view.update([e],{x:0,z:0},0);await Promise.resolve();view.update([e],{x:0,z:0},1,1,false,camera);
 const root=scene.getObjectByName('modular-enemies'),instances=()=>root.children.reduce((n,p)=>n+p.count,0);assert.ok(instances()>0);
 e.x=10000;view.update([e],{x:0,z:0},1,1,false,camera);assert.equal(instances(),0);
 e.x=0;view.update([e],{x:0,z:0},1,1,false,camera);assert.ok(instances()>0);
 view.dispose();geometry.dispose();material.dispose();
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,spawnEnemy,hurtEnemy} from '../src/game.js';
import {assignEnemyAssembly,ENEMY_RECIPES} from '../src/systems/enemy-assembly.js';
import {PUPPETEER_BUILD_SECONDS,SHIELD_ATTACK_INTERVAL,SHIELD_FRONT_REDUCTION,MIRROR_COOLDOWN,puppeteerSummonSpread,specialistDamageScale,summonAssemblyProgress,tryMirrorProjectile,tickEnemySpecialist} from '../src/systems/enemy-specialists.js';
import {tickModularAttack} from '../src/systems/enemy-combat.js';
import {SHIELD_VISUAL_MULTIPLIER,SHIELD_VISUAL_SIZE,enemyVisualParts,enemyVisualArchetype,ENEMY_BODY_APPEARANCES} from '../src/enemy-assembly-view.js';

const setup=id=>{
 const s=createRun(undefined,'survival',72);s.world={walkable:()=>true};s.waves.credit=-1e6;s.nextElite=s.nextBoss=Infinity;s.player={x:0,y:0,z:5};
 const recipe=ENEMY_RECIPES.find(r=>r.id===id),e=spawnEnemy(s,'normal',{x:0,y:0,z:0},recipe.role,0,{promote:false});assignEnemyAssembly(s,e,0,{missionRole:recipe.role,missionRecipeId:id});e.speed=0;return{s,e};
};

test('shield-bearer reduces the frontal 120 degree sector by exactly 80 percent and leaves its rear open',()=>{
 const {e}=setup('shield-bearer');e.specialFacing=0;
 assert.equal(SHIELD_FRONT_REDUCTION,.8);assert.ok(Math.abs(specialistDamageScale(e,{origin:{x:0,z:5}})-.2)<1e-12);assert.equal(specialistDamageScale(e,{origin:{x:0,z:-5}}),1);
 e.enemyAttack.warning={};assert.equal(specialistDamageScale(e,{origin:{x:0,z:5}}),1);
});

test('shield-bearer holds between rams whose impacts are five seconds apart',()=>{
 const {s,e}=setup('shield-bearer');s.player.z=1;e.enemyAttack.readyAt=0;s.time=0;tickModularAttack(s,e,s.player,()=>{},true);const first=e.enemyAttack.warning;s.time=first.at;tickModularAttack(s,e,s.player,()=>{},true);const impact=s.time;s.time=e.enemyAttack.readyAt;tickModularAttack(s,e,s.player,()=>{},true);assert.ok(Math.abs(e.enemyAttack.warning.at-impact-SHIELD_ATTACK_INTERVAL)<1e-9);
});

test('mirrorling turns one player projectile into a hostile shot and observes its cooldown',()=>{
 const {s,e}=setup('mirrorling'),weapon={key:'needle',damage:35,range:14,speed:40},shot={mode:'projectile',speed:40,w:weapon};
 assert.equal(MIRROR_COOLDOWN,5);assert.equal(tryMirrorProjectile(s,e,shot),true);assert.equal(s.hostileShots.length,1);const reflected=s.hostileShots[0];assert.equal(reflected.reflectedByMirror,true);assert.ok(reflected.dz>0);assert.equal(reflected.key,'needle');assert.equal(reflected.w,weapon);assert.equal(reflected.speed,shot.speed);assert.equal(reflected.damage,weapon.damage);assert.equal(tryMirrorProjectile(s,e,shot),false);assert.ok(e.specialPose);
});

test('puppeteer keeps releasing visible pairs while alive and replenishes losses',()=>{
 const {s,e}=setup('puppeteer'),spawned=[];e.specialReadyAt=0;s.time=0;const spawn=(parent,recipe,side)=>{spawned.push([recipe,side]);s.enemies.push({id:++s.entityId,hp:1,summonOwner:parent.id});};
 assert.equal(tickEnemySpecialist(s,e,0,spawn),true);assert.equal(spawned.length,0);s.time=.91;tickEnemySpecialist(s,e,0,spawn);s.time=4.92;tickEnemySpecialist(s,e,0,spawn);s.time=5.83;tickEnemySpecialist(s,e,0,spawn);assert.deepEqual(spawned,[['worker','left'],['worker','right'],['worker','left'],['worker','right']]);
 s.enemies.find(q=>q.summonOwner===e.id).hp=0;s.time=9.84;tickEnemySpecialist(s,e,0,spawn);s.time=10.75;tickEnemySpecialist(s,e,0,spawn);assert.equal(spawned.length,6);
});

test('puppeteer workers visibly assemble from separate equipment before becoming whole',()=>{
 const {e}=setup('puppeteer'),worker=setup('worker').e;worker.summonAssembly={started:10,until:10+PUPPETEER_BUILD_SECONDS,speed:worker.speed};
 const core=enemyVisualParts(worker,10.05),building=enemyVisualParts(worker,10.7),whole=enemyVisualParts(worker,12);
 assert.equal(summonAssemblyProgress(worker,10),0);assert.equal(summonAssemblyProgress(worker,worker.summonAssembly.until),1);
 assert.ok(core.some(p=>p.motion==='summon-core'));assert.ok(building.some(p=>p.motion==='summon-assembly'));assert.ok(building.some(p=>p.size<whole.find(q=>q.asset===p.asset)?.size));assert.ok(!whole.some(p=>p.motion?.startsWith('summon-')));assert.equal(e.specialty,'puppeteer');assert.deepEqual([puppeteerSummonSpread(0),puppeteerSummonSpread(2),puppeteerSummonSpread(4)],[1.25,2.15,3.05]);
});

test('divider splits once into two smaller rewardless attackers',()=>{
 const {s,e}=setup('divider');hurtEnemy(s,e,Number.MAX_SAFE_INTEGER);const children=s.enemies.filter(q=>q.hp>0&&q.summonOwner===e.id);
 assert.equal(children.length,2);assert.ok(children.every(q=>q.recipeId==='divider'&&q.splitGeneration===1&&q.noRewards&&q.visualScale<1));
 for(const child of children)hurtEnemy(s,child,Number.MAX_SAFE_INTEGER);assert.equal(s.enemies.filter(q=>q.hp>0&&q.summonOwner===e.id).length,0);
});

test('all four specialists use fixed authored bodies and attack-ready visual parts',()=>{
 for(const id of ['shield-bearer','divider','mirrorling','puppeteer']){const {e}=setup(id),parts=enemyVisualParts(e);assert.equal(enemyVisualArchetype(e),`special:${id}`);assert.ok(parts.some(p=>p.asset===ENEMY_BODY_APPEARANCES[id].core));assert.ok(parts.some(p=>p.asset.startsWith('arm-')));assert.ok(parts.some(p=>p.motion?.startsWith('special'))||id==='divider');}
 const shield=enemyVisualParts(setup('shield-bearer').e),shieldPart=shield.find(p=>p.motion==='special-shield'),shieldBody=shield.find(p=>p.asset===ENEMY_BODY_APPEARANCES['shield-bearer'].core);assert.equal(SHIELD_VISUAL_SIZE,13.5);assert.equal(SHIELD_VISUAL_MULTIPLIER,2.5);assert.equal(shieldPart.size,SHIELD_VISUAL_SIZE);assert.equal(shieldPart.visualScale,SHIELD_VISUAL_MULTIPLIER);assert.equal(shieldPart.materialStyle,'shield-special');assert.equal(shieldPart.anchor,'center');assert.ok(shieldPart.position[2]>=.3&&shieldPart.position[2]<=.5);assert.ok(Math.abs(shieldPart.rotation[0])<.01);assert.ok(shieldBody.size<.7);
 const mirror=enemyVisualParts(setup('mirrorling').e);assert.ok(mirror.every(p=>p.materialStyle==='mirror'));assert.equal(mirror.filter(p=>p.motion?.startsWith('special-mirror')).length,3);assert.ok(Math.max(...mirror.map(p=>p.position[1]))>2.5);
});

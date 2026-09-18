import test from 'node:test';
import assert from 'node:assert/strict';
import {attack,createRun,hurtEnemy,spawnEnemy} from '../src/game.js';
import {createPart} from '../src/assembly.js';
import {assignEnemyAssembly,ENEMY_RECIPES} from '../src/systems/enemy-assembly.js';
import {ENEMY_LOCOMOTION,enemyInvulnerable,enemyLocomotionPose,enemyTargetable,tickEnemyLocomotion} from '../src/systems/enemy-locomotion.js';

const flatWorld=blocked=>({walkable:(x,z)=>!blocked?.(x,z),canMove:(from,to)=>!blocked?.(to.x,to.z)});
function setup(id,{x=0,z=0,target={x:0,y:0,z:12},world=flatWorld()}={}){
 const s=createRun(undefined,'survival',1701);s.world=world;s.player={...target};s.waves.credit=-1e6;s.nextElite=s.nextBoss=Infinity;
 const recipe=ENEMY_RECIPES.find(r=>r.id===id),e=spawnEnemy(s,'normal',{x,y:0,z},recipe.role,960,{promote:false});assignEnemyAssembly(s,e,960,{missionRole:recipe.role,missionRecipeId:id});e.hp=e.maxHp=10000;e.damage=1;return{s,e};
}
const tickAt=(s,e,time,options={})=>{const previous=e.testAt??0;e.testAt=time;s.time=time;return tickEnemyLocomotion(s,e,s.player,Math.max(0,time-previous),{speed:e.speed,...options});};

test('six recipes own locomotion identities while worker stays the baseline',()=>{
 const expected={gatherer:'spiral',digger:'burrow','small-hunter':'hop',runner:'sprint',biter:'pack',crusher:'charge'};
 for(const [id,locomotion]of Object.entries(expected)){
  const recipe=ENEMY_RECIPES.find(r=>r.id===id);assert.equal(recipe.locomotion,locomotion);
  const s=createRun(undefined,'survival',77),e=spawnEnemy(s,'elite',{x:0,y:0,z:4},recipe.role,960,{promote:false});assignEnemyAssembly(s,e,960,{missionRole:recipe.role,missionRecipeId:id});assert.equal(e.locomotion,locomotion);
 }
 assert.equal(ENEMY_RECIPES.find(r=>r.id==='worker').locomotion,undefined);
});

test('small hunter advances only through its 3.6 metre hop and contacts after landing',()=>{
 const {s,e}=setup('small-hunter');let state=tickAt(s,e,0,{stopDistance:1});assert.equal(state.contactAllowed,false);assert.equal(e.z,0);
 state=tickAt(s,e,.27,{stopDistance:1});assert.equal(e.locomotionState.phase,'travel');assert.ok(e.z>1.6&&e.z<2);assert.ok(enemyLocomotionPose(e,.27).y>1);
 state=tickAt(s,e,.5,{stopDistance:1});assert.ok(Math.abs(e.z-ENEMY_LOCOMOTION.hop.distance)<1e-9);assert.equal(e.locomotionState.phase,'land');assert.equal(state.contactAllowed,true);
});

test('gatherer closes along a curved spiral instead of a straight chase',()=>{
 const {s,e}=setup('gatherer');const state=tickAt(s,e,.1,{stopDistance:1});assert.equal(state.movementOwned,true);assert.ok(e.z>0);assert.ok(Math.abs(e.x)>.05);
});

test('digger is fully invulnerable and untargetable only during underground travel',()=>{
 const {s,e}=setup('digger');tickAt(s,e,0,{stopDistance:1});assert.equal(e.locomotionState.phase,'dive');assert.equal(enemyTargetable(e),true);
 tickAt(s,e,.36,{stopDistance:1});assert.equal(e.locomotionState.phase,'travel');assert.equal(enemyInvulnerable(e),true);assert.equal(enemyTargetable(e),false);
 const hp=e.hp;assert.equal(hurtEnemy(s,e,500,0,'environment'),false);assert.equal(e.hp,hp);
 tickAt(s,e,.91,{stopDistance:1});assert.equal(e.locomotionState.phase,'emerge');assert.equal(enemyTargetable(e),true);assert.equal(hurtEnemy(s,e,1),true);assert.ok(e.hp<hp);
});

test('automatic weapon aim skips an underground digger',()=>{
 const {s,e:digger}=setup('digger',{z:4,target:{x:0,y:0,z:0}});digger.locomotionState={kind:'burrow',phase:'travel',startedAt:0,from:{x:0,z:4},to:{x:0,z:8}};
 const worker=spawnEnemy(s,'normal',{x:0,y:0,z:5},'mass',960,{promote:false}),recipe=ENEMY_RECIPES.find(r=>r.id==='worker');assignEnemyAssembly(s,worker,960,{missionRole:'mass',missionRecipeId:recipe.id});worker.hp=worker.maxHp=10000;
 s.arms=[createPart(s,'seed',1),null];s.events=[];attack(s,.01);assert.equal(s.events.find(event=>event.type==='attack')?.tz,worker.z);
});

test('runner builds speed while retaining a bounded turn rate',()=>{
 const {s,e}=setup('runner');const start=e.z;for(let i=1;i<=10;i++)tickAt(s,e,i/10,{stopDistance:1});assert.ok(e.z-start>e.speed);assert.ok(e.locomotionState.boost>=.9);
 s.player={x:12,y:0,z:e.z};const heading=e.locomotionState.heading;tickAt(s,e,1.1,{stopDistance:1});assert.ok(Math.abs(e.locomotionState.heading-heading)<=ENEMY_LOCOMOTION.sprint.turn*.101);
});

test('freeze cancels hop, sprint and charge without moving the enemy',()=>{
 for(const id of ['small-hunter','runner','crusher']){
  const target=id==='crusher'?{x:0,y:0,z:6}:{x:0,y:0,z:12},{s,e}=setup(id,{target});tickAt(s,e,0,{stopDistance:1});
  const before={x:e.x,z:e.z};e.frozenUntil=1;const state=tickAt(s,e,.2,{stopDistance:1});
  assert.deepEqual({x:e.x,z:e.z},before);assert.equal(state.movementOwned,true);assert.equal(state.contactAllowed,false);assert.equal(e.locomotionState,undefined);
 }
});

test('an unchanged combat clock preserves the active manoeuvre phase and position',()=>{
 const {s,e}=setup('small-hunter');tickAt(s,e,0,{stopDistance:1});tickAt(s,e,.34,{stopDistance:1});
 const before={phase:e.locomotionState.phase,x:e.x,z:e.z,startedAt:e.locomotionState.startedAt};
 tickEnemyLocomotion(s,e,s.player,0,{speed:e.speed,stopDistance:1});
 assert.deepEqual({phase:e.locomotionState.phase,x:e.x,z:e.z,startedAt:e.locomotionState.startedAt},before);
});

test('biter packs stage in distinct sectors and enter the same assault window',()=>{
 for(const count of [1,2,4,8]){
  const first=setup('biter',{x:0,z:ENEMY_LOCOMOTION.pack.radius,target:{x:0,y:0,z:0}}),s=first.s,enemies=[first.e];
  for(let i=1;i<count;i++){const recipe=ENEMY_RECIPES.find(r=>r.id==='biter'),angle=i/count*Math.PI*2,e=spawnEnemy(s,'normal',{x:Math.sin(angle)*ENEMY_LOCOMOTION.pack.radius,y:0,z:Math.cos(angle)*ENEMY_LOCOMOTION.pack.radius},'fast',960,{promote:false});assignEnemyAssembly(s,e,960,{missionRole:'fast',missionRecipeId:recipe.id});e.hp=e.maxHp=10000;enemies.push(e);}
  s.time=.2;for(let frame=0;frame<70;frame++){s.time+=.02;for(const e of enemies)tickEnemyLocomotion(s,e,s.player,.02,{speed:e.speed,stopDistance:1});}
  const angles=enemies.map(e=>Math.atan2(e.x,e.z)).sort((a,b)=>a-b);assert.equal(new Set(angles.map(a=>a.toFixed(2))).size,count);
  s.time=1.7;const before=enemies.map(e=>Math.hypot(e.x,e.z));const states=enemies.map(e=>tickEnemyLocomotion(s,e,s.player,.1,{speed:e.speed,stopDistance:1}));assert.ok(states.every(state=>state.contactAllowed));assert.ok(enemies.every((e,i)=>Math.hypot(e.x,e.z)<before[i]));
 }
});

test('a biter pack deterministically redistributes its sectors after a death',()=>{
 const first=setup('biter',{x:0,z:ENEMY_LOCOMOTION.pack.radius,target:{x:0,y:0,z:0}}),s=first.s,enemies=[first.e];
 for(let i=1;i<4;i++){const recipe=ENEMY_RECIPES.find(r=>r.id==='biter'),e=spawnEnemy(s,'normal',{x:i,y:0,z:ENEMY_LOCOMOTION.pack.radius},'fast',960,{promote:false});assignEnemyAssembly(s,e,960,{missionRole:'fast',missionRecipeId:recipe.id});e.hp=e.maxHp=10000;enemies.push(e);}
 s.time=.2;for(const e of enemies)tickEnemyLocomotion(s,e,s.player,0,{speed:e.speed,stopDistance:1});
 enemies[1].hp=0;const living=enemies.filter(e=>e.hp>0).sort((a,b)=>a.id-b.id);for(const e of living){e.x=0;e.z=0;}
 s.time=.3;for(let frame=0;frame<150;frame++)for(const e of living)tickEnemyLocomotion(s,e,s.player,.02,{speed:e.speed,stopDistance:1});
 for(let i=0;i<living.length;i++){
  const actual=Math.atan2(living[i].x,living[i].z),expected=i/living.length*Math.PI*2;
  assert.ok(Math.abs(Math.atan2(Math.sin(actual-expected),Math.cos(actual-expected)))<.12);
 }
});

test('crusher telegraphs, charges no farther than five metres and recovers',()=>{
 const {s,e}=setup('crusher',{target:{x:0,y:0,z:6}});let state=tickAt(s,e,0,{stopDistance:1});assert.equal(e.locomotionState.phase,'windup');assert.equal(state.contactAllowed,false);
 state=tickAt(s,e,.9,{stopDistance:1});assert.equal(e.locomotionState.phase,'travel');assert.equal(state.contactAllowed,true);assert.ok(e.z>2&&e.z<3);
 tickAt(s,e,1.21,{stopDistance:1});assert.ok(e.z<=ENEMY_LOCOMOTION.charge.distance);assert.equal(e.locomotionState.phase,'recovery');
 tickAt(s,e,1.91,{stopDistance:1});assert.equal(e.locomotionState,undefined);assert.ok(e.locomotionReadyAt>s.time);
});

test('crusher charge stops at contact distance instead of entering the target model',()=>{
 const stopDistance=2.1,{s,e}=setup('crusher',{target:{x:0,y:0,z:4.5}});tickAt(s,e,0,{stopDistance});
 tickAt(s,e,1.21,{stopDistance});
 assert.ok(Math.hypot(e.x-s.player.x,e.z-s.player.z)>=stopDistance-.01);
});

test('blocked jump and charge endpoints are shortened instead of crossing a wall',()=>{
 const world=flatWorld((x,z)=>z>1.5);
 for(const id of ['small-hunter','crusher']){
  const {s,e}=setup(id,{target:{x:0,y:0,z:6},world});tickAt(s,e,0,{stopDistance:1});
  if(e.locomotionState){s.time=2;tickEnemyLocomotion(s,e,s.player,2,{speed:e.speed,stopDistance:1});}
  assert.ok(e.z<=1.5);
 }
});

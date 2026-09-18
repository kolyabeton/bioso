import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,spawnEnemy,attack,hurtEnemy,receiveDamage} from '../src/game.js';
import {createWorldRun} from '../src/world-run.js';
import {tickModularAttack,enemyAttackRange} from '../src/systems/enemy-combat.js';
import {createPart,equip,digest,upgrade,upgradeOptions} from '../src/assembly.js';
import {createEnemyHealthView} from '../src/enemy-health-view.js';
import * as T from 'three';
test('opening Warden ram hits only its locked forward sector in both phases',()=>{
 const s=createWorldRun(undefined,'survival',42),e=s.enemies.find(q=>q.id===s.introBossId);
 assert.equal(e.recipeId,'warden');e.territory.state='engaged';
 for(const phase of [1,2])for(const yaw of [0,Math.PI/2,-Math.PI*.75]){
  const dx=Math.sin(yaw),dz=Math.cos(yaw);
  for(const [name,forward,side,expected] of [['front',9,0,1],['edge',10,0,1],['left',0,-9,0],['right',0,9,0],['behind',-9,0,0],['outside arc',6,6,0],['outside reach',10.36,0,0]]){
   e.hp=e.maxHp*(phase===1?1:.5);e.enemyAttack={index:0,phase,readyAt:0,warning:null};s.time+=10;
   s.player={x:e.x+dx*9,y:e.y,z:e.z+dz*9};let hits=0;
   assert.equal(enemyAttackRange(e,s),10);
   tickModularAttack(s,e,s.player,()=>hits++,true);const w=e.enemyAttack.warning;
   assert.equal(w.mode,'sector');assert.equal(w.telegraphMode,'sector');assert.equal(w.radius,10);assert.equal(w.angle,Math.PI/3);
   s.player={x:e.x+dx*forward+dz*side,y:e.y,z:e.z+dz*forward-dx*side};s.time=w.at;
   tickModularAttack(s,e,s.player,()=>hits++,true);
   assert.equal(hits,expected,`${phase}/${yaw}/${name}`);assert.equal(e.attackPose.dx,w.dx);assert.equal(e.attackPose.dz,w.dz);
  }
 }
});

test('root Warden keeps its separate circular ground slam',()=>{
 const s=createWorldRun(undefined,'survival',42),e=s.enemies.find(q=>q.recipeId==='root-warden');
 e.territory.state='engaged';e.enemyAttack={index:0,readyAt:0,warning:null};s.player={x:e.x,y:e.y,z:e.z+1};
 tickModularAttack(s,e,s.player,()=>{},true);const w=e.enemyAttack.warning;
 assert.equal(w.mode,'area');assert.equal(w.radius,3.8*3);
});

test('opening habitat deals at most half a heart through contact, melee and phase-two shots',()=>{
 const s=createWorldRun(undefined,'survival',42),e=s.enemies.find(q=>q.id===s.introBossId);
 assert.equal(e.damage,.5);e.territory.state='engaged';s.player={x:e.x,y:e.y,z:e.z+1};
 const hit=()=>{s.hp=2;s.health.invulnerableUntil=0;receiveDamage(s,e.damage,{hp:2,armor:0,dodge:0},e);assert.equal(s.hp,1.5);};
 hit();
 for(const index of [0,1,2]){
  e.hp=e.maxHp*.5;e.enemyAttack={index,phase:2,readyAt:0,warning:null};s.time+=10;
  let hits=0;const strike=()=>{hits++;hit();};
  tickModularAttack(s,e,s.player,strike,true);
  assert.ok(e.enemyAttack.warning);s.time=e.enemyAttack.warning.at;
  tickModularAttack(s,e,s.player,strike,true);
  if(index<2)assert.equal(hits,1);
 }
 assert.equal(s.hostileShots.length,10);
 assert.ok(s.hostileShots.every(q=>q.damage>0&&q.damage<=.5));
 assert.ok(s.enemies.filter(q=>q.habitat&&q!==e&&q.habitatRank!==4).every(q=>q.damage>.5));
});
test('intro boss takes 8–11 seconds with one unupgraded starter claw',()=>{
 const s=createRun(undefined,'survival',20317),e=spawnEnemy(s,'boss',{x:1,z:0});
 assert.equal(e.maxHp,182);let t=0;while(e.hp>0&&t<30){attack(s,.01);s.time+=.01;t+=.01;}
 assert.ok(e.hp===0);assert.ok(t>=8&&t<=11,`kill time ${t}`);
 const second=spawnEnemy(s,'boss',{x:1,z:0});assert.ok(second.hp>182);
});
test('first boss guarantees digestion every run and unlocks real recycling/upgrading',()=>{
 for(const unlocked of [false,true]){const s=createRun();if(unlocked)s.profile.unlocked.push('digestion');
 const e=spawnEnemy(s,'boss',{x:1,z:0});hurtEnemy(s,e,10000);hurtEnemy(s,e,10000);
 const drops=s.ground.filter(q=>q.part.key==='digestion');assert.equal(drops.length,1);assert.ok(s.profile.unlocked.includes('digestion'));
 s.inventory.push(drops[0].part);assert.ok(equip(s,drops[0].part.id,0));
 for(const key of ['claws','universal','claws','universal']){const p=createPart(s,key);s.inventory.push(p);assert.ok(digest(s,p.id));}assert.equal(s.biomass,12);
 const option=upgradeOptions(s.arms[0])[0];assert.ok(option);assert.ok(upgrade(s,s.arms[0].id,option,true));assert.equal(s.biomass,0);
 const second=spawnEnemy(s,'boss',{x:1,z:0});hurtEnemy(s,second,10000);assert.equal(s.ground.filter(q=>q.part.key==='digestion').length,1);
 }
});
test('boss and elite bars face camera, shrink and disappear after death/reset',()=>{
 const scene=new T.Scene(),camera=new T.PerspectiveCamera();camera.rotation.x=-.8;const view=createEnemyHealthView(scene),enemies=[{id:1,kind:'boss',hp:200,maxHp:400,x:0,z:0,radius:1.7},{id:2,kind:'elite',hp:100,maxHp:100,x:4,z:0,radius:1},{id:3,kind:'normal',hp:10,maxHp:10}];
 view.update(enemies,camera,2);const bars=scene.getObjectByName('enemy-health-bars').children;assert.equal(bars.length,2);assert.equal(bars[0].children[0].visible,false);assert.ok(Math.abs(bars[0].children[1].scale.x-5.8*(734/768)*.5)<1e-9);assert.equal(bars[0].position.y,7.52);assert.ok(bars[0].quaternion.equals(camera.quaternion));
 assert.equal(bars[0].children[1].material.color.getHexString(),'ed7465');assert.equal(bars[0].children[1].material.transparent,true);assert.ok(bars[0].children[1].renderOrder>99);
 assert.equal(bars[1].children[0].scale.y,.1);assert.equal(bars[1].children[1].scale.y,.1);assert.equal(bars[1].children[1].material.color.getHexString(),'e89a48');
 enemies[0].hp=0;view.update(enemies,camera);assert.equal(bars[1].visible,false);view.reset();assert.ok(bars.every(b=>!b.visible));
});

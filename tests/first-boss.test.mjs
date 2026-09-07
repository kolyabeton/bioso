import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,spawnEnemy,attack,hurtEnemy} from '../src/game.js';
import {createPart,equip,digest,upgrade,upgradeOptions} from '../src/assembly.js';
import {createEnemyHealthView} from '../src/enemy-health-view.js';
import * as T from 'three';
test('intro boss takes 20–26 seconds with one unupgraded starter claw',()=>{
 const s=createRun(undefined,'survival',20317),e=spawnEnemy(s,'boss',{x:1,z:0});
 assert.equal(e.maxHp,520);let t=0;while(e.hp>0&&t<30){attack(s,.01);s.time+=.01;t+=.01;}
 assert.ok(e.hp===0);assert.ok(t>=20&&t<=26,`kill time ${t}`);
 const second=spawnEnemy(s,'boss',{x:1,z:0});assert.ok(second.hp>520);
});
test('first boss guarantees digestion every run and unlocks real recycling/upgrading',()=>{
 for(const unlocked of [false,true]){const s=createRun();if(unlocked)s.profile.unlocked.push('digestion');
 const e=spawnEnemy(s,'boss',{x:1,z:0});hurtEnemy(s,e,10000);hurtEnemy(s,e,10000);
 const drops=s.ground.filter(q=>q.part.key==='digestion');assert.equal(drops.length,1);assert.ok(s.profile.unlocked.includes('digestion'));
 s.inventory.push(drops[0].part);assert.ok(equip(s,drops[0].part.id,0));
 for(const key of ['claws','universal']){const p=createPart(s,key);s.inventory.push(p);assert.ok(digest(s,p.id));}assert.equal(s.biomass,12);
 const option=upgradeOptions(s.arms[0])[0];assert.ok(option);assert.ok(upgrade(s,s.arms[0].id,option,true));assert.equal(s.biomass,0);
 const second=spawnEnemy(s,'boss',{x:1,z:0});hurtEnemy(s,second,10000);assert.equal(s.ground.filter(q=>q.part.key==='digestion').length,1);
 }
});
test('boss and elite bars face camera, shrink and disappear after death/reset',()=>{
 const scene=new T.Scene(),camera=new T.PerspectiveCamera();camera.rotation.x=-.8;const view=createEnemyHealthView(scene),enemies=[{id:1,kind:'boss',hp:200,maxHp:400,x:0,z:0,radius:1.7},{id:2,kind:'elite',hp:100,maxHp:100,x:4,z:0,radius:1},{id:3,kind:'normal',hp:10,maxHp:10}];
 view.update(enemies,camera,2);const bars=scene.getObjectByName('enemy-health-bars').children;assert.equal(bars.length,2);assert.equal(bars[0].children[1].scale.x,2.25);assert.ok(bars[0].quaternion.equals(camera.quaternion));
 enemies[0].hp=0;view.update(enemies,camera);assert.equal(bars[1].visible,false);view.reset();assert.ok(bars.every(b=>!b.visible));
});

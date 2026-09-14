import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,spawnEnemy,hurtEnemy,attack} from '../src/game.js';
import {createPart} from '../src/assembly.js';
import {prepareDamageReview} from '../src/ui/damage-review.js';
test('damage event reports armor-adjusted HP loss including lethal hits, without duplicate dead hits',()=>{
 const s=createRun(undefined,'survival',123),e=spawnEnemy(s,'normal',{x:0,z:1});e.hp=20;e.armor=100;
 hurtEnemy(s,e,12);let hit=s.events.find(e=>e.type==='enemy-damage');assert.equal(hit.amount,6);assert.equal(hit.critical,false);
 s.events=[];hurtEnemy(s,e,100,0,'direct',true);hit=s.events.find(e=>e.type==='enemy-damage');assert.equal(hit.amount,14);assert.equal(hit.critical,true);
 s.events=[];hurtEnemy(s,e,100);assert.equal(s.events.length,0);
});
test('weapon crit roll reaches damage presentation without changing damage math',()=>{
 for(const [roll,critical] of [[0,true],[.99,false]]){const s=createRun(undefined,'survival',123);s.arms=[createPart(s,'claws'),null];const e=spawnEnemy(s,'normal',{x:0,z:1});e.hp=e.maxHp=1000;s.rng=()=>roll;attack(s,.01);const hit=s.events.find(e=>e.type==='enemy-damage');assert.ok(hit);assert.equal(hit.critical,critical);assert.equal(hit.amount,1000-e.hp);}
});
test('damage review visibly loops through a real three-target shield impact',()=>{
 const s=createRun(undefined,'survival',123);let wall=0;const review=prepareDamageReview(s,()=>{},()=>wall);assert.equal(review.paused,false);assert.equal(s.enemies.length,3);
 for(let i=0;i<70;i++){wall+=1000/60;review.tick();s.time+=1/60;attack(s,1/60);}
 assert.equal(s.events.filter(e=>e.type==='enemy-damage').length,3);assert.ok(s.enemies.every(e=>Math.hypot(e.kickX||0,e.kickZ||0)>=47.9));
 const ids=s.enemies.map(e=>e.id);wall=3000;review.tick();assert.equal(s.enemies.length,3);assert.notDeepEqual(s.enemies.map(e=>e.id),ids);assert.ok(s.arms[0].cooldown>0);
});
import {createDamageNumbersView} from '../src/damage-numbers-view.js';
import {OrthographicCamera} from 'three';
test('numbers expire, pause, aggregate DoT, respect reduced motion and cap crowds',()=>{
 const previous=globalThis.document;
 const node=()=>({style:{},children:[],setAttribute(){},append(n){n.parent=this;this.children.push(n);},remove(){this.parent.children=this.parent.children.filter(n=>n!==this);}});
 globalThis.document={createElement:node};
 try{const parent=node(),view=createDamageNumbersView({parentElement:parent,clientWidth:360,clientHeight:640}),layer=parent.children[0],camera=new OrthographicCamera(-10,10,10,-10,.1,100);camera.position.z=20;camera.updateMatrixWorld();
 const hit={type:'enemy-damage',target:1,source:'acid',amount:.4,x:0,y:0,z:0,radius:1};view.event(hit);view.event(hit);assert.equal(layer.children.length,1);assert.equal(layer.children[0].textContent,'0.8');
 view.update(0,camera,true);const pose=layer.children[0].style.transform;view.update(.3,camera,true);assert.equal(layer.children[0].style.transform,pose);view.update(0,camera);assert.equal(layer.children.length,1);view.update(.6,camera);assert.equal(layer.children.length,0);
 view.event({...hit,target:2,source:'rocket',amount:16});assert.equal(layer.children[0].className,'damage-number');assert.equal(layer.children[0].textContent,'16');view.reset();
 for(let i=0;i<100;i++)view.event({...hit,source:'direct'});assert.equal(layer.children.length,48);view.reset();assert.equal(layer.children.length,0);
 }finally{globalThis.document=previous;}
});

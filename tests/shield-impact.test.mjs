import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,spawnEnemy,attack} from '../src/game.js';
import {createPart} from '../src/assembly.js';
import {createMeleeAnimation,SHIELD_IMPACT_DELAY} from '../src/melee-animation.js';
function fixture(){
 const s=createRun(undefined,'survival',123);s.arms=[createPart(s,'hammer'),null];
 const e=spawnEnemy(s,'normal',{x:0,z:2});e.hp=e.maxHp=10000;s.events=[];
 return {s,e,p:s.arms[0]};
}
test('shield damage, knockback and impact effects occur at full extension, once',()=>{
 const {s,e,p}=fixture(),a=createMeleeAnimation();s.time=4;attack(s,0);
 const windup=s.events.find(e=>e.type==='melee-windup');assert.ok(windup);
 a.attack(windup,3.9);assert.equal(a.pose(p.id,4).phase,0);
 assert.equal(e.hp,e.maxHp);assert.equal(e.z,2);assert.ok(!s.events.some(e=>e.type==='attack'));
 s.time=4+SHIELD_IMPACT_DELAY-.001;attack(s,0);assert.equal(e.hp,e.maxHp);
 // Repeated ticks without advancing combat time (pause) cannot cause early contact.
 attack(s,0);assert.equal(e.hp,e.maxHp);
 s.time=4+SHIELD_IMPACT_DELAY;attack(s,0);
 assert.ok(e.hp<e.maxHp);assert.equal(e.z,4);assert.ok(a.pose(p.id,s.time).extension>1.2);
 const impact=s.events.find(e=>e.type==='attack');assert.ok(impact);assert.equal(a.attack(impact,s.time),false);
 const hp=e.hp;attack(s,0);assert.equal(e.hp,hp);assert.equal(e.z,4);
});
test('shield windup cannot hit a removed, dead, out-of-range or occluded target',()=>{
 for(const change of [({s})=>s.arms=[null,null],({e})=>e.hp=0,({e})=>e.z=20,({s})=>s.enemies=[],({s})=>s.world.lineClear=()=>false]){
  const f=fixture();attack(f.s,0);change(f);const hp=f.e.hp,z=f.e.z;
  f.s.time+=SHIELD_IMPACT_DELAY;attack(f.s,0);assert.equal(f.e.hp,hp);assert.equal(f.e.z,z);
 }
});

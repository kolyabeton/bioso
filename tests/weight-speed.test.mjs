import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorldRun,stepWorldRun} from '../src/world-run.js';
import {createPart,stats,weightSpeedFactor,drop,upgrade} from '../src/assembly.js';
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-7,`${actual} != ${expected}`);
function loaded(weight){
 const s=createWorldRun(undefined,'survival',20317);
 const base=stats(s).weight;
 for(let a=0;a<=20;a++)for(let b=0;b<=20;b++)if(base+a*8+b*10===weight){
  s.inventory=[...Array.from({length:a},()=>createPart(s,'claws')),...Array.from({length:b},()=>createPart(s,'seed'))];
  return s;
 }
 throw Error(`Cannot construct load ${weight}`);
}
test('load curve matches requested percentages and scales with capacity',()=>{
 for(const capacity of [100,200])for(const [percent,factor] of [[0,1],[60,1],[65,.95],[70,.9],[80,.8],[90,.7],[99,.61],[100,0],[110,0]])near(weightSpeedFactor(capacity*percent/100,capacity),factor);
});
test('survival movement applies load penalty and stops at full capacity',()=>{
 const base=stats(loaded(32)).speed;
 for(const [weight,factor] of [[60,1],[70,.9],[80,.8],[90,.7],[100,0],[110,0]]){
  const s=loaded(weight),before={...s.player};
  near(stats(s).speed,base*factor);assert.equal(stats(s).overloaded,factor===0);
  stepWorldRun(s,.05,{x:1,z:0});
  near(Math.hypot(s.player.x-before.x,s.player.z-before.z),base*factor*.05);
 }
});
test('dropping weight or upgrading capacity immediately restores movement',()=>{
 const s=loaded(100);assert.equal(stats(s).speed,0);
 assert(drop(s,s.inventory[0].id));assert(stats(s).speed>0);assert.equal(stats(s).overloaded,false);
 const full=loaded(100);assert(upgrade(full,full.body.id,'capacity'));
 assert(stats(full).speed>0);near(stats(full).loadFactor,1-(100/110-.6));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {navigateEnemy} from '../src/world-navigation.js';

test('many enemies share bounded path work when a bush hides an unreachable goal',()=>{
 let checks=0;
 const world={tiles:[],flat:true,walkable(x,z,r){checks++;return Math.abs(x)<80&&Math.abs(z)<80&&Math.hypot(x,z)>3+r;},findPath(){throw Error('Synchronous biome path search must not run');}};
 const s={world,time:0},enemies=Array.from({length:30},(_,id)=>({id,x:-8,z:0,radius:.7,hp:10}));
 for(let frame=0;frame<100;frame++){
  s.time=frame/60;checks=0;
  for(const e of enemies)navigateEnemy(s,e,{x:0,z:0},3,1/60);
  assert.ok(checks<2200,`Unbounded frame work: ${checks}`);
 }
});
test('incremental routes still let enemies pass a bush without crossing it',()=>{
 const world={tiles:[],flat:true,walkable:(x,z,r)=>Math.abs(x)<40&&Math.abs(z)<40&&Math.hypot(x,z)>3+r};
 const s={world,time:0},e={id:1,x:-8,z:0,radius:.7,hp:10};
 for(let i=0;i<600;i++){
  s.time=i/60;navigateEnemy(s,e,{x:8,z:0},3,1/60);
  assert.ok(world.walkable(e.x,e.z,e.radius));
 }
 assert.ok(Math.hypot(e.x-8,e.z)<1);
});

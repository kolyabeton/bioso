import test from 'node:test';
import assert from 'node:assert/strict';
import {navigateEnemy} from '../src/world-navigation.js';
function fixture(cache){
 const tile={x:0,z:0,index:0,biome:'gardens',decorations:[{wall:true}]};let calls=0;
 const world={presentation:cache?'biomes':'test',flat:true,tiles:[tile],walkable(x,z,r){return Math.abs(x)<30&&Math.abs(z)<30&&!(tile.decorations.length&&x>-2-r&&x<2+r&&Math.abs(z)<4+r);},canMove(a,b,r){calls++;return this.walkable(b.x,b.z,r);}};
 return {world,tile,time:0,enemies:Array.from({length:12},(_,i)=>({id:i+1,x:-10,z:0,radius:.5,hp:10})),calls:()=>calls};
}
test('shared grid edges preserve routes and invalidate when collision snapshots or APIs change',()=>{
 const a=fixture(false),b=fixture(true),target={x:10,z:0};
 for(let frame=0;frame<360;frame++){
  for(const s of [a,b]){s.time=frame/60;if(frame===150){s.tile.decorations=[];delete s.tile.collisionDecorations;}if(frame===240){s.world.canMove=function(p,q,r){return this.walkable(q.x,q.z,r)&&q.z<20;};}for(const e of s.enemies)navigateEnemy(s,e,target,4,1/60);}
  assert.deepEqual(b.enemies,a.enemies,'frame '+frame);
 }
 assert.ok(b.calls()<a.calls()*.75,`${b.calls()} / ${a.calls()} collision calls`);
});

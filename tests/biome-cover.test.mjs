import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorldRun} from '../src/world-run.js';
import {movePlayer} from '../src/elevation.js';
import {createPart} from '../src/assembly.js';
import {clearSegment} from '../src/world-navigation.js';

test('thickets block movement and fire, while narrow passages fit both body sizes',()=>{
 for(const body of ['wanderer','hecaton']){
  const s=createWorldRun(undefined,'survival',12);s.body=createPart(s,body);
  for(const tile of s.world.tiles){
   const thicket=tile.decorations.find(d=>d.feature==='thicket');
   assert.equal(s.world.walkable(thicket.x,thicket.z,1.5),false);
   assert.equal(s.world.lineClear({x:thicket.x-5,y:1,z:thicket.z},{x:thicket.x+5,y:1,z:thicket.z}),false);
   s.player={x:tile.x,z:tile.z-17,y:0};
   for(let i=0;i<170;i++)movePlayer(s,.05,0,.2);
   assert.ok(Math.abs(s.player.z-(tile.z+17))<.01);
   assert.equal(s.hp,2);assert.equal(s.dead,false);
  }
 }
});

test('stone recess remains enterable and all surrounding safe points have a route',()=>{
 const s=createWorldRun(undefined,'survival',12),w=s.world;
 for(const tile of w.tiles){
  assert.equal(tile.decorations.filter(d=>d.feature).length,14);
  const entry={x:tile.x+20,z:tile.z-7},inside={x:tile.x+20,z:tile.z-13};
  assert.ok(clearSegment(w,entry,inside,2.4));
  for(const target of tile.safe){const path=w.findPath(tile.safe[2],target,2.4);const last=path.at(-1)||tile.safe[2];assert.ok(Math.hypot(last.x-target.x,last.z-target.z)<2.1);}
 }
});

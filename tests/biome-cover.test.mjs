import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorldRun} from '../src/world-run.js';
import {movePlayer} from '../src/elevation.js';
import {createPart} from '../src/assembly.js';
import {clearSegment} from '../src/world-navigation.js';

test('thickets block movement and fire, while narrow passages fit both body sizes',()=>{
 for(const body of ['wanderer','hecaton']){
  const s=createWorldRun(undefined,'survival',12);s.body=createPart(s,body);const startingHp=s.hp;
  for(const tile of s.world.tiles){
   const thicket=tile.decorations.find(d=>d.feature==='thicket'&&s.world.flyable(d.x,d.z,.4));
   assert.equal(s.world.walkable(thicket.x,thicket.z,1.5),false);
   assert.equal(s.world.flyable(thicket.x,thicket.z,.4),true);
   assert.equal(s.world.lineClear({x:thicket.x-5,y:1,z:thicket.z},{x:thicket.x+5,y:1,z:thicket.z}),false);
   if(tile.biome==='forest'){
    // The authored forest now bends around real outcrops instead of a straight strip.
    const path=s.world.findPath(tile.safe[2],tile.safe[3],2.4);assert.ok(path.length);
    s.player={...tile.safe[2],y:0};
    for(const point of path){const dx=point.x-s.player.x,dz=point.z-s.player.z,n=Math.ceil(Math.hypot(dx,dz)/.15);for(let i=0;i<n;i++)movePlayer(s,.02,dx/n,dz/n);}
    assert.ok(Math.hypot(s.player.x-tile.safe[3].x,s.player.z-tile.safe[3].z)<2.1);continue;
   }
   s.player={x:tile.x,z:tile.z-17,y:0};
   for(let i=0;i<170;i++)movePlayer(s,.05,0,.2);
   assert.ok(Math.abs(s.player.z-(tile.z+17))<.01);
   assert.equal(s.hp,startingHp);assert.equal(s.dead,false);
  }
 }
});

test('stone recess remains enterable and all surrounding safe points have a route',()=>{
 const s=createWorldRun(undefined,'survival',12),w=s.world;
 for(const tile of w.tiles){
  if(tile.biome!=='forest'){
   assert.ok(tile.decorations.filter(d=>d.feature).length>=8);
   const entry={x:tile.x+20,z:tile.z-7},inside={x:tile.x+20,z:tile.z-13};
   assert.ok(clearSegment(w,entry,inside,2.4));
  }
  for(const target of tile.safe){const path=w.findPath(tile.safe[2],target,2.4);const last=path.at(-1)||tile.safe[2];assert.ok(Math.hypot(last.x-target.x,last.z-target.z)<2.1);}
 }
});

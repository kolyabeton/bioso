import test from 'node:test';
import assert from 'node:assert/strict';
import {obstacleCandidates} from '../src/obstacle-index.js';
import {obstacleContains,obstacleHeight} from '../src/architecture-collision.js';
import {assembleBiomeWorld} from '../src/biome-world.js';
import {seededRandom} from '../src/simulation.js';

test('indexed biome collisions match exhaustive hulls across tiles, seams, heights and radii',()=>{
 const w=assembleBiomeWorld(20317),rng=seededRandom(42013);let checked=0,full=0,narrow=0;
 for(const tile of w.tiles)for(let i=0;i<320;i++){
  const x=tile.x+(rng()-.5)*66,z=tile.z+(rng()-.5)*66,r=[0,.4,.8,1.5,2.4,4,5.6][i%7],y=[.1,1,4,12][i%4];
  const all=w.obstacles(x,z),candidates=obstacleCandidates(all,x,z,r),hits=all.filter(o=>obstacleContains(o,x,z,r));
  assert.deepEqual(candidates.filter(o=>obstacleContains(o,x,z,r)),hits,`${tile.id} ${x},${z},r=${r}`);
  assert.equal(w.solidAt(x,y,z,r),hits.some(o=>y<(w.heightAt(o.x,o.z)??0)+obstacleHeight(o)));
  assert.equal(candidates.some(o=>o.feature!=='thicket'&&obstacleContains(o,x,z,r)),all.some(o=>o.feature!=='thicket'&&obstacleContains(o,x,z,r)));
  checked++;full+=all.length;narrow+=candidates.length;
 }
 assert.equal(checked,8000);assert.ok(narrow<full*.3,`Broad phase retained ${narrow}/${full} candidates`);
});

test('rotated offset multi-boxes and circle footprints remain conservative at cell boundaries',()=>{
 const items=[{x:-8,z:8,rotation:1.7,collisionFootprint:{shape:'boxes',boxes:[{halfX:2,halfZ:.8,offsetX:12,offsetZ:-5},{halfX:.5,halfZ:5,offsetX:-8}]}},{x:16,z:-16,radius:3}];
 for(let x=-32;x<=32;x+=.5)for(let z=-32;z<=32;z+=.5)for(const r of [0,.7,4,5]){
  assert.deepEqual(obstacleCandidates(items,x,z,r).filter(o=>obstacleContains(o,x,z,r)),items.filter(o=>obstacleContains(o,x,z,r)));
 }
});

test('clearing a world decoration snapshot invalidates the index, and new items rebuild it',()=>{
 const w=assembleBiomeWorld(20317),tile=w.tiles[0],o=tile.decorations.find(o=>o.environmentSignature);
 assert.ok(w.solidAt(o.x,.1,o.z));
 tile.decorations=[];for(const t of w.tiles)delete t.collisionDecorations;
 assert.equal(w.solidAt(o.x,.1,o.z),false);
 const list=[{x:0,z:0,radius:1}];assert.equal(obstacleCandidates(list,24,24).length,0);
 list.push({x:24,z:24,radius:1});assert.equal(obstacleCandidates(list,24,24).length,1);
 assert.equal(obstacleCandidates([{x:0,z:0}],0,0).length,1,'unknown bounds retain exhaustive fallback');
});

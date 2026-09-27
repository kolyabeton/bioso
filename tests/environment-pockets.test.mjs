import test from 'node:test';
import assert from 'node:assert/strict';
import {environmentPockets} from '../src/environment-pockets.js';
import {pocketGrassGeometry} from '../src/environment-pockets-view.js';
import {createWorldRun} from '../src/world-run.js';
import {assembleBiomeWorld} from '../src/biome-world.js';

test('all mission pockets are deterministic, bounded, preserve a traversable room and do not change collision',()=>{
 for(const mode of ['garden','quarantine','core','nursery','mother']){
  const s=createWorldRun(undefined,mode,12),tile=s.world.tiles[0],before=JSON.stringify(tile.decorations);
  const points=environmentPockets(tile,s.world);
  assert.ok(points.length>25&&points.length<=200,mode);
  assert.deepEqual(points,environmentPockets(tile,s.world));assert.equal(JSON.stringify(tile.decorations),before);
  for(const p of points){assert.ok(Math.abs(p.x-tile.x)-p.size*.5>2.5);assert.ok(p.height<=1.32);assert.ok(Math.abs(p.z-tile.z)<=28);}
  assert.ok(s.world.findPath({x:0,z:28},{x:0,z:-28},1.92).length);
 }
});
test('survival pockets avoid cross-cell routes and safe points',()=>{
 const world=assembleBiomeWorld(12);
 for(const tile of world.tiles)for(const p of environmentPockets(tile,world)){
  assert.ok(Math.abs(p.x-tile.x)>=3.65&&Math.abs(p.z-tile.z)>=5.2);
  assert.ok(tile.safe.every(s=>Math.hypot(s.x-p.x,s.z-p.z)>=3.2));
 }
});
test('grass tufts are real bent low-poly geometry with no texture dependency',()=>{
 const g=pocketGrassGeometry();assert.equal(g.attributes.position.count/3,84);
 assert.equal(g.attributes.position.count,g.attributes.color.count);assert.ok(g.attributes.normal);
 assert.ok([...g.attributes.position.array].every(Number.isFinite));g.dispose();
});

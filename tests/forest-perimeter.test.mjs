import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {assembleBiomeWorld} from '../src/biome-world.js';
import {FOREST_ASSETS,forestPerimeterPieces,forestCornerUV} from '../src/forest-perimeter.js';
test('composed forest covers the entire perimeter once and never covers playable ground',()=>{
 const world=assembleBiomeWorld(12),b=world.bounds,all=world.tiles.flatMap(t=>forestPerimeterPieces(t,world));
 for(const url of FOREST_ASSETS)assert.ok(existsSync('public'+url),url);
 assert.equal(new Set(all.filter(p=>p.projection).map(p=>p.name)).size,4);
 assert.equal(all.filter(p=>p.projection).length,12);
 for(const p of all)assert.ok(p.x+p.width/2<=b.minX||p.x-p.width/2>=b.maxX||p.z+p.depth/2<=b.minZ||p.z-p.depth/2>=b.maxZ);
 for(let z=b.minZ-23.5;z<b.maxZ+24;z++)for(let x=b.minX-15.5;x<b.maxX+16;x++){
  if(x>b.minX&&x<b.maxX&&z>b.minZ&&z<b.maxZ)continue;
  assert.equal(all.filter(p=>Math.abs(p.x-x)<p.width/2&&Math.abs(p.z-z)<p.depth/2).length,1,`${x},${z}`);
 }
});

test('corner tessellation shares exactly the same source UV across both joints',()=>{
 const w=assembleBiomeWorld(12),all=w.tiles.flatMap(t=>forestPerimeterPieces(t,w));
 for(const name of ['nw','ne','sw','se']){
  const parts=all.filter(p=>p.name===name),anchor=parts[0].projection;
  for(const p of parts)assert.deepEqual(forestCornerUV(anchor.x,anchor.z,p.projection),[anchor.u,1-anchor.v]);
  for(const p of parts)assert.deepEqual(p.projection,anchor);
 }
});

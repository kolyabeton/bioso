import test from 'node:test';
import assert from 'node:assert/strict';
import {assembleBiomeWorld} from '../src/biome-world.js';
import {forestBorder} from '../src/biome-border.js';
test('forest surrounds only external edges and leaves playable ground and internal seams clear',()=>{
 const world=assembleBiomeWorld(12),before=JSON.stringify(world.tiles);
 for(const tile of world.tiles){
  const result=forestBorder(tile,world),edges=Number(tile.cx===0)+Number(tile.cx===4)+Number(tile.cz===0)+Number(tile.cz===4);
  assert.equal(result.patches.length,edges);assert.deepEqual(result,forestBorder(tile,world));
  assert.equal(result.plants.length>0,edges>0);
  for(const p of result.plants)assert.ok(p.x< -32||p.x>288||p.z< -32||p.z>288);
 }
 assert.equal(JSON.stringify(world.tiles),before);
 // All four corners and the outer belt have a ground patch, not empty background.
 const patches=world.tiles.flatMap(t=>forestBorder(t,world).patches);
 for(let z=-130;z<=380;z+=10)for(let x=-130;x<=380;x+=10){
  if(x>=-32&&x<=288&&z>=-32&&z<=288)continue;
  assert.ok(patches.some(p=>Math.abs(p.x-x)<=p.width/2&&Math.abs(p.z-z)<=p.depth/2),`${x},${z}`);
 }
});

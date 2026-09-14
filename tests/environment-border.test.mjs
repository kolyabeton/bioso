import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assembleBiomeWorld} from '../src/biome-world.js';
import {createWorldRun} from '../src/world-run.js';
import {environmentBorderPlacements,environmentBorderHeight} from '../src/environment-border.js';
import {environmentProfile} from '../src/environment-profiles.js';
import {forestBorder} from '../src/biome-border.js';
test('3D borders use their biome models and keep entire fitted models outside gameplay',()=>{
 for(const world of [assembleBiomeWorld(12),...['garden','quarantine','core','nursery','mother'].map(mode=>createWorldRun(undefined,mode,12).world)]){
  const before=JSON.stringify(world.tiles),b=world.bounds;
  for(const tile of world.tiles){
   const items=environmentBorderPlacements(tile,world);
   assert.deepEqual(items,environmentBorderPlacements(tile,world));
   for(const p of items){assert.ok(environmentProfile(tile).pieces.includes(p.model)||p.model==='forest-boulder-v3');const r=p.size*.71;assert.ok(p.x+r<b.minX||p.x-r>b.maxX||p.z+r<b.minZ||p.z-r>b.maxZ);}
  }
  assert.equal(JSON.stringify(world.tiles),before);
 }
});
test('dense edge forms a raised barrier without changing the playable height',()=>{
 const world=assembleBiomeWorld(12),tile=world.tiles.find(t=>t.biome==='scrapyard'&&t.x===0);
 assert.equal(environmentBorderHeight(tile,world,-32,tile.z),0);
 assert.ok(environmentBorderHeight(tile,world,-38,tile.z)>4);
 assert.equal(environmentBorderHeight(tile,world,-44,tile.z),6.5);
 assert.ok(environmentBorderPlacements(tile,world).length>50);
});
test('outer ground covers corners once; no coplanar overlaps or legacy image strips',()=>{
 const world=assembleBiomeWorld(12),patches=world.tiles.flatMap(t=>forestBorder(t,world).patches);
 for(let i=0;i<patches.length;i++)for(let j=i+1;j<patches.length;j++){
  const a=patches[i],b=patches[j];assert.ok(Math.abs(a.x-b.x)>=(a.width+b.width)/2||Math.abs(a.z-b.z)>=(a.depth+b.depth)/2);
 }
 const source=readFileSync(new URL('../src/biome-view.js',import.meta.url),'utf8');
 assert.doesNotMatch(source,/FOREST_ASSETS|forestPerimeterPieces|forest-composition-/);
 assert.match(source,/addEnvironmentBorder\(group,tile,(?:world|buildWorld)/);
});
test('scrapyard keeps the front fence and rocks but omits redundant rear junk walls',()=>{
 for(const world of [assembleBiomeWorld(12),createWorldRun(undefined,'quarantine',12).world]){
  const b=world.bounds,items=world.tiles.filter(t=>environmentProfile(t)?.relief==='heaps').flatMap(t=>environmentBorderPlacements(t,world));
  assert.ok(items.some(p=>p.model==='environment-scrap-bank-v1'));
  assert.ok(items.some(p=>p.model==='forest-boulder-v3'));
  assert.ok(!items.some(p=>p.model==='environment-scrap-engine-v2'));
  for(const p of items){const dx=Math.max(0,b.minX-p.x,p.x-b.maxX),dz=Math.max(0,b.minZ-p.z,p.z-b.maxZ);assert.ok(Math.min(dx||Infinity,dz||Infinity)<11);}
 }
});

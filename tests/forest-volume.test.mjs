import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assembleBiomeWorld,validateWorld} from '../src/biome-world.js';
import {obstacleContains} from '../src/architecture-collision.js';
import {clearSegment} from '../src/world-navigation.js';
import {FOREST_ROCK_PROFILE} from '../src/forest-rock-profile.js';
import {modelPoints,hull} from '../scripts/obstacle-footprints.mjs';

test('Forest world keeps all large-body targets reachable across seeds and variants',()=>{
 for(const seed of [1,2,12,42,709]){
  const w=assembleBiomeWorld(seed);assert.deepEqual(validateWorld(w),[]);
  for(const t of w.tiles.filter(t=>t.biome==='forest'))for(const goal of [...t.safe,...t.ports]){
   const path=w.findPath(t.safe[2],goal,2.4);let previous=t.safe[2];
   for(const p of path){assert.ok(clearSegment(w,previous,p,2.4));previous=p;}
   assert.ok(Math.hypot(previous.x-goal.x,previous.z-goal.z)<2.1);
  }
 }
});
test('Blender boulder collision silhouette matches the actual exported mesh',()=>{
 const points=modelPoints('forest-boulder-v3',{normalize:false});
 assert.deepEqual(FOREST_ROCK_PROFILE.hull,hull(points.map(p=>[p.x,p.z])));
 assert.equal(FOREST_ROCK_PROFILE.height,Math.max(...points.map(p=>p.y)));
});
test('arch piers are solid but their rotated central opening fits the large body',()=>{
 const w=assembleBiomeWorld(12),d=w.tiles[4].decorations.find(d=>d.forestRole==='arch');
 const c=Math.cos(d.rotation),s=Math.sin(d.rotation);
 for(let along=-4;along<=4;along+=.2){const x=d.x+s*along,z=d.z+c*along;assert.equal(obstacleContains(d,x,z,2.4),false);}
 assert.equal(obstacleContains(d,d.x+c*3.15,d.z-s*3.15,.1),true);
});
test('Forest runtime uses instanced volume meshes, not environment shell images',()=>{
 const view=fs.readFileSync(new URL('../src/biome-view.js',import.meta.url),'utf8');
 assert.doesNotMatch(view,/addForestDetails|environment-v3\.webp/);
 const volume=fs.readFileSync(new URL('../src/forest-sculpt-view.js',import.meta.url),'utf8');
 assert.match(volume,/InstancedMesh/);assert.doesNotMatch(volume,/PlaneGeometry|SpriteMaterial/);
 for(const id of ['forest-tree-0-v3','forest-tree-broad-v4','forest-shrub-v3','forest-boulder-v3','forest-relic-v3','forest-ruin-arch-v2']){
  const points=modelPoints(id,{normalize:false}),xs=points.map(p=>p.x),ys=points.map(p=>p.y),zs=points.map(p=>p.z);
  for(const a of [xs,ys,zs])assert.ok(Math.max(...a)-Math.min(...a)>.3,id+' is not a flat picture');
 }
});
test('tree variants have distinct proportions and the root bank has no tall needle',()=>{
 const dimensions=id=>{const p=modelPoints(id,{normalize:false});return ['x','y','z'].map(k=>Math.max(...p.map(v=>v[k]))-Math.min(...p.map(v=>v[k])));};
 const tall=dimensions('forest-tree-0-v3'),broad=dimensions('forest-tree-broad-v4'),stump=dimensions('forest-root-bank-v2');
 assert.ok(broad[1]<tall[1]*.7);
 assert.ok(broad[0]/broad[1]>1.3);
 assert.ok(stump[1]<2.6);
 assert.ok(stump[0]>3&&stump[2]>3,'retains a substantial root/stone footprint');
});

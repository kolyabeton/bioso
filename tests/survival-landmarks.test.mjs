import test from 'node:test';
import assert from 'node:assert/strict';
import {assembleBiomeWorld,localHeight} from '../src/biome-world.js';
import {terrainBuffers} from '../src/biome-view.js';
import {environmentId} from '../src/environment-profiles.js';
import {SURVIVAL_LANDMARK_BOUNDS} from '../src/survival-landmark-bounds.js';
import {modelPoints,hull} from '../scripts/obstacle-footprints.mjs';
import {createWorldRun} from '../src/world-run.js';

test('survival landmarks use exported collision hulls and do not leak into missions',()=>{
 for(const [id,b] of Object.entries(SURVIVAL_LANDMARK_BOUNDS)){
  const p=modelPoints(id);assert.deepEqual(b.hull,hull(p.map(v=>[v.x,v.z])));assert.equal(b.height,Math.max(...p.map(v=>v.y)));
 }
 for(const mission of ['garden','quarantine','core','nursery','mother'])assert.ok(createWorldRun(undefined,mission,12).world.tiles.every(t=>t.decorations.every(d=>!d.survivalLandmark)));
 const w=assembleBiomeWorld(12);
 for(const t of w.tiles){
  const props=t.decorations.filter(d=>d.survivalLandmark);assert.equal(props.length,t.biome==='forest'?0:3);
  for(const p of props){assert.ok(p.collisionProfile);assert.ok(p.size>=7);assert.ok(Math.hypot(p.x-t.x,p.z-t.z)>8);}
  if(environmentId(t)==='quiet-scrapyard')assert.ok(props.some(d=>d.model==='environment-scrap-megaturbine-v1'));
  if(environmentId(t)==='brood-nursery')assert.ok(props.some(d=>d.model==='environment-brood-hanging-cocoons-v1'));
 }
});
test('survival terrain reveals broad relief, uses physics heights and keeps cross routes level',()=>{
 const w=assembleBiomeWorld(12);
 for(const t of w.tiles){
  if(t.biome==='forest')continue;
  const positions=terrainBuffers(t).ground.positions;let max=0;
  for(let i=0;i<positions.length;i+=3){const [x,y,z]=positions.slice(i,i+3);max=Math.max(max,y);assert.ok(Math.abs(y-localHeight(t,x-t.x,z-t.z))<.003);}
  assert.ok(max>1.25,environmentId(t)+' needs visible relief');
  for(let u=-32;u<=32;u++){
   assert.equal(localHeight(t,0,u),0);assert.equal(localHeight(t,u,0),0);
   for(const [x,z]of [[-32,u],[32,u],[u,-32],[u,32]])assert.equal(localHeight(t,x,z),0);
  }
  assert.ok(w.walkable(t.x+8,t.z,2.4),'review vista is a genuine walkable position');
 }
});

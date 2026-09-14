import test from 'node:test';
import assert from 'node:assert/strict';
import {obstacleContains} from '../src/architecture-collision.js';
import {assembleBiomeWorld} from '../src/biome-world.js';

test('pillar blocks its visible base but permits the formerly invisible perimeter',()=>{
 const p={model:'arch-pillar',size:8,x:0,z:0,rotation:0,radius:5.68};
 assert.equal(obstacleContains(p,0,0,1.5),true);
 assert.equal(obstacleContains(p,0,3.1,1.5),false);
 assert.equal(obstacleContains(p,0,2,1.5),true);
 assert.equal(obstacleContains({...p,rotation:Math.PI/2},0,3.1,1.5),true);
 assert.equal(obstacleContains({...p,rotation:Math.PI/2},3.1,0,1.5),false);
});
test('biome movement and visibility share the fitted architecture footprint',()=>{
 const w=assembleBiomeWorld(20317),p=w.tiles[0].decorations.find(d=>d.environmentSignature);
 assert.ok(p);assert.equal(w.walkable(p.x+5,p.z,1.5),true);
 assert.equal(w.walkable(p.x,p.z,1.5),false);
 assert.equal(w.lineClear({x:p.x+5,y:2,z:p.z-1},{x:p.x+5,y:2,z:p.z+1}),true);
 assert.equal(w.lineClear({x:p.x-5,y:2,z:p.z},{x:p.x+5,y:2,z:p.z}),false);
});
test('legacy obstacles without model metadata retain circular collisions',()=>{
 const rock={x:4,z:5,radius:2};assert.equal(obstacleContains(rock,4,7.9,1),true);assert.equal(obstacleContains(rock,4,8.1,1),false);
});

test('player can walk beside current architecture while walking through its base stays blocked',async()=>{
 const {movePlayer}=await import('../src/elevation.js');
 const w=assembleBiomeWorld(20317),p=w.tiles[0].decorations.find(d=>d.environmentSignature);
 const s={world:w,body:{key:'wanderer'},player:{x:p.x+5,z:p.z-1}};
 for(let i=0;i<40;i++)movePlayer(s,.04,0,.05);
 assert.ok(Math.abs(s.player.z-(p.z+1))<.001);
 s.player={x:p.x-5,z:p.z};for(let i=0;i<40;i++)movePlayer(s,.04,.25,0);
 assert.ok(s.player.x<p.x-2);
});

test('rounding along a tangent does not create a barrier absent from pathfinding',()=>{
 const turbine={model:'arch-turbine',size:11,x:12,z:279,rotation:0};
 assert.equal(obstacleContains(turbine,16,286,1.5),false);
 assert.equal(obstacleContains(turbine,16,285.9999999999998,1.5),false);
 assert.equal(obstacleContains(turbine,16,285.99,1.5),true);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorldRun} from '../src/world-run.js';
import {terrainBuffers} from '../src/biome-view.js';
import {movePlayer,bodyRadius} from '../src/elevation.js';

test('playable survival has continuous sculpted ground, filled gaps and no jump links',()=>{
 const s=createWorldRun(undefined,'survival',12);
 // This test measures terrain continuity; encounter structures have their own collision suite.
 s.encounters.nodes=[];
 assert.equal(s.world.flat,true);
 for(const tile of s.world.tiles){
  assert.deepEqual(tile.jumps,[]);
  assert.equal(s.world.heightAt(tile.x,tile.z),0);
  const mesh=terrainBuffers(tile);
  assert.ok(mesh.ground.positions.length);
  assert.ok(mesh.ground.positions.every(Number.isFinite));
  if(tile.biome!=='forest')assert.ok(mesh.ground.positions.some((v,i)=>i%3===1&&Math.abs(v)>.001));
  assert.equal(mesh.cliff.positions.length,0);
  s.player={x:tile.x-5,z:tile.z,y:0};
  for(let i=0;i<100;i++)movePlayer(s,.05,.1,0);
  assert.ok(Math.abs(s.player.x-(tile.x+5))<.01);
  assert.ok(Math.abs(s.player.y-s.world.heightAt(s.player.x,s.player.z))<1e-6);
  assert.equal(s.player.vertical,'grounded');
 }
});
test('continuous survival boundary stops the hero without falling or damage',()=>{
 const s=createWorldRun(undefined,'survival',12),tile=s.world.tiles[0];
 s.player={x:tile.x-29,z:tile.z+16,y:0};const hp=s.hp;
 for(let i=0;i<100;i++)movePlayer(s,.05,-.2,0);
 assert.ok(s.player.x>tile.x-32);
 assert.equal(s.player.vertical,'grounded');
 assert.ok(Math.abs(s.player.y-s.world.heightAt(s.player.x,s.player.z))<1e-6);assert.equal(s.hp,hp);assert.equal(s.dead,false);
});


test('sculpted landscape fills all cells and former cutouts with connected ground',()=>{
 const {world}=createWorldRun(undefined,'survival',12);
 assert.equal(world.tiles.length,25);
 const heights=[];for(let z=-30;z<288;z+=4)for(let x=-30;x<288;x+=4){const height=world.heightAt(x,z);assert.notEqual(height,null);heights.push(height);}assert.ok(heights.some(height=>Math.abs(height)>.1));
 for(const tile of world.tiles)for(const port of tile.ports){
  const a={x:port.x-port.dx*3,z:port.z-port.dz*3},b={x:port.x+port.dx*3,z:port.z+port.dz*3};
  assert.ok(world.canMove(a,b,1.5));
 }
});

test('all biome entry points ignore the retired terrain option and generate continuous sculpted ground',async()=>{
 const {createBiomeWorld,assembleBiomeWorld,MODULES}=await import('../src/biome-world.js');
 const {prepareBiomes}=await import('../src/biome-run.js');
 const {createRun}=await import('../src/game.js');
 assert.ok(MODULES.every(m=>!['gap','rise'].includes(m.kind)));
 for(const world of [createBiomeWorld(12),assembleBiomeWorld(12,{flat:false}),prepareBiomes(createRun(undefined,'survival',12),{flat:false}).world]){
  assert.equal(world.flat,true);assert.equal(world.tiles.length,25);
  const heights=[];for(let z=-31;z<288;z+=2)for(let x=-31;x<288;x+=2){const height=world.heightAt(x,z);assert.notEqual(height,null);heights.push(height);}assert.ok(heights.some(height=>Math.abs(height)>.1));
 }
});

test('every map edge blocks both body sizes without terrain damage',()=>{
 const s=createWorldRun(undefined,'survival',12);
 for(const body of ['wanderer','hecaton']){
  s.body={...s.body,key:body};
  for(const [x,z,dx,dz] of [[-29,0,-.3,0],[285,0,.3,0],[0,-29,0,-.3],[0,285,0,.3]]){
   s.player={x,z,y:0};
   for(let i=0;i<300;i++)movePlayer(s,1/60,dx,dz);
   assert.equal(s.hp,2);assert.equal(s.dead,false);assert.ok(Math.abs(s.player.y-s.world.heightAt(s.player.x,s.player.z))<1e-6);
   assert.ok(s.world.walkable(s.player.x,s.player.z,bodyRadius(s)));
  }
 }
});

test('stale vertical state is grounded without applying damage or a jump',()=>{
 const s=createWorldRun(undefined,'survival',12);
 for(const vertical of ['falling','jumping']){
  Object.assign(s.player,{y:-20,vy:-100,vertical,fallFrom:50,jump:{}});
  movePlayer(s,1/60,0,0);
  assert.equal(s.hp,2);assert.equal(s.dead,false);assert.equal(s.player.y,0);
  assert.equal(s.player.vertical,'grounded');assert.equal(s.player.jump,undefined);
 }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorldRun} from '../src/world-run.js';
import {terrainBuffers} from '../src/biome-view.js';
import {movePlayer,bodyRadius} from '../src/elevation.js';

test('playable survival has flat rendered ground, filled gaps and no jump links',()=>{
 const s=createWorldRun(undefined,'survival',12);
 assert.equal(s.world.flat,true);
 for(const tile of s.world.tiles){
  assert.deepEqual(tile.jumps,[]);
  assert.equal(s.world.heightAt(tile.x,tile.z),0);
  const mesh=terrainBuffers(tile);
  assert.ok(mesh.ground.positions.length);
  assert.ok(mesh.ground.positions.every((v,i)=>i%3!==1||v===0));
  assert.equal(mesh.cliff.positions.length,0);
  s.player={x:tile.x-5,z:tile.z,y:0};
  for(let i=0;i<100;i++)movePlayer(s,.05,.1,0);
  assert.ok(Math.abs(s.player.x-(tile.x+5))<.01);
  assert.equal(s.player.y,0);
  assert.equal(s.player.vertical,'grounded');
 }
});
test('flat survival boundary stops the hero without falling or damage',()=>{
 const s=createWorldRun(undefined,'survival',12),tile=s.world.tiles[0];
 s.player={x:tile.x-29,z:tile.z+16,y:0};const hp=s.hp;
 for(let i=0;i<100;i++)movePlayer(s,.05,-.2,0);
 assert.ok(s.player.x>tile.x-32);
 assert.equal(s.player.vertical,'grounded');
 assert.equal(s.player.y,0);assert.equal(s.hp,hp);assert.equal(s.dead,false);
});


test('flat landscape fills all cells and former cutouts with connected ground',()=>{
 const {world}=createWorldRun(undefined,'survival',12);
 assert.equal(world.tiles.length,25);
 for(let z=-30;z<288;z+=4)for(let x=-30;x<288;x+=4)assert.equal(world.heightAt(x,z),0);
 for(const tile of world.tiles)for(const port of tile.ports){
  const a={x:port.x-port.dx*3,z:port.z-port.dz*3},b={x:port.x+port.dx*3,z:port.z+port.dz*3};
  assert.ok(world.canMove(a,b,1.5));
 }
});

test('all biome entry points ignore the retired terrain option and generate continuous ground',async()=>{
 const {createBiomeWorld,assembleBiomeWorld,MODULES}=await import('../src/biome-world.js');
 const {prepareBiomes}=await import('../src/biome-run.js');
 const {createRun}=await import('../src/game.js');
 assert.ok(MODULES.every(m=>!['gap','rise'].includes(m.kind)));
 for(const world of [createBiomeWorld(12),assembleBiomeWorld(12,{flat:false}),prepareBiomes(createRun(undefined,'survival',12),{flat:false}).world]){
  assert.equal(world.flat,true);assert.equal(world.tiles.length,25);
  for(let z=-31;z<288;z+=2)for(let x=-31;x<288;x+=2)assert.equal(world.heightAt(x,z),0);
 }
});

test('every map edge blocks both body sizes without terrain damage',()=>{
 const s=createWorldRun(undefined,'survival',12);
 for(const body of ['wanderer','hecaton']){
  s.body={...s.body,key:body};
  for(const [x,z,dx,dz] of [[-29,0,-.3,0],[285,0,.3,0],[0,-29,0,-.3],[0,285,0,.3]]){
   s.player={x,z,y:0};
   for(let i=0;i<300;i++)movePlayer(s,1/60,dx,dz);
   assert.equal(s.hp,2);assert.equal(s.dead,false);assert.equal(s.player.y,0);
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

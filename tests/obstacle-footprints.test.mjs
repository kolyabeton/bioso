import test from 'node:test';
import assert from 'node:assert/strict';
import {generate} from '../scripts/obstacle-footprints.mjs';
import outlines from '../src/obstacle-footprints.json' with {type:'json'};
import {obstacleContains,obstacleScale} from '../src/architecture-collision.js';
import {assembleBiomeWorld} from '../src/biome-world.js';
import {movePlayer} from '../src/elevation.js';

test('all collision outlines match the actual GLB vertices and shared rock geometry',()=>{
 assert.deepEqual(outlines,generate());
});
const obstacle=id=>id==='rock'?{feature:'rock',radius:3.6,height:4.32,size:7.2}:id==='veg-shrub'?{feature:'thicket',radius:3.1,height:3.2,size:6.2}:{model:id,size:id==='arch-turbine'?11:8,radius:5.68,height:8};
const rotate=(x,z,a)=>({x:Math.cos(a)*x+Math.sin(a)*z,z:-Math.sin(a)*x+Math.cos(a)*z});

test('every outline edge permits clear space and blocks overlap for both body sizes at four rotations',()=>{
 for(const [id,profile] of Object.entries(outlines))for(const rotation of [0,.7,Math.PI/2,2.4])for(const r of [1.5,2.4]){
  const item={...obstacle(id),x:0,z:0,rotation},scale=obstacleScale(item);
  for(let i=0;i<profile.hull.length;i++){
   const a=profile.hull[i],b=profile.hull[(i+1)%profile.hull.length],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),nx=dz/length,nz=-dx/length;
   const at=distance=>rotate((a[0]+b[0])*scale/2+nx*distance,(a[1]+b[1])*scale/2+nz*distance,rotation);
   const outside=at(r+.03),overlap=at(r-.03);
   assert.equal(obstacleContains(item,outside.x,outside.z,r),false,`${id} clear edge ${i}`);
   assert.equal(obstacleContains(item,overlap.x,overlap.z,r),true,`${id} blocked edge ${i}`);
  }
 }
});

test('actual player movement passes beside each obstacle type with both chassis sizes',()=>{
 const w=assembleBiomeWorld(12);
 for(const [id,profile] of Object.entries(outlines))for(const rotation of [0,.7,Math.PI/2,2.4])for(const [key,r] of [['wanderer',1.5],['hecaton',2.4]]){
  const item={...obstacle(id),x:0,z:0,rotation},scale=obstacleScale(item);w.obstacles=()=>[item];
  for(let i=0;i<profile.hull.length;i+=Math.max(1,Math.floor(profile.hull.length/3))){
   const a=profile.hull[i],b=profile.hull[(i+1)%profile.hull.length],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
   const start=rotate((a[0]+b[0])*scale/2+dz/length*(r+.08),(a[1]+b[1])*scale/2-dx/length*(r+.08),rotation);
   const step=rotate(dx/length*.01,dz/length*.01,rotation),s={world:w,body:{key},player:{...start}};
   for(let k=0;k<10;k++)movePlayer(s,.02,step.x,step.z);
   assert.ok(Math.hypot(s.player.x-start.x-step.x*10,s.player.z-start.z-step.z*10)<1e-7,`${id} ${key} rotation ${rotation}`);
  }
 }
});

test('both chassis traverse all 25 tiles, safe points and stone recesses across two seeds',()=>{
 for(const seed of [12,20317])for(const [key,r] of [['wanderer',1.5],['hecaton',2.4]]){
  const world=assembleBiomeWorld(seed),s={world,body:{key},player:{x:0,z:22}};
  for(const tile of world.tiles)for(const goal of [...tile.safe,{x:tile.x+20,z:tile.z-13}]){
   const path=world.findPath(s.player,goal,r);
   assert.ok(path.length||Math.hypot(s.player.x-goal.x,s.player.z-goal.z)<2.1,`${seed} ${key} ${tile.id} missing path`);
   for(const p of path){const dx=p.x-s.player.x,dz=p.z-s.player.z,n=Math.ceil(Math.hypot(dx,dz)/.15);for(let i=0;i<n;i++)movePlayer(s,.02,dx/n,dz/n);}
   assert.ok(Math.hypot(s.player.x-goal.x,s.player.z-goal.z)<2.1,`${seed} ${key} ${tile.id}: stuck at ${s.player.x},${s.player.z}`);
  }
 }
});

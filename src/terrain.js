import {seededRandom} from './simulation.js';
export const WORLD_HALF=1024,CHUNK=64,FOOTPRINT=2.4;
export function chunkData(seed,cx,cz){
 const rand=seededRandom((seed^Math.imul(cx+32,73856093)^Math.imul(cz+32,19349663))>>>0),obstacles=[];
 // A connected 16 m-wide cross in every chunk is never obstructed.
 for(const [a,b] of [[-1,-1],[-1,1],[1,-1],[1,1]]){
  const x=cx*CHUNK+32+a*(13+rand()*8),z=cz*CHUNK+32+b*(13+rand()*8),radius=2+rand()*3;
  if(Math.hypot(x,z)>24)obstacles.push({x,z,radius,height:1+rand()*4});
 }
 return{cx,cz,obstacles,lair:{x:cx*CHUNK+32,z:cz*CHUNK+32},shade:rand()};
}
export function terrain(seed){
 const cache=new Map();return{seed,chunk(cx,cz){const key=cx+','+cz;if(!cache.has(key))cache.set(key,chunkData(seed,cx,cz));return cache.get(key);},obstacles(x,z){const result=[];for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)result.push(...this.chunk(Math.floor(x/64)+a,Math.floor(z/64)+b).obstacles);return result;},walkable(x,z,r=FOOTPRINT){return Math.abs(x)<=WORLD_HALF-r&&Math.abs(z)<=WORLD_HALF-r&&this.obstacles(x,z).every(o=>Math.hypot(x-o.x,z-o.z)>r+o.radius);}};
}
export function move(world,p,dx,dz,r=FOOTPRINT){
 const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.5));
 const canStep=(a,b)=>p.flying&&world.canFly?world.canFly(a,b,r):world.canMove?world.canMove(a,b,r):p.flying&&world.flyable?world.flyable(b.x,b.z,r):world.walkable(b.x,b.z,r);
 for(let i=0;i<steps;i++){if(canStep(p,{x:p.x+dx/steps,z:p.z}))p.x+=dx/steps;if(canStep(p,{x:p.x,z:p.z+dz/steps}))p.z+=dz/steps;if(world.heightAt)p.y=world.heightAt(p.x,p.z)??p.y??0;}
}
export function spawnPoint(world,player,rng,min=27,max=40,r=FOOTPRINT){
 for(let i=0;i<80;i++){const a=rng()*Math.PI*2,d=min+rng()*(max-min),p={x:player.x+Math.cos(a)*d,z:player.z+Math.sin(a)*d};if(world.walkable(p.x,p.z,r))return p;}
 return null;
}

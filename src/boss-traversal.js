import {WORLD_HALF} from './terrain.js';

export const ignoresBossObstacles=e=>(e.kind==='boss'||e.kind==='final')&&e.radius>=6;
/** Only map coverage limits giant hulls. Scenery and slope clearance do not. */
export function moveGiantBoss(s,e,dx,dz){
 const w=s.world,n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.25));
 for(let i=0;i<n;i++)for(const [ax,az]of [[dx/n,0],[0,dz/n]]){
  const x=e.x+ax,z=e.z+az;
  const h=w.heightAt?w.heightAt(x,z):Math.abs(x)<=WORLD_HALF-e.radius&&Math.abs(z)<=WORLD_HALF-e.radius?0:null;
  if(!Number.isFinite(h))continue;
  if(s.streaming&&w.tileAt&&!s.streaming.ready.has(w.tileAt(x,z)?.id))continue;
  e.x=x;e.z=z;e.y=h;
 }
}

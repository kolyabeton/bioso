import {bodySize} from './body-size.js';
import {eventObstacles,eventMovementClear} from './gameplay-modules/event-collision.js';
export const elevation=p=>p.y??0;
export const spatialDistance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z,elevation(a)-elevation(b));
export const planarDistance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
/** Ground pickups keep their authored horizontal radius on relief. */
export const groundDistance=(s,a,b)=>s.world.heightAt?planarDistance(a,b):spatialDistance(a,b);
export const bodyRadius=s=>bodySize(s.body).radius;
/** Melee stats already include the hull through heroMeleeAttackRange. */
export const playerAttackRange=(s,w)=>w.range+(['sector','area','contact'].includes(w.mode)?0:bodyRadius(s));
export function visibleBetween(s,a,b,offset=1){return !s.world.lineClear||s.world.lineClear({...a,y:elevation(a)+offset},{...b,y:elevation(b)+offset});}
export function surfaceReach(s,a,b){
 const w=s.world;if(!w.heightAt)return true;
 const ah=w.heightAt(a.x,a.z),bh=w.heightAt(b.x,b.z);if(!Number.isFinite(ah)||!Number.isFinite(bh))return false;
 // Reject airborne/other-floor objects, but allow the same grade that movement
 // accepts instead of treating a traversable hill as a separate floor.
 if((a.y!=null&&Math.abs(elevation(a)-ah)>=1)||(b.y!=null&&Math.abs(elevation(b)-bh)>=1))return false;
 if(Math.abs(ah-bh)>planarDistance(a,b)*.6+.05)return false;
 return visibleBetween(s,{...a,y:ah},{...b,y:bh},.2);
}
// Ground-only movement: boundaries and unloaded tiles block movement, never cause damage.
export function movePlayer(s,dt,dx,dz){
 const w=s.world,p=s.player,r=bodyRadius(s),events=eventObstacles(s);
 p.y=w.heightAt(p.x,p.z)??0;p.vy=0;p.vertical='grounded';delete p.jump;delete p.fallFrom;
 const n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.25));
 for(let i=0;i<n;i++)for(const [ax,az]of [[dx/n,0],[0,dz/n]]){
  if(!ax&&!az)continue;
  const x=p.x+ax,z=p.z+az,h=w.heightAt(x,z);
  if(h===null||!w.walkable(x,z,r)||!eventMovementClear(events,p,x,z,r))continue;
  if(s.streaming&&!s.streaming.ready.has(w.tileAt(x,z)?.id))continue;
  p.x=x;p.z=z;p.y=h;
 }
}
export function settleObjects(s,objects=true){
 if(!s.world.heightAt)return;
 const targets=Array.isArray(objects)?objects:objects?[...s.enemies,...s.ground,...s.xpDrops,...s.puddles]:[];
 for(const p of targets){
  let h=s.world.heightAt(p.x,p.z);
  if(h===null&&(s.ground.includes(p)||s.xpDrops.includes(p))){const safe=s.world.tiles.flatMap(t=>t.safe).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];p.x=safe.x;p.z=safe.z;h=s.world.heightAt(p.x,p.z);}
  p.y=h??p.y??0;
 }
 for(const e of s.events){if(e.x!=null){e.y??=s.world.heightAt(e.x,e.z)??s.player.y;if(e.tx!=null)e.ty??=s.world.heightAt(e.tx,e.tz)??0;}}
}

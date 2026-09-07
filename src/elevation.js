import {bodySize} from './body-size.js';
export const elevation=p=>p.y??0;
export const spatialDistance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z,elevation(a)-elevation(b));
export const bodyRadius=s=>bodySize(s.body).radius;
export function visibleBetween(s,a,b,offset=1){return !s.world.lineClear||s.world.lineClear({...a,y:elevation(a)+offset},{...b,y:elevation(b)+offset});}
export function surfaceReach(s,a,b){return !s.world.heightAt||Math.abs(elevation(a)-elevation(b))<1&&visibleBetween(s,a,b,.2);}
// Ground-only movement: boundaries and unloaded tiles block movement, never cause damage.
export function movePlayer(s,dt,dx,dz){
 const w=s.world,p=s.player,r=bodyRadius(s);
 p.y=w.heightAt(p.x,p.z)??0;p.vy=0;p.vertical='grounded';delete p.jump;delete p.fallFrom;
 const n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.25));
 for(let i=0;i<n;i++)for(const [ax,az]of [[dx/n,0],[0,dz/n]]){
  if(!ax&&!az)continue;
  const x=p.x+ax,z=p.z+az,h=w.heightAt(x,z);
  if(h===null||!w.walkable(x,z,r))continue;
  if(s.streaming&&!s.streaming.ready.has(w.tileAt(x,z)?.id))continue;
  p.x=x;p.z=z;p.y=h;
 }
}
export function settleObjects(s){
 if(!s.world.heightAt)return;
 for(const p of [...s.enemies,...s.ground,...s.xpDrops,...s.puddles]){
  let h=s.world.heightAt(p.x,p.z);
  if(h===null&&(s.ground.includes(p)||s.xpDrops.includes(p))){const safe=s.world.tiles.flatMap(t=>t.safe).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];p.x=safe.x;p.z=safe.z;h=s.world.heightAt(p.x,p.z);}
  p.y=h??p.y??0;
 }
 for(const e of s.events){if(e.x!=null){e.y??=s.world.heightAt(e.x,e.z)??s.player.y;if(e.tx!=null)e.ty??=s.world.heightAt(e.tx,e.tz)??0;}}
}

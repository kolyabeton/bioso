import {eventCollisionWorld,moveCreature} from './gameplay-modules/event-collision.js';
import {ignoresBossObstacles} from './boss-traversal.js';
export function clearSegment(world,a,b,r=2.4,flying=false){
 const d=Math.hypot(b.x-a.x,b.z-a.z),n=Math.ceil(d/(world.canMove ? .5 : 1));
 for(let i=1;i<=n;i++){
  const p={x:a.x+(b.x-a.x)*(i-1)/n,z:a.z+(b.z-a.z)*(i-1)/n},q={x:a.x+(b.x-a.x)*i/n,z:a.z+(b.z-a.z)*i/n};
  // Match the player's X-then-Z substeps, including clearance around corners.
  if(flying&&world.canFly){const corner={x:q.x,z:p.z};if(!world.canFly(p,corner,r)||!world.canFly(corner,q,r))return false;}
  else if(world.canMove){const corner={x:q.x,z:p.z};if(!world.canMove(p,corner,r)||!world.canMove(corner,q,r))return false;}
  else if(flying&&world.flyable?!world.flyable(q.x,q.z,r):!world.walkable(q.x,q.z,r))return false;
 }
 return true;
}
// Bounded A*, only requested on an obstructed line; identical footprint test to movement.
function* pathSearch(world,start,goal,r=1,{cell=4,budget=2400,flying=false,edgeCache=null}={}){
 const key=(x,z)=>x+','+z,sx=Math.round(start.x/cell),sz=Math.round(start.z/cell),gx=Math.round(goal.x/cell),gz=Math.round(goal.z/cell),open=[],seen=new Map();
 const walkable=(x,z)=>flying&&world.flyable?world.flyable(x,z,r):world.walkable(x,z,r),blockedGoal=!walkable(gx*cell,gz*cell);
 const first={x:sx,z:sz,g:0,f:Math.hypot(gx-sx,gz-sz),parent:null};open.push(first);seen.set(key(sx,sz),first);let best=first;
 while(open.length&&budget-->0){yield;let index=0;for(let i=1;i<open.length;i++)if(open[i].f<open[index].f)index=i;const n=open.splice(index,1)[0];if(n.closed)continue;n.closed=true;if(Math.hypot(n.x-gx,n.z-gz)<Math.hypot(best.x-gx,best.z-gz))best=n;if(n.x===gx&&n.z===gz||blockedGoal&&n!==first&&Math.hypot(n.x-gx,n.z-gz)<=1.5){best=n;break;}
  for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const x=n.x+dx,z=n.z+dz,k=key(x,z),old=seen.get(k),g=n.g+Math.hypot(dx,dz);if(old?.closed||old&&g>=old.g)continue;const a={x:n.x*cell,z:n.z*cell},b={x:x*cell,z:z*cell};let clear;
   if(edgeCache){const edge=r+':'+Number(flying)+':'+cell+':'+n.x+','+n.z+'>'+x+','+z;clear=edgeCache.get(edge);if(clear===undefined){clear=clearSegment(world,a,b,r,flying);if(edgeCache.size>=65536)edgeCache.clear();edgeCache.set(edge,clear);}}
   else clear=clearSegment(world,a,b,r,flying);
   if(!clear)continue;const v={x,z,g,f:g+Math.hypot(x-gx,z-gz),parent:n};seen.set(k,v);open.push(v);}
 }
 const path=[];for(let n=best;n?.parent;n=n.parent)path.unshift({x:n.x*cell,z:n.z*cell});return path;
}
export function findPath(...args){
 const search=pathSearch(...args);let step;do{step=search.next();}while(!step.done);return step.value;
}
// Keep search iterators outside serializable game/save state. All enemies share a
// per-frame expansion budget; blocked goals cannot monopolize a rendered frame.
const navigationJobs=new WeakMap();
/** A relocation must discard both the cached path and any in-flight search. */
export function resetEnemyNavigation(s,e){
 navigationJobs.get(s)?.jobs.delete(e);e.path=null;e.navigationLine=null;e.repathAt=0;
}

function requestPath(s,e,target){
 const now=s.time+(s.isaac?.extraTime||0);
 let scheduler=navigationJobs.get(s);
 if(!scheduler){scheduler={time:-1,jobs:new Map(),queue:[],edges:new Map(),world:null,snapshots:[]};navigationJobs.set(s,scheduler);}
 // Shared only by immutable biome collision snapshots. A rebuilt/removed
 // decoration list or replaced collision API invalidates every cached edge.
 const w=eventCollisionWorld(s,e),cacheable=w===eventCollisionWorld(s)&&w.presentation==='biomes'&&w.flat,eventKey=w.eventCollisionKey();
 if(!cacheable)scheduler.edges.clear();
 if(cacheable&&scheduler.checkedAt!==now){
  scheduler.checkedAt=now;const methods=[w.canMove,w.canFly,w.walkable,w.flyable,w.heightAt,w.solidAt,w.obstacles,w.tileAt,w.neighbors],heightKey=tile=>[tile.x,tile.z,tile.index,tile.biome,tile.environmentId,tile.visualEnvironmentId].join(':');
  const changed=scheduler.world!==w||scheduler.eventKey!==eventKey||methods.some((fn,i)=>scheduler.methods?.[i]!==fn)||scheduler.snapshots.length!==w.tiles.length||w.tiles.some((tile,i)=>{const old=scheduler.snapshots[i];return !old||old.tile!==tile||old.decorations!==tile.decorations||old.length!==tile.decorations.length||old.collision!==tile.collisionDecorations||old.heightKey!==heightKey(tile);});
  if(changed){scheduler.edges.clear();scheduler.world=w;scheduler.eventKey=eventKey;scheduler.methods=methods;scheduler.snapshots=w.tiles.map(tile=>({tile,decorations:tile.decorations,length:tile.decorations.length,collision:tile.collisionDecorations,heightKey:heightKey(tile)}));}
 }
 if(!scheduler.jobs.has(e)&&(!e.path||now>=e.repathAt)){
  const job={e,search:pathSearch(w,e,target,e.radius,{cell:2,budget:1200,flying:!!e.flying,edgeCache:cacheable?scheduler.edges:null})};
  scheduler.jobs.set(e,job);scheduler.queue.push(job);
 }
 if(scheduler.time===now)return;
 scheduler.time=now;
 for(let i=0;i<24&&scheduler.queue.length;i++){
  const job=scheduler.queue.shift();
  if(scheduler.jobs.get(job.e)!==job)continue;
  if(job.e.hp<=0){scheduler.jobs.delete(job.e);continue;}
  const step=job.search.next();
  if(step.done){job.e.path=step.value;job.e.repathAt=now+1+(job.e.id%5)*.1;scheduler.jobs.delete(job.e);}
  else scheduler.queue.push(job);
 }
}
export function navigateEnemy(s,e,target,speed,dt){
 const now=s.time+(s.isaac?.extraTime||0);
 if(e.windup)return;
 if(ignoresBossObstacles(e)){
  e.path=null;e.navigationLine=null;navigationJobs.get(s)?.jobs.delete(e);
  const d=Math.hypot(target.x-e.x,target.z-e.z),travel=Math.min(d,Math.max(0,speed*dt));
  if(d>.01)moveCreature(s,e,(target.x-e.x)/d*travel,(target.z-e.z)/d*travel,e.radius);
  return;
 }
 const world=eventCollisionWorld(s,e);
 let next=target;
 if(s.world.tiles&&!s.world.flat){const a=s.world.tileAt(e.x,e.z),b=s.world.tileAt(target.x,target.z);if(a&&b&&a!==b){const forward=(b.index-a.index+16)%16,idx=(a.index+(forward<=8?1:15))%16,n=s.world.tiles[idx];target={x:(a.x+n.x)/2+(n.x-a.x)/64*6,z:(a.z+n.z)/2+(n.z-a.z)/64*6};next=target;}}
 const cached=e.navigationLine,age=now-(cached?.at??-Infinity),sameStart=cached&&Math.hypot(e.x-cached.ex,e.z-cached.ez)<.75,sameTarget=cached&&Math.hypot(target.x-cached.tx,target.z-cached.tz)<.75;
 const direct=age<.2&&sameStart&&sameTarget?cached.clear:clearSegment(world,e,target,e.radius,!!e.flying);
 if(!(age<.2&&sameStart&&sameTarget))e.navigationLine={at:now,ex:e.x,ez:e.z,tx:target.x,tz:target.z,clear:direct};
 if(!direct){
  if(world.tiles){requestPath(s,e,target);}
  else if(!e.path||now>=e.repathAt){e.path=e.flying&&world.flyable?findPath(world,e,target,e.radius,{flying:true}):world.findPath?world.findPath(e,target,e.radius):findPath(world,e,target,e.radius);e.repathAt=now+1+(e.id%5)*.1;}
  while(e.path?.length&&Math.hypot(e.x-e.path[0].x,e.z-e.path[0].z)<1)e.path.shift();next=e.path?.[0]||e;
 }else {e.path=null;navigationJobs.get(s)?.jobs.delete(e);}
 const d=Math.hypot(next.x-e.x,next.z-e.z);if(d>.01)moveCreature(s,e,(next.x-e.x)/d*Math.min(d,speed*dt),(next.z-e.z)/d*Math.min(d,speed*dt),e.radius);
}

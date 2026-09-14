import {findPath,clearSegment} from '../../world-navigation.js';
import {eventObstacles,eventMovementClear} from '../../gameplay-modules/event-collision.js';

export const RACE_RULES=Object.freeze({pace:6.4,combatAllowance:3,finishRadius:3,routeRadius:2.4,packCount:3});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const routeLength=path=>path.slice(1).reduce((sum,p,i)=>sum+distance(path[i],p),0);
export const raceTimeLimit=length=>Math.ceil(length/RACE_RULES.pace+RACE_RULES.combatAllowance);
function raceNavigationWorld(s,n){
 const source=s.world,obstacles=eventObstacles(s).filter(o=>distance(o,n)>.1);
 if(!obstacles.length)return source;
 const world=Object.create(source);
 world.walkable=(x,z,r)=>source.walkable(x,z,r)&&eventMovementClear(obstacles,{x,z},x,z,r);
 world.canMove=(from,to,r)=>source.canMove?source.canMove(from,to,r)&&eventMovementClear(obstacles,from,to.x,to.z,r):world.walkable(to.x,to.z,r);
 return world;
}

/** A complete, collision-checked route; partial A* results must never create a timed challenge. */
export function prepareRace(s,n){
 if(n.race)return n.race;
 if(n.raceUnavailable)return null;
 if(s.mode!=='survival'||!s.world.flat||!s.world.tiles)return null;
 const w=raceNavigationWorld(s,n),r=RACE_RULES.routeRadius,start={x:n.x,y:n.y??0,z:n.z};
 const candidates=w.tiles.flatMap(t=>t.safe).filter(p=>distance(start,p)>=160&&w.walkable(p.x,p.z,r)).sort((a,b)=>distance(start,b)-distance(start,a));
 for(const goal of candidates.slice(0,6)){
  const raw=findPath(w,start,goal,r,{cell:4,budget:18000});
  if(!raw.length||distance(raw.at(-1),goal)>6)continue;
  const path=[start,...raw,{...goal,y:w.heightAt(goal.x,goal.z)}];
  if(!path.slice(1).every((p,i)=>clearSegment(w,path[i],p,r)))continue;
  // Remove grid zigzags only when the creature can follow the resulting segment.
  const smooth=[start];let at=0;
  while(at<path.length-1){let end=Math.min(path.length-1,at+12);while(end>at+1&&!clearSegment(w,path[at],path[end],r))end--;smooth.push(path[end]);at=end;}
  const length=routeLength(smooth);
  const packs=Array.from({length:RACE_RULES.packCount},(_,i)=>{
   const target=length*(i+1)/(RACE_RULES.packCount+1);let traversed=0;
   for(let k=1;k<smooth.length;k++){const d=distance(smooth[k-1],smooth[k]);if(traversed+d>=target){const t=(target-traversed)/d;return{x:smooth[k-1].x+(smooth[k].x-smooth[k-1].x)*t,z:smooth[k-1].z+(smooth[k].z-smooth[k-1].z)*t,spawned:false};}traversed+=d;}
  });
  return n.race={start,finish:path.at(-1),path:smooth,length,limit:raceTimeLimit(length),packs};
 }
 n.raceUnavailable=true;return null;
}

export function startRace(s,n){
 const plan=prepareRace(s,n);if(!plan)return false;
 n.elapsed=0;n.progress=0;n.members=[];n.state='active';Object.assign(n,plan.finish);
 s.encounters.active=n;return true;
}

export function tickRace(s,n,dt,spawn){
 if(s.dead||s.hp<=0){n.state='failed';s.encounters.active=null;return;}
 n.elapsed+=dt;
 const arrived=distance(s.player,n)<=RACE_RULES.finishRadius&&clearSegment(s.world,s.player,n,.5);
 if(arrived&&n.elapsed<=n.race.limit+1e-8){n.state='reward';s.encounters.active=null;s.events.push({type:'notice',text:'Финиш! Испытание пройдено · выберите награду'});return;}
 if(n.elapsed>=n.race.limit){n.state='failed';s.encounters.active=null;s.events.push({type:'notice',text:'Время вышло · финиш не достигнут'});return;}
 if(!spawn)return;
 for(const pack of n.race.packs){if(pack.spawned||distance(s.player,pack)>19)continue;pack.spawned=true;
  for(let i=0;i<3;i++){
   const p={x:pack.x+(i-1)*2,z:pack.z+(i===1?2:0)};
   if(!s.world.walkable(p.x,p.z,1))continue;
   const e=spawn('normal',p,i===2?'ranged':'mass',s.time);
   if(e){e.challengeId=n.id;e.territory=null;n.members.push(e.id);}
  }
 }
}

/** Navigation is run-local. Targets follow living entities, never a stale screen position. */
export function setWaypoint(s,target){
 if(!target||!Number.isFinite(target.x)||!Number.isFinite(target.z))return false;
 if(!target.kind&&!target.type&&s.world.walkable&&!s.world.walkable(target.x,target.z,.5))return false;
 s.waypoint={x:target.x,y:target.y??0,z:target.z,label:target.label||'Точка на карте',id:target.id,source:target.kind?'enemy':target.type?'encounter':'point'};return true;
}
export function waypointTarget(s){
 const w=s.waypoint;if(!w)return null;
 let target=w;
 if(w.source==='enemy')target=s.enemies.find(e=>e.id===w.id&&e.hp>0);
 if(w.source==='encounter')target=s.encounters?.nodes.find(n=>n.id===w.id&&!['complete','failed'].includes(n.state));
 return target?{...w,x:target.x,y:target.y??0,z:target.z,distance:Math.hypot(target.x-s.player.x,target.z-s.player.z)}:null;
}
export function screenBearing(from,to,width,height){return Math.atan2((to.x-from.x)*width,-(from.y-to.y)*height)*180/Math.PI;}

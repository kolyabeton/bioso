/** Navigation is run-local. Targets follow living entities, never a stale screen position. */
export const ACTIVE_EVENT_GUIDE_DISTANCE=22;

export function setWaypoint(s,target){
 if(!target||!Number.isFinite(target.x)||!Number.isFinite(target.z))return false;
 if(!target.kind&&!target.type&&!target.pickupKind&&!target.groundItem&&s.world.walkable&&!s.world.walkable(target.x,target.z,.5))return false;
 s.waypoint={x:target.x,y:target.y??0,z:target.z,label:target.label||'Точка на карте',id:target.id,source:target.pickupKind?'recovery':target.groundItem?'ground':target.kind?'enemy':target.type?'encounter':'point'};return true;
}
export function waypointTarget(s){
 const w=s.waypoint;if(!w)return null;
 let target=w;
 if(w.source==='enemy')target=s.enemies.find(e=>e.id===w.id&&e.hp>0);
 if(w.source==='encounter')target=s.encounters?.nodes.find(n=>n.id===w.id&&!['complete','failed'].includes(n.state));
 if(w.source==='recovery')target=s.recoveryDrops?.find(q=>q.id===w.id)??s.consumableDrops?.find(q=>q.id===w.id);
 if(w.source==='ground')target=s.ground?.find(q=>q.id===w.id);
 return target?{...w,x:target.x,y:target.y??0,z:target.z,distance:Math.hypot(target.x-s.player.x,target.z-s.player.z)}:null;
}
export function automaticWaypointTarget(s){
 const dungeon=s.mode==='survival'&&s.encounters?.active?.dungeon&&!s.encounters.active.cleared?s.encounters.active:null;
 const zones=(dungeon?.aggroZones||[]).filter(zone=>zone.state==='idle');
 if(zones.length){const zone=zones.reduce((nearest,candidate)=>Math.hypot(candidate.x-s.player.x,candidate.z-s.player.z)<Math.hypot(nearest.x-s.player.x,nearest.z-s.player.z)?candidate:nearest),distance=Math.hypot(zone.x-s.player.x,zone.z-s.player.z);return{x:zone.x,y:zone.y??0,z:zone.z,label:'Зона элиты',id:zone.id,source:'dungeon-zone',distance};}
 if(s.encounters?.active?.dungeon)return null;
 const event=s.mode==='survival'&&!s.encounters?.active?.dungeon&&s.encounters?.active?.state==='active'?s.encounters.active:null;
 const eventDistance=event?Math.hypot(event.x-s.player.x,event.z-s.player.z):0;
 if(event&&eventDistance>Math.max(ACTIVE_EVENT_GUIDE_DISTANCE,(event.radius||0)+8))return{x:event.x,y:event.y??0,z:event.z,label:event.label||event.type,id:event.id,source:'event',distance:eventDistance};
 const boss=s.mode==='survival'&&s.introBossId?s.enemies?.find(e=>e.id===s.introBossId&&e.hp>0):null;
 if(boss)return{x:boss.x,y:boss.y??0,z:boss.z,label:'Первый босс',id:boss.id,source:'mission',distance:Math.hypot(boss.x-s.player.x,boss.z-s.player.z)};
 return null;
}
export function compassTarget(s){
 if(s.dead||s.mode!=='survival')return null;
 if(s.encounters?.active?.dungeon)return automaticWaypointTarget(s);
 return (!s.waypoint?.autoObjective&&waypointTarget(s))||automaticWaypointTarget(s);
}
export function screenBearing(from,to,width,height){return Math.atan2((to.x-from.x)*width,-(from.y-to.y)*height)*180/Math.PI;}

export function movementTargetAlignment(s,input,target=compassTarget(s)){
 const movement=Math.hypot(input?.x||0,input?.z||0),distance=target?.distance??Math.hypot((target?.x??s.player.x)-s.player.x,(target?.z??s.player.z)-s.player.z);
 if(!target||distance<=3||movement<.2)return null;
 return ((input.x||0)*(target.x-s.player.x)+(input.z||0)*(target.z-s.player.z))/(movement*distance);
}

/** Sustained reverse travel produces a sparse, light haptic cue. */
export function createWrongWayFeedback(pulse=()=>{},{hold=.45,cooldown=1.4,threshold=-.35,duration=8}={}){
 let wrongFor=0,wait=0,targetKey='';
 function reset(){wrongFor=wait=0;targetKey='';}
 function update(s,input,dt){
  const target=compassTarget(s),key=target?`${target.source}:${target.id??`${target.x},${target.z}`}`:'';
  if(key!==targetKey){targetKey=key;wrongFor=wait=0;}
  wait=Math.max(0,wait-Math.max(0,dt||0));const alignment=movementTargetAlignment(s,input,target);
  if(alignment===null||alignment>threshold){wrongFor=0;return false;}
  wrongFor+=Math.max(0,dt||0);if(wrongFor<hold||wait>0)return false;
  wrongFor=0;wait=cooldown;pulse(duration);return true;
 }
 return{update,reset,state:()=>({wrongFor,wait,targetKey})};
}

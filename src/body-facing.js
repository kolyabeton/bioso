import {bodySize} from './body-size.js';

export const angleDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
/** Radians per second: structural size and rated capacity, never carried loot. */
export function bodyTurnSpeed(body,capacity){
 return 8/(bodySize(body).scale*Math.sqrt(Math.max(1,capacity/100)));
}
export const armSide=slot=>slot%2?-1:1;
/** Each hand owns the forward/outboard quadrant. The centreline is shared. */
export function clampArmYaw(yaw,slot){
 const side=armSide(slot);return side*Math.max(0,Math.min(Math.PI/2,side*angleDelta(yaw,0)));
}
export function armCanReach(s,slot,target){
 const yaw=angleDelta(Math.atan2(target.x-s.player.x,target.z-s.player.z),s.player.facing??0);
 return Math.abs(yaw-clampArmYaw(yaw,slot))<1e-7;
}
export function turnBody(s,dt,turnSpeed,target=null,slot=0){
 const facing=s.player.facing??0;
 let desired=facing;
 if(target){
  const both=s.arms.some((p,i)=>p&&!p.disabled&&armSide(i)!==armSide(slot));
  desired=Math.atan2(target.x-s.player.x,target.z-s.player.z)-(both?0:armSide(slot)*.35);
 }else if(Math.hypot(s.motion?.x??0,s.motion?.z??0)>.05)desired=Math.atan2(s.motion.x,s.motion.z);
 const delta=angleDelta(desired,facing),limit=turnSpeed*Math.max(0,dt);
 s.player.facing=angleDelta(facing+Math.max(-limit,Math.min(limit,delta)),0);
}

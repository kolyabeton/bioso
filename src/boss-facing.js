import {angleDelta} from './body-facing.js';
import {bodySize} from './body-size.js';

export const isTurningBoss=e=>e.kind==='boss'||e.kind==='final';
/** Radians/second. Larger hulls turn more slowly, independently of walking/attack speed. */
export function bossTurnSpeed(e){
 const frame=e.assembly?.body?bodySize(e.assembly.body).scale:1;
 return 8/Math.max(.5,(e.radius??1)*frame*(e.visualScale??1));
}
export function turnBossFacing(e,target,dt,now){
 const state=e.bossCombat??e;
 if(!isTurningBoss(e))return state.facing;
 if(e.hp<=0||e.frozenUntil>now||e.pickupSleepUntil>now)return state.facing;
 const dx=target.x-e.x,dz=target.z-e.z;
 if(Math.hypot(dx,dz)<1e-8)return state.facing;
 const desired=Math.atan2(dx,dz),facing=state.facing??desired;
 const delta=angleDelta(desired,facing),limit=bossTurnSpeed(e)*Math.max(0,dt);
 state.facing=angleDelta(facing+Math.max(-limit,Math.min(limit,delta)),0);
 return state.facing;
}

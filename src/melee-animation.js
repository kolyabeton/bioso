import {WHIP_PULL_PHASE} from './whip-timing.js';
import {HERO_MELEE_RANGE_MULTIPLIER} from './melee-range.js';

const durations={claws:.42,hammer:.55,drill:.46,whip:.42,fangs:.28};
export const SHIELD_IMPACT_DELAY=durations.hammer*.44;
export const isMelee=key=>Object.hasOwn(durations,key);
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
/** Different silhouettes and recovery profiles; attack timing belongs to simulation. */
export function meleePose(key,t,side=1,gather=false){
 const rise=smooth(t/.22),strike=smooth((t-.22)/.22),recover=1-smooth((t-.44)/.56);
 switch(key){
  case 'claws':{const cut=smooth((t-.12)/.3),hold=1-smooth((t-.64)/.36);return{yaw:side*(-.7*rise+2.25*cut)*hold,pitch:-.16*Math.sin(t*Math.PI),roll:side*.27*cut*hold,extension:.35*HERO_MELEE_RANGE_MULTIPLIER*cut*hold,trail:t>.1&&t<.94,spin:0};}
  case 'hammer':return{yaw:side*-.12*rise*recover,pitch:-.5*rise*recover,roll:side*.18*rise*recover,extension:(-.3*rise+1.55*strike)*recover*HERO_MELEE_RANGE_MULTIPLIER,trail:false,spin:0};
  case 'drill':{const drive=smooth((t-.04)/.3),retract=1-.62*smooth((t-.68)/.32);return{yaw:side*-.05*Math.sin(t*Math.PI),pitch:-.06*drive,roll:side*.035*Math.sin(t*Math.PI*5),extension:(.48+.12*drive)*retract*HERO_MELEE_RANGE_MULTIPLIER,trail:false,spin:t*Math.PI*18};}
  case 'whip':{const wind=smooth(t/.16),cut=smooth((t-.16)/.32),back=smooth((t-WHIP_PULL_PHASE)/.43);return{yaw:side*(-.8*wind+1.8*cut)*(1-back),pitch:-.25*wind*(1-back),roll:side*(.22*cut-.35*back)*(1-smooth((t-.9)/.1)),extension:(.4*cut-(gather?.65:.25)*back)*(1-smooth((t-.9)/.1))*HERO_MELEE_RANGE_MULTIPLIER,trail:t>.16&&t<.55,spin:0};}
  case 'fangs':return{yaw:side*.28*Math.sin(t*Math.PI*2),pitch:-.12*strike,roll:side*-.3*strike*recover,extension:1.05*HERO_MELEE_RANGE_MULTIPLIER*strike*recover,trail:false,spin:0};
  default:return{yaw:0,pitch:0,roll:0,extension:0,trail:false,spin:0};
 }
}
export function createMeleeAnimation(){
 const strikes=new Map();
 return{
  attack(event,time){if(event.type==='whip-grab'){const active=strikes.get(event.source);if(active?.key==='whip')active.targets=event.targets;return false;}if(!['attack','melee-windup'].includes(event.type)||event.animationStarted||!isMelee(event.key))return false;const at=event.at??time,aim=Math.atan2(event.tx-event.x,event.tz-event.z),target={tx:event.tx,ty:event.ty,tz:event.tz,targetRadius:event.targetRadius,whipGather:event.whipGather,strikeRange:event.strikeRange,originX:event.x,originZ:event.z,targets:[],duration:event.duration??durations[event.key]},active=strikes.get(event.source);if(event.key==='whip'&&event.echo&&active?.key==='whip'&&at-active.start<active.duration)return false;if(event.key==='drill'&&active?.key==='drill'&&at-active.start<durations.drill){Object.assign(active,{aim,...target});return false;}strikes.set(event.source,{key:event.key,start:at,aim,...target});return true;},
  pose(id,time,side=1){const s=strikes.get(id);if(!s)return null;const t=Math.max(0,(time-s.start)/s.duration);if(t>=1){strikes.delete(id);return null;}return{aim:s.aim,tx:s.tx,ty:s.ty,tz:s.tz,targetRadius:s.targetRadius,whipGather:s.whipGather,strikeRange:s.strikeRange,originX:s.originX,originZ:s.originZ,targets:s.targets,duration:s.duration,phase:t,...meleePose(s.key,t,side,s.whipGather)};},
  retain(ids){const keep=new Set(ids);for(const id of strikes.keys())if(!keep.has(id))strikes.delete(id);},
  reset(){strikes.clear();},
 };
}

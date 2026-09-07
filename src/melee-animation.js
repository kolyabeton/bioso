const durations={claws:.30,hammer:.55,drill:.16,whip:.42,fangs:.28};
export const SHIELD_IMPACT_DELAY=durations.hammer*.44;
export const isMelee=key=>Object.hasOwn(durations,key);
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
/** Different silhouettes and recovery profiles; attack timing belongs to simulation. */
export function meleePose(key,t,side=1){
 const rise=smooth(t/.22),strike=smooth((t-.22)/.22),recover=1-smooth((t-.44)/.56);
 const swing=(-.85*rise+2*strike)*recover;
 switch(key){
  case 'claws':return{yaw:side*swing*1.25,pitch:-.12*Math.sin(t*Math.PI),roll:side*.2*strike*recover,extension:.35*strike*recover,trail:t>.18&&t<.62,spin:0};
  case 'hammer':return{yaw:side*-.12*rise*recover,pitch:-.5*rise*recover,roll:side*.18*rise*recover,extension:(-.3*rise+1.55*strike)*recover,trail:false,spin:0};
  case 'drill':return{yaw:0,pitch:0,roll:0,extension:.48+.12*Math.sin(t*Math.PI*4),trail:false,spin:t*Math.PI*10};
  case 'whip':return{yaw:side*swing*1.8,pitch:-.4*Math.sin(t*Math.PI),roll:side*.35*Math.sin(t*Math.PI*2),extension:.55*Math.sin(t*Math.PI),trail:t>.12&&t<.8,spin:0};
  case 'fangs':return{yaw:side*.28*Math.sin(t*Math.PI*2),pitch:-.12*strike,roll:side*-.3*strike*recover,extension:1.05*strike*recover,trail:false,spin:0};
  default:return{yaw:0,pitch:0,roll:0,extension:0,trail:false,spin:0};
 }
}
export function createMeleeAnimation(){
 const strikes=new Map();
 return{
  attack(event,time){if(!['attack','melee-windup'].includes(event.type)||event.animationStarted||!isMelee(event.key))return false;strikes.set(event.source,{key:event.key,start:event.at??time,aim:Math.atan2(event.tx-event.x,event.tz-event.z)});return true;},
  pose(id,time,side=1){const s=strikes.get(id);if(!s)return null;const t=Math.max(0,(time-s.start)/durations[s.key]);if(t>=1){strikes.delete(id);return null;}return{aim:s.aim,phase:t,...meleePose(s.key,t,side)};},
  retain(ids){const keep=new Set(ids);for(const id of strikes.keys())if(!keep.has(id))strikes.delete(id);},
  reset(){strikes.clear();},
 };
}

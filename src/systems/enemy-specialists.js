import {combatTime} from './mutations.js';
import {spatialDistance} from '../elevation.js';
import {moveCreature} from '../gameplay-modules/event-collision.js';

export const SHIELD_FRONT_REDUCTION=.8;
export const SHIELD_FRONT_ARC=Math.PI*2/3;
export const SHIELD_ATTACK_INTERVAL=5;
export const MIRROR_COOLDOWN=5;
export const PUPPETEER_INTERVAL=4;
export const PUPPETEER_LIMIT=6;
export const PUPPETEER_BUILD_SECONDS=1.4;
export const DRONE_HUNTER_WARNING=.8;
export const DRONE_HUNTER_COOLDOWN=4;
export const DRONE_HUNTER_REPLACEMENT_DELAY=4;
export const EVADE_CHANCE=.8;
export const puppeteerSummonSpread=existing=>1.25+Math.floor(existing/2)*.9;

const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const approach=(current,target,max)=>current+Math.max(-max,Math.min(max,wrap(target-current)));

function tickDroneHunter(s,e,dt,hunt){
 const now=combatTime(s),companions=s.abilities?.companions||[];
 let target=e.specialAttack?companions.find(c=>c.id===e.specialAttack.target):null;
 if(!target)target=[...companions].sort((a,b)=>spatialDistance(e,a)-spatialDistance(e,b)||a.id-b.id)[0];
 if(!target){if(e.specialAttack)e.specialAttack=null;if(e.enemyAttack?.warning?.droneHunter)e.enemyAttack.warning=null;return false;}
 const distance=spatialDistance(e,target),contact=e.radius+.8;
 if(e.specialAttack){
  if(now<e.specialAttack.at){
   const dx=(target.x-e.x)/(distance||1),dz=(target.z-e.z)/(distance||1);
   e.enemyAttack??={index:0,readyAt:Infinity,warning:null};
   e.enemyAttack.warning={key:'fangs',mode:'shot',telegraphMode:'shot',droneHunter:true,x:e.x,y:e.y??0,z:e.z,dx,dz,range:distance,width:.16,started:e.specialAttack.started,at:e.specialAttack.at};
   return true;
  }
  if(e.enemyAttack?.warning?.droneHunter)e.enemyAttack.warning=null;
  if(distance<=contact+1){hunt?.(target,e);e.specialPose={kind:'drone-hunter',started:now,until:now+.7};e.attackPose={key:'fangs',slot:0,x:e.x,y:e.y??0,z:e.z,dx:(target.x-e.x)/(distance||1),dz:(target.z-e.z)/(distance||1),started:e.specialAttack.started,at:now};e.specialReadyAt=now+DRONE_HUNTER_COOLDOWN;}
  else e.specialReadyAt=now+.4;
  e.specialAttack=null;return true;
 }
 if(distance>contact){const travel=Math.min(distance-contact,e.speed*1.45*dt);moveCreature(s,e,(target.x-e.x)/(distance||1)*travel,(target.z-e.z)/(distance||1)*travel,e.radius);return true;}
 e.specialReadyAt??=now;
 if(now>=e.specialReadyAt){e.specialAttack={kind:'drone-hunter',target:target.id,started:now,at:now+DRONE_HUNTER_WARNING};e.specialPose={kind:'drone-hunter',started:now,until:now+DRONE_HUNTER_WARNING};s.events.push({type:'enemy-drone-hunt-warning',source:e.id,target:target.id,x:e.x,y:e.y??0,z:e.z,tx:target.x,ty:(target.y??0)+(target.hover??1.5),tz:target.z,duration:DRONE_HUNTER_WARNING});}
 return true;
}

export function tickEnemySpecialist(s,e,dt,spawn,hunt){
 if(!e.specialty||e.hp<=0)return false;
 const now=combatTime(s);
 if(e.frozenUntil>now||e.territory&&e.territory.state!=='engaged'&&!e.challengeId){if(e.specialAttack){e.specialAttack=null;e.specialReadyAt=now+1;}if(e.enemyAttack?.warning?.droneHunter)e.enemyAttack.warning=null;return false;}
 if(e.specialty==='shield-bearer'){
  const target=Math.atan2(s.player.x-e.x,s.player.z-e.z);
  e.specialFacing=e.specialFacing==null?target:approach(e.specialFacing,target,.55*dt);
 }
 if(e.specialty==='drone-hunter')return tickDroneHunter(s,e,dt,hunt);
 if(e.specialty!=='puppeteer')return false;
 const children=s.enemies.filter(q=>q.hp>0&&q.summonOwner===e.id).length;
 e.specialReadyAt??=now+2.5;
 if(e.specialAttack){
  if(now<e.specialAttack.at)return true;
  const count=Math.min(2,PUPPETEER_LIMIT-children);
  for(let i=0;i<count;i++)spawn?.(e,'worker',i?'right':'left');
  e.specialPose={kind:'puppeteer',started:now,until:now+.8};
  e.attackPose={key:'seed',slot:0,x:e.x,y:e.y??0,z:e.z,dx:Math.sin(e.specialFacing??0),dz:Math.cos(e.specialFacing??0),started:e.specialAttack.started,at:now};
  e.specialAttack=null;e.specialReadyAt=now+PUPPETEER_INTERVAL;
  return true;
 }
 if(now>=e.specialReadyAt&&children<PUPPETEER_LIMIT){
  e.specialAttack={kind:'puppeteer',started:now,at:now+.9};
  e.specialPose={kind:'puppeteer',started:now,until:now+1.7};
  return true;
 }
 return false;
}

/** An evader slips most direct hits; lingering acid and hazards cannot be dodged. */
export const specialistEvades=(e,mode,roll)=>e.specialty==='evader'&&!['acid','environment'].includes(mode)&&roll<EVADE_CHANCE;

export function specialistDamageScale(e,{now=0,origin=null,direction=null,mode=null}={}){
 if(e.specialty!=='shield-bearer'||['acid','environment'].includes(mode))return 1;
 if(e.enemyAttack?.warning||e.attackPose&&now<e.attackPose.at+.8)return 1;
 const facing=e.specialFacing;if(facing==null)return 1;
 let toward;
 if(direction)toward=Math.atan2(-direction.dx,-direction.dz);
 else if(origin)toward=Math.atan2(origin.x-e.x,origin.z-e.z);
 else return 1;
 return Math.abs(wrap(toward-facing))<=SHIELD_FRONT_ARC/2?1-SHIELD_FRONT_REDUCTION:1;
}

export function tryMirrorProjectile(s,e,shot){
 const now=combatTime(s);
 if(e.specialty!=='mirrorling'||e.hp<=0||e.frozenUntil>now||e.territory&&e.territory.state!=='engaged'&&!e.challengeId||now<(e.mirrorReadyAt??0)||shot.mode!=='projectile'||shot.reflectedByMirror)return false;
 const dx=s.player.x-e.x,dz=s.player.z-e.z,d=Math.hypot(dx,dz)||1,speed=shot.speed??7,key=shot.w?.key||'seed';
 e.mirrorReadyAt=now+MIRROR_COOLDOWN;e.specialPose={kind:'mirrorling',started:now,until:now+.9};
 e.attackPose={key,slot:0,x:e.x,y:e.y??0,z:e.z,dx:dx/d,dz:dz/d,started:now,at:now};
 // Reflected shots keep the original weapon, speed, damage and presentation.
 // Only ownership and direction change.
 s.hostileShots.push({id:++s.entityId,x:e.x,y:(e.y??0)+1,z:e.z,dx:dx/d,dz:dz/d,dy:((s.player.y??0)-(e.y??0))/d,speed,life:Math.max(.2,(shot.w?.range??16)/speed),travel:0,key,mode:shot.mode,w:shot.w,kind:e.kind,owner:e.id,damage:shot.w?.damage??e.damage??1,missionScaled:!!e.missionRoomStrength,reflectedByMirror:true});
 s.events.push({type:'enemy-reflect',key,x:e.x,y:e.y??0,z:e.z,tx:s.player.x,ty:s.player.y??0,tz:s.player.z});
 return true;
}

export function specialPoseAmount(e,time){
 const p=e.specialPose;if(!p||e.frozenUntil>time||time<p.started||time>p.until)return 0;
 const t=(time-p.started)/(p.until-p.started||1);
 return Math.sin(Math.PI*Math.max(0,Math.min(1,t)));
}

export function summonAssemblyProgress(e,time){
 const build=e.summonAssembly;if(!build)return 1;
 return Math.max(0,Math.min(1,(time-build.started)/(build.until-build.started||1)));
}

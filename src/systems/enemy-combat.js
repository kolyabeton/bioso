import {combatTime} from './mutations.js';
import {visibleBetween,spatialDistance} from '../elevation.js';
import {SURVIVAL_PRESSURE} from './balance.js';

// Enemy tuning is independent of player weapon DPS and item tier multipliers.
export const ENEMY_WEAPONS=Object.freeze({
 claws:{mode:'sector',range:1.4,angle:1.2,warning:.8,recovery:1.2},
 fangs:{mode:'sector',range:1.3,angle:1,warning:.85,recovery:1.3},
 drill:{mode:'sector',range:1.6,angle:.65,warning:.8,recovery:1.1},
 whip:{mode:'sector',range:2.5,angle:2.5,warning:1,recovery:1.6},
 hammer:{mode:'area',range:2.1,warning:1.3,recovery:2},
 seed:{mode:'shot',range:13,warning:.8,recovery:3.5,speed:5},
 needle:{mode:'shot',range:16,warning:1.1,recovery:4,speed:7},
 acid:{mode:'acid',range:12,radius:2.2,warning:1.3,recovery:4},
});
export function cancelEnemyAttack(e,now){if(!e.enemyAttack)return;e.enemyAttack.warning=null;e.enemyAttack.readyAt=Math.max(e.enemyAttack.readyAt,now+1);}
export function enemyAttackRange(e){const keys=e.assembly.arms.filter(Boolean);const w=ENEMY_WEAPONS[keys[e.enemyAttack.index%keys.length].key];return ['shot','acid'].includes(w.mode)?Math.min(9,w.range):e.radius+w.range*.65;}
export function warningHits(w,target){
 const dx=target.x-w.x,dz=target.z-w.z,d=Math.hypot(dx,dz);
 if(Math.abs((target.y??0)-(w.y??0))>1.5)return false;
 if(w.mode==='acid'||w.mode==='area')return d<=w.radius+.35;
 return d<=w.radius+.35&&(d<.01||(dx*w.dx+dz*w.dz)/d>=Math.cos(w.angle/2));
}
/** Locks the aim and feet during warning; one weapon at a time; body contact is handled by the simulation. */
export function tickModularAttack(s,e,target,hit){
 const now=combatTime(s),a=e.enemyAttack;if(!a||e.hp<=0)return false;
 if(e.frozenUntil>now||e.territory&&e.territory.state!=='engaged'&&!e.challengeId){cancelEnemyAttack(e,now);return false;}
 if(e.volatile){cancelEnemyAttack(e,now);return false;}
 if(a.warning){
  const w=a.warning;if(now<w.at)return true;
  a.warning=null;a.readyAt=now+w.recovery*(s.mode==='survival'?SURVIVAL_PRESSURE.recovery:1);a.index++;e.attackPose={...w,at:now};
  if(w.mode==='shot')s.hostileShots.push({x:w.x,y:w.y+1,z:w.z,dx:w.dx,dz:w.dz,dy:w.dy,speed:w.speed,life:w.range/w.speed,key:w.key,owner:e.id});
  else if(warningHits(w,target)&&visibleBetween(s,e,target))hit();
  s.events.push({type:'enemy-strike',key:w.key,x:w.x,y:w.y,z:w.z,radius:w.radius,dx:w.dx,dz:w.dz,mode:w.mode});
  return true;
 }
 if(now<a.readyAt||!visibleBetween(s,e,target))return false;
 const arms=e.assembly.arms.map((p,slot)=>({p,slot})).filter(a=>a.p),selected=arms[a.index%arms.length],key=selected.p.key,w=ENEMY_WEAPONS[key],distance=spatialDistance(e,target);
 if(distance>w.range+(['shot','acid'].includes(w.mode)?0:e.radius))return false;
 const dx=target.x-e.x,dz=target.z-e.z,d=Math.hypot(dx,dz)||1;
 a.warning={...w,key,slot:selected.slot,x:w.mode==='acid'?target.x:e.x,y:w.mode==='acid'?(target.y??0):(e.y??0),z:w.mode==='acid'?target.z:e.z,dx:dx/d,dz:dz/d,dy:((target.y??0)-(e.y??0))/d,radius:w.radius??(w.range+e.radius),started:now,at:now+w.warning};
 // Boss projectiles fire immediately; melee and acid retain their dodge warnings.
 if(w.mode==='shot'&&(e.kind==='boss'||e.kind==='final')){a.warning.at=now;return tickModularAttack(s,e,target,hit);}
 return true;
}

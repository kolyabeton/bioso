import {organEffect} from '../body-traits.js';
import {combatTime,isaacState,hasOrgan,activeMutation,inMire} from '.././mutations.js';
import {weaponStats} from '../../assembly.js';
import {modifiers} from '.././abilities.js';
import {lightning} from '.././effects.js';
import {visibleBetween,spatialDistance,surfaceReach} from '../../elevation.js';
export const ISAAC_LIMITS={larvae:120,slime:80};
export function prepareIsaacAttack(s,p,w,repeat=false){
 const a=isaacState(s);if(!repeat)a.attacks[p.id]=(a.attacks[p.id]||0)+1;
 return {...w,isaac:{organEffect:organEffect(s),returning:hasOrgan(s,'returnNerve')&&['seed','needle'].includes(p.key),slime:hasOrgan(s,'slime'),parasite:!repeat&&hasOrgan(s,'parasite')&&a.attacks[p.id]%3===0}};
}
export function isaacHit(s,e,damage,w){if(!w.isaac)return;
 if(w.isaac.slime)e.slimeUntil=combatTime(s)+3*(w.isaac.organEffect??1);
 if(w.isaac.parasite)e.clutch={until:combatTime(s)+6,damage:damage*.4*(w.isaac.organEffect??1)};
}
function larvae(s,e,count,damage){const a=isaacState(s);for(let i=0;i<count&&a.larvae.length<ISAAC_LIMITS.larvae;i++)a.larvae.push({id:++s.entityId,x:e.x+Math.cos(i*2.4)*.3,y:e.y??0,z:e.z+Math.sin(i*2.4)*.3,life:5,prepare:.35,damage});}
export function isaacDeath(s,e,source){const a=isaacState(s),secondary=['larva','conductor','heart'].includes(source);
 if(e.slimeUntil>combatTime(s)&&a.slimePools.length<ISAAC_LIMITS.slime)a.slimePools.push({id:++s.entityId,x:e.x,y:e.y??0,z:e.z,life:3,radius:2});
 if(!secondary&&e.clutch?.until>combatTime(s))larvae(s,e,2,e.clutch.damage);
 if(!secondary&&activeMutation(s,'hive')&&spatialDistance(e,s.player)<=8){a.hiveKills++;if(a.hiveKills%5===0)larvae(s,e,3,Math.max(8,...s.arms.filter(Boolean).map(p=>weaponStats(s,p).damage*.4)));}
 if(['boss','final'].includes(e.kind))for(const p of s.arms.filter(Boolean))p.bound=false;
}
export function conductorAttack(s,w,damage){const a=isaacState(s);if(!activeMutation(s,'conductor'))return;a.conductorAttacks++;
 if(a.conductorAttacks%5===0&&combatTime(s)>=a.conductorAt){a.conductorAt=combatTime(s)+.5;lightning(s,w,(e,d)=>damage(e,d,'conductor'),3);}
}
export function slimePace(s,e){const slimed=e.slimeUntil>combatTime(s)||(s.isaac?.slimePools||[]).some(p=>p.life>0&&surfaceReach(s,p,e)&&spatialDistance(p,e)<=p.radius*(activeMutation(s,'mire')?1.5:1));return slimed?(['boss','final'].includes(e.kind)?.9:.75):1;}
export function tickIsaacCombat(s,dt,damage){const a=isaacState(s),b=modifiers(s);
 for(const p of a.slimePools)p.life-=dt;a.slimePools=a.slimePools.filter(p=>p.life>0);
 for(const l of [...a.larvae]){l.life-=dt;l.prepare-=dt*(1+(b.summonRate||0));if(l.prepare>0)continue;
  const target=s.enemies.filter(e=>e.hp>0&&e.kind!=='objective'&&visibleBetween(s,l,e)).sort((x,y)=>spatialDistance(l,x)-spatialDistance(l,y))[0];if(!target)continue;
  const d=spatialDistance(l,target),travel=10*dt;if(d<=travel+(target.radius||.6)){damage(target,l.damage*(1+(b.summonDamage||0)),'larva');l.life=0;}else{l.x+=(target.x-l.x)/d*travel;l.z+=(target.z-l.z)/d*travel;l.y+=((target.y??0)-l.y)/d*travel;}
 }a.larvae=a.larvae.filter(l=>l.life>0);
 if(a.pulses){a.pulses=0;const power=3*organEffect(s)*Math.max(0,...s.arms.filter(Boolean).map(p=>weaponStats(s,p).damage));for(const e of s.enemies)if(e.hp>0&&e.kind!=='objective'&&visibleBetween(s,s.player,e)&&spatialDistance(s.player,e)<=5)damage(e,power,'heart');s.events.push({type:'heart-pulse',x:s.player.x,y:s.player.y??0,z:s.player.z});}
}

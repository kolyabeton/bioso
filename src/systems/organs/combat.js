import {organEffect} from '../body-traits.js';
import {combatTime,isaacState,activeMutation,inMire} from '.././mutations.js';
import {weaponStats,stackedReturnNerveDamage,parasiteLarvaDamage,slimeSlowdown} from '../../assembly.js';
import {modifiers} from '.././abilities.js';
import {lightning} from '.././effects.js';
import {visibleBetween,spatialDistance,surfaceReach} from '../../elevation.js';
import {summonTuning} from '../symbionts.js';
export const ISAAC_LIMITS={larvae:120,slime:80};
export function prepareIsaacAttack(s,p,w,repeat=false){
 const a=isaacState(s);if(!repeat)a.attacks[p.id]=(a.attacks[p.id]||0)+1;
 const returnDamage=stackedReturnNerveDamage(s),slimes=s.organs.filter(q=>q?.key==='slime'),slime=slimes.length?{slow:slimes.reduce((sum,q)=>sum+slimeSlowdown(q),0)}:0;
 return {...w,isaac:{organEffect:organEffect(s),returning:returnDamage>0&&['seed','needle'].includes(p.key),returnDamage,slime}};
}
export function isaacHit(s,e,damage,w){if(!w.isaac)return;
 if(w.isaac.slime){const active=e.slimeUntil>combatTime(s),count=typeof w.isaac.slime==='number'?w.isaac.slime:1,slow=typeof w.isaac.slime==='object'?(w.isaac.slime.slow??.1):.1*count;e.slimeSlow=Math.max(active?(e.slimeSlow??.1*(e.slimePower||1)):0,slow);e.slimeUntil=combatTime(s)+3*(w.isaac.organEffect??1);}
}
function larvae(s,e,count,damage,offset=0){const a=isaacState(s);for(let i=0;i<count&&a.larvae.length<ISAAC_LIMITS.larvae;i++)a.larvae.push({id:++s.entityId,x:e.x+Math.cos((i+offset)*2.4)*.3,y:e.y??0,z:e.z+Math.sin((i+offset)*2.4)*.3,life:5,prepare:.35,damage});}
export function isaacDeath(s,e,source){const a=isaacState(s);
 if(e.slimeUntil>combatTime(s)&&a.slimePools.length<ISAAC_LIMITS.slime)a.slimePools.push({id:++s.entityId,x:e.x,y:e.y??0,z:e.z,life:3,radius:2,slow:e.slimeSlow??.1*(e.slimePower||1)});
 delete e.clutch; // Old infections no longer produce a death-triggered brood.
 if(['boss','final'].includes(e.kind))for(const p of s.arms.filter(Boolean))if(!p.permanentBound)p.bound=false;
}
export function conductorAttack(s,w,damage){const a=isaacState(s);if(!activeMutation(s,'conductor'))return;a.conductorAttacks++;
 if(a.conductorAttacks%5===0&&combatTime(s)>=a.conductorAt){a.conductorAt=combatTime(s)+.5;lightning(s,w,(e,d)=>damage(e,d,'conductor'),3);}
}
export function slimePace(s,e){const direct=e.slimeUntil>combatTime(s)?e.slimeSlow??.1*(e.slimePower||1):0,pools=(s.isaac?.slimePools||[]).filter(p=>p.life>0&&surfaceReach(s,p,e)&&spatialDistance(p,e)<=p.radius*(activeMutation(s,'mire')?1.5:1)),slow=Math.max(direct,0,...pools.map(p=>p.slow??.1*(p.power||1)));return slow?Math.max(.1,1-slow):1;}
export function tickIsaacCombat(s,dt,damage){const a=isaacState(s),b=modifiers(s),tuning=summonTuning(s,b),dungeon=s.encounters?.active?.dungeon?s.encounters.active.id:null;
 // Each installed womb has its own timer. Attack rate advances production,
 // not enemy deaths or hero weapon counters. Removing it drops its timer.
 a.broodTimers??={};const wombs=s.organs.filter(p=>p?.key==='parasite');
 const producers=wombs.map(p=>({id:String(p.id),count:2,damage:parasiteLarvaDamage(s,p)}));
 if(activeMutation(s,'hive'))producers.push({id:'hive',count:3,damage:Math.max(8,...s.arms.filter(Boolean).map(p=>weaponStats(s,p).damage*.4))});
 const ids=new Set(producers.map(p=>p.id));
 for(const id of Object.keys(a.broodTimers))if(!ids.has(id))delete a.broodTimers[id];
 if(dt>0)for(const [index,p] of producers.entries()){
  let remaining=(a.broodTimers[p.id]??2)-dt*tuning.rate;
  while(remaining<=1e-8){
   larvae(s,s.player,p.count,p.damage,index*2);remaining+=2;
   if(a.larvae.length>=ISAAC_LIMITS.larvae){remaining=2;break;}
  }
  a.broodTimers[p.id]=remaining;
 }
 for(const p of a.slimePools)p.life-=dt;a.slimePools=a.slimePools.filter(p=>p.life>0);
 for(const l of [...a.larvae]){l.life-=dt;l.prepare-=dt*tuning.rate;if(l.prepare>0)continue;
  const target=s.enemies.filter(e=>e.hp>0&&e.kind!=='objective'&&(!dungeon||e.challengeId===dungeon)&&visibleBetween(s,l,e)).sort((x,y)=>spatialDistance(l,x)-spatialDistance(l,y))[0];if(!target)continue;
  const d=spatialDistance(l,target),travel=10*tuning.speed*dt;if(d<=travel+(target.radius||.6)){damage(target,l.damage*tuning.damage*(['boss','final','elite'].includes(target.kind)?tuning.bossDamage:1),'larva');l.life=0;}else{l.x+=(target.x-l.x)/d*travel;l.z+=(target.z-l.z)/d*travel;l.y+=((target.y??0)-l.y)/d*travel;}
 }a.larvae=a.larvae.filter(l=>l.life>0);
 if(a.pulses){const pulses=a.pulses,multiplier=a.pulseDamage>0?a.pulseDamage:2*pulses;a.pulses=0;a.pulseDamage=0;const power=multiplier*organEffect(s)*Math.max(0,...s.arms.filter(Boolean).map(p=>weaponStats(s,p).damage));for(const e of s.enemies)if(e.hp>0&&e.kind!=='objective'&&visibleBetween(s,s.player,e)&&spatialDistance(s.player,e)<=5)damage(e,power,'heart');s.events.push({type:'heart-pulse',count:pulses,x:s.player.x,y:s.player.y??0,z:s.player.z});}
}

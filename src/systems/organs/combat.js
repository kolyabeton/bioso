import {organEffect} from '../body-traits.js';
import {combatTime,isaacState,activeMutation,inMire} from '.././mutations.js';
import {weaponStats,stackedReturnNerveDamage,parasiteLarvaDamage,slimeSlowdown,coolerDamageFraction} from '../../assembly.js';
import {modifiers} from '.././abilities.js';
import {lightning} from '.././effects.js';
import {applyColdStack} from '../effects.js';
import {visibleBetween,spatialDistance,surfaceReach} from '../../elevation.js';
import {summonTuning} from '../symbionts.js';
import {enemyInvulnerable,enemyTargetable} from '../enemy-locomotion.js';
import {isCombatHand,itemCompatibleHandKeys} from '../hand-compatibility.js';
export const ISAAC_LIMITS={larvae:120,slime:80};
export const SLIME_SLOW_CAP=.4;
export function prepareIsaacAttack(s,p,w,repeat=false){
 const a=isaacState(s);if(!repeat)a.attacks[p.id]=(a.attacks[p.id]||0)+1;
 const returnDamage=stackedReturnNerveDamage(s),slimes=s.organs.filter(q=>q?.key==='slime'),slime=slimes.length?{slow:Math.min(SLIME_SLOW_CAP,slimes.length*slimeSlowdown()*organEffect(s)),fraction:slimes.reduce((sum,p)=>sum+coolerDamageFraction(p),0)*organEffect(s)}:0;
 return {...w,isaac:{organEffect:organEffect(s),returning:returnDamage>0&&itemCompatibleHandKeys('returnNerve').includes(p.key),returnDamage,slime}};
}
export function isaacHit(s,e,damage,w){if(!w.isaac||enemyInvulnerable(e))return false;
 if(w.isaac.slime){const now=combatTime(s),slow=typeof w.isaac.slime==='object'?(w.isaac.slime.slow??.1):.1;
  e.slimeSlow=Math.min(SLIME_SLOW_CAP,slow);e.slimeUntil=now+5+(modifiers(s).chillDuration||0);
  const fraction=typeof w.isaac.slime==='object'?(w.isaac.slime.fraction??.1):.1,amount=damage*fraction;
  (e.coolerDots??=[]).push({dps:amount/5,blast:amount,until:now+5+(modifiers(s).burnDuration||0)});if(e.coolerDots.length>80)e.coolerDots.shift();
  return applyColdStack(s,e);
 }
 return false;
}
export function tickCoolerDamage(s,dt,damage){
 const now=combatTime(s),before=now-dt;
 for(const e of s.enemies)if(e.hp>0&&e.coolerDots?.length){let amount=0;
  const contributing=e.coolerDots.filter(dot=>dot.until>before);
  for(const dot of contributing)amount+=dot.dps*Math.max(0,Math.min(dt,dot.until-before));
  e.coolerBlastThisTick=Math.max(0,...contributing.map(dot=>dot.blast||0));
  if(amount>0)damage(e,amount,'cooler-dot');
  delete e.coolerBlastThisTick;
  e.coolerDots=e.coolerDots.filter(dot=>dot.until>now);
 }
}
function larvae(s,e,count,damage,offset=0){const a=isaacState(s);for(let i=0;i<count&&a.larvae.length<ISAAC_LIMITS.larvae;i++)a.larvae.push({id:++s.entityId,x:e.x+Math.cos((i+offset)*2.4)*.3,y:e.y??0,z:e.z+Math.sin((i+offset)*2.4)*.3,life:5,prepare:.35,damage});}
export function isaacDeath(s,e,source,damage){const a=isaacState(s);
 const blast=Math.max(e.coolerBlastThisTick||0,...(e.coolerDots||[]).filter(dot=>dot.until>combatTime(s)).map(dot=>dot.blast||0));
 if(blast>0&&!e.coolerExploded){e.coolerExploded=true;const radius=2.5;
  s.events.push({type:'blast',key:'cooler',color:0x83ddff,x:e.x,y:e.y??0,z:e.z,radius});
  for(const target of s.enemySpatial?.queryCircle(e.x,e.z,radius+2)??s.enemies)if(target!==e&&enemyTargetable(target)&&spatialDistance(e,target)<=radius+(target.radius||0)&&visibleBetween(s,e,target))damage?.(target,blast,'cooler-blast');
 }
 delete e.clutch; // Old infections no longer produce a death-triggered brood.
 if(['boss','final'].includes(e.kind))for(const p of s.arms.filter(Boolean))if(!p.permanentBound)p.bound=false;
}
export function conductorAttack(s,w,damage){const a=isaacState(s);if(!activeMutation(s,'conductor'))return;a.conductorAttacks++;
 if(a.conductorAttacks%5===0&&combatTime(s)>=a.conductorAt){a.conductorAt=combatTime(s)+.5;lightning(s,w,(e,d)=>damage(e,d,'conductor'),3);}
}
export function slimePace(s,e){const direct=Math.max(e.slimeUntil>combatTime(s)?e.slimeSlow??.1*(e.slimePower||1):0,e.acidSlowUntil>combatTime(s)?e.acidSlow??.3:0,e.shieldAuraUntil>combatTime(s)?e.shieldAuraSlow??.1:0),spread=activeMutation(s,'mire')?1.5:1;
 const inRange=p=>!e.flying&&p.life>0&&surfaceReach(s,p,e)&&spatialDistance(p,e)<=(p.radius??2)*spread;
 const slimes=(s.isaac?.slimePools||[]).filter(inRange).map(p=>p.slow??.1*(p.power||1));
 const acid=(s.puddles||[]).filter(p=>p.slow>0&&inRange(p)).map(p=>p.slow);
 const slow=Math.max(direct,0,...slimes,...acid),boss=['boss','final'].includes(e.kind);
 return slow?Math.max(.1,1-slow*(boss ? .5 : 1)):1;}
export function tickIsaacCombat(s,dt,damage){const a=isaacState(s),b=modifiers(s),tuning=summonTuning(s,b),dungeon=s.encounters?.active?.dungeon?s.encounters.active.id:null;
 // Each installed womb has its own timer. Attack rate advances production,
 // not enemy deaths or hero weapon counters. Production pauses until a visible,
 // combat-eligible enemy enters the shared swarm search radius.
 a.broodTimers??={};const wombs=s.organs.filter(p=>p?.key==='parasite');
 const producers=wombs.map(p=>({id:String(p.id),count:2,damage:parasiteLarvaDamage(s,p)}));
 if(activeMutation(s,'hive'))producers.push({id:'hive',count:3,damage:Math.max(8,...s.arms.filter(Boolean).map(p=>weaponStats(s,p,undefined,{pollinators:false}).damage*.4))+tuning.pollinatorDamage});
 const ids=new Set(producers.map(p=>p.id));
 for(const id of Object.keys(a.broodTimers))if(!ids.has(id))delete a.broodTimers[id];
 const nearbyEnemy=producers.length>0&&(s.enemySpatial?.queryCircle(s.player.x,s.player.z,tuning.search)??s.enemies).some(e=>enemyTargetable(e)&&!e.dungeonDormant&&e.kind!=='objective'&&(!dungeon||e.challengeId===dungeon)&&spatialDistance(s.player,e)<=tuning.search&&visibleBetween(s,s.player,e));
 if(dt>0&&nearbyEnemy)for(const [index,p] of producers.entries()){
  let remaining=(a.broodTimers[p.id]??2)-dt*tuning.rate;
  while(remaining<=1e-8){
   larvae(s,s.player,p.count,p.damage,index*2);remaining+=2;
   if(a.larvae.length>=ISAAC_LIMITS.larvae){remaining=2;break;}
  }
  a.broodTimers[p.id]=remaining;
 }
 for(const p of a.slimePools)p.life-=dt;a.slimePools=a.slimePools.filter(p=>p.life>0);
 for(const l of [...a.larvae]){l.life-=dt;l.prepare-=dt*tuning.rate;if(l.prepare>0)continue;
  const target=s.enemies.filter(e=>enemyTargetable(e)&&e.kind!=='objective'&&(!dungeon||e.challengeId===dungeon)&&visibleBetween(s,l,e)).sort((x,y)=>spatialDistance(l,x)-spatialDistance(l,y))[0];if(!target)continue;
  const d=spatialDistance(l,target),travel=10*tuning.speed*dt;if(d<=travel+(target.radius||.6)){damage(target,l.damage*tuning.damage*(['boss','final','elite'].includes(target.kind)?tuning.bossDamage:1),'larva');l.life=0;}else{l.x+=(target.x-l.x)/d*travel;l.z+=(target.z-l.z)/d*travel;l.y+=((target.y??0)-l.y)/d*travel;}
 }a.larvae=a.larvae.filter(l=>l.life>0);
 if(a.pulses){const pulses=a.pulses,multiplier=a.pulseDamage>0?a.pulseDamage:2*pulses;a.pulses=0;a.pulseDamage=0;const power=multiplier*organEffect(s)*Math.max(0,...s.arms.filter(part=>part&&isCombatHand(part)).map(part=>weaponStats(s,part).damage));for(const e of s.enemies)if(enemyTargetable(e)&&e.kind!=='objective'&&visibleBetween(s,s.player,e)&&spatialDistance(s.player,e)<=5)damage(e,power,'heart');s.events.push({type:'heart-pulse',count:pulses,x:s.player.x,y:s.player.y??0,z:s.player.z});}
}

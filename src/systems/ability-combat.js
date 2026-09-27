import {modifiers} from './abilities.js';
import {combatTime} from './mutations.js';
import {soulProc} from './soul-procs.js';
import {spatialDistance,visibleBetween} from '../elevation.js';
import {enemyTargetable} from './enemy-locomotion.js';
import {isMelee,isRangedHand,isFlyingProjectileHand,isRicochetProjectileHand} from './hand-compatibility.js';

const distance=spatialDistance;
const primary=w=>!w?.secondary&&!w?.repeat;

export function prepareAbilityAttack(s,p,w,target,repeat=false){
 const b=modifiers(s),a=s.abilities,now=combatTime(s),out={...w};
 if(repeat||!primary(out))return out;
 if(out.magazine&&p.ammo>=3){
  if(b.ammoLoadedDamage)out.damage*=1+b.ammoLoadedDamage;
  if(b.ammoRefundChance)out.ammoRefundChance=Math.min(1,b.ammoRefundChance);
  if(b.tripleChamber){out.ammoCost=2;out.damage*=1.5;}
 }
 if(b.focusRate&&target){
  const previous=a.focus[p.id],same=previous?.target===target.id&&now-previous.at<2,stacks=same?Math.min(5,previous.stacks+1):1;
  a.focus[p.id]={target:target.id,stacks,at:now};out.interval/=1+stacks*(b.focusRatePerStack||.05);
  soulProc(s,'focus',s.player,{tx:target.x,ty:target.y??0,tz:target.z,source:p.id,level:stacks});
 }
 if(b.ballisticGrowth&&isRangedHand(out)&&target&&out.range>0){
  const maximum=b.ballisticMax||.3,rangeProgress=distance(s.player,target)/out.range;
  out.ballisticBonus=Math.min(1,Math.max(0,(rangeProgress-.5)*2))*maximum;out.damage*=1+out.ballisticBonus;
 }
 if(b.counterShell&&isMelee(out)&&a.retaliationUntil>now){
  a.retaliationUntil=0;out.damage*=1+(b.counterShellDamage||1);out.counterShell=true;soulProc(s,'countershell',s.player,{tx:target?.x,ty:target?.y??0,tz:target?.z});
  s.events.push({type:'ability-impact',kind:'countershell',x:s.player.x,y:s.player.y??0,z:s.player.z});
 }
 if(b.neuralWeb&&isFlyingProjectileHand(out))out.abilityVolley={neuralWebUsed:false};
 return out;
}

export function abilityDamageMultiplier(s,e,w){const b=modifiers(s);return primary(w)&&b.rupture&&e.ruptureUntil>combatTime(s)?1+(b.ruptureDamage||.2):1;}

/** One critical tempo refund per original attack, shared by every projectile in its volley. */
export function applyCriticalTempo(s,w,critical){
 const b=modifiers(s);if(!critical||!primary(w)||!b.criticalTempo||w.criticalTempoUsed)return false;
 const arm=s.arms?.find(p=>p?.id===w.partId);if(!arm)return false;
 w.criticalTempoUsed=true;arm.cooldown=Math.max(0,(arm.cooldown||0)*(1-(b.criticalTempoReduction||.15)));
 soulProc(s,'impulse',s.player,{source:arm.id});return true;
}

export function markRupture(s,e,w,critical){
 if(!critical||!primary(w)||!modifiers(s).rupture||e.hp<=0)return false;
 e.ruptureUntil=combatTime(s)+3;soulProc(s,'rupture',e,{dx:w?.dx??0,dz:w?.dz??1});return true;
}

/** Reach of the neural arc, in metres. */
export const NEURAL_WEB_RANGE=12;
export function tryNeuralWeb(s,origin,w,hitDamage,applyDamage){
 const volley=w?.abilityVolley;if(!volley||volley.neuralWebUsed||!primary(w)||!modifiers(s).neuralWeb)return false;
 const pool=s.enemySpatial?.queryCircle(origin.x,origin.z,NEURAL_WEB_RANGE+2)??s.enemies;let target=null,nearest=Infinity;
 for(const candidate of pool){if(candidate===origin||!enemyTargetable(candidate))continue;const d=distance(origin,candidate);if(d<=NEURAL_WEB_RANGE&&d<nearest&&visibleBetween(s,origin,candidate)){target=candidate;nearest=d;}}
 if(!target)return false;volley.neuralWebUsed=true;
 soulProc(s,'neuralweb',origin,{tx:target.x,ty:target.y??0,tz:target.z});applyDamage(target,hitDamage*(modifiers(s).neuralWebDamage||.4),'neuralweb');return true;
}

export function ricochetProfile(s,w){
 const b=modifiers(s);if(!primary(w)||!isRicochetProjectileHand(w))return null;
 const nativeHops=Math.max(0,Math.floor(w.ricochetHops||0)),abilityHops=b.ricochet?1+(b.ricochetTargets||0):0,hops=nativeHops+abilityHops;
 if(!hops)return null;
 const nativeDamage=Math.max(0,w.ricochetDamage||0),abilityDamage=b.ricochet?(b.ricochetDamage ? .7+b.ricochetDamage : .5):0;
 return{hops,damage:Math.max(nativeDamage,abilityDamage),crit:b.ricochetCrit||0,hunter:!!b.ricochetHunter,range:w.ricochetRange||4};
}

export function ricochetFinisherMultiplier(s,e,w){
 if(w?.secondary!=='ricochet'||!e?.maxHp||e.hp/e.maxHp>.5)return 1;
 return 1+(modifiers(s).ricochetFinisher||0);
}

export function nextRicochetTarget(s,origin,visited,hunter=false,range=4){
 const pool=s.enemySpatial?.queryCircle(origin.x,origin.z,range+2)??s.enemies,candidates=[];
 for(const e of pool){if(!enemyTargetable(e)||visited.has(e.id))continue;const d=distance(origin,e);if(d<=range+(e.radius||0)&&visibleBetween(s,origin,e))candidates.push({e,d,health:e.maxHp>0?e.hp/e.maxHp:e.hp});}
 candidates.sort((a,b)=>hunter?a.health-b.health||a.d-b.d:a.d-b.d);return candidates[0]?.e??null;
}

export function resolveCounterShellHit(s,result){
 if(['ignored','dodged'].includes(result)||!modifiers(s).counterShell)return result;
 s.abilities.retaliationUntil=combatTime(s)+5;soulProc(s,'countershell-charge',s.player);return result;
}

export function tickGuardian(s){
 if(!modifiers(s).guardian)return false;
 const now=combatTime(s),g=s.abilities.guardian,angle=now*1.7;
 g.x=s.player.x+Math.cos(angle)*1.45;g.z=s.player.z+Math.sin(angle)*1.45;g.y=(s.player.y??0)+1.35;
 if(now<(g.readyAt||0)||!s.hostileShots?.length)return false;
 let shot=null,nearest=Infinity;for(const q of s.hostileShots){const d=distance(s.player,q);if(d<=6&&d<nearest){shot=q;nearest=d;}}
 if(!shot)return false;s.hostileShots=s.hostileShots.filter(q=>q!==shot);g.readyAt=now+Math.max(2,7-(modifiers(s).guardianRank||1));
 soulProc(s,'guardian',g,{tx:shot.x,ty:shot.y??0,tz:shot.z});return true;
}

export function tickCryoTrail(s){
 const a=s.abilities,b=modifiers(s),now=combatTime(s);a.cryoTrails=(a.cryoTrails||[]).filter(q=>q.until>now);
 if(b.cryoTrail&&a.moving>=2&&now>=(a.cryoAt||0)){
  const rank=b.cryoTrailRank||1,radius=1.25+rank*.25,duration=2.5+rank*.5,limit=3+rank;
  a.cryoAt=now+1;a.cryoTrails.push({id:`cryo-${now}`,x:s.player.x,y:s.player.y??0,z:s.player.z,radius,until:now+duration});
  if(a.cryoTrails.length>limit)a.cryoTrails.splice(0,a.cryoTrails.length-limit);soulProc(s,'cryotrail',s.player,{radius});
 }
 for(const patch of a.cryoTrails)for(const e of s.enemies)if(enemyTargetable(e)&&distance(patch,e)<=patch.radius+(e.radius||0))e.chillUntil=Math.max(e.chillUntil||0,now+.2);
}

export function symbiontAbilityHit(s,target,damage){
 const a=s.abilities;if(!modifiers(s).sporeBrood)return false;
 const cadence=Math.max(1,6-(modifiers(s).sporeBroodRank||1));a.sporeHits=(a.sporeHits||0)+1;if(a.sporeHits%cadence!==0||(a.spores||[]).length>=12)return false;
 const spore={id:`spore-${a.sporeHits}`,target:target.id,x:target.x,y:target.y??0,z:target.z,damage,at:combatTime(s)+2};
 a.spores.push(spore);soulProc(s,'sporeplant',target);return true;
}

export function tickSporeBrood(s,applyDamage,ignite){
 const a=s.abilities,now=combatTime(s),remaining=[];
 for(const spore of a.spores||[]){
  const host=s.enemies.find(e=>e.id===spore.target);if(host){spore.x=host.x;spore.y=host.y??0;spore.z=host.z;}
  if(host?.hp>0&&now<spore.at){remaining.push(spore);continue;}
  soulProc(s,'sporebrood',spore,{radius:2.5});s.events.push({type:'ability-impact',kind:'sporebrood',x:spore.x,y:spore.y,z:spore.z,radius:2.5});
  const pool=s.enemySpatial?.queryCircle(spore.x,spore.z,5)??s.enemies;
  for(const e of pool)if(enemyTargetable(e)&&distance(spore,e)<=2.5+(e.radius||0)&&visibleBetween(s,spore,e)){ignite(e,spore.damage);applyDamage(e,spore.damage,'sporebrood');}
 }
 a.spores=remaining;
}

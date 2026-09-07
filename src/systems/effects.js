import {tickSymbionts} from './symbionts.js';
import {soulProc} from './soul-procs.js';
import {openSecret} from './encounters.js';
import {combatTime} from './mutations.js';
import {spatialDistance,visibleBetween} from '../elevation.js';
import {modifiers} from './abilities.js';
const dist=spatialDistance;
const boss=e=>['boss','final'].includes(e.kind);
function burn(s,e,damage,b){soulProc(s,'burn',e);e.burn={dps:Math.max(e.burn?.dps||0,damage*.2*(1+(b.burnDamage||0))),until:combatTime(s)+3+(b.burnDuration||0)};}
export function onHit(s,e,damage,secondaryDamage,{elements=true,thermal=true}={}){
 const b=modifiers(s);if(elements&&b.burn&&s.rng()<.2)burn(s,e,damage,b);
 if(elements&&b.chill&&s.rng()<.2){soulProc(s,'cold',e);e.chillUntil=combatTime(s)+2+(b.chillDuration||0);e.chillHits=(e.chillHits||0)+1;if(b.freeze&&e.chillHits>=3&&combatTime(s)>=(e.freezeReady||0)){soulProc(s,'freeze',e);e.chillHits=0;e.frozenUntil=combatTime(s)+1;e.freezeReady=combatTime(s)+3;}}
 if(thermal&&b.thermal&&e.burn?.until>combatTime(s)&&e.frozenUntil>combatTime(s)&&combatTime(s)>=(e.thermalReady||0)){e.thermalReady=combatTime(s)+2;soulProc(s,'thermal',e,{radius:3});for(const q of s.enemies)if(q.hp>0&&visibleBetween(s,e,q)&&dist(e,q)<=3)secondaryDamage(q,damage);s.events.push({type:'blast',x:e.x,z:e.z});}
}
export function onDeath(s,e){if(!modifiers(s).spread||!e.burn||e.burn.until<=combatTime(s))return;for(const q of s.enemies)if(q.hp>0&&visibleBetween(s,e,q)&&dist(e,q)<=3){soulProc(s,'spread',e,{tx:q.x,ty:q.y??0,tz:q.z});q.burn={dps:Math.max(q.burn?.dps||0,e.burn.dps),until:Math.max(q.burn?.until||0,e.burn.until)};}}
export function enemyPace(s,e){if(e.frozenUntil>combatTime(s))return boss(e)?.85:0;if(e.chillUntil>combatTime(s))return boss(e)?.85:.7;return 1;}
export function lightning(s,w,damage,count=null){
 const b=modifiers(s),available=s.enemies.filter(e=>e.hp>0);let origin=s.player;
 const secret=s.encounters?.nodes.find(n=>n.type==='nursery'&&n.state==='ready'&&visibleBetween(s,origin,n)&&dist(origin,n)<=w.range);if(secret){openSecret(s,secret);s.events.push({type:'arc',x:origin.x,z:origin.z,tx:secret.x,tz:secret.z});}
 for(let i=0;i<(count??(1+(b.chains||0)));i++){const e=available.filter(e=>visibleBetween(s,origin,e)&&dist(origin,e)<=(i?4:w.range)).sort((a,c)=>dist(origin,a)-dist(origin,c))[0];if(!e)break;available.splice(available.indexOf(e),1);const d=w.damage*.5*(1+(b.electricDamage||0));if(b.plasma)burn(s,e,d,b);damage(e,d);soulProc(s,b.plasma?'plasma':'electric',origin,{tx:e.x,ty:e.y??0,tz:e.z});s.events.push({type:'arc',soul:true,x:origin.x,y:origin.y??0,z:origin.z,tx:e.x,ty:e.y??0,tz:e.z});origin=e;}
}
/** All damage supplied here is secondary and cannot increment attack/proc counters. */
export function tickEffects(s,dt,damage){
 for(const e of s.enemies)if(e.hp>0&&e.burn){const duration=Math.max(0,Math.min(dt,e.burn.until-(combatTime(s)-dt)));if(duration)damage(e,e.burn.dps*duration,'burn');if(e.burn.until<=combatTime(s))e.burn=null;}
 const a=s.abilities,b=modifiers(s),count=b.summons||0;
 while(a.companions.length<count){soulProc(s,'summon',s.player);a.companions.push({id:`symbiont-${a.companions.length}`,cooldown:0,attacks:0,x:s.player.x,z:s.player.z});}
 tickSymbionts(s,dt,b,(c,target)=>{
  const hits=b.swarm&&c.attacks%3===0?2:1;
  if(hits===2)soulProc(s,'swarm',c,{tx:target.x,ty:target.y??0,tz:target.z});
  for(let j=0;j<hits&&target.hp>0;j++){
   const amount=8*(1+(b.summonDamage||0))*(1+a.learned.length*.08);
   if(b.summonElements)onHit(s,target,amount,damage,{thermal:false});
   damage(target,amount,'summon');
  }
  s.events.push({type:'hit',x:target.x,y:target.y??0,z:target.z});
 });
 for(const q of a.summonShots){q.delay-=dt;if(q.delay>0)continue;q.life-=dt;const e=s.enemies.find(e=>e.id===q.target&&e.hp>0);if(!e||!visibleBetween(s,q,e)){q.life=0;continue;}const d=dist(q,e),travel=18*dt;if(d<=travel+.4){if(b.summonElements)onHit(s,e,q.damage,damage,{thermal:false});damage(e,q.damage,'summon');q.life=0;s.events.push({type:'hit',x:e.x,z:e.z});}else{q.x+=(e.x-q.x)/d*travel;q.z+=(e.z-q.z)/d*travel;q.y=(q.y??0)+((e.y??0)-(q.y??0))/d*travel;}}
 a.summonShots=a.summonShots.filter(q=>q.life>0);
}

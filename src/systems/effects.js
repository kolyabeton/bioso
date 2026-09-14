import {syncSetState} from './sets/bonuses.js';
import {tickSymbionts,summonTuning,syncSwarmRate} from './symbionts.js';
import {droneStats} from './summon-equipment.js';
import {soulProc} from './soul-procs.js';
import {openSecret} from './encounters.js';
import {combatTime} from './mutations.js';
import {spatialDistance,visibleBetween} from '../elevation.js';
import {modifiers} from './abilities.js';
import {symbiontAbilityHit,tickSporeBrood} from './ability-combat.js';
const dist=spatialDistance;
const boss=e=>['boss','final'].includes(e.kind);
const nearby=(s,origin,radius)=>s.enemySpatial?.queryCircle(origin.x,origin.z,radius+2)??s.enemies;
function activeBurnStacks(e,now){
 if(!e.burn)return[];
 const stacks=Array.isArray(e.burn.stacks)?e.burn.stacks:[{dps:e.burn.dps||0,until:e.burn.until||0}];
 return stacks.filter(stack=>stack.until>now&&stack.dps>=0);
}
function setBurn(e,stacks){
 // A single ignition can arrive by several wildfire paths. Keep its identity:
 // copying it again at each death grows exponentially in dense crowds.
 stacks=[...new Set(stacks)];
 if(!stacks.length){e.burn=null;return;}
 e.burn={stacks,dps:stacks.reduce((sum,stack)=>sum+stack.dps,0),until:stacks.reduce((until,stack)=>Math.max(until,stack.until),0),count:stacks.length};
}
function burn(s,e,damage,b){
 const now=combatTime(s),stacks=activeBurnStacks(e,now);
 stacks.push({dps:damage*.2*(1+(b.burnDamage||0)),until:now+3+(b.burnDuration||0)});setBurn(e,stacks);
 soulProc(s,'burn',e,{stacks:stacks.length,strength:Math.min(2.4,.8+Math.log2(stacks.length+1)*.42)});
}
export function onHit(s,e,damage,secondaryDamage,{elements=true,thermal=true}={}){
 const b=modifiers(s);if(elements&&b.burn&&s.rng()<Math.min(1,b.burnChance||.15))burn(s,e,damage,b);
 if(elements&&b.chill&&s.rng()<Math.min(1,b.chillChance||.2)){soulProc(s,'cold',e);e.chillUntil=combatTime(s)+2+(b.chillDuration||0);e.chillHits=(e.chillHits||0)+1;if(b.freeze&&e.chillHits>=3&&combatTime(s)>=(e.freezeReady||0)){soulProc(s,'freeze',e);e.chillHits=0;e.frozenUntil=combatTime(s)+.75+(b.freezeDuration||.25);e.freezeReady=combatTime(s)+3;}}
 if(thermal&&b.thermal&&e.burn?.until>combatTime(s)&&e.frozenUntil>combatTime(s)&&combatTime(s)>=(e.thermalReady||0)){e.thermalReady=combatTime(s)+2;soulProc(s,'thermal',e,{radius:3});for(const q of nearby(s,e,3))if(q.hp>0&&dist(e,q)<=3&&visibleBetween(s,e,q))secondaryDamage(q,damage*(b.thermalDamage||1));s.events.push({type:'blast',x:e.x,z:e.z});}
}
export function onDeath(s,e){const b=modifiers(s),now=combatTime(s),radius=2.5+(b.spreadRadius||.5),source=activeBurnStacks(e,now);if(!b.spread||!source.length)return;for(const q of nearby(s,e,radius))if(q.hp>0&&dist(e,q)<=radius&&visibleBetween(s,e,q)){const stacks=[...activeBurnStacks(q,now),...source];setBurn(q,stacks);soulProc(s,'spread',e,{tx:q.x,ty:q.y??0,tz:q.z,stacks:source.length,strength:Math.min(2.4,.8+Math.log2(stacks.length+1)*.42)});}}
export function enemyPace(s,e){if(e.frozenUntil>combatTime(s))return boss(e)?.85:0;if(e.chillUntil>combatTime(s))return boss(e)?.85:.7;return 1;}
export function lightning(s,w,damage,count=null){
 const b=modifiers(s),available=(s.enemySpatial?.queryCircle(s.player.x,s.player.z,w.range+8)??s.enemies).filter(e=>e.hp>0);let origin=s.player;
 const melee=['sector','area','contact'].includes(w.mode);
 const secret=s.encounters?.nodes.find(n=>n.type==='nursery'&&n.state==='ready'&&visibleBetween(s,origin,n)&&dist(origin,n)<=w.range);if(secret){openSecret(s,secret);s.events.push({type:'arc',x:origin.x,z:origin.z,tx:secret.x,tz:secret.z});}
 for(let i=0;i<(count??(1+(b.chains||0)));i++){let e=null,nearest=Infinity;for(const candidate of available){const d=dist(origin,candidate),reach=i?4:w.range+(melee?(candidate.radius||0):0);if(d<nearest&&d<=reach&&visibleBetween(s,origin,candidate)){e=candidate;nearest=d;}}if(!e)break;available.splice(available.indexOf(e),1);const d=w.damage*(.4+(b.electricPower||.1)+(b.stormPower||0))*(1+(b.electricDamage||0));if(b.plasma)burn(s,e,d*(1+(b.plasmaBurnDamage||0)),b);damage(e,d);soulProc(s,b.plasma?'plasma':'electric',origin,{tx:e.x,ty:e.y??0,tz:e.z});s.events.push({type:'arc',soul:true,x:origin.x,y:origin.y??0,z:origin.z,tx:e.x,ty:e.y??0,tz:e.z});origin=e;}
}
/** All damage supplied here is secondary and cannot increment attack/proc counters. */
export function tickEffects(s,dt,damage){
 const now=combatTime(s),before=now-dt;
 for(const e of s.enemies)if(e.hp>0&&e.burn){const stacks=activeBurnStacks(e,before);let amount=0;for(const stack of stacks)amount+=stack.dps*Math.max(0,Math.min(dt,stack.until-before));if(amount)damage(e,amount,'burn');setBurn(e,stacks.filter(stack=>stack.until>now));}
 syncSetState(s);
 const a=s.abilities,b=modifiers(s),tuning=summonTuning(s,b);
 syncSwarmRate(s,tuning.rate);
 const sources=[...Array.from({length:tuning.baseCount},(_,i)=>({id:`symbiont-${i}`})),...(tuning.setCount?[{id:'set-broodmother'}]:[]),...tuning.drones.map(p=>({id:`drone-${p.id}`,sourcePartId:p.id}))];
 const sourceKeys=new Set(sources.map(source=>source.id)),ready=a.companionSummonReadyAt??={},existing=new Map(a.companions.map(c=>[c.sourceKey??c.id,c]));
 for(const key of Object.keys(ready))if(!sourceKeys.has(key)&&key!=='set-broodmother')delete ready[key];
 a.companions=sources.flatMap(source=>{
  if(existing.has(source.id))return[existing.get(source.id)];
  if((ready[source.id]??-Infinity)>now)return[];
  const replacement=source.id in ready;delete ready[source.id];soulProc(s,'summon',s.player);const c={...source,sourceKey:source.id,id:`${source.id}-${++s.entityId}`,cooldown:0,attacks:0,x:s.player.x,y:s.player.y??0,z:s.player.z};
  s.events.push({type:'summon-create',id:c.id,x:c.x,y:c.y,z:c.z,replacement});return[c];
 });
 tickSymbionts(s,dt,b,(c,target)=>{
  const hits=b.swarm&&c.attacks%3===0?1+(b.swarmHits||1):1;
  if(hits===2)soulProc(s,'swarm',c,{tx:target.x,ty:target.y??0,tz:target.z});
  for(let j=0;j<hits&&target.hp>0;j++){
   const source=tuning.drones.find(p=>p.id===c.sourcePartId);
   const amount=(source?droneStats(source).damage:6)*tuning.damage*(['boss','final','elite'].includes(target.kind)?tuning.bossDamage:1);
   if(b.summonElements)onHit(s,target,amount,damage,{thermal:false});
   damage(target,amount,'summon');symbiontAbilityHit(s,target,amount);
  }
  s.events.push({type:'hit',x:target.x,y:target.y??0,z:target.z});
 });
 for(const q of a.summonShots){q.delay-=dt;if(q.delay>0)continue;q.life-=dt;const e=s.enemies.find(e=>e.id===q.target&&e.hp>0);if(!e||!visibleBetween(s,q,e)){q.life=0;continue;}const d=dist(q,e),travel=18*dt;if(d<=travel+.4){if(b.summonElements)onHit(s,e,q.damage,damage,{thermal:false});damage(e,q.damage,'summon');q.life=0;s.events.push({type:'hit',x:e.x,z:e.z});}else{q.x+=(e.x-q.x)/d*travel;q.z+=(e.z-q.z)/d*travel;q.y=(q.y??0)+((e.y??0)-(q.y??0))/d*travel;}}
 a.summonShots=a.summonShots.filter(q=>q.life>0);
 tickSporeBrood(s,damage,(e,amount)=>burn(s,e,amount,b));
}

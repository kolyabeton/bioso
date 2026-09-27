import {syncSetState} from './sets/bonuses.js';
import {tickSymbionts,summonTuning,syncSwarmRate} from './symbionts.js';
import {droneStats} from './summon-equipment.js';
import {soulProc} from './soul-procs.js';
import {openSecret} from './encounters.js';
import {combatTime,activeMutation} from './mutations.js';
import {spatialDistance,visibleBetween,playerAttackRange,surfaceReach} from '../elevation.js';
import {modifiers} from './abilities.js';
import {symbiontAbilityHit,tickSporeBrood} from './ability-combat.js';
import {enemyInvulnerable,enemyTargetable} from './enemy-locomotion.js';
import {recordChassisFreeze} from './chassis-progress.js';
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
 if(enemyInvulnerable(e))return;
 const now=combatTime(s),stacks=activeBurnStacks(e,now);
 stacks.push({dps:damage*.2,until:now+3+(b.burnDuration||0)});setBurn(e,stacks);
 soulProc(s,'burn',e,{stacks:stacks.length,strength:Math.min(2.4,.8+Math.log2(stacks.length+1)*.42)});
}
export function applyColdStack(s,e){
 const b=modifiers(s);if(!b.chill||enemyInvulnerable(e))return false;
 soulProc(s,'cold',e);if(b.freeze&&combatTime(s)<(e.freezeReady||0))return true;e.chillHits=(e.chillHits||0)+1;
 if(b.freeze&&e.chillHits>=3&&combatTime(s)>=(e.freezeReady||0)&&combatTime(s)>=(e.regulatorFrozenUntil||0)){
  e.chillHits=0;e.freezeReady=combatTime(s)+3;
  if(boss(e))e.chillUntil=Math.max(e.chillUntil||0,combatTime(s)+.75+(b.freezeDuration||.25));
  else{soulProc(s,'freeze',e);e.frozenUntil=combatTime(s)+.75+(b.freezeDuration||.25);recordChassisFreeze(s,e);}
 }
 return true;
}
export function onHit(s,e,damage,secondaryDamage,{elements=true,thermal=true,coldStackAdded=false}={}){
 if(enemyInvulnerable(e))return;
 const b=modifiers(s);if(elements&&b.burn&&s.rng()<Math.min(1,b.burnChance||.15))burn(s,e,damage,b);
 if(elements&&b.chill&&s.rng()<Math.min(1,b.chillChance||.2)){e.chillUntil=combatTime(s)+2+(b.chillDuration||0);if(!coldStackAdded)applyColdStack(s,e);}
 if(thermal&&b.thermal&&e.burn?.until>combatTime(s)&&e.frozenUntil>combatTime(s)&&combatTime(s)>=(e.thermalReady||0)){e.thermalReady=combatTime(s)+2;soulProc(s,'thermal',e,{radius:3});for(const q of nearby(s,e,3))if(q.hp>0&&dist(e,q)<=3&&visibleBetween(s,e,q))secondaryDamage(q,damage*(b.thermalDamage||1));s.events.push({type:'blast',x:e.x,z:e.z});}
}
function activeFieldDots(s,e,now){
 if(e.flying)return[];
 const fields=[...(s.puddles||[]).map(p=>[p,'acid']),...(s.fireTrails||[]).map(p=>[p,'burn'])];
 const touching=fields.filter(([p,source])=>p.life>0&&dist(p,e)<=(p.radius||0)*(source==='acid'&&activeMutation(s,'mire')?1.5:1)+(source==='burn'?(e.radius||0):0)&&surfaceReach(s,p,e));
 const strongestFire=touching.filter(([,source])=>source==='burn').sort((a,b)=>b[0].dps-a[0].dps)[0];
 return touching.filter(([,source])=>source==='acid').concat(strongestFire?[strongestFire]:[]).map(([p,source])=>p.spreadDot??(p.spreadDot={source,dps:p.damage??p.dps,until:now+p.life}));
}
export function onDeath(s,e){
 const b=modifiers(s);if(!b.spread)return;
 const now=combatTime(s),radius=2.5+(b.spreadRadius||.5),burns=activeBurnStacks(e,now),coolers=(e.coolerDots||[]).filter(dot=>dot.until>now),dots=[...(e.spreadDots||[]).filter(dot=>dot.until>now),...activeFieldDots(s,e,now),...(e.shieldAuraDot?.until>now?[e.shieldAuraDot]:[])];
 if(!burns.length&&!coolers.length&&!dots.length)return;
 for(const q of nearby(s,e,radius))if(enemyTargetable(q)&&dist(e,q)<=radius&&visibleBetween(s,e,q)){
  if(burns.length)setBurn(q,[...activeBurnStacks(q,now),...burns]);
  if(coolers.length)q.coolerDots=[...new Set([...(q.coolerDots||[]),...coolers])].slice(-80);
  if(dots.length)q.spreadDots=[...new Set([...(q.spreadDots||[]),...dots])].slice(-80);
  soulProc(s,'spread',e,{tx:q.x,ty:q.y??0,tz:q.z,stacks:burns.length+coolers.length+dots.length,strength:Math.min(2.4,.8+Math.log2(burns.length+coolers.length+dots.length+1)*.42)});
 }
}
export function enemyPace(s,e){if(e.regulatorFrozenUntil>combatTime(s))return 0;if(e.frozenUntil>combatTime(s))return boss(e)?.85:0;if(e.chillUntil>combatTime(s))return boss(e)?.85:.7;return 1;}
export function lightning(s,w,damage,count=null){
 const b=modifiers(s),available=(s.enemySpatial?.queryCircle(s.player.x,s.player.z,playerAttackRange(s,w)+8)??s.enemies).filter(enemyTargetable);let origin=s.player;
 const melee=['sector','area','contact'].includes(w.mode);
 const secret=s.encounters?.nodes.find(n=>n.type==='nursery'&&n.state==='ready'&&visibleBetween(s,origin,n)&&dist(origin,n)<=playerAttackRange(s,w));if(secret){openSecret(s,secret);s.events.push({type:'arc',x:origin.x,z:origin.z,tx:secret.x,tz:secret.z});}
 for(let i=0;i<(count??(1+(b.chains||0)));i++){let e=null,nearest=Infinity;for(const candidate of available){const d=dist(origin,candidate),reach=i?4:playerAttackRange(s,w)+(melee?(candidate.radius||0):0);if(d<nearest&&d<=reach&&visibleBetween(s,origin,candidate)){e=candidate;nearest=d;}}if(!e)break;available.splice(available.indexOf(e),1);const d=w.damage*(.4+(b.electricPower||.1)+(b.stormPower||0))*(1+(b.electricDamage||0));if(b.plasma)burn(s,e,d*(1+(b.plasmaBurnDamage||0)),b);damage(e,d);soulProc(s,b.plasma?'plasma':'electric',origin,{tx:e.x,ty:e.y??0,tz:e.z});s.events.push({type:'arc',soul:true,x:origin.x,y:origin.y??0,z:origin.z,tx:e.x,ty:e.y??0,tz:e.z});origin=e;}
}
/** All damage supplied here is secondary and cannot increment attack/proc counters. */
export function tickEffects(s,dt,damage){
 const now=combatTime(s),before=now-dt;
 for(const e of s.enemies)if(e.hp>0&&e.burn){const stacks=activeBurnStacks(e,before);let amount=0;for(const stack of stacks)amount+=stack.dps*Math.max(0,Math.min(dt,stack.until-before));if(amount)damage(e,amount,'burn');setBurn(e,stacks.filter(stack=>stack.until>now));}
 for(const e of s.enemies)if(e.hp>0&&e.spreadDots?.length){const dots=e.spreadDots.filter(dot=>dot.until>before);for(const source of ['burn','acid','shield-aura']){let amount=0;for(const dot of dots)if(dot.source===source)amount+=dot.dps*Math.max(0,Math.min(dt,dot.until-before));if(amount>0)damage(e,amount,source);}e.spreadDots=dots.filter(dot=>dot.until>now);}
 syncSetState(s);
 const a=s.abilities,b=modifiers(s),tuning=summonTuning(s,b);
 const biteDamage=e=>tuning.biteDamage*tuning.damage*(['boss','final','elite'].includes(e.kind)?tuning.bossDamage:1);
 const chainBlast=(dead,amount)=>{if(!b.droneChainBlast||dead.droneChainExploded)return;dead.droneChainExploded=true;const radius=2.5;s.events.push({type:'ability-impact',kind:'detonation-chain',x:dead.x,y:dead.y??0,z:dead.z,radius});for(const q of nearby(s,dead,radius))if(q!==dead&&enemyTargetable(q)&&dist(dead,q)<=radius+(q.radius||0)&&visibleBetween(s,dead,q))damage(q,amount*(b.droneChainBlastDamage||.5),'drone-chain-blast');};
 const droneDamage=(e,amount,source)=>{const alive=e.hp>0;damage(e,amount,source);if(alive&&e.hp<=0&&source==='summon')chainBlast(e,biteDamage(e));};
 const droneBlast=(origin,radius,amount,source)=>{s.events.push({type:'ability-impact',kind:source==='drone-death-blast'?'detonation-death':'detonation-bite',x:origin.x,y:origin.y??0,z:origin.z,radius});for(const q of nearby(s,origin,radius))if(enemyTargetable(q)&&dist(origin,q)<=radius+(q.radius||0)&&visibleBetween(s,origin,q))droneDamage(q,amount,source);};
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
  s.events.push({type:'summon-attack',key:'symbiont-bite',source:c.sourceKey??c.id,sourcePartId:c.sourcePartId,x:c.x,y:c.y??0,z:c.z,tx:target.x,ty:target.y??0,tz:target.z});
  const hits=b.swarm&&c.attacks%3===0?1+(b.swarmHits||1):1;
  if(hits===2)soulProc(s,'swarm',c,{tx:target.x,ty:target.y??0,tz:target.z});
  const source=tuning.drones.find(p=>p.id===c.sourcePartId),drone=source?droneStats(source):null,dungeon=s.encounters?.active?.dungeon?s.encounters.active.id:null;
  const targets=drone?.attackRadius?nearby(s,c,drone.attackRadius).filter(e=>enemyTargetable(e)&&(!dungeon||e.challengeId===dungeon)&&dist(c,e)<=drone.attackRadius+(e.radius||0)&&visibleBetween(s,c,e)):[target];
  for(let j=0;j<hits;j++)for(const e of targets)if(enemyTargetable(e)){
   const amount=biteDamage(e);
   if(b.summonElements)onHit(s,e,amount,damage,{thermal:false});
   droneDamage(e,amount,'summon');symbiontAbilityHit(s,e,amount);
   if(b.droneBlast)droneBlast(e,1.5+.5*(b.droneBlastRadiusRank||0),amount*(b.droneBlastDamage||.3),'drone-bite-blast');
  }
  for(const e of targets)s.events.push({type:'hit',key:source?'drone':undefined,x:e.x,y:e.y??0,z:e.z});
 });
 for(const blast of a.droneBlasts??[])droneBlast(blast,blast.radius,blast.damage,'drone-death-blast');
 a.droneBlasts=[];
 for(const q of a.summonShots){q.delay-=dt;if(q.delay>0)continue;q.life-=dt;const e=s.enemies.find(e=>e.id===q.target&&enemyTargetable(e));if(!e||!visibleBetween(s,q,e)){q.life=0;continue;}const d=dist(q,e),travel=18*dt;if(d<=travel+.4){if(b.summonElements)onHit(s,e,q.damage,damage,{thermal:false});damage(e,q.damage,'summon');q.life=0;s.events.push({type:'hit',x:e.x,z:e.z});}else{q.x+=(e.x-q.x)/d*travel;q.z+=(e.z-q.z)/d*travel;q.y=(q.y??0)+((e.y??0)-(q.y??0))/d*travel;}}
 a.summonShots=a.summonShots.filter(q=>q.life>0);
 tickSporeBrood(s,damage,(e,amount)=>burn(s,e,amount,b));
}

import {stats,weaponStats,digestionMultiplier} from '../assembly.js';
import {bodyTraitState,chassisTraitBoost,effectiveBodyTraitDescription,BODY_DAMAGE_BONUS_CAP} from './body-traits.js';
import {modifiers,abilityLevel} from './abilities.js';
import {combatTime} from './mutations.js';
import {summonTuning} from './symbionts.js';
import {enemyTargetable} from './enemy-locomotion.js';
import {spatialDistance,visibleBetween} from '../elevation.js';
import {recordChassisFreeze} from './chassis-progress.js';
import {WAVE_RULES} from './balance.js';
import {reloadDuration} from './sets-loot.js';

const state=s=>s.supportChassis??={regulatorAt:null,towers:[],pulseUntil:0};
export const supportTargetable=(s,e)=>enemyTargetable(e)&&!e.dungeonDormant&&e.kind!=='objective'&&(!s.encounters?.active?.dungeon||e.challengeId===s.encounters.active.id);
export function chassisTuning(s,st=stats(s)){
 const trait=bodyTraitState(s),boost=1+chassisTraitBoost(s),radius=st.pickup+1,rank=abilityLevel(s,'cold.3'),towerLimit=2+Math.floor(Math.max(0,st.capacity-150)/75);
 const damageBoost=Math.min(1+BODY_DAMAGE_BONUS_CAP,boost);
 return{key:trait.key,active:trait.active,radius,armorReduction:(.5+.02*Math.max(0,st.pickup-7)+.1*digestionMultiplier(s))*boost,freezeDuration:(rank>=3?2:rank===2?1.5:1)*boost,reflectionScale:(.5+.1*st.armor)*damageBoost,towerLimit,towerHp:2+2*(towerLimit-2),boost,damageBoost};
}
export function chassisDescription(s,p=s.body){
 const context=p===s.body?s:{...s,body:p};
 return effectiveBodyTraitDescription(context,p,Object.hasOwn({demolition:1,regulator:1,sentinel:1,assembler:1},p.key)?chassisTuning(context):null);
}
export function demolitionReduction(s,e){
 if(s.body?.key!=='demolition')return 0;
 const t=chassisTuning(s);return t.active&&supportTargetable(s,e)&&spatialDistance(s.player,e)<=t.radius?t.armorReduction:0;
}
export function sentinelCircles(s){
 if(s.body?.key!=='sentinel'||!bodyTraitState(s).active)return[];
 const angle=combatTime(s)*Math.PI/2;
 return Array.from({length:3},(_,i)=>({x:s.player.x+Math.sin(angle+i*Math.PI*2/3)*3,y:(s.player.y??0)+1,z:s.player.z+Math.cos(angle+i*Math.PI*2/3)*3,radius:.5}));
}
const segmentProgress=(p,a,b)=>{const dx=b.x-a.x,dy=(b.y??1)-(a.y??1),dz=b.z-a.z;return Math.max(0,Math.min(1,((p.x-a.x)*dx+((p.y??1)-(a.y??1))*dy+(p.z-a.z)*dz)/(dx*dx+dy*dy+dz*dz||1)));};
export function segmentContact(p,a,b){const t=segmentProgress(p,a,b);return Math.hypot(p.x-a.x-(b.x-a.x)*t,(p.y??1)-(a.y??1)-((b.y??1)-(a.y??1))*t,p.z-a.z-(b.z-a.z)*t)<=p.radius;}
export function interceptSupportShot(s,q,old,next){
 if(s.body?.key!=='sentinel'&&!state(s).towers.length)return false;
 const candidates=[...sentinelCircles(s).map(p=>({p,reflect:true})),...state(s).towers.filter(p=>p.hp>0).map(p=>({p:{...p,y:(p.y??0)+1,radius:.65},tower:p}))].filter(c=>segmentContact(c.p,old,next)).sort((a,b)=>segmentProgress(a.p,old,next)-segmentProgress(b.p,old,next));
 const hit=candidates[0];if(!hit)return false;
 if(hit.tower){hit.tower.hp--;return true;}
 if(q.chassisReflected)return false;
 const progress=segmentProgress(hit.p,old,next),x=old.x+(next.x-old.x)*progress,y=(old.y??1)+((next.y??1)-(old.y??1))*progress,z=old.z+(next.z-old.z)*progress;
 const shooter=s.enemies.find(e=>e.id===q.owner&&supportTargetable(s,e)),dx=shooter?shooter.x-x:-q.dx,dz=shooter?shooter.z-z:-q.dz,d=Math.hypot(dx,dz)||1,st=stats(s),damage=Math.max(0,...s.arms.filter(p=>p&&!p.disabled).map(p=>weaponStats(s,p,st).damage))*chassisTuning(s,st).reflectionScale;
 s.shots.push({id:++s.entityId,source:'sentinel',mode:'projectile',x,y,z,dx:dx/d,dz:dz/d,dy:shooter?((shooter.y??0)+1-y)/d:-(q.dy||0),speed:q.speed??WAVE_RULES.projectileSpeed,life:8,travel:0,hit:new Set(),remaining:1,organReflection:true,chassisReflected:true,frozenUntil:q.frozenUntil??0,target:shooter?.id,w:{key:q.key==='seed'?'seed':'needle',mode:'projectile',damage,crit:0,critPower:1,range:56}});
 s.events.push({type:'chassis-reflect',x,y,z,tx:shooter?.x,ty:shooter?.y,tz:shooter?.z});return true;
}
export function towerTarget(s,e,fallback){
 let chosen=fallback,nearest=spatialDistance(e,fallback);
 for(const tower of state(s).towers)if(tower.hp>0&&spatialDistance(e,tower)<nearest&&visibleBetween(s,e,tower)){chosen=tower;nearest=spatialDistance(e,tower);}return chosen;
}
export const isTower=p=>!!p?.chassisTower;
export const hitTower=t=>{if(t.hp>0)t.hp--;};
export function damageTowersFromEvents(s,events){
 for(const event of events)if(event.type==='volatile-blast'||event.type==='enemy-strike'&&event.mode==='area')for(const tower of state(s).towers)if(tower.hp>0&&tower.id!==event.hitTarget&&Math.abs((tower.y??0)-(event.y??0))<=1.5&&Math.hypot(tower.x-event.x,tower.z-event.z)<=(event.radius??0)+.65&&visibleBetween(s,event,tower))hitTower(tower);
}
export function tickTowerAcid(s,dt){
 for(const tower of state(s).towers){let exposure=0;for(const pool of s.enemyAcidPools??[])if(pool.life>0&&Math.abs((pool.y??0)-(tower.y??0))<=1.5&&Math.hypot(pool.x-tower.x,pool.z-tower.z)<=pool.radius+.65&&visibleBetween(s,pool,tower))exposure=Math.max(exposure,Math.min(dt,pool.life));
  tower.acidExposure=exposure>0?(tower.acidExposure??0)+exposure:0;
  while(tower.hp>0&&tower.acidExposure>=1){tower.acidExposure--;hitTower(tower);}
 }
}
/** Pause preparation and expiry clocks, rather than canceling the pending attack. */
export function tickRegulatorHold(s,e,dt){
 const now=combatTime(s),overlap=Math.max(0,Math.min(dt,(e.regulatorFrozenUntil??0)-(now-dt)));if(!overlap)return false;
 const shift=(o,keys)=>{if(!o)return;for(const key of keys)if(Number.isFinite(o[key]))o[key]+=overlap;};
 shift(e.enemyAttack,['readyAt']);shift(e.enemyAttack?.warning,['at','started']);shift(e.bossCombat,['readyAt','exposedUntil','mirrorUntil']);shift(e.bossCombat?.dash,['until','at','started']);shift(e,['shootAt','specialReadyAt','mirrorReadyAt','locomotionReadyAt']);shift(e.windup,['at','started']);shift(e.specialAttack,['at','started']);shift(e.specialPose,['until','started']);shift(e.locomotionState,['startedAt']);shift(e.summonAssembly,['until']);
 return now<(e.regulatorFrozenUntil||0);
}
function towerPointAllowed(s,a,x,z){
 const y=s.world.heightAt?.(x,z)??s.player.y??0,heroRadius=(s.player.radius??.8)+.4;
 if(!Number.isFinite(y)||Math.hypot(x-s.player.x,z-s.player.z)<heroRadius||s.world.walkable&&!s.world.walkable(x,z,.4)||!visibleBetween(s,s.player,{x,y,z})||a.towers.some(q=>Math.hypot(q.x-x,q.z-z)<1.3))return null;
 return{x,y,z};
}
function spawnTower(s,t,now){
 const a=state(s);let point=null;
 for(let i=0;i<12&&!point;i++){
  const yaw=s.rng()*Math.PI*2,radius=Math.sqrt(1+s.rng()*8),x=s.player.x+Math.sin(yaw)*radius,z=s.player.z+Math.cos(yaw)*radius;
  point=towerPointAllowed(s,a,x,z);
 }
 for(let radius=1;radius<=3&&!point;radius+=.25)for(let i=0;i<24&&!point;i++){
  const yaw=i*Math.PI/12,x=s.player.x+Math.sin(yaw)*radius,z=s.player.z+Math.cos(yaw)*radius;
  point=towerPointAllowed(s,a,x,z);
 }
 if(!point)return false;
 const tower={id:'tower-'+(++s.entityId),chassisTower:true,...point,hp:t.towerHp,maxHp:t.towerHp,until:now+Math.max(40,10*(t.towerLimit+1)),cooldown:0,ammo:null,reloadRemaining:0,reloadDuration:0};
 if(a.towers.length>=t.towerLimit)a.towers.shift();a.towers.push(tower);s.events.push({type:'chassis-tower',...point});return true;
}
/** Primary attacks only; echoes never call this entry point. */
export function recordAssemblerAttack(s,part,st=stats(s)){
 if(part?.key!=='arc'||part.disabled||s.body?.key!=='assembler'||!bodyTraitState(s).active)return false;
 part.assemblerAttacks=(part.assemblerAttacks||0)+1;
 if(part.assemblerAttacks<10)return false;
 if(!spawnTower(s,chassisTuning(s,st),combatTime(s)))return false;
 part.assemblerAttacks-=10;return true;
}
export function tickSupportChassis(s,dt,st,damage){
 const a=state(s);if(!['demolition','regulator','sentinel','assembler'].includes(s.body?.key)){a.towers=[];return;}const now=combatTime(s),t=chassisTuning(s,st),eligible=s.enemies.filter(e=>supportTargetable(s,e));
 if(t.key==='regulator'&&t.active&&eligible.some(e=>spatialDistance(s.player,e)<=t.radius)&&(a.regulatorAt===null||now>=a.regulatorAt)){
  a.regulatorAt=now+6;a.pulseUntil=now+.55;
  for(const e of eligible)if(spatialDistance(s.player,e)<=t.radius&&now>=(e.frozenUntil||0)&&now>=(e.regulatorImmuneUntil||0)){e.regulatorFrozenUntil=now+t.freezeDuration;e.frozenUntil=e.regulatorFrozenUntil;e.regulatorImmuneUntil=e.frozenUntil+2;recordChassisFreeze(s,e);}
  for(const q of s.hostileShots)if(q.life>0&&spatialDistance(s.player,q)<=t.radius&&now>=(q.frozenUntil||0)){q.frozenUntil=now+t.freezeDuration;q.freezeStarted=now;}
  s.events.push({type:'chassis-freeze',x:s.player.x,y:s.player.y??0,z:s.player.z,radius:t.radius});
 }
 a.towers=a.towers.filter(q=>q.hp>0&&q.until>now);
 if(t.key!=='assembler'||!t.active){a.towers=[];return;}
 while(a.towers.length>t.towerLimit)a.towers.shift();
 const arms=s.arms.filter(p=>p?.key==='arc'&&!p.disabled),source=arms.sort((a,b)=>weaponStats(s,b,st).damage-weaponStats(s,a,st).damage)[0];if(!source)return;
 const w=weaponStats(s,source,st),swarm=summonTuning(s,modifiers(s));
 for(const tower of a.towers){
  tower.cooldown=Math.max(0,tower.cooldown-dt);tower.ammo??=w.magazine??10;
  if(tower.reloadRemaining>0){tower.reloadRemaining=Math.max(0,tower.reloadRemaining-dt*swarm.rate);if(tower.reloadRemaining===0)tower.ammo=w.magazine??10;else continue;}
  if(tower.cooldown>0)continue;
  let origin=tower,available=[...eligible],scale=1,attacked=false;
  for(let i=0;i<3;i++){const e=available.filter(e=>e.hp>0&&spatialDistance(origin,e)<=(i?5:w.range)&&visibleBetween(s,origin,e)).sort((a,b)=>spatialDistance(origin,a)-spatialDistance(origin,b))[0];if(!e)break;damage(e,(w.damage*.3+swarm.pollinatorDamage)*swarm.damage*t.damageBoost*scale,'tower');s.events.push({type:'arc',key:'arc',source:tower.id,x:origin.x,y:origin.y??0,z:origin.z,tx:e.x,ty:e.y??0,tz:e.z});available=available.filter(q=>q!==e);origin=e;scale*=.75;attacked=true;}
  if(attacked){tower.cooldown=w.interval/swarm.rate;tower.ammo--;if(tower.ammo<=0){tower.reloadDuration=reloadDuration(s,source,w.reload??4)*Math.max(.2,1-(modifiers(s).weaponReload||0));tower.reloadRemaining=tower.reloadDuration;}}
 }
}

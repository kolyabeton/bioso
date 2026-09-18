import {combatTime} from './mutations.js';
import {visibleBetween,spatialDistance,surfaceReach,bodyRadius} from '../elevation.js';
import {SURVIVAL_PRESSURE,SURVIVAL_FINAL} from './balance.js';
import {SHIELD_ATTACK_INTERVAL} from './enemy-specialists.js';

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
const bossMove=(key,extra)=>Object.freeze({key,...ENEMY_WEAPONS[key],telegraph:true,...extra});
export const SURVIVAL_BOSS_ATTACKS=Object.freeze({
 warden:Object.freeze([
  bossMove('hammer',{bossAction:'slam',mode:'sector',radius:10,angle:Math.PI/3,warning:1.25,recovery:2.4}),
  bossMove('claws',{bossAction:'cleave',range:3.2,warning:.72,recovery:1.8}),
  bossMove('needle',{bossAction:'shock-ring',pattern:'ring',count:10,gap:.9,range:13,speed:5.2,telegraphMode:'area',radius:3.8,warning:1.2,recovery:3,fractional:true,damageScale:.35,slot:0}),
 ]),
 stalker:Object.freeze([
  bossMove('needle',{bossAction:'needle-line',range:16,width:1.1,warning:.85,recovery:2.2}),
  bossMove('claws',{bossAction:'reaping-sweep',range:3.1,warning:.68,recovery:1.7}),
  bossMove('needle',{bossAction:'needle-rain',mode:'area',castRange:13,radius:2.8,targeted:true,warning:1.05,recovery:2.7,slot:0}),
 ]),
 orchid:Object.freeze([
  bossMove('acid',{bossAction:'acid-bloom',radius:2.8,warning:1.2,recovery:2.8}),
  bossMove('whip',{bossAction:'vine-sweep',range:4.2,warning:.9,recovery:2}),
  bossMove('seed',{bossAction:'seed-fan',pattern:'fan',count:7,spread:.18,range:14,speed:5.5,width:1.4,warning:1,recovery:2.6,fractional:true,damageScale:.4,slot:0}),
 ]),
 'root-warden':Object.freeze([
  bossMove('hammer',{bossAction:'root-slam',radius:3.8,warning:1.3,recovery:2.5}),
  bossMove('drill',{bossAction:'drill-sweep',range:3.5,warning:.78,recovery:1.8}),
  bossMove('seed',{bossAction:'root-ring',pattern:'ring',count:12,gap:.9,range:13,speed:4.8,telegraphMode:'area',radius:4.2,warning:1.25,recovery:3,fractional:true,damageScale:.35,slot:0}),
 ]),
 mother:Object.freeze([
  bossMove('seed',{bossAction:'seed-spiral',pattern:'ring',count:10,gap:1.05,range:14,speed:4.4,telegraphMode:'area',radius:4.5,warning:1.25,recovery:3.2,fractional:true,damageScale:.08}),
  bossMove('needle',{bossAction:'needle-fan',pattern:'fan',count:7,spread:.16,range:16,speed:6.5,width:1.6,warning:1,recovery:2.5,fractional:true,damageScale:.12}),
  bossMove('claws',{bossAction:'brood-sweep',range:4,warning:.82,recovery:2,slot:2}),
 ]),
});
export const ENEMY_ACID_SLOW_FACTOR=.7,ENEMY_ACID_PUDDLE_DURATION=2,ENEMY_ACID_DAMAGE=.5,ENEMY_ACID_TICK=1,ENEMY_ACID_POOL_LIMIT=32;
const acidPools=s=>s.enemyAcidPools??=[];
const inAcidPool=(s,p)=>p.life>0&&Math.abs((p.y??0)-(s.player.y??0))<=1.5&&Math.hypot(p.x-s.player.x,p.z-s.player.z)<=p.radius+.35&&surfaceReach(s,p,s.player);
export const enemyAcidPace=s=>acidPools(s).some(p=>inAcidPool(s,p))?ENEMY_ACID_SLOW_FACTOR:1;
function leaveAcidPool(s,w){
 const pools=acidPools(s);if(pools.length>=ENEMY_ACID_POOL_LIMIT)pools.shift();
 pools.push({id:++s.entityId,x:w.x,y:w.y??0,z:w.z,radius:w.radius??ENEMY_WEAPONS.acid.radius,life:ENEMY_ACID_PUDDLE_DURATION,damage:w.damage??1,missionScaled:!!w.missionScaled});
}
/** One shared exposure clock keeps overlapping enemy pools from stacking damage. */
export function tickEnemyAcidPools(s,dt,hit){
 const pools=acidPools(s);let exposedFor=0,source=null;
 for(const p of pools){if(inAcidPool(s,p)){const overlap=Math.min(dt,p.life);if(overlap>exposedFor){exposedFor=overlap;source=p;}}p.life-=dt;}
 s.enemyAcidPools=pools.filter(p=>p.life>0);
 if(exposedFor<=0){s.enemyAcidExposure=0;return;}
 s.enemyAcidExposure=(s.enemyAcidExposure??0)+exposedFor;
 while(s.enemyAcidExposure>=ENEMY_ACID_TICK){s.enemyAcidExposure-=ENEMY_ACID_TICK;hit(ENEMY_ACID_DAMAGE*(source?.damage??1),source);}
}
export const ENEMY_ATTACK_SPEED=Object.freeze({normal:1,elite:3,boss:2,final:2});
export const enemyAttackSpeed=e=>(ENEMY_ATTACK_SPEED[e.kind]??1)/(e.attackRecoveryScale||1);
export const ENEMY_CONTACT_GAP=.15;
export const enemyContactRange=(s,e)=>e.radius+bodyRadius(s)+ENEMY_CONTACT_GAP;
const bossPhase=e=>e.maxHp>0&&e.hp/e.maxHp<=.6?2:1;
export const survivalBossAttackDeck=e=>{
 const deck=['boss','final'].includes(e.kind)?SURVIVAL_BOSS_ATTACKS[e.recipeId]:null;
 return deck?(bossPhase(e)===1?deck.slice(0,2):deck):null;
};
const attackEntries=e=>{
 const deck=survivalBossAttackDeck(e);
 if(deck)return deck.map((w,index)=>({p:{key:w.key},slot:w.slot??Math.min(index,e.assembly?.arms.length-1||0),w:w.key==='hammer'&&w.mode==='area'?{...w,radius:(w.radius||w.range)*3}:w}));
 return (e.assembly?.arms??[]).map((p,slot)=>({p,slot,w:p?ENEMY_WEAPONS[p.key]:null})).filter(a=>a.p);
};
const activeEnemyWeapon=e=>{const attacks=attackEntries(e);return attacks.length?attacks[e.enemyAttack.index%attacks.length].w:null;};
export const ordinaryContactOnly=e=>e.kind==='normal'&&!e.specialty&&activeEnemyWeapon(e)?.mode==='sector';
export function cancelEnemyAttack(e,now){if(!e.enemyAttack)return;e.enemyAttack.warning=null;e.enemyAttack.readyAt=Math.max(e.enemyAttack.readyAt,now+1);}
export function enemyAttackRange(e,s=null){
 const range=w=>w.castRange?Math.min(13,w.castRange):w.mode==='sector'?(w.radius??(s?enemyContactRange(s,e):e.radius+.8+ENEMY_CONTACT_GAP)):['shot','acid'].includes(w.mode)?Math.min(9,w.range):e.radius+w.range*.65;
 // A ranged elite holds its firing distance even while its next slot is a backup claw.
 if(e.kind==='elite')return Math.max(...e.assembly.arms.filter(Boolean).map(p=>range(ENEMY_WEAPONS[p.key])));
 return range(activeEnemyWeapon(e));
}
export function warningHits(w,target){
 const dx=target.x-w.x,dz=target.z-w.z,d=Math.hypot(dx,dz);
 if(Math.abs((target.y??0)-(w.y??0))>1.5)return false;
 if(w.mode==='acid'||w.mode==='area')return d<=w.radius+.35;
 if(w.mode==='laser'){const along=dx*w.dx+dz*w.dz,cross=Math.abs(dx*w.dz-dz*w.dx);return along>=0&&along<=w.range&&cross<=(w.width||1)*.5+.35;}
 return d<=w.radius+.35&&(d<.01||(dx*w.dx+dz*w.dz)/d>=Math.cos(w.angle/2));
}
/** Resolves one weapon at a time; bosses retain readable warnings for every authored move. */
export function tickModularAttack(s,e,target,hit,knownVisible=null){
 const now=combatTime(s),a=e.enemyAttack;if(!a||e.hp<=0)return false;
 const deck=SURVIVAL_BOSS_ATTACKS[e.recipeId];
 if(deck&&['boss','final'].includes(e.kind)){
  const phase=bossPhase(e);
  if(a.phase==null)a.phase=phase;
  else if(phase>a.phase){a.phase=phase;a.index=2;a.warning=null;a.readyAt=Math.max(a.readyAt,now+.6);s.events.push({type:'notice',text:'Босс меняет тактику'});}
 }
 if(ordinaryContactOnly(e)){a.warning=null;return false;}
 const canSee=()=>typeof knownVisible==='function'?knownVisible():knownVisible??visibleBetween(s,e,target);
 if(e.frozenUntil>now||e.territory&&e.territory.state!=='engaged'&&!e.challengeId){cancelEnemyAttack(e,now);return false;}
 if(e.volatile){cancelEnemyAttack(e,now);return false;}
 if(a.warning){
  const w=a.warning;if(now<w.at)return true;
  const recovery=e.specialty==='shield-bearer'?Math.max(0,SHIELD_ATTACK_INTERVAL-w.warning):w.recovery*(s.mode==='survival'?SURVIVAL_PRESSURE.recovery:1)*(s.mode==='survival'&&e.kind==='final'?SURVIVAL_FINAL.recovery:1)/enemyAttackSpeed(e);
  a.warning=null;a.readyAt=now+recovery;a.index++;e.attackPose={...w,at:now};
  if(w.mode==='shot'){
   const count=w.count??(s.mode==='survival'&&e.kind==='final'?3:1),spread=w.spread??SURVIVAL_FINAL.shotSpread,base=Math.atan2(w.dx,w.dz),gap=w.pattern==='ring'?(w.gap??0):0,angles=w.pattern==='ring'?Array.from({length:count},(_,i)=>gap/2+(Math.PI*2-gap)*(count===1?.5:i/(gap>0?count-1:count))):Array.from({length:count},(_,i)=>(i-(count-1)/2)*spread);
   for(const angle of angles){const yaw=base+angle,dx=Math.sin(yaw),dz=Math.cos(yaw);s.hostileShots.push({id:++s.entityId,x:w.x+dx*(e.radius??0),y:w.y+1,z:w.z+dz*(e.radius??0),dx,dz,dy:w.pattern==='ring'?0:w.dy,speed:w.speed,life:w.range/w.speed,travel:0,key:w.key,kind:e.kind,owner:e.id,damage:w.damage??1,fractional:!!w.fractional,missionScaled:!!e.missionRoomStrength});}
  }
  else if(w.mode==='acid')leaveAcidPool(s,w);
  else if(warningHits(w,target)&&canSee())hit();
  s.events.push({type:'enemy-strike',key:w.key,bossAction:w.bossAction,x:w.x,y:w.y,z:w.z,radius:w.radius,dx:w.dx,dz:w.dz,mode:w.mode,duration:w.mode==='acid'?ENEMY_ACID_PUDDLE_DURATION:undefined});
  return true;
 }
 if(now<a.readyAt)return false;
 const arms=attackEntries(e),distance=spatialDistance(e,target);
 // Mixed elites and the Mother skip unreachable weapons instead of stalling on a backup claw.
 if(s.mode==='survival'&&e.kind==='elite')for(let i=0;i<arms.length;i++){
  const weapon=arms[a.index%arms.length].w;
  if(distance<=(weapon.mode==='sector'?enemyContactRange(s,e):weapon.range+(weapon.mode==='shot'||weapon.mode==='acid'?0:e.radius)))break;
  a.index++;
 }
 const selected=arms[a.index%arms.length],key=selected.p.key,w=selected.w;
 const reach=w.mode==='sector'?(w.radius??enemyContactRange(s,e)):w.range+(['shot','acid'].includes(w.mode)?0:e.radius);
 if(distance>reach||!canSee())return false;
 const dx=target.x-e.x,dz=target.z-e.z,d=Math.hypot(dx,dz)||1;
 const targeted=w.mode==='acid'||w.targeted;
 a.warning={...w,key,slot:selected.slot,x:targeted?target.x:e.x,y:targeted?(target.y??0):(e.y??0),z:targeted?target.z:e.z,dx:dx/d,dz:dz/d,dy:((target.y??0)-(e.y??0))/d,radius:w.radius??(w.range+e.radius),telegraphMode:w.telegraphMode??w.mode,started:now,at:now+w.warning,damage:(e.damage??1)*(w.damageScale??1),missionScaled:!!e.missionRoomStrength};
 // Direct strikes and shots release immediately. Hammer area and Orchid acid stay telegraphed.
 if(!w.telegraph&&!['area','acid'].includes(w.mode)){a.warning.at=now;return tickModularAttack(s,e,target,hit,knownVisible);}
 return true;
}

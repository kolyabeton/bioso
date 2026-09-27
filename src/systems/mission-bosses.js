import {scaleEnemyStats,difficultyHardShare,difficultyProfile} from './difficulty.js';
import {combatTime} from './mutations.js';
import {eventCollisionWorld,moveCreature} from '../gameplay-modules/event-collision.js';
import {navigateEnemy} from '../world-navigation.js';
import {visibleBetween,bodyRadius} from '../elevation.js';
import {enemyPace} from './effects.js';
import {slimePace} from './organs/combat.js';
import {enemyAttackSpeed,warningHits} from './enemy-combat.js';
import {turnBossFacing} from '../boss-facing.js';

// World metres, independently tuned from the survival boss budget.
export const MISSION_BOSSES=Object.freeze({
 'boss-mercury-hunter':{radius:1.8,speed:3.8,armor:12,damage:.5,action:'dash',warning:.95,recovery:3.2,range:15},
 'boss-scrap-leviathan':{radius:5.5,speed:.65,armor:65,exposedArmor:20,exposure:3,action:'crush',warning:1.6,recovery:4.2,range:13},
 // Shipped cathedral footprint at its fixed 10 m height: 4.39449 m radius.
 'boss-root-cathedral':{radius:2.19725,speed:0,armor:35,action:'roots',warning:1.35,recovery:3,range:24},
 'boss-mirror-collector':{radius:2.2,speed:2.2,armor:20,action:'copy',warning:1.1,recovery:2.8,range:16},
 'boss-swarm-shepherd':{radius:3,speed:1.7,armor:25,action:'swarm',warning:1.3,recovery:4.5,range:22},
});
export const missionBoss=e=>!!e.bossCombat&&!!MISSION_BOSSES[e.bossDesignId];
const children=(s,e)=>s.enemies.filter(q=>q.bossOwner===e.id&&q.hp>0);
const log=(s,e,action)=>{e.bossCombat.counts[action]=(e.bossCombat.counts[action]||0)+1;s.events.push({type:'boss-action',boss:e.bossDesignId,action,x:e.x,z:e.z});};
export function setupMissionBoss(s,e,id){
 const p=MISSION_BOSSES[id];if(!p||e.bossCombat)return;
 e.bossDesignId=id;e.radius=p.radius*2;e.speed=p.speed;e.damage=p.damage??.5;e.armor=p.armor+(e.bossArmorBonus||0);e.assembly=null;e.enemyAttack={warning:null};delete e.difficultyBossSpeedApplied;scaleEnemyStats(s,e,{health:false});
 e.bossCombat={phase:1,readyAt:combatTime(s)+1.8,cycle:0,counts:{},facing:Math.atan2(s.player.x-e.x,s.player.z-e.z),anchor:{x:e.x,z:e.z},exposedUntil:0};
 e.visualHeight=id==='boss-root-cathedral'?10:undefined;
}
export function bossDamageMultiplier(s,e,source){
 if(!missionBoss(e))return 1;
 const a=e.bossCombat,now=combatTime(s),id=e.bossDesignId;
 if(id==='boss-mirror-collector'&&a.mirrorUntil>now){
  if(source==='direct'&&now>=(a.reflectAt??0)){
   a.reflectAt=now+.7;emitFan(s,e,1,4.5,'needle');log(s,e,'reflect');
  }
  return .4;
 }
 if(a.exposedUntil>now)return 1.65;
 return 1;
}
export function cleanupBoss(s,e){
 if(!missionBoss(e))return;
 for(const q of children(s,e))q.hp=0;
 s.hostileShots=s.hostileShots.filter(q=>q.owner!==e.id);e.enemyAttack.warning=null;e.bossCombat.dash=null;
}
function emitFan(s,e,count,speed=6,key='seed',aim=null){
 const dx=(aim?.x??s.player.x)-e.x,dz=(aim?.z??s.player.z)-e.z,base=Math.atan2(dx,dz);
 for(let i=0;i<count;i++){
  const a=base+(i-(count-1)/2)*.23,x=Math.sin(a),z=Math.cos(a);
  s.hostileShots.push({id:++s.entityId,x:e.x+x*e.radius,y:(e.y??0)+1,z:e.z+z*e.radius,dx:x,dz:z,dy:0,speed,life:4,travel:0,key,kind:'boss',owner:e.id,damage:e.damage??1,missionScaled:!!e.missionRoomStrength});
 }
}
function emitRing(s,e,count,speed=5,key='seed',gap=.8){
 const base=Math.atan2(s.player.x-e.x,s.player.z-e.z);
 for(let i=0;i<count;i++){
  const a=base+gap/2+(Math.PI*2-gap)*(count===1?.5:i/(count-1)),x=Math.sin(a),z=Math.cos(a);
  s.hostileShots.push({id:++s.entityId,x:e.x+x*e.radius,y:(e.y??0)+1,z:e.z+z*e.radius,dx:x,dz:z,dy:0,speed,life:4,travel:0,key,kind:'boss',owner:e.id,damage:e.damage??1,missionScaled:!!e.missionRoomStrength});
 }
}
function spawnBees(s,e){
 const live=children(s,e).filter(q=>q.kind==='boss-drone').length,count=Math.min(8-live,e.bossCombat.phase===2?5:4),now=combatTime(s);
 for(let i=0;i<count;i++){
  const a=(i+.5)*Math.PI*2/count,x=e.x+Math.sin(a)*3.2,z=e.z+Math.cos(a)*3.2;
  if(!eventCollisionWorld(s).walkable(x,z,.4))continue;
  const hp=Math.max(20,Math.round(e.maxHp*.004));s.enemies.push({id:++s.entityId,kind:'boss-drone',role:'flying',flying:true,bossOwner:e.id,x,y:e.y??0,z,hp,maxHp:hp,radius:.4,speed:4.4,armor:0,damage:e.damage??1,missionRoomStrength:e.missionRoomStrength,contact:0,born:now,shootAt:now+.45+i*.18,expires:now+16});
 }log(s,e,'bees');
}
const segmentDistance=(p,a,b)=>{const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(p.x-a.x-dx*t,p.z-a.z-dz*t);};
/** Owns movement + attack for authored mission bosses and their targetable parts/drones. */
export function tickMissionBoss(s,e,dt,hit,target=s.player){
 if(!missionBoss(e)&&!e.bossOwner)return false;
 const now=combatTime(s);
 if(e.bossOwner){
  const owner=s.enemies.find(q=>q.id===e.bossOwner&&q.hp>0);if(!owner){e.hp=0;return true;}
  if(now>=e.expires||owner.territory&&owner.territory.state!=='engaged'){e.hp=0;return true;}
  if(e.frozenUntil>now||e.pickupSleepUntil>now)return true;
  const d=Math.hypot(s.player.x-e.x,s.player.z-e.z)||1;e.dx=(s.player.x-e.x)/d;e.dz=(s.player.z-e.z)/d;
  const pace=enemyPace(s,e)*slimePace(s,e),old={x:e.x,z:e.z};moveCreature(s,e,e.dx*e.speed*pace*dt,e.dz*e.speed*pace*dt,e.radius);
  if(e.kind==='boss-drone'&&d<=13&&now>=e.shootAt&&visibleBetween(s,e,s.player)){
   e.shootAt=now+1.45;const speed=9;s.hostileShots.push({id:++s.entityId,x:e.x,y:(e.y??0)+.8,z:e.z,dx:e.dx,dz:e.dz,dy:0,speed,life:1.8,travel:0,key:'needle',kind:'boss-drone',owner:e.id,damage:e.damage??1,missionScaled:!!e.missionRoomStrength});s.events.push({type:'enemy-shot',x:e.x,y:e.y??0,z:e.z,tx:e.x+e.dx*13,tz:e.z+e.dz*13,key:'needle'});
  }
  if(segmentDistance(s.player,old,e)<bodyRadius(s)+e.radius&&visibleBetween(s,e,s.player)){hit(e);e.hp=0;s.events.push({type:'enemy-strike',mode:'area',key:'hammer',x:e.x,y:e.y??0,z:e.z,radius:.8});}
  return true;
 }
 const a=e.bossCombat,p=MISSION_BOSSES[e.bossDesignId];
 e.kickX=e.kickZ=0;
 if(p.speed===0){e.x=a.anchor.x;e.z=a.anchor.z;}
 const phase=e.hp/e.maxHp<=.5?2:1;
 if(phase>a.phase){a.phase=phase;a.cycle=0;a.exposedUntil=now+3;e.enemyAttack.warning=null;a.dash=null;a.readyAt=now+1.2;log(s,e,'phase-2');s.events.push({type:'boss-phase',boss:e.bossDesignId,phase,x:e.x,y:e.y??0,z:e.z});s.events.push({type:'notice',text:`${e.bossName} · вторая фаза`});}
 const difficulty=difficultyProfile(s.difficulty);
 e.speed=p.speed*(e.bossSpeedScale??1)*(a.phase===2?1.22:1)*difficulty.speed*(1+difficultyHardShare(s.difficulty));
 e.armor=(a.exposedUntil>now?(p.exposedArmor??p.armor):p.armor)*difficulty.armor+(e.bossArmorBonus??0);
 e.bossHover=p.action==='swarm'&&a.phase===1?1.1:0;
 if(e.frozenUntil>now||e.pickupSleepUntil>now){a.dash=null;e.enemyAttack.warning=null;a.readyAt=now+1;return true;}
 const pace=enemyPace(s,e)*slimePace(s,e);
 if(target!==s.player){
  // Habitat bosses use the same aggro/leash decision as ordinary territorial enemies.
  a.dash=null;e.enemyAttack.warning=null;a.mirrorUntil=0;a.readyAt=now+1.8;
  s.hostileShots=s.hostileShots.filter(q=>q.owner!==e.id);
  if(e.speed>0&&Math.hypot(target.x-e.x,target.z-e.z)>e.radius+.6){
   turnBossFacing(e,target,dt,now);
   navigateEnemy(s,e,target,e.speed*pace,dt);
  }
  return true;
 }
 const d=Math.hypot(s.player.x-e.x,s.player.z-e.z)||1;
 if(a.dash){
  const dash=a.dash,old={x:e.x,z:e.z},travel=Math.min(12*(e.bossDashSpeedScale??1)*pace*dt,dash.left);moveCreature(s,e,dash.dx*travel,dash.dz*travel,e.radius);dash.left-=travel;
  if(!dash.hit&&segmentDistance(s.player,old,e)<=e.radius+bodyRadius(s)&&visibleBetween(s,e,s.player)){hit(e);dash.hit=true;}
  if(dash.left<=.01||Math.hypot(e.x-old.x,e.z-old.z)<travel*.3){a.dash=null;a.exposedUntil=now+2.4;a.readyAt=now+2.4/enemyAttackSpeed(e);log(s,e,'dash-finished');}return true;
 }
 const w=e.enemyAttack.warning;
 if(w){
  if(now<w.at)return true;
  e.enemyAttack.warning=null;e.attackPose={...w,at:now};a.readyAt=now+(w.recovery??p.recovery)*(a.phase===2?.5:1)/enemyAttackSpeed(e);a.cycle++;log(s,e,w.bossAction);
  if(w.bossAction==='dash'){a.dash={dx:w.dx,dz:w.dz,left:w.range,hit:false};}
  else if(w.bossAction==='swarm')spawnBees(s,e);
  else if(w.mode==='shot'){const speed=w.speed*(a.phase===2?1.5:1);if(w.pattern==='ring')emitRing(s,e,w.count,speed,w.key,w.gap);else emitFan(s,e,w.count,speed,w.key,{x:w.x+w.dx*30,z:w.z+w.dz*30});if(p.action==='copy'&&w.mirror){a.mirrorUntil=now+2;a.exposedUntil=0;}}
  else{if(warningHits(w,s.player)&&visibleBetween(s,{x:w.x,y:w.y,z:w.z},s.player))hit(e);s.events.push({type:'enemy-strike',...w});if(p.action==='copy'){a.mirrorUntil=now+1.7;a.exposedUntil=0;}else{a.exposedUntil=now+(p.exposure??1.6);e.armor=(p.exposedArmor??p.armor)*difficultyProfile(s.difficulty).armor+(e.bossArmorBonus??0);}}
  return true;
 }
 const desired=p.action==='swarm'&&a.phase===1?10:p.action==='copy'?7:e.radius+1;
 if(e.speed>0&&d>desired&&!(p.action==='crush'&&a.exposedUntil>now))navigateEnemy(s,e,s.player,e.speed*pace,dt);
 turnBossFacing(e,s.player,dt,now);
 if(now<a.readyAt||d>p.range||!visibleBetween(s,e,s.player))return true;
 const dx=Math.sin(a.facing),dz=Math.cos(a.facing),slot=a.cycle%3,base={x:e.x,y:e.y??0,z:e.z,dx,dz,started:now,at:now+p.warning/(e.difficultyAttackRate??1),key:'hammer',mode:'area',radius:e.radius+2,angle:Math.PI*2,bossAction:p.action};
 if(p.action==='dash'){
  if(slot===0)Object.assign(base,{bossAction:'dash',key:'needle',mode:'shot',range:Math.min(14,d+3),width:e.radius*2,recovery:3.2});
  else if(slot===1)Object.assign(base,{bossAction:'hunter-volley',key:'needle',mode:'shot',range:18,count:a.phase===2?7:5,speed:7,width:1.2,recovery:2.5});
  else Object.assign(base,{bossAction:'hunter-pounce',x:s.player.x,z:s.player.z,radius:3.1,recovery:2.7});
 }
 if(p.action==='roots'){
  if(slot===0)Object.assign(base,{bossAction:'roots',x:s.player.x,z:s.player.z,radius:a.phase===2?3.5:2.8,recovery:3});
  else if(slot===1)Object.assign(base,{bossAction:'seed-volley',key:'seed',mode:'shot',range:24,count:a.phase===2?7:5,speed:5,width:1.5,recovery:2.7});
  else Object.assign(base,{bossAction:'root-ring',key:'seed',mode:'shot',pattern:'ring',gap:.9,range:20,count:a.phase===2?14:10,speed:4.7,telegraphMode:'area',radius:5.2,recovery:3.2});
 }
 if(p.action==='crush'){
  if(slot===0)Object.assign(base,{bossAction:'crush',x:e.x+dx*(e.radius+1),z:e.z+dz*(e.radius+1),radius:4,recovery:4.2});
  else if(slot===1)Object.assign(base,{bossAction:'scrap-volley',key:'seed',mode:'shot',range:20,count:a.phase===2?7:5,speed:4.5,width:1.8,recovery:3.4});
  else Object.assign(base,{bossAction:'shock-ring',key:'needle',mode:'shot',pattern:'ring',gap:.85,range:18,count:a.phase===2?16:12,speed:4.2,telegraphMode:'area',radius:e.radius+2.6,recovery:4});
 }
 if(p.action==='copy'){
  if(slot===0){
   const key=s.arms.filter(Boolean)[a.cycle%Math.max(1,s.arms.filter(Boolean).length)]?.key??'needle';a.copiedWeapon=key;Object.assign(base,{bossAction:'copy',mirror:true,recovery:2.8});
   if(['claws','fangs','hammer','drill','whip'].includes(key))Object.assign(base,{x:s.player.x,z:s.player.z,radius:2.6});
   else Object.assign(base,{key:key==='seed'?'seed':'needle',mode:'shot',range:20,count:a.phase===2?5:3,speed:6});
  }else if(slot===1)Object.assign(base,{bossAction:'mirror-volley',key:'needle',mode:'shot',range:20,count:a.phase===2?7:5,speed:6.2,width:1.5,mirror:true,recovery:2.6});
  else Object.assign(base,{bossAction:'mirror-collapse',x:s.player.x,z:s.player.z,radius:a.phase===2?3.5:3,recovery:3});
 }
 if(p.action==='swarm'){
  if(slot===0)Object.assign(base,{bossAction:'eye-laser',key:'needle',mode:'laser',telegraphMode:'shot',range:22,width:a.phase===2?1.5:1.1,radius:0,recovery:3.1});
  else if(slot===1)Object.assign(base,{bossAction:'swarm',recovery:4.1});
  else Object.assign(base,{bossAction:'brood-ring',key:'seed',mode:'shot',pattern:'ring',gap:.9,range:18,count:a.phase===2?16:12,speed:4.8,telegraphMode:'area',radius:4.8,recovery:3.5});
 }
 e.enemyAttack.warning=base;
 return true;
}

export function missionBossStatus(s,e){
 const a=e.bossCombat,w=e.enemyAttack?.warning,p=MISSION_BOSSES[e.bossDesignId],now=combatTime(s);
 if(w?.bossAction==='dash')return'Рывок · уйдите в сторону';
 if(w?.bossAction==='eye-laser')return'Глаз заряжается · выйдите из луча';
 if(w?.bossAction==='swarm')return'Улей открывается · мухи начнут стрелять';
 if(w?.pattern==='ring')return'Кольцо · найдите просвет';
 if(w)return w.mode==='shot'?'Залп · между снарядами':'Удар · выйдите из зоны';
 if(a.dash)return'Рывок';
 if(a.mirrorUntil>now)return'Зеркало · отдаёт выстрелы';
 if(a.exposedUntil>now)return'Ядро открыто · усиленный урон';
 return a.phase===2?'Вторая фаза':'Готовит атаку';
}

import {combatTime} from './mutations.js';
import {move} from '../terrain.js';
import {navigateEnemy} from '../world-navigation.js';
import {visibleBetween,bodyRadius} from '../elevation.js';
import {enemyPace} from './effects.js';
import {enemyAttackSpeed,warningHits} from './enemy-combat.js';

// World metres, independently tuned from the survival boss budget.
export const MISSION_BOSSES=Object.freeze({
 'boss-mercury-hunter':{radius:1.8,speed:3.8,armor:12,action:'dash',warning:.95,recovery:3.2,range:15},
 'boss-scrap-leviathan':{radius:7,speed:.65,armor:65,action:'crush',warning:1.6,recovery:4.2,range:13,nodes:4,nodeType:'support'},
 'boss-root-cathedral':{radius:4.5,speed:0,armor:35,action:'roots',warning:1.35,recovery:3,range:24,nodes:3,nodeType:'root'},
 'boss-mirror-collector':{radius:2.2,speed:2.2,armor:20,action:'copy',warning:1.1,recovery:2.8,range:16},
 'boss-swarm-shepherd':{radius:3,speed:1.7,armor:25,action:'swarm',warning:1.3,recovery:4.5,range:22,nodes:3,nodeType:'command'},
});
export const missionBoss=e=>!!e.bossCombat&&!!MISSION_BOSSES[e.bossDesignId];
const children=(s,e)=>s.enemies.filter(q=>q.bossOwner===e.id&&q.hp>0);
const nodes=(s,e)=>children(s,e).filter(q=>q.kind==='boss-part');
const log=(s,e,action)=>{e.bossCombat.counts[action]=(e.bossCombat.counts[action]||0)+1;s.events.push({type:'boss-action',boss:e.bossDesignId,action,x:e.x,z:e.z});};
function placeNode(e,q){
 const yaw=e.bossCombat.facing||0,c=Math.cos(yaw),t=Math.sin(yaw);
 q.x=e.x+q.offset.x*c+q.offset.z*t;q.z=e.z-q.offset.x*t+q.offset.z*c;q.y=e.y??0;
}
export function setupMissionBoss(s,e,id){
 const p=MISSION_BOSSES[id];if(!p||e.bossCombat)return;
 e.bossDesignId=id;e.radius=p.radius*2;e.speed=p.speed;e.damage=2;e.armor=p.armor+(e.bossArmorBonus||0);e.assembly=null;e.enemyAttack={warning:null};
 e.bossCombat={phase:1,readyAt:combatTime(s)+1.8,cycle:0,counts:{},facing:0,anchor:{x:e.x,z:e.z},exposedUntil:0};
 e.visualHeight=id==='boss-root-cathedral'?10:undefined;
 for(let i=0;i<(p.nodes||0);i++){
  // Front/side anchors keep all targets reachable within the 18 m mission corridor.
  const offset=p.nodeType==='support'?{x:(i%2?1:-1)*5.5,z:i<2?3.8:-3.8}:{x:(i-1)*(p.nodeType==='root'?5.4:3.8),z:i===1?(p.nodeType==='root'?6.2:4.3):2.5};
  const hp=Math.round(e.maxHp*(p.nodeType==='support'?.045:.035));
  const q={id:++s.entityId,kind:'boss-part',role:p.nodeType,bossOwner:e.id,nodeIndex:i,offset,hp,maxHp:hp,radius:.8,speed:0,armor:0,damage:0,contact:0,born:combatTime(s),missionRoom:e.missionRoom};placeNode(e,q);s.enemies.push(q);
 }
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
 const n=nodes(s,e).length;
 if(id==='boss-root-cathedral'&&n)return .22;
 if(id==='boss-scrap-leviathan'&&n>2)return .55;
 if(id==='boss-swarm-shepherd'&&a.phase===1&&n)return .6;
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
 const live=children(s,e).filter(q=>q.kind==='boss-drone').length,commands=nodes(s,e).length,count=Math.min(8-live,Math.max(2,commands+1));
 for(let i=0;i<count;i++){
  const a=(i+.5)*Math.PI*2/count,x=e.x+Math.sin(a)*3.2,z=e.z+Math.cos(a)*3.2;
  if(!s.world.walkable(x,z,.4))continue;
  const hp=Math.max(20,Math.round(e.maxHp*.004));s.enemies.push({id:++s.entityId,kind:'boss-drone',role:'flying',flying:true,bossOwner:e.id,x,y:e.y??0,z,hp,maxHp:hp,radius:.4,speed:4.4,armor:0,damage:e.damage??1,missionRoomStrength:e.missionRoomStrength,contact:0,born:combatTime(s),expires:combatTime(s)+16});
 }log(s,e,'bees');
}
const segmentDistance=(p,a,b)=>{const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(p.x-a.x-dx*t,p.z-a.z-dz*t);};
/** Owns movement + attack for authored mission bosses and their targetable parts/drones. */
export function tickMissionBoss(s,e,dt,hit,target=s.player){
 if(!missionBoss(e)&&!e.bossOwner)return false;
 const now=combatTime(s);
 if(e.bossOwner){
  const owner=s.enemies.find(q=>q.id===e.bossOwner&&q.hp>0);if(!owner){e.hp=0;return true;}
  if(e.kind==='boss-part'){placeNode(owner,e);return true;}
  if(now>=e.expires||owner.territory&&owner.territory.state!=='engaged'){e.hp=0;return true;}
  if(e.frozenUntil>now||e.pickupSleepUntil>now)return true;
  const d=Math.hypot(s.player.x-e.x,s.player.z-e.z)||1;e.dx=(s.player.x-e.x)/d;e.dz=(s.player.z-e.z)/d;
  const old={x:e.x,z:e.z};move(s.world,e,e.dx*e.speed*enemyPace(s,e)*dt,e.dz*e.speed*enemyPace(s,e)*dt,e.radius);
  if(segmentDistance(s.player,old,e)<bodyRadius(s)+e.radius&&visibleBetween(s,e,s.player)){hit(e);e.hp=0;s.events.push({type:'enemy-strike',mode:'area',key:'hammer',x:e.x,y:e.y??0,z:e.z,radius:.8});}
  return true;
 }
 const a=e.bossCombat,p=MISSION_BOSSES[e.bossDesignId],n=nodes(s,e).length;
 e.kickX=e.kickZ=0;
 if(p.speed===0){e.x=a.anchor.x;e.z=a.anchor.z;}
 const phase=e.hp/e.maxHp<=.5||(p.nodes&&n===0)?2:1;
 if(phase>a.phase){a.phase=phase;a.cycle=0;a.exposedUntil=now+3;e.enemyAttack.warning=null;a.dash=null;a.readyAt=now+1.2;log(s,e,'phase-2');s.events.push({type:'boss-phase',boss:e.bossDesignId,phase,x:e.x,y:e.y??0,z:e.z});s.events.push({type:'notice',text:`${e.bossName} · вторая фаза`});}
 if(p.nodes&&n<(a.nodesLeft??p.nodes)){a.exposedUntil=now+4;log(s,e,'node-destroyed');}a.nodesLeft=n;a.disabledSupports=p.nodeType==='support'?[0,1,2,3].filter(i=>!nodes(s,e).some(q=>q.nodeIndex===i)).map(i=>[0,1,4,5][i]):[];
 e.speed=p.speed*(e.bossSpeedScale??1)*(p.action==='crush'?Math.max(.3,n/4):a.phase===2?1.22:1);
 e.armor=(p.armor+(e.bossArmorBonus??0))*(p.nodes?n/p.nodes:1);
 e.bossHover=p.action==='swarm'&&a.phase===1?1.1:0;
 if(e.frozenUntil>now||e.pickupSleepUntil>now){a.dash=null;e.enemyAttack.warning=null;a.readyAt=now+1;return true;}
 if(target!==s.player){
  // Habitat bosses use the same aggro/leash decision as ordinary territorial enemies.
  a.dash=null;e.enemyAttack.warning=null;a.mirrorUntil=0;a.readyAt=now+1.8;
  s.hostileShots=s.hostileShots.filter(q=>q.owner!==e.id);
  if(e.speed>0&&Math.hypot(target.x-e.x,target.z-e.z)>e.radius+.6){
   a.facing=Math.atan2(target.x-e.x,target.z-e.z);
   navigateEnemy(s,e,target,e.speed*enemyPace(s,e),dt);
  }
  for(const q of nodes(s,e))placeNode(e,q);
  return true;
 }
 const d=Math.hypot(s.player.x-e.x,s.player.z-e.z)||1;
 if(a.dash){
  const dash=a.dash,old={x:e.x,z:e.z},travel=Math.min(12*enemyPace(s,e)*dt,dash.left);move(s.world,e,dash.dx*travel,dash.dz*travel,e.radius);dash.left-=travel;
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
  else{if(warningHits(w,s.player)&&visibleBetween(s,{x:w.x,y:w.y,z:w.z},s.player))hit(e);s.events.push({type:'enemy-strike',...w});if(p.action==='copy'){a.mirrorUntil=now+1.7;a.exposedUntil=0;}else a.exposedUntil=now+1.6;}
  return true;
 }
 const desired=p.action==='swarm'&&a.phase===1?10:p.action==='copy'?7:e.radius+1;
 if(e.speed>0&&d>desired)navigateEnemy(s,e,s.player,e.speed*enemyPace(s,e),dt);
 a.facing=Math.atan2(s.player.x-e.x,s.player.z-e.z);
 for(const q of nodes(s,e))placeNode(e,q);
 if(now<a.readyAt||d>p.range||!visibleBetween(s,e,s.player))return true;
 const dx=Math.sin(a.facing),dz=Math.cos(a.facing),slot=a.cycle%3,base={x:e.x,y:e.y??0,z:e.z,dx,dz,started:now,at:now+p.warning,key:'hammer',mode:'area',radius:e.radius+2,angle:Math.PI*2,bossAction:p.action};
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
  if(slot===0&&a.phase===1)Object.assign(base,{bossAction:'swarm',recovery:4.5});
  else if(slot===0)Object.assign(base,{bossAction:'ground-claws',x:s.player.x,z:s.player.z,radius:3.2,recovery:2.8});
  else if(slot===1)Object.assign(base,{bossAction:'hive-volley',key:'needle',mode:'shot',range:20,count:a.phase===2?9:6,speed:6,width:1.6,recovery:3});
  else Object.assign(base,{bossAction:'brood-ring',key:'seed',mode:'shot',pattern:'ring',gap:.9,range:18,count:a.phase===2?16:12,speed:4.8,telegraphMode:'area',radius:4.8,recovery:3.5});
 }
 e.enemyAttack.warning=base;
 return true;
}

export function missionBossStatus(s,e){
 const a=e.bossCombat,w=e.enemyAttack?.warning,p=MISSION_BOSSES[e.bossDesignId],now=combatTime(s);
 if(w?.bossAction==='dash')return'Рывок · уйдите в сторону';
 if(w?.bossAction==='swarm')return'Улей открывается · сбивайте пчёл';
 if(w?.pattern==='ring')return'Кольцо · найдите просвет';
 if(w)return w.mode==='shot'?'Залп · между снарядами':'Удар · выйдите из зоны';
 if(a.dash)return'Рывок';
 if(a.mirrorUntil>now)return'Зеркало · отдаёт выстрелы';
 if(a.exposedUntil>now)return'Ядро открыто · усиленный урон';
 const n=nodes(s,e).length;
 if(p.nodeType==='root'&&n)return`Питающие корни: ${n} · разрушьте их`;
 if(p.nodeType==='support'&&n)return`Опоры: ${n} · замедляют босса`;
 if(p.nodeType==='command'&&n&&a.phase===1)return`Узлы роя: ${n} · сбейте управление`;
 return a.phase===2?'Вторая фаза':'Готовит атаку';
}

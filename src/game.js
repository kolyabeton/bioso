import {spawnRecoveryDrop,tickRecoveryDrops} from './systems/recovery-drops.js';
import {SHIELD_IMPACT_DELAY} from './melee-animation.js';
import {armCanReach,turnBody} from './body-facing.js';
import {specializationHit,specializationKill,prepareSpecializationAttack} from './systems/weapon-specialization.js';
import {awardMeta,recordVictory,tickOverrun,startOverrun,validLoadout,spendReroll} from './systems/meta-progression.js';
import {reactorKill,pullHarpoon,tickExtraParts} from './systems/extra-parts.js';
import {soulProc} from './systems/soul-procs.js';
import {assignEnemyAssembly,eligibleRecipes} from './systems/enemy-assembly.js';
import {tickModularAttack,enemyAttackRange,cancelEnemyAttack} from './systems/enemy-combat.js';
import {assignTerritory,territoryTarget} from './systems/territories.js';
import {generateLoot,normalDrop,queueBossReward,hitSetMultiplier} from './systems/sets-loot.js';
import {combatTime,isaacState,hasOrgan,activeMutation,syncMutations} from './systems/mutations.js';
import {prepareIsaacAttack,isaacHit,isaacDeath,conductorAttack,slimePace,tickIsaacCombat} from './systems/isaac-combat.js';
import {prepareEncounters,discoverEncounters,secretTarget,openSecret,startChallenge,containChallenge,tickChallenge,encounterStatus} from './systems/encounters.js';
import {spatialDistance,visibleBetween,surfaceReach,movePlayer,settleObjects} from './elevation.js';
import {createHealth,preserveHealth,receiveHit,tickHealth,vampireHit} from './systems/health.js';
import {createAbilities,modifiers,attackTriggers,updateMotion} from './systems/abilities.js';
import {gainXP,selectAbility,rollChoices} from './systems/progression.js';
import {createWaves,tickWaves,tickEnemyRanged,tickHostileShots} from './systems/waves.js';
import {enemyBalance,ECONOMY,SURVIVAL_PRESSURE} from './systems/balance.js';
import {onHit,onDeath,enemyPace,lightning,tickEffects} from './systems/effects.js';
import {CATALOG,MISSIONS,SURVIVAL_UNLOCKS,INCREMENTS} from './catalog.js';
import {createPart,newProfile,autoPickup,stats,weaponStats,installed,upgradeOptions,upgrade,lootTier,tierFactor,addBonus} from './assembly.js';
import {seededRandom} from './simulation.js';
import {terrain,move,spawnPoint} from './terrain.js';
import {tickWeapons,startReload,consumeRound,movementFactor,hitFeedback,tickImpact,IDLE_RELOAD_DELAY} from './combat-feel.js';
import {decorateLivingEnemy,tickVolatile,separateEnemies,splinterShots} from './living-combat.js';
import {tickExploration,tickDelivery,deliveryStatus,missionEnemyTarget} from './exploration.js';
import {navigateEnemy,clearSegment} from './world-navigation.js';
const distance=spatialDistance;
export function createRun(profile=newProfile(),mode='survival',seed=Date.now()>>>0){
 const s={health:createHealth(),abilities:createAbilities(),waves:createWaves(),hostileShots:[],metrics:{spawned:0,maxEnemies:0,killed:[]},seed,profile,mode,serial:0,entityId:0,rng:seededRandom(seed),world:terrain(seed),time:0,level:1,xp:0,pending:0,choices:[],soul:{},biomass:0,player:{x:0,z:0,facing:0},enemies:[],shots:[],puddles:[],xpDrops:[],recoveryDrops:[],ground:[],events:[],inventory:[],kills:0,elites:0,bosses:0,nextElite:180,nextBoss:480,spawnCredit:0,hitAgo:999,dead:false,won:false,finalDefeated:false,continued:false,visitedLairs:new Set()};
 s.body=createPart(s,'wanderer');s.arms=[createPart(s,'claws'),null];s.legs=[createPart(s,'universal'),createPart(s,'universal')];s.organs=[null,null];s.hp=stats(s).hp;
 if(mode!=='survival')setupMission(s);return s;
}
export function randomLoot(s,source='normal'){const p=generateLoot(s,createPart,lootTier(s.level,s.rng),source,null,false);p.lootSource=source;return p;}
export function award(s,id,keys){
 if(s.profile.achievements.includes(id))return false;s.profile.achievements.push(id);
 for(const key of keys)if(!s.profile.unlocked.includes(key)){s.profile.unlocked.push(key);s.ground.push({id:++s.entityId,part:createPart(s,key,lootTier(s.level,s.rng)),x:s.player.x+1,z:s.player.z});}
 s.events.push({type:'unlock',text:'Открыто: '+keys.map(k=>CATALOG[k].name).join(', ')});return true;
}
function checkUnlocks(s){if(s.mode==='survival'){for(const u of SURVIVAL_UNLOCKS)if(u.test(s))award(s,u.id,u.rewards);awardMeta(s,createPart);}}
export function addXP(s,amount){gainXP(s,amount);checkUnlocks(s);}
export function chooseUpgrade(s,index){const old=stats(s).hp;if(!selectAbility(s,index))return false;preserveHealth(s,old,stats(s).hp);return true;}
export function spawnEnemy(s,kind='normal',position=null,role='mass',threat=s.time){
 if(s.mode==='survival'&&kind==='normal'&&!eligibleRecipes(threat,role).length)role='mass';
 const base=enemyBalance(threat,kind,role);
 if(s.mode==='survival'){
  // Opening mobs now survive a normal claw hit; preserve readable whole health.
  base.hp=Math.round(base.hp*SURVIVAL_PRESSURE.hp);base.speed*=SURVIVAL_PRESSURE.speed;
  // Keep the introductory boss bounded even when its habitat uses a later threat tier.
  if(kind==='boss'&&!s.introBossId)base.hp=SURVIVAL_PRESSURE.introBossHp;
 }
 const p=position||spawnPoint(s.world,s.player,s.rng,27,40,s.world.heightAt?base.radius:undefined);if(!p)return null;
 if(s.world.heightAt){if(!s.world.walkable(p.x,p.z,base.radius))return null;p.y=s.world.heightAt(p.x,p.z);}
 const e={...p,...base,id:++s.entityId,kind,contact:0,born:combatTime(s)};e.maxHp=e.hp;if(s.mode==='survival'&&kind==='boss'&&!s.introBossId)s.introBossId=e.id;assignEnemyAssembly(s,e,threat);decorateLivingEnemy(s,e,!position);s.enemies.push(e);s.metrics.spawned++;s.metrics.maxEnemies=Math.max(s.metrics.maxEnemies,s.enemies.length);return assignTerritory(s,e);
}
export function hurtEnemy(s,e,damage,ignore=0,source='direct',critical=false){
 if(e.hp<=0)return false;e.engagedAt??=combatTime(s);const applied=Math.min(e.hp,damage/(1+(e.armor||0)*(1-ignore)/100));s.metrics.damage??={direct:0,burn:0,electric:0,summon:0,acid:0,thermal:0,environment:0};s.metrics.damage[source]=(s.metrics.damage[source]||0)+applied;e.hp-=applied;
 if(applied>0&&source!=='environment')s.events.push({type:'enemy-damage',target:e.id,x:e.x,y:e.y??0,z:e.z,radius:e.radius??.6,amount:applied,critical,source});
 if(e.hp>0)return true;e.hp=0;
 if(e.kind==='objective'){s.events.push({type:'destroy',x:e.x,z:e.z});return true;}
 onDeath(s,e);isaacDeath(s,e,source);s.metrics.killed.push({kind:e.kind,role:e.role,age:combatTime(s)-e.born,combatSeconds:e.engagedAt==null?0:combatTime(s)-e.engagedAt,minute:s.time/60});s.kills++;reactorKill(s);if(e.kind==='elite')s.elites++;if(['boss','final'].includes(e.kind))s.bosses++;
 if(e.kind==='final'){s.finalDefeated=true;if(s.mode==='survival'){s.won=true;recordVictory(s);s.events.push({type:'victory',text:'Матка повержена. Завершить забег или продолжить?'});}}
 s.xpDrops.push({id:++s.entityId,x:e.x,z:e.z,value:e.xp??(e.kind==='normal'?1:e.kind==='elite'?12:45)});
 if(['boss','final'].includes(e.kind)){
  if(s.mode==='survival'&&s.bosses===1){
   const stomach=createPart(s,'digestion',1);
   s.ground.push({id:++s.entityId,x:e.x,y:e.y,z:e.z,part:stomach});
   // Two ordinary spares teach digestion and fund one base-price upgrade.
   for(const key of ['claws','universal'])s.ground.push({id:++s.entityId,x:e.x,y:e.y,z:e.z,part:createPart(s,key,1)});
   if(!s.profile.unlocked.includes('digestion'))s.profile.unlocked.push('digestion');
   s.events.push({type:'unlock',text:'Желудок выпал! Установите пищеварительный орган и переработайте лишние детали в биомассу.'});
  }
  queueBossReward(s,createPart,lootTier(s.level,s.rng));
 }
 else if(e.kind==='elite'||normalDrop(s))s.ground.push({id:++s.entityId,x:e.x,y:e.y,z:e.z,part:randomLoot(s,e.kind==='elite'?'elite':'normal')});
 spawnRecoveryDrop(s,e);checkUnlocks(s);s.events.push({type:'death',x:e.x,z:e.z});return true;
}
function deal(s,e,w,scale=1,ignore=0,direction=null){
 if(e.hp<=0)return false;const b=modifiers(s),base=w.damage*scale*specializationHit(s,e,w)*(w.key==='harpoon'&&['elite','boss','final'].includes(e.kind)?1.25:1)*hitSetMultiplier(s,e,w),critical=s.rng()<w.crit,damage=base*(critical?w.critPower:1)*(e.chillUntil>combatTime(s)?1+(b.brittle||0):1);
 if(critical&&!w.secondary&&(b.crit||b.critPower||(['sector','area','contact'].includes(w.mode)?b.meleeCrit:b.rangedCrit)))soulProc(s,'critical',e,{dx:direction?.dx??0,dz:direction?.dz??1});
 isaacHit(s,e,damage,w);if(!w.secondary)onHit(s,e,damage,(target,d)=>hurtEnemy(s,target,d,0,'thermal')); const hit=hurtEnemy(s,e,damage,ignore,w.secondary|| (w.mode==='arc'?'electric':'direct'),critical);if(hit){if(e.hp<=0)specializationKill(s,w);hitFeedback(s,e,w,direction);if(w.key==='harpoon')pullHarpoon(s,e);}return hit;
}
function emitShot(s,p,w,target,offset=0){
 const spread=w.spread?(s.rng()*2-1)*w.spread*(1+(p.bloom||0)):0;
 const a=Math.atan2(target.z-s.player.z,target.x-s.player.x)+offset+spread;
 s.shots.push({id:++s.entityId,source:p.id,x:s.player.x,y:(s.player.y??0)+1,z:s.player.z,dy:((target.y??0)-(s.player.y??0))/(Math.hypot(target.x-s.player.x,target.z-s.player.z)||1),dx:Math.cos(a),dz:Math.sin(a),target:target.id,returning:false,returnable:!!w.isaac?.returning,life:w.range/w.speed,speed:w.speed,w,hit:new Set(),remaining:w.pierce||1,mode:w.mode,aim:{x:target.x,z:target.z},distance:distance(s.player,target),travel:0});
}
// Resolve shield contact on the same combat clock as its thrust animation.
function shieldImpacts(s){
 const now=combatTime(s),pending=s.shieldStrikes??[];
 s.shieldStrikes=pending.filter(hit=>hit.at>now);
 for(const hit of pending){
  if(hit.at>now)continue;
  const slot=s.arms.findIndex(p=>p?.id===hit.event.source&&p.key==='hammer');
  if(slot<0||s.dead)continue;
  s.events.push({...hit.event,x:s.player.x,y:s.player.y??0,z:s.player.z,at:now,animationStarted:true});
  for(const id of hit.targets){
   const e=s.enemies.find(e=>e.id===id&&e.hp>0);
   if(!e||!armCanReach(s,slot,e)||!visibleBetween(s,s.player,e)||distance(s.player,e)>hit.w.range+(e.radius||0))continue;
   deal(s,e,hit.w);
   if(e.kind==='normal'){const d=distance(e,s.player)||1;move(s.world,e,(e.x-s.player.x)/d*2,(e.z-s.player.z)/d*2,e.radius);}
  }
 }
}
export function attack(s,dt,st=stats(s),repeatPart=null){
 if(!repeatPart)shieldImpacts(s);
 if(!repeatPart){tickWeapons(s,dt);for(const p of s.arms.filter(Boolean))p.cooldown-=dt;}
 if(!repeatPart){
  let focus=null,focusSlot=0,nearest=Infinity;
  for(const [slot,p] of s.arms.entries())if(p&&!p.disabled){
   const w=weaponStats(s,p,st),candidates=s.enemies.filter(e=>e.hp>0&&visibleBetween(s,s.player,e)&&distance(s.player,e)<=w.range+(['sector','area','contact'].includes(w.mode)?e.radius||0:0));
   const secret=secretTarget(s,p,w);if(secret&&!candidates.length)candidates.push(secret);
   for(const e of candidates){const d=distance(s.player,e);if(d<nearest){focus=e;focusSlot=slot;nearest=d;}}
  }
  turnBody(s,dt,st.turnSpeed,focus,focusSlot);
 }
 const sync=s.arms.filter(p=>p&&!p.disabled&&['seed','needle','rocket'].includes(p.key)),common=hasOrgan(s,'commonNerve');
 const syncReady=!common||sync.every(p=>p.cooldown<=1e-8&&!(p.reloadRemaining>0)&&p.ammo>0&&s.enemies.some(e=>e.hp>0&&armCanReach(s,s.arms.indexOf(p),e)&&visibleBetween(s,s.player,e)&&distance(s.player,e)<=weaponStats(s,p,st).range));
 const alive=s.enemies.filter(e=>e.hp>0);
 for(const p of (repeatPart?[repeatPart]:s.arms.filter(Boolean))){
  if(p.disabled){p.cooldown=Math.max(0,p.cooldown);continue;}
  if(!repeatPart&&p.cooldown>1e-8)continue;
  let w=weaponStats(s,p,st);if(!repeatPart&&p.reloadRemaining>0){p.cooldown=Math.max(0,p.cooldown);continue;}
  if(!repeatPart&&w.magazine&&p.ammo===0){startReload(s,p);continue;}
  const targets=alive.filter(e=>e.hp>0&&armCanReach(s,s.arms.indexOf(p),e)&&visibleBetween(s,s.player,e)&&distance(s.player,e)<=w.range+(['sector','area','contact'].includes(w.mode)?e.radius||0:0)).sort((a,b)=>distance(s.player,a)-distance(s.player,b));
  const secret=!repeatPart&&secretTarget(s,p,w);
  if(secret&&!targets.length&&armCanReach(s,s.arms.indexOf(p),secret)){w=prepareSpecializationAttack(s,p,prepareIsaacAttack(s,p,w));p.cooldown=w.interval;s.events.push({type:p.key==='arc'?'arc':'attack',key:p.key,source:p.id,x:s.player.x,z:s.player.z,tx:secret.x,tz:secret.z});if(p.key==='acid'){emitShot(s,p,w,{...secret,id:secret.id});s.shots.at(-1).secret=secret.id;}else openSecret(s,secret);consumeRound(s,p);const trigger=attackTriggers(s,p,w);conductorAttack(s,w,(e,d,source)=>hurtEnemy(s,e,d,0,source));if(trigger.electric)lightning(s,w,(e,d)=>hurtEnemy(s,e,d,0,'electric'));continue;}
  if(!repeatPart&&common&&sync.includes(p)&&!syncReady&&targets.length){p.cooldown=Math.max(0,p.cooldown);continue;}
  if(!targets.length){if(repeatPart)continue;p.cooldown=0;p.idleFor=(p.idleFor||0)+dt;if(p.idleFor>=IDLE_RELOAD_DELAY)startReload(s,p);continue;}
  if(p.key==='drill')targets.sort((a,b)=>Number(b.kind!=='normal')-Number(a.kind!=='normal'));
  if(p.key==='rocket')targets.sort((a,b)=>alive.filter(e=>distance(e,b)<3).length-alive.filter(e=>distance(e,a)<3).length);
  w=prepareSpecializationAttack(s,p,prepareIsaacAttack(s,p,w,!!repeatPart),!!repeatPart);if(common&&sync.includes(p))w.damage*=1+(w.isaac?.organEffect??1);
  const target=targets[0];if(repeatPart)soulProc(s,'echo',s.player,{tx:target.x,ty:target.y??0,tz:target.z});if(!repeatPart)p.cooldown=Math.max(.001,w.interval+Math.min(0,p.cooldown));p.idleFor=0;p.aim=Math.atan2(target.x-s.player.x,target.z-s.player.z);
  const attackEvent={type:'attack',key:p.key,source:p.id,at:combatTime(s),x:s.player.x,y:s.player.y??0,z:s.player.z,tx:target.x,ty:target.y??0,tz:target.z};
  s.events.push(p.key==='hammer'?{...attackEvent,type:'melee-windup'}:attackEvent);
  if(p.key==='hammer'){
   (s.shieldStrikes??=[]).push({at:combatTime(s)+SHIELD_IMPACT_DELAY,event:attackEvent,w,targets:targets.map(e=>e.id)});
  }else if(w.mode==='arc'){
   let previous=s.player,available=[...alive],scale=1;
   for(let i=0;i<3;i++){const e=available.filter(e=>e.hp>0&&(i>0||armCanReach(s,s.arms.indexOf(p),e))&&visibleBetween(s,previous,e)&&distance(previous,e)<=(i?5:w.range)).sort((a,b)=>distance(previous,a)-distance(previous,b))[0];if(!e)break;s.events.push({type:'arc',x:previous.x,y:previous.y??0,z:previous.z,tx:e.x,ty:e.y??0,tz:e.z});deal(s,e,w,scale);scale*=.75;available=available.filter(q=>q!==e);previous=e;}
  }else if(['projectile','rocket','acid'].includes(w.mode)){const count=(w.mode==='rocket'?3:1)+(w.extra||0);if(w.extra)soulProc(s,'multishot',s.player,{tx:target.x,ty:target.y??0,tz:target.z,count});for(let i=0;i<count;i++)emitShot(s,p,w,target,(i-(count-1)/2)*.12);}
  else if(w.mode==='contact'){const hit=deal(s,target,w,1,p.key==='drill'?.5:0);if(hit&&p.key==='fangs')vampireHit(s,st);}
  else{
   const a=Math.atan2(target.z-s.player.z,target.x-s.player.x);
   for(const e of targets){const b=Math.atan2(e.z-s.player.z,e.x-s.player.x),delta=Math.atan2(Math.sin(b-a),Math.cos(b-a));if(w.mode==='sector'&&Math.abs(delta)>w.angle/2)continue;deal(s,e,w);}
  }
  if(!repeatPart){conductorAttack(s,w,(e,d,source)=>hurtEnemy(s,e,d,0,source));const trigger=attackTriggers(s,p,w);if(trigger.electric)lightning(s,w,(e,d)=>hurtEnemy(s,e,d,0,'electric'));if(trigger.echo)s.abilities.echoes.push({partId:p.id,at:combatTime(s)+.15});consumeRound(s,p);}
 }
}
const segmentDistance=(p,a,b)=>{const dx=b.x-a.x,dz=b.z-a.z,dy=(b.y??1)-(a.y??1),t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz+((p.y??1)-(a.y??1))*dy)/(dx*dx+dz*dz+dy*dy||1)));return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz,(p.y??1)-(a.y??1)-t*dy);};
function shotsStep(s,dt){
 const fragments=[];
 for(const q of s.shots){
  const old={x:q.x,y:q.y,z:q.z};q.life-=dt;
  if(q.returning){const d=Math.hypot(s.player.x-q.x,s.player.z-q.z);if(d<=q.speed*dt+.5){q.life=0;continue;}q.dx=(s.player.x-q.x)/d;q.dz=(s.player.z-q.z)/d;q.dy=((s.player.y??0)+1-(q.y??1))/d;}

  if(q.mode==='rocket'){let target=s.enemies.find(e=>e.id===q.target&&e.hp>0);if(!target){target=s.enemies.filter(e=>e.hp>0).sort((a,b)=>distance(q,a)-distance(q,b))[0];if(target)q.target=target.id;}if(target){const d=distance(q,target)||1;q.dx=(target.x-q.x)/d;q.dz=(target.z-q.z)/d;q.dy=((target.y??0)+1-(q.y??1))/d;}}
  q.x+=q.dx*q.speed*dt;q.z+=q.dz*q.speed*dt;q.y=(q.y??1)+(q.dy??0)*q.speed*dt;q.travel+=q.speed*dt;
  if(s.world.lineClear&&!s.world.lineClear(old,q)){q.life=0;continue;}
  const collisions=s.enemies.filter(e=>e.hp>0&&(q.remaining>0||q.mode!=='projectile')&&!q.hit.has(e.id)&&segmentDistance({...e,y:(e.y??0)+1},old,q)<(e.radius||1)+.18).sort((a,b)=>distance(old,a)-distance(old,b));
  const secret=q.secret&&s.encounters?.nodes.find(n=>n.id===q.secret);if(secret&&q.mode==='acid'&&segmentDistance({...secret,y:(secret.y??0)+1},old,q)<1.6)openSecret(s,secret);
  if(q.mode==='acid'&&(collisions.length||q.travel>=q.distance||q.life<=0)){
   if(collisions[0])deal(s,collisions[0],q.w);if(!s.world.heightAt||s.world.heightAt(q.x,q.z)!==null)s.puddles.push({id:++s.entityId,source:q.source,x:q.x,y:s.world.heightAt?.(q.x,q.z)??0,z:q.z,life:3,damage:q.w.damage/12*8});q.life=0;
  }else if(q.mode==='rocket'&&collisions.length){for(const e of s.enemies)if(e.hp>0&&visibleBetween(s,q,e,0)&&distance(e,q)<=2+e.radius)deal(s,e,q.w);q.life=0;s.events.push({type:'blast',x:q.x,z:q.z});}
  else if(q.mode==='projectile'){for(const e of collisions){if(e.hp<=0)continue;deal(s,e,q.isSplinter?{...q.w,isaac:null,secondary:'splinter'}:q.w,q.returning?.6*(q.w.isaac?.organEffect??1):1,0,q);fragments.push(...splinterShots(s,q,e));if(q.remaining>1&&!q.isSplinter&&modifiers(s).pierce)soulProc(s,'pierce',e,{dx:q.dx,dz:q.dz});q.hit.add(e.id);if(--q.remaining<=0){if(!q.returnable)q.life=0;break;}}}
  if(q.returnable&&!q.returning&&(q.travel>=q.w.range||q.life<=0)){q.returning=true;q.hit=new Set();q.remaining=q.w.pierce||1;q.life=8;}
  if(!s.world.lineClear&&!s.world.walkable(q.x,q.z,.05))q.life=0;
 }
 s.shots=s.shots.filter(q=>q.life>0);
 s.shots.push(...fragments.slice(0,Math.max(0,300-s.shots.filter(q=>q.isSplinter).length)));
 for(const e of s.enemies.filter(e=>e.hp>0)){const perArm=new Map();for(const q of s.puddles)if(surfaceReach(s,q,e)&&distance(e,q)<=2.5*(activeMutation(s,'mire')?1.5:1))perArm.set(q.source,Math.max(perArm.get(q.source)||0,q.damage));for(const d of perArm.values())hurtEnemy(s,e,d*dt,0,'acid');}
 for(const p of s.puddles)p.life-=dt;s.puddles=s.puddles.filter(p=>p.life>0);
}
export function receiveDamage(s,damage,st=stats(s)){return receiveHit(s,st,{damage});}
function setupMission(s){
 const m=MISSIONS.find(m=>m.id===s.mode);if(!m)throw Error('Unknown mission');
 s.mission={...m,nodes:[],activated:0,defense:0,carrying:false,complete:false,targetHp:80,finalSpawned:false};
 const positions=s.mode==='quarantine'?[[0,-64],[64,0],[0,64],[-64,0]]:s.mode==='mother'?[[0,-64],[64,0],[-64,0]]:s.mode==='garden'?[[0,-64],[64,0],[0,64]]:s.mode==='core'?[[0,-128],[0,32]]:[[0,0]];
 for(const [x,z] of positions){const n={id:++s.entityId,x,z,active:false};if(['quarantine','mother'].includes(s.mode)){Object.assign(n,{kind:'objective',hp:500,maxHp:500,armor:10,radius:2,damage:0});s.enemies.push(n);}s.mission.nodes.push(n);}
}
export function missionStatus(s){if(s.encounters?.active)return encounterStatus(s);const m=s.mission;if(!m)return'Свободный маршрут · враги усиливаются со временем';if(m.complete)return'Задание выполнено';if(s.mode==='garden')return`Узлы ${m.activated}/3 · защита ${Math.floor(m.defense)}/90 с · HP узла ${Math.ceil(m.targetHp)}`;if(s.mode==='quarantine')return`Генераторы ${m.nodes.filter(n=>n.hp<=0).length}/4`;if(s.mode==='core'&&s.exploration)return deliveryStatus(s);if(s.mode==='core')return m.carrying?'Ядро с вами · вернитесь к выходу':'Найдите живое ядро';if(s.mode==='nursery')return`Защита ${Math.floor(s.time)}/480 с · HP питомника ${Math.ceil(m.targetHp)}`;return`Защитные органы ${m.nodes.filter(n=>n.hp<=0).length}/3${m.finalSpawned?' · победите матку':''}`;}
function missionStep(s,dt){
 const m=s.mission;if(!m||m.complete)return;
 let complete=false;
 if(s.mode==='garden'){
  for(const n of m.nodes)if(!n.active&&distance(n,s.player)<3){n.active=true;m.activated++;m.last=n;s.events.push({type:'notice',text:'Узел запущен'});}
  if(m.activated===3){m.defense+=dt;complete=m.defense>=90;}
 }else if(s.mode==='quarantine')complete=m.nodes.every(n=>n.hp<=0);
 else if(s.mode==='core'){if(s.exploration)complete=tickDelivery(s);else{if(distance(m.nodes[0],s.player)<3)m.carrying=true;complete=m.carrying&&distance(m.nodes[1],s.player)<3;}}
 else if(s.mode==='nursery')complete=s.time>=480&&m.targetHp>0;
 else if(s.mode==='mother'){
  if(!m.finalSpawned&&m.nodes.every(n=>n.hp<=0)){spawnEnemy(s,'final',s.exploration?{x:0,z:-260}:null,'mass',s.exploration?480:s.time);m.finalSpawned=true;}complete=s.finalDefeated;
 }
 if(complete){m.complete=true;s.won=true;award(s,'mission:'+m.id,m.rewards);s.events.push({type:'victory',text:'Миссия выполнена: '+m.name});}
 else if(s.time>=m.duration||m.targetHp<=0){s.dead=true;s.events.push({type:'notice',text:m.targetHp<=0?'Защищаемый объект потерян':'Время миссии истекло'});}
}
export function step(s,dt,input={x:0,z:0}){
 if(s.dead||s.pending||s.bossRewards?.length||s.won&&!s.continued)return;
 if(!s.encounters)prepareEncounters(s);syncMutations(s);discoverEncounters(s);const challengeWasActive=!!s.encounters.active;
 if(challengeWasActive)isaacState(s).extraTime+=dt;else s.time+=dt;s.hitAgo+=dt;const st=stats(s),length=Math.hypot(input.x,input.z)||1,pace=movementFactor(s,st),oldPlayer={...s.player};
 if(s.world.heightAt)movePlayer(s,dt,input.x/Math.max(1,length)*st.speed*pace*dt,input.z/Math.max(1,length)*st.speed*pace*dt,st.overloaded);else move(s.world,s.player,input.x/Math.max(1,length)*st.speed*pace*dt,input.z/Math.max(1,length)*st.speed*pace*dt);
 containChallenge(s,oldPlayer);if(s.dead)return;settleObjects(s);
 updateMotion(s,dt,distance(oldPlayer,s.player)>1e-6);if(s.abilities.moving>=3)s.setMovingUntil=combatTime(s)+1;
 s.motion={x:dt?(s.player.x-oldPlayer.x)/dt:0,z:dt?(s.player.z-oldPlayer.z)/dt:0,pace};
 if(!challengeWasActive&&!s.exploration&&s.time>=180){const c=s.world.chunk(Math.floor(s.player.x/64),Math.floor(s.player.z/64)),key=c.cx+','+c.cz;if(distance(s.player,c.lair)<8&&!s.visitedLairs.has(key)){s.visitedLairs.add(key);spawnEnemy(s,'elite');s.events.push({type:'notice',text:'Вы потревожили логово'});}}
 if(!challengeWasActive&&(!s.exploration||s.mode==='survival'))tickWaves(s,dt,(kind,position,role)=>spawnEnemy(s,kind,position,role));
 if(!challengeWasActive)tickExploration(s,dt,{spawn:(...args)=>spawnEnemy(s,...args),loot:()=>randomLoot(s,'elite')});
 const protectedNode=challengeWasActive?null:s.mode==='nursery'?s.mission.nodes[0]:s.mode==='garden'&&s.mission.activated===3?s.mission.last:null;
 separateEnemies(s,dt);
 for(const e of s.enemies){tickImpact(s,e,dt);if(e.hp<=0||e.kind==='objective')continue;e.contact-=dt;
  if(tickVolatile(s,e,dt,(q,d)=>hurtEnemy(s,q,d,0,'environment'),()=>receiveHit(s,st,{cause:'explosion'})))continue;
  const fallback=protectedNode&&e.id%3===0?protectedNode:s.player;
  const target=territoryTarget(s,e,s.exploration?missionEnemyTarget(s,e,fallback):fallback),d=distance(e,target)||.001;
  const firingLane=e.role!=='ranged'||visibleBetween(s,e,target)&&(s.world.lineClear||clearSegment(s.world,e,target,.05));
  let holding=false;
  if(e.assembly){if(target===s.player)holding=tickModularAttack(s,e,target,()=>receiveDamage(s,e.damage,st));else cancelEnemyAttack(e,combatTime(s));}
  else if((target===s.player||target===protectedNode)&&(firingLane||e.windup))tickEnemyRanged(s,e,target);
  const stopRange=e.assembly&&target===s.player?(visibleBetween(s,e,target)&&(s.world.lineClear?s.world.lineClear(e,target):clearSegment(s.world,e,target,.05))?enemyAttackRange(e):0):null;
  if(s.exploration){if(!holding&&d>(stopRange??(e.role==='ranged'&&target===s.player&&firingLane?9:e.radius+.6)))navigateEnemy(s,e,target,e.speed*enemyPace(s,e)*slimePace(s,e)*(e.hitStagger>0?.1:1),dt);}
  else if(!holding&&d>(stopRange??(e.role==='ranged'?9:e.radius+.6))){const pace=enemyPace(s,e)*slimePace(s,e)*(e.hitStagger>0?.1:1),dx=(target.x-e.x)/d*e.speed*pace*dt,dz=(target.z-e.z)/d*e.speed*pace*dt,old={x:e.x,z:e.z};move(s.world,e,dx,dz,e.radius);if(distance(e,old)<.001)move(s.world,e,-dz,dx,e.radius);}
  if(visibleBetween(s,e,target)&&enemyPace(s,e)>0&&distance(e,target)<e.radius+1&&e.contact<=0){if(target===s.player)receiveDamage(s,1,st);else if(!e.assembly&&target===protectedNode)s.mission.targetHp-=e.damage;e.contact=1;}
 }
 tickHostileShots(s,dt,()=>receiveHit(s,st,{cause:'projectile'}));
 const due=s.abilities.echoes.filter(q=>q.at<=combatTime(s));s.abilities.echoes=s.abilities.echoes.filter(q=>q.at>combatTime(s));for(const q of due){const p=s.arms.find(p=>p?.id===q.partId);if(p)attack(s,0,st,p);}
 attack(s,dt,st);shotsStep(s,dt);tickEffects(s,dt,(e,d,source)=>hurtEnemy(s,e,d,0,source));s.enemies=s.enemies.filter(e=>e.hp>0);
 settleObjects(s);
 for(const q of s.xpDrops){if(!surfaceReach(s,q,s.player))continue;const d=distance(q,s.player);if(d<st.pickup){q.x+=(s.player.x-q.x)*Math.min(1,dt*8);q.z+=(s.player.z-q.z)*Math.min(1,dt*8);}if(d<.8){addXP(s,q.value);s.events.push({type:'experience'});q.value=0;}}s.xpDrops=s.xpDrops.filter(q=>q.value);
 tickRecoveryDrops(s,st);tickExtraParts(s,dt,(e,d,source)=>hurtEnemy(s,e,d,0,source));tickHealth(s,st);tickIsaacCombat(s,dt,(e,d,source)=>hurtEnemy(s,e,d,0,source));containChallenge(s,s.player);if(!s.dead&&s.hp>0)tickChallenge(s,dt);
 if(s.hp<=0){s.dead=true;s.events.push({type:'notice',text:'Душа возвращается.'});}
 tickOverrun(s,dt,(...args)=>spawnEnemy(s,...args),createPart);checkUnlocks(s);if(!s.dead&&!challengeWasActive)missionStep(s,dt);settleObjects(s);if(!s.dead){const items=autoPickup(s);if(items.length)s.events.push({type:'notice',text:items.length===1?`${CATALOG[items[0].key].name} · в инвентаре`:`Детали в инвентаре: ${items.length}`});}
}

export const beginEncounter=(s,id)=>startChallenge(s,id,(...args)=>spawnEnemy(s,...args));

export const beginOverrun=s=>startOverrun(s,(...args)=>spawnEnemy(s,...args));
export function applyStartingLoadout(s,choice){const c=validLoadout(s.profile,choice);s.body=createPart(s,c.body);const d=CATALOG[c.body];s.arms=Array.from({length:d.arms},(_,i)=>i===0?createPart(s,c.arm):null);s.legs=Array.from({length:d.legs},()=>createPart(s,'universal'));s.organs=Array.from({length:d.organs},(_,i)=>i===0&&c.organ?createPart(s,c.organ):null);s.hp=stats(s).hp;return c;}

export function rerollReward(s){if(s.pending)return spendReroll(s,()=>rollChoices(s,s.choices.map(c=>c.id)));const r=s.bossRewards?.[0];if(!r)return false;return spendReroll(s,()=>{const old=r.options.map(p=>p.key),next=[];for(let i=0;i<3;i++)next.push(generateLoot(s,createPart,lootTier(s.level,s.rng),'boss',r.rarity,false,[...old,...next.map(p=>p.key)]));r.options=next;});}

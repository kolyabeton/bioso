import {assignWaveEliteDisposition,bossEngaged} from './territories.js';
import {combatTime} from './mutations.js';
import {visibleBetween} from '../elevation.js';
import {phaseAt,WAVE_RULES,MINUTE_BUDGET} from './balance.js';
import {SURVIVAL_CADENCE,survivalSpawnLimit,survivalBudgetBetween,waveEliteAllowance} from './survival-cadence.js';
export function createWaves(){return{credit:0,nextElite:WAVE_RULES.eliteStart,nextBoss:WAVE_RULES.bossEvery,softCap:24,minuteSignature:'mass',budget:MINUTE_BUDGET};}
export const liveWaveElites=s=>s.enemies.filter(e=>e.hp>0&&e.waveElite);
export function minuteBudgetFactor(time){
 const second=((time%60)+60)%60,segment=MINUTE_BUDGET.find(q=>second>=q.from&&second<q.to)||MINUTE_BUDGET.at(-1);
 return segment.share/((segment.to-segment.from)/60);
}
export function waveBudgetBetween(start,end,multiplier=1){
 let total=0,at=Math.max(0,start),finish=Math.max(at,end);
 while(at<finish-1e-9){
  const second=((at%60)+60)%60,segment=MINUTE_BUDGET.find(q=>second>=q.from&&second<q.to)||MINUTE_BUDGET.at(-1);
  const nextMinuteSegment=at+(segment.to-second),nextAct=(Math.floor(at/480)+1)*480,next=Math.min(finish,nextMinuteSegment,nextAct),mid=(at+next)/2;
  const minuteRate=phaseAt(Math.floor(mid/60)*60).rate;
  total+=minuteRate/60*(next-at)*minuteBudgetFactor(mid)*multiplier;at=next;
 }
 return total;
}
function weightedRole(s,weights,exclude=null){
 const roles=['mass','fast','armored','ranged'],entries=roles.map((role,i)=>[role,weights[i]||0]).filter(([role,weight])=>weight>0&&role!==exclude);
 if(!entries.length)return'mass';let r=s.rng()*entries.reduce((sum,[,weight])=>sum+weight,0);
 for(const [role,weight]of entries){r-=weight;if(r<=0)return role;}return entries.at(-1)[0];
}
export function signatureRole(s,p){
 const signature=p.minuteSignature;
 if(['mass','fast','ranged','armored','flying'].includes(signature)&&s.rng()<.45)return signature;
 if(signature==='mixed'&&s.rng()<.45)return['fast','ranged','armored','flying'][Math.floor(s.rng()*4)];
 if(signature==='climax'&&s.rng()<.45)return['ranged','armored','flying'][Math.floor(s.rng()*3)];
 return weightedRole(s,p.weights,['mass','fast','ranged','armored','flying'].includes(signature)?signature:null);
}
/** Emits spawn requests; the coordinator owns placement and entity creation. */
export function tickWaves(s,dt,spawn){
 if(s.encounters?.active||s.overrun?.state==='active')return;
 const w=s.waves,p=phaseAt(s.time),pressure=survivalSpawnLimit(s);
 // Ordinary wave stragglers outside the battle area must not occupy the cap
 // forever while the player explores. No kills, loot, or XP for recycling.
 if(pressure)s.enemies=s.enemies.filter(e=>!(e.kind==='normal'&&e.waveSpawn&&!e.challengeId&&!e.summonOwner&&Math.hypot(e.x-s.player.x,e.z-s.player.z)>56));
 const resting=!!pressure?.rest,protectedRest=s.time<(s.reliefUntil||0),phaseKey=pressure?`${pressure.index}:${resting?'rest':'assault'}`:null;
 // Assault credit never spills into a lull (or the next assault). Each phase
 // starts from its own budget, so no blocked spawn debt can form a late clump.
 if(phaseKey!==null&&w.cadencePhase!==phaseKey){if(w.cadencePhase!==undefined)w.credit=0;w.cadencePhase=phaseKey;}
 // Compatibility aliases remain writable for focused simulation fixtures.
 w.nextElite=s.nextElite;w.nextBoss=s.nextBoss;
 if(pressure&&!pressure.intro&&!resting&&!protectedRest&&w.eliteCycle!==pressure.index){w.eliteCycle=pressure.index;if(Number.isFinite(w.nextElite))w.nextElite=Math.min(w.nextElite,pressure.at);}
 if(s.mode==='survival'&&!s.bossHabitats&&s.time>=w.nextBoss){spawn(w.nextBoss===2400?'final':'boss');w.nextBoss+=WAVE_RULES.bossEvery;}
 const bossAlive=s.enemies.some(bossEngaged),superBossAlive=s.enemies.some(e=>e.hp>0&&e.survivalSuperBoss);
 if(!resting&&!protectedRest&&s.time>=w.nextElite){if(!bossAlive&&waveEliteAllowance(s)&&(!pressure||s.enemies.filter(e=>e.hp>0).length<pressure.softCap))assignWaveEliteDisposition(s,spawn('elite',null,'mass',s.time,{wave:true}));w.nextElite=s.time+WAVE_RULES.eliteEvery;w.lastEliteAt=s.time;}
 const living=s.enemies.filter(e=>e.hp>0).length,softCap=pressure?.softCap??Math.max(1,Math.floor(p.softCap*(superBossAlive?WAVE_RULES.bossSoftCap:1)));
 w.softCap=softCap;w.minuteSignature=p.minuteSignature;w.budget=MINUTE_BUDGET;
 w.pressure=pressure?{index:pressure.index,rest:resting||protectedRest,until:pressure.until}:null;
 if(protectedRest||living>=softCap)w.credit=0;
 else if(pressure)w.credit+=survivalBudgetBetween(Math.max(s.time-dt,pressure.at,s.reliefUntil||0),s.time,pressure.startAt)*pressure.flow;
 else w.credit+=waveBudgetBetween(s.time-dt,s.time,superBossAlive?WAVE_RULES.bossFlow:1);
 while(w.credit>=1){
  w.credit--;const count=s.enemies.filter(e=>e.hp>0).length;if(count>=(pressure?SURVIVAL_CADENCE.cap:WAVE_RULES.cap)||count>=softCap){w.credit=0;break;}
  const role=pressure?.intro||resting?'mass':pressure&&s.rng()<.7?'mass':signatureRole(s,p),allowPromotion=waveEliteAllowance(s);
  assignWaveEliteDisposition(s,spawn('normal',null,role,s.time,{promote:allowPromotion,wave:true}));
 }
 s.nextElite=w.nextElite;s.nextBoss=w.nextBoss;s.spawnCredit=w.credit;
}

export function tickEnemyRanged(s,e,target){
 if(e.role!=='ranged'||e.hp<=0)return;
 if(e.windup)e.windup=null;
 if(e.frozenUntil>combatTime(s))return;
 if(!visibleBetween(s,e,target)||Math.hypot(e.x-target.x,e.z-target.z)>13||combatTime(s)<(e.shootAt??e.born+2))return;
 const dx=target.x-e.x,dz=target.z-e.z,d=Math.hypot(dx,dz)||1;
 const aim={dx:dx/d,dz:dz/d,dy:((target.y??0)-(e.y??0))/d,targetNode:target===s.player?null:target.id};e.shootAt=combatTime(s)+3.5;
 s.hostileShots.push({x:e.x,y:(e.y??0)+1,z:e.z,dy:aim.dy,dx:aim.dx,dz:aim.dz,life:WAVE_RULES.projectileLife,travel:0,key:'legacy',kind:e.kind,targetNode:aim.targetNode,damage:e.damage??1,missionScaled:!!e.missionRoomStrength});
 s.events.push({type:'enemy-shot',x:e.x,z:e.z,tx:e.x+aim.dx*13,tz:e.z+aim.dz*13});
}
export function tickHostileShots(s,dt,hit,intercept=null){
 for(const q of s.hostileShots){q.life-=dt;const old={x:q.x,y:q.y??1,z:q.z};const speed=q.speed??WAVE_RULES.projectileSpeed;q.x+=q.dx*speed*dt;q.z+=q.dz*speed*dt;q.y=(q.y??1)+(q.dy??0)*speed*dt;q.travel=(q.travel??0)+speed*dt;if(s.world.lineClear&&!s.world.lineClear(old,q)){q.life=0;continue;}
 if(intercept?.(q,old,q)){q.life=0;continue;}
 const target=q.targetNode?s.mission?.nodes.find(n=>n.id===q.targetNode):s.player;if(!target)continue;
 const dx=q.x-old.x,dz=q.z-old.z,t=Math.max(0,Math.min(1,((target.x-old.x)*dx+(target.z-old.z)*dz)/(dx*dx+dz*dz||1)));
 if(Math.hypot(target.x-old.x-t*dx,target.z-old.z-t*dz,(target.y??0)+1-old.y-t*((q.y??1)-old.y))<.7){if(q.targetNode)s.mission.targetHp--;else hit(q);q.life=0;}
 if(!s.world.lineClear&&!s.world.walkable(q.x,q.z))q.life=0;
 }s.hostileShots=s.hostileShots.filter(q=>q.life>0);
}

import {bossEngaged} from './territories.js';
import {combatTime} from './mutations.js';
import {visibleBetween} from '../elevation.js';
import {phaseAt,WAVE_RULES,SURVIVAL_PRESSURE} from './balance.js';
export function createWaves(){return{credit:0,nextElite:WAVE_RULES.eliteStart,nextBoss:WAVE_RULES.bossEvery};}
/** Emits spawn requests; the coordinator owns placement and entity creation. */
export function tickWaves(s,dt,spawn){
 const w=s.waves,p=phaseAt(s.time);
 // Compatibility aliases remain writable for focused simulation fixtures.
 w.nextElite=s.nextElite;w.nextBoss=s.nextBoss;
 if(s.mode==='survival'&&!s.bossHabitats&&s.time>=w.nextBoss){spawn(w.nextBoss===2400?'final':'boss');w.nextBoss+=WAVE_RULES.bossEvery;}
 const bossAlive=s.enemies.some(bossEngaged);
 if(s.time>=w.nextElite){if(!bossAlive&&(!s.bossHabitats||s.enemies.filter(e=>e.hp>0&&e.kind==='elite'&&!e.challengeId).length<6))spawn('elite');w.nextElite=s.time+WAVE_RULES.eliteEvery;w.lastEliteAt=s.time;}
 const cycle=s.time%60,pulse=cycle<12?1.35:cycle>48?.65:1;
 w.credit+=p.rate/60*dt*pulse*(bossAlive?WAVE_RULES.bossFlow:1)*(s.mode==='survival'?SURVIVAL_PRESSURE.rate:1);
 while(w.credit>=1){
  w.credit--;if(s.enemies.filter(e=>e.hp>0).length>=WAVE_RULES.cap){w.credit=0;break;}
  let r=s.rng(),role='mass';for(const [i,weight]of p.weights.entries()){r-=weight;if(r<=0){role=['mass','fast','armored','ranged'][i];break;}}
  if(s.mode==='survival'){
   const variant=s.rng();
   if(s.time>=30&&variant<.1)role='ranged';
   else if(s.time>=120&&variant>=.1&&variant<.18)role='flying';
   else if(s.time<480&&s.time>=90&&variant>=.18&&variant<.34)role='fast';
   else if(s.time<480&&s.time>=180&&variant>=.34&&variant<.44)role='armored';
  }
  spawn('normal',null,role);
 }
 s.nextElite=w.nextElite;s.nextBoss=w.nextBoss;s.spawnCredit=w.credit;
}

export const RANGED_WARNING=.7;
export function tickEnemyRanged(s,e,target){
 if(e.role!=='ranged'||e.hp<=0)return;
 if(e.frozenUntil>combatTime(s)){if(e.windup){e.windup=null;e.shootAt=e.frozenUntil;}return;}
 if(e.windup){
  if(combatTime(s)+1e-8<e.windup.at)return;
  const aim=e.windup;e.windup=null;e.shootAt=combatTime(s)+3.5;
  s.hostileShots.push({x:e.x,y:(e.y??0)+1,z:e.z,dy:aim.dy??0,dx:aim.dx,dz:aim.dz,life:WAVE_RULES.projectileLife,targetNode:aim.targetNode});
  s.events.push({type:'enemy-shot',x:e.x,z:e.z,tx:e.x+aim.dx*13,tz:e.z+aim.dz*13});return;
 }
 if(!visibleBetween(s,e,target)||Math.hypot(e.x-target.x,e.z-target.z)>13||combatTime(s)<(e.shootAt??e.born+2))return;
 const dx=target.x-e.x,dz=target.z-e.z,d=Math.hypot(dx,dz)||1;
 e.windup={at:combatTime(s)+RANGED_WARNING,started:combatTime(s),dx:dx/d,dz:dz/d,dy:((target.y??0)-(e.y??0))/d,targetNode:target===s.player?null:target.id};
 s.events.push({type:'danger',x:e.x,z:e.z});
}
export function tickHostileShots(s,dt,hit){
 for(const q of s.hostileShots){q.life-=dt;const old={x:q.x,y:q.y??1,z:q.z};const speed=q.speed??WAVE_RULES.projectileSpeed;q.x+=q.dx*speed*dt;q.z+=q.dz*speed*dt;q.y=(q.y??1)+(q.dy??0)*speed*dt;if(s.world.lineClear&&!s.world.lineClear(old,q)){q.life=0;continue;}
 const target=q.targetNode?s.mission?.nodes.find(n=>n.id===q.targetNode):s.player;if(!target)continue;
 const dx=q.x-old.x,dz=q.z-old.z,t=Math.max(0,Math.min(1,((target.x-old.x)*dx+(target.z-old.z)*dz)/(dx*dx+dz*dz||1)));
 if(Math.hypot(target.x-old.x-t*dx,target.z-old.z-t*dz,(target.y??0)+1-old.y-t*((q.y??1)-old.y))<.7){if(q.targetNode)s.mission.targetHp--;else hit();q.life=0;}
 if(!s.world.lineClear&&!s.world.walkable(q.x,q.z))q.life=0;
 }s.hostileShots=s.hostileShots.filter(q=>q.life>0);
}

import {WAVE_RULES} from './balance.js';
import {spawnPoint} from '../terrain.js';

// The third minute starts at 2:00. Assaults grow one measured step at a time;
// their 35-second lulls retain only a sparse mass-enemy trickle.
export const SURVIVAL_CADENCE=Object.freeze({
 start:120,introRate:3,introSoftCap:6,assault:65,rest:35,
 restRate:6,restSoftCap:8,cap:120,burstSeconds:10,
 startRate:48,rateStep:15,maxRate:240,
 startSoftCap:20,softCapStep:6,
 startBurst:8,burstStep:3,maxBurst:48,
 firstEliteDamage:.5
});
export function survivalCadenceAt(time){
 const {start,assault,rest,cap}=SURVIVAL_CADENCE,cycle=assault+rest;
 if(time<start)return null;
 const index=Math.floor((time-start)/cycle),at=start+index*cycle,elapsed=time-at,resting=elapsed>=assault;
 return {index,at,elapsed,rest:resting,until:at+(resting?cycle:assault),
  rate:resting?SURVIVAL_CADENCE.restRate:Math.min(SURVIVAL_CADENCE.maxRate,SURVIVAL_CADENCE.startRate+index*SURVIVAL_CADENCE.rateStep),
  softCap:resting?SURVIVAL_CADENCE.restSoftCap:Math.min(cap,SURVIVAL_CADENCE.startSoftCap+index*SURVIVAL_CADENCE.softCapStep),
  burst:Math.min(SURVIVAL_CADENCE.maxBurst,SURVIVAL_CADENCE.startBurst+index*SURVIVAL_CADENCE.burstStep),eliteCap:Math.min(WAVE_RULES.eliteCap,index+1)};
}
// Both scheduled elites and automatic promotions spend the same per-assault
// quota. Survivors occupy slots, and kills never refund a slot in this wave.
export function waveEliteAllowance(s){
 const live=s.enemies.filter(e=>e.hp>0&&(e.waveElite||e.wavePressureIndex!=null)).length;
 if(s.mode!=='survival')return live<WAVE_RULES.eliteCap;
 const p=survivalCadenceAt(s.time);if(!p)return false;
 let budget=s.waves.eliteWave;
 if(budget?.index!==p.index)budget=s.waves.eliteWave={index:p.index,issued:live};
 return !p.rest&&s.time>=(s.reliefUntil||0)&&budget.issued<p.eliteCap&&live<p.eliteCap;
}
export function recordWaveElite(s,e){
 if(s.mode!=='survival'||e.wavePressureIndex!=null)return;
 // Placement succeeded; failed spawn attempts must not consume the quota.
 const p=survivalCadenceAt(s.time);if(!p)return;
 e.wavePressureIndex=p.index;s.waves.eliteWave.issued++;
}
export function survivalSpawnLimit(s){
 if(s.mode!=='survival')return null;
 if(s.time<SURVIVAL_CADENCE.start)return{index:-1,at:0,elapsed:s.time,rest:false,until:SURVIVAL_CADENCE.start,rate:SURVIVAL_CADENCE.introRate,softCap:SURVIVAL_CADENCE.introSoftCap,burst:0,eliteCap:0,flow:1,intro:true};
 const cadence=survivalCadenceAt(s.time);
 if(!cadence)return null;
 const superBoss=s.enemies.some(e=>e.hp>0&&e.survivalSuperBoss);
 return {...cadence,softCap:Math.floor(cadence.softCap*(superBoss?WAVE_RULES.bossSoftCap:1)),flow:superBoss?WAVE_RULES.bossFlow:1};
}
export function survivalBudgetBetween(start,end){
 let at=Math.max(0,start),total=0;
 if(at<SURVIVAL_CADENCE.start){const introEnd=Math.min(end,SURVIVAL_CADENCE.start);total+=(introEnd-at)*SURVIVAL_CADENCE.introRate/60;at=introEnd;}
 while(at<end-1e-9){
 const p=survivalCadenceAt(at),next=Math.min(end,p.until);
  total+=(next-at)*p.rate/60;
  at=next;
 }
 return total;
}
export function survivalWavePosition(s,radius){
 const motion=s.motion||{},speed=Math.hypot(motion.x||0,motion.z||0);
 // A moving explorer meets the next front instead of leaving every spawn
 // behind. Keep a full safe approach distance and some pressure on all sides.
 if(speed>1&&s.rng()<.75){
  const heading=Math.atan2(motion.z,motion.x);
  for(let i=0;i<24;i++){
   const angle=heading+(s.rng()-.5)*Math.PI,d=20+s.rng()*8;
   const p={x:s.player.x+Math.cos(angle)*d,z:s.player.z+Math.sin(angle)*d};
   if(s.world.walkable(p.x,p.z,radius))return p;
  }
 }
 return spawnPoint(s.world,s.player,s.rng,20,28,radius);
}

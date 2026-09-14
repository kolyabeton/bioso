import {WAVE_RULES} from './balance.js';
import {spawnPoint} from '../terrain.js';

// The cadence shape uses 2:00 as its simulation origin. Production Survival
// rebases that origin to 15 seconds after the introductory boss dies.
// Assaults grow one measured step at a time; their 35-second lulls retain only
// a sparse mass-enemy trickle.
export const SURVIVAL_CADENCE=Object.freeze({
 start:120,introRate:3,introSoftCap:6,assault:65,rest:35,
 restRate:6,restSoftCap:8,cap:120,burstSeconds:10,
 startRate:48,rateStep:15,maxRate:240,
 startSoftCap:20,softCapStep:6,
 startBurst:8,burstStep:3,maxBurst:48,
 firstEliteDamage:.5
});
export const SURVIVAL_FIRST_WAVE_DELAY=15;
export function survivalFirstWaveAt(s){
 if(Number.isFinite(s?.survivalFirstWaveAt))return s.survivalFirstWaveAt;
 // Focused simulations without an authored opening boss retain the canonical
 // cadence origin. A real Survival run waits until that boss has been killed.
 return s?.mode==='survival'&&s.introBossId?Infinity:SURVIVAL_CADENCE.start;
}
export function scheduleFirstSurvivalWave(s,defeatedAt=s.time){
 const at=defeatedAt+SURVIVAL_FIRST_WAVE_DELAY,eliteAt=at+(WAVE_RULES.eliteStart-SURVIVAL_CADENCE.start);
 s.survivalFirstWaveAt=at;s.reliefUntil=Math.max(s.reliefUntil||0,at);s.waves.credit=0;
 s.nextElite=eliteAt;s.waves.nextElite=eliteAt;
 return at;
}
export function survivalCadenceAt(time,start=SURVIVAL_CADENCE.start){
 const {assault,rest,cap}=SURVIVAL_CADENCE,cycle=assault+rest;
 if(time<start)return null;
 let index=Math.floor((time-start)/cycle);
 // A fractional boss-death time can round subtraction below an exact boundary.
 // Compare absolute timestamps so budget integration always advances past it.
 if(time>=start+(index+1)*cycle)index++;
 const at=start+index*cycle,elapsed=time-at,resting=time>=at+assault;
 return {index,at,elapsed,rest:resting,until:resting?start+(index+1)*cycle:at+assault,
  rate:resting?SURVIVAL_CADENCE.restRate:Math.min(SURVIVAL_CADENCE.maxRate,SURVIVAL_CADENCE.startRate+index*SURVIVAL_CADENCE.rateStep),
  softCap:resting?SURVIVAL_CADENCE.restSoftCap:Math.min(cap,SURVIVAL_CADENCE.startSoftCap+index*SURVIVAL_CADENCE.softCapStep),
  burst:Math.min(SURVIVAL_CADENCE.maxBurst,SURVIVAL_CADENCE.startBurst+index*SURVIVAL_CADENCE.burstStep),eliteCap:Math.min(WAVE_RULES.eliteCap,index+1)};
}
export const survivalCadenceForRun=s=>survivalCadenceAt(s.time,survivalFirstWaveAt(s));
// Both scheduled elites and automatic promotions spend the same per-assault
// quota. Survivors occupy slots, and kills never refund a slot in this wave.
export function waveEliteAllowance(s){
 const live=s.enemies.filter(e=>e.hp>0&&(e.waveElite||e.wavePressureIndex!=null)).length;
 if(s.mode!=='survival')return live<WAVE_RULES.eliteCap;
 const p=survivalCadenceForRun(s);if(!p)return false;
 let budget=s.waves.eliteWave;
 if(budget?.index!==p.index)budget=s.waves.eliteWave={index:p.index,issued:live};
 return !p.rest&&s.time>=(s.reliefUntil||0)&&budget.issued<p.eliteCap&&live<p.eliteCap;
}
export function recordWaveElite(s,e){
 if(s.mode!=='survival'||e.wavePressureIndex!=null)return;
 // Placement succeeded; failed spawn attempts must not consume the quota.
 const p=survivalCadenceForRun(s);if(!p)return;
 e.wavePressureIndex=p.index;s.waves.eliteWave.issued++;
}
export function survivalSpawnLimit(s){
 if(s.mode!=='survival')return null;
 const start=survivalFirstWaveAt(s);
 if(s.time<start)return{index:-1,at:0,elapsed:s.time,rest:false,until:start,startAt:start,rate:SURVIVAL_CADENCE.introRate,softCap:SURVIVAL_CADENCE.introSoftCap,burst:0,eliteCap:0,flow:1,intro:true};
 const cadence=survivalCadenceAt(s.time,start);
 if(!cadence)return null;
 const superBoss=s.enemies.some(e=>e.hp>0&&e.survivalSuperBoss);
 return {...cadence,startAt:start,softCap:Math.floor(cadence.softCap*(superBoss?WAVE_RULES.bossSoftCap:1)),flow:superBoss?WAVE_RULES.bossFlow:1};
}
export function survivalBudgetBetween(start,end,firstWaveAt=SURVIVAL_CADENCE.start){
 let at=Math.max(0,start),total=0;
 if(at<firstWaveAt){const introEnd=Math.min(end,firstWaveAt);total+=(introEnd-at)*SURVIVAL_CADENCE.introRate/60;at=introEnd;}
 while(at<end-1e-9){
 const p=survivalCadenceAt(at,firstWaveAt),next=Math.min(end,p.until);
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

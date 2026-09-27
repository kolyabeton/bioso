import {difficultyProfile,difficultyNormalCount} from './difficulty.js';
import {WAVE_RULES,survivalPressureProfile} from './balance.js';
import {spawnPoint} from '../terrain.js';
import {eventCollisionWorld} from '../gameplay-modules/event-collision.js';

export const SURVIVAL_CADENCE=Object.freeze({
 density:1.5,
 start:120,introRate:3,introSoftCap:6,reinforcement:15,rest:20,cap:120,
 startSoftCap:20,softCapStep:6,firstEliteDamage:.5,
 // A pack is far larger than the crowd allowed on screen, so members keep streaming in
 // while the player fights; the last stragglers are not worth chasing, so the pack
 // hands over as soon as this few are left.
 packScale:1.8,packCap:200,restThreshold:10,
 // Every fifth wave fields five elites, plus one per three full run minutes.
 elitePulseEvery:5,elitePulseBase:5,elitePulseStep:180,
 // Share of normal slots that is plain filler; the rest cycles unlocked roles.
 massShare:.4
});
export function survivalFirstWaveAt(s){
 if(Number.isFinite(s?.survivalFirstWaveAt))return s.survivalFirstWaveAt;
 // Only bare simulation fixtures have no authored opening boss.
 return s?.introBossId?Infinity:SURVIVAL_CADENCE.start;
}
export function survivalWaveSpec(index,time=0){
 const base=SURVIVAL_CADENCE.startSoftCap+index*SURVIVAL_CADENCE.softCapStep,pressure=survivalPressureProfile(time);
 const packSize=Math.min(SURVIVAL_CADENCE.packCap,Math.ceil(base*SURVIVAL_CADENCE.packScale*pressure.count));
 const liveCap=Math.min(SURVIVAL_CADENCE.cap,Math.ceil(base*pressure.live));
 const baseEliteCap=Math.min(WAVE_RULES.eliteCap,index+1),ordinary=time<18*60?baseEliteCap:Math.min(packSize,pressure.eliteCap);
 const elitePulse=(index+1)%SURVIVAL_CADENCE.elitePulseEvery===0;
 const pulseEliteCap=SURVIVAL_CADENCE.elitePulseBase+Math.floor(Math.max(0,time)/SURVIVAL_CADENCE.elitePulseStep);
 const eliteCap=elitePulse?Math.min(packSize,pulseEliteCap):ordinary;
 return {index,packSize,liveCap,eliteCap,elitePulse};
}
function beginRest(s,q,at){
 q.phase='rest';q.restUntil=at+difficultyProfile(s.difficulty).rest;s.waves.credit=s.spawnCredit=0;
}
function beginWave(s,index){
 const q=s.waves.cadence={...survivalWaveSpec(index,s.time),at:s.time,phase:'main',pack:0,issued:0,packElitesIssued:0,rosters:null,reinforcementUntil:null,restUntil:null};
 s.waves.credit=s.spawnCredit=0;s.waves.eliteWave={index,issued:0};
 return q;
}
export function startNextSurvivalWave(s){
 if(s.mode!=='survival'||s.waves.cadence)return s.waves.cadence?.at;
 s.survivalFirstWaveAt=s.time;beginWave(s,0);return s.time;
}
export function survivalCadenceForRun(s){
 if(s.mode!=='survival')return null;
 const q=s.waves.cadence;if(!q)return null;
 return {...q,elapsed:s.time-q.at,rest:q.phase==='rest',until:q.restUntil??Infinity,softCap:q.liveCap??q.packSize};
}
export function advanceSurvivalWave(s){
 if(s.mode!=='survival'||s.encounters?.active||s.overrun?.state==='active'||s.dead||s.won&&!s.continued)return;
 let q=s.waves.cadence;
 if(!q){if(s.time>=survivalFirstWaveAt(s))beginWave(s,0);return;}
 if(q.phase==='reinforcement'&&s.time>=q.reinforcementUntil)beginRest(s,q,q.reinforcementUntil);
 if(q.phase==='rest'){
  if(s.time>=q.restUntil)beginWave(s,q.index+1);
  return;
 }
 if(q.issued<q.packSize)return;
 const left=s.enemies.filter(e=>e.hp>0&&e.survivalWaveIndex===q.index&&e.survivalWavePack===q.pack);
 const budgetUnits=new Set(left.map(e=>e.groupId?`group:${e.groupId}`:`enemy:${e.id}`)).size;
 if(budgetUnits>=Math.min(SURVIVAL_CADENCE.restThreshold,q.packSize))return;
 // Nobody has to hunt the last few, and nobody takes them off the field either: the
 // cadence hands over while they keep fighting, so they still have to be killed.
 if(q.pack===0){q.phase='reinforcement';q.pack=1;if(q.rosters)q.packSize=q.rosters[1].length;q.issued=0;q.packElitesIssued=0;q.reinforcementUntil=s.time+SURVIVAL_CADENCE.reinforcement;}
 else beginRest(s,q,s.time);
 s.waves.credit=s.spawnCredit=0;
}
export function waveEliteAllowance(s){
 const live=s.enemies.filter(e=>e.hp>0&&(e.waveElite||e.wavePressureIndex!=null)).length;
 if(s.mode!=='survival')return live<WAVE_RULES.eliteCap;
 const q=s.waves.cadence;if(!q||q.phase==='rest')return false;
 const packCap=q.pack===0?Math.ceil(q.eliteCap/2):Math.floor(q.eliteCap/2);
 const currentLive=s.enemies.filter(e=>e.hp>0&&e.survivalWaveIndex===q.index&&(e.waveElite||e.wavePressureIndex!=null)).length;
 return q.packElitesIssued<packCap&&s.waves.eliteWave.issued<q.eliteCap&&currentLive<q.eliteCap;
}
export function recordWaveElite(s,e){
 if(s.mode!=='survival'||e.wavePressureIndex!=null)return;
 const q=s.waves.cadence;if(!q)return;
 e.wavePressureIndex=q.index;q.packElitesIssued++;s.waves.eliteWave.issued++;
}
export function survivalSpawnLimit(s){
 if(s.mode!=='survival')return null;
 const p=survivalCadenceForRun(s);
 if(!p)return {index:-1,at:0,elapsed:s.time,rest:false,until:survivalFirstWaveAt(s),rate:SURVIVAL_CADENCE.introRate*SURVIVAL_CADENCE.density,softCap:difficultyNormalCount(s,SURVIVAL_CADENCE.introSoftCap*SURVIVAL_CADENCE.density),eliteCap:0,intro:true};
 const superBoss=s.enemies.some(e=>e.hp>0&&e.survivalSuperBoss);
 return {...p,softCap:Math.floor(Math.max(Math.ceil(p.eliteCap/2),p.softCap*difficultyProfile(s.difficulty).normalCount*SURVIVAL_CADENCE.density)*(superBoss?WAVE_RULES.bossSoftCap:1))};
}
// Warmup is the only continuous Survival budget. Finite waves own their roster.
export function survivalBudgetBetween(start,end,firstWaveAt=SURVIVAL_CADENCE.start){
 return Math.max(0,Math.min(end,firstWaveAt)-Math.max(0,start))*SURVIVAL_CADENCE.introRate*SURVIVAL_CADENCE.density/60;
}
export function survivalWavePosition(s,radius){
 const world=eventCollisionWorld(s),motion=s.motion||{},speed=Math.hypot(motion.x||0,motion.z||0);
 // A moving explorer meets the next front instead of leaving every spawn
 // behind. Keep a full safe approach distance and some pressure on all sides.
 if(speed>1&&s.rng()<.75){
  const heading=Math.atan2(motion.z,motion.x);
  for(let i=0;i<24;i++){
   const angle=heading+(s.rng()-.5)*Math.PI,d=20+s.rng()*8;
   const p={x:s.player.x+Math.cos(angle)*d,z:s.player.z+Math.sin(angle)*d};
   if(world.walkable(p.x,p.z,radius))return p;
  }
 }
 return spawnPoint(world,s.player,s.rng,20,28,radius);
}

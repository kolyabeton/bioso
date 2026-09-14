import {SURVIVAL_CADENCE,survivalCadenceAt,survivalSpawnLimit,waveEliteAllowance} from './survival-cadence.js';
import {assignWaveEliteDisposition} from './territories.js';
const PATTERNS=['ring','pincers','perimeter','spiral'];

function nextSpec(index){
 const at=SURVIVAL_CADENCE.start+index*(SURVIVAL_CADENCE.assault+SURVIVAL_CADENCE.rest);
 return{at,count:survivalCadenceAt(at).burst,pattern:PATTERNS[index%PATTERNS.length]};
}
function position(s,pattern,index,count){
 const spread=index/Math.max(1,count-1),side=index%2?1:-1;
 if(pattern==='pincers')return{x:s.player.x+side*(24+8*spread),z:s.player.z+(spread-.5)*34};
 if(pattern==='perimeter'){const a=index*Math.PI*2/count;return{x:s.player.x+Math.cos(a)*(32+6*Math.sin(index*2.1)),z:s.player.z+Math.sin(a)*(32+6*Math.sin(index*2.1))};}
 if(pattern==='spiral'){const a=index*.72,r=17+18*spread;return{x:s.player.x+Math.cos(a)*r,z:s.player.z+Math.sin(a)*r};}
 const a=index*Math.PI*2/count;return{x:s.player.x+Math.cos(a)*27,z:s.player.z+Math.sin(a)*27};
}
export function tickSurvivalHordes(s,dt,spawn){
 if(s.mode!=='survival'||s.encounters?.active||s.overrun?.state==='active')return;
 const h=s.survivalHordes??={index:0,queue:null};
 const pressure=survivalSpawnLimit(s);if(!pressure)return;
 if(pressure.intro){h.queue=null;return;}
 if(pressure.rest||s.time<(s.reliefUntil||0)){h.queue=null;h.index=Math.max(h.index,pressure.index+1);return;}
 if(h.queue?.at!==pressure.at)h.queue=null;
 // Skip expired/blocked openings, never catch up old waves on return.
 if(h.index<=pressure.index){
  h.index=pressure.index+1;
  if(pressure.elapsed<SURVIVAL_CADENCE.burstSeconds){
   const spec=nextSpec(pressure.index),count=Math.floor(spec.count*pressure.flow);
   h.queue={...spec,count,spawned:Math.floor(count*pressure.elapsed/SURVIVAL_CADENCE.burstSeconds),duration:SURVIVAL_CADENCE.burstSeconds};
  }
 }
 const q=h.queue;if(!q)return;
 q.elapsed=Math.min(q.duration,pressure.elapsed);
 const due=Math.min(q.count,Math.floor(q.count*q.elapsed/q.duration));
 let living=s.enemies.filter(e=>e.hp>0).length;
 while(q.spawned<due){
  const index=q.spawned++;if(living>=pressure.softCap)continue;
  const p=position(s,q.pattern,index,q.count);if(s.world.heightAt)p.y=s.world.heightAt(p.x,p.z)??0;
  const role=index%10===0?'ranged':index%5===0?'fast':'mass',promote=waveEliteAllowance(s);
  const e=spawn('normal',p,role,s.time,{promote,wave:true})||spawn('normal',null,role,s.time,{promote,wave:true});
  if(e){assignWaveEliteDisposition(s,e);e.hordePattern=q.pattern;e.hordeEvent=true;living++;}
 }
 if(q.spawned>=q.count)h.queue=null;
}
export const survivalHordeSchedule=index=>nextSpec(index);

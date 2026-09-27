import {combatTime} from './mutations.js';
import {bodyRadius,playerAttackRange,visibleBetween,spatialDistance} from '../elevation.js';
import {moveCreature} from '../gameplay-modules/event-collision.js';

import {WHIP_DURATION,WHIP_HIT_PHASE,WHIP_PULL_PHASE,WHIP_PULL_DURATION} from '../whip-timing.js';
export function queueWhipStrike(s,p,w,event,echo=false){
 if(!echo)p.whipAttacks=(p.whipAttacks||0)+1;
 const duration=Math.min(WHIP_DURATION,Math.max(.06,w.interval));
 Object.assign(event,{duration,echo,strikeRange:playerAttackRange(s,w),whipGather:!echo&&p.whipAttacks%3===0});
 const aim=Math.atan2(event.tz-event.z,event.tx-event.x);
 (s.whipStrikes??=[]).push({event,w,aim,origin:{x:event.x,y:event.y,z:event.z},at:event.at+duration*WHIP_HIT_PHASE,pullAt:event.at+duration*WHIP_PULL_PHASE});
}
export function tickWhipStrikes(s,deal,targetable,onImpact=()=>{}){
 const now=combatTime(s);
 s.whipStrikes=(s.whipStrikes||[]).filter(hit=>{
  if(s.dead||!s.arms.some(p=>p?.id===hit.event.source&&p.key==='whip'&&!p.disabled))return false;
  if(!hit.struck&&now>=hit.at){
   hit.struck=[];
   for(const e of s.enemies){
    if(!targetable(s,e)||spatialDistance(hit.origin,e)>hit.event.strikeRange+(e.radius||0)||!visibleBetween(s,hit.origin,e))continue;
    const a=Math.atan2(e.z-hit.origin.z,e.x-hit.origin.x),delta=Math.atan2(Math.sin(a-hit.aim),Math.cos(a-hit.aim));
    if(Math.abs(delta)<=hit.w.angle/2&&deal(s,e,hit.w))hit.struck.push(e);
   }
   s.events.push({...hit.event,type:'attack',at:hit.at,animationStarted:true,hitCount:hit.struck.length});
   onImpact(hit);
  }
  if(!hit.pulled&&now>=hit.pullAt){
   hit.pulled=true;
   if(hit.event.whipGather){
    const targets=hit.struck.filter(e=>e.hp>0&&['normal','elite'].includes(e.kind));
    for(const e of targets){
     const tx=hit.origin.x+Math.cos(hit.aim)*hit.event.strikeRange,tz=hit.origin.z+Math.sin(hit.aim)*hit.event.strikeRange;
     const dx=tx-e.x,dz=tz-e.z,len=Math.hypot(dx,dz),amount=Math.min(e.kind==='elite'?1:5,len);
     if(len<1e-6)continue;
     // Each new grab owns movement from the creature's current position.
     e.whipPull={source:hit.event.source,start:hit.pullAt,end:hit.pullAt+WHIP_PULL_DURATION,last:0,dx:dx/len*amount,dz:dz/len*amount};
     e.kickX=e.kickZ=0;
    }
    s.events.push({type:'whip-grab',source:hit.event.source,targets,at:hit.pullAt});
   }
  }
  return !hit.pulled;
 });
 for(const e of s.enemies){
  const p=e.whipPull;if(!p)continue;
  if(e.hp<=0||s.dead||!s.arms.some(a=>a?.id===p.source&&a.key==='whip'&&!a.disabled)){delete e.whipPull;continue;}
  const t=Math.max(0,Math.min(1,(now-p.start)/WHIP_PULL_DURATION)),progress=t*t*(3-2*t),delta=progress-p.last;p.last=progress;
  if(delta>0){const steps=Math.max(1,Math.ceil(Math.hypot(p.dx,p.dz)*delta/.2)),dx=p.dx*delta/steps,dz=p.dz*delta/steps,gap=bodyRadius(s)+(e.radius||.48)+.6;
   for(let i=0;i<steps;i++){const before=Math.hypot(e.x-s.player.x,e.z-s.player.z),after=Math.hypot(e.x+dx-s.player.x,e.z+dz-s.player.z);if(after<gap&&after<before)break;moveCreature(s,e,dx,dz,e.radius);}
  }
  if(t>=1)delete e.whipPull;
 }
}

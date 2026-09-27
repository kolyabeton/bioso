import {runnerFireFraction,weaponStats} from '../assembly.js';
import {surfaceReach,spatialDistance} from '../elevation.js';
import {modifiers} from './abilities.js';

export const RUNNER_FIRE_DURATION=3;
export const RUNNER_FIRE_RADIUS=.8;
const SPACING=.75,MAX_TRAILS=120;

export function recordRunnerFire(s,from){
 const runners=(s.legs||[]).filter(p=>p?.key==='runner');
 if(!runners.length){s.runnerFireDistance=0;return;}
 const weapon=(s.arms||[]).filter(p=>p&&!p.disabled&&p.key!=='drone').map(p=>weaponStats(s,p).damage).reduce((a,b)=>Math.max(a,b),0);
 if(weapon<=0)return;
 s.fireTrails??=[];
 const dx=s.player.x-from.x,dz=s.player.z-from.z,length=Math.hypot(dx,dz);
 if(length<1e-6)return;
 const dps=weapon*Math.max(...runners.map(runnerFireFraction)),duration=RUNNER_FIRE_DURATION+(modifiers(s).burnDuration||0);
 let next=SPACING-(s.runnerFireDistance||0);
 while(next<=length+1e-8){
  const x=from.x+dx*next/length,z=from.z+dz*next/length,y=s.world.heightAt?.(x,z);
  if(y!==null)(s.fireTrails??=[]).push({id:++s.entityId,x,z,y:y??s.player.y??0,radius:RUNNER_FIRE_RADIUS,life:duration,duration,dps});
  next+=SPACING;
 }
 s.runnerFireDistance=(s.runnerFireDistance||0)+length;
 s.runnerFireDistance%=SPACING;
 if(s.fireTrails.length>MAX_TRAILS)s.fireTrails.splice(0,s.fireTrails.length-MAX_TRAILS);
}

export function tickRunnerFire(s,dt,damage){
 const trails=s.fireTrails||[];if(!trails.length)return;
 const hits=new Map();
 for(const trail of trails)if(trail.life>0){
  for(const e of s.enemySpatial?.queryCircle(trail.x,trail.z,trail.radius+2)??s.enemies)if(e.hp>0&&!e.flying&&surfaceReach(s,trail,e)&&spatialDistance(trail,e)<=trail.radius+(e.radius||0))hits.set(e,Math.max(hits.get(e)||0,trail.dps*Math.min(dt,trail.life)));
  trail.life-=dt;
 }
 for(const [e,amount] of hits)damage(e,amount,'burn');
 s.fireTrails=trails.filter(trail=>trail.life>0);
}

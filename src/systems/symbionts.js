import {combatTime} from './mutations.js';
import {spatialDistance as dist,visibleBetween} from '../elevation.js';

// Simulation owns every flight phase. A bee can only deal damage at the target.
export function tickSymbionts(s,dt,b,strike){
 const now=combatTime(s),companions=s.abilities.companions;
 for(const [i,c]of companions.entries()){
  c.y??=s.player.y??0;c.cooldown=Math.max(0,c.cooldown-dt);
  const valid=e=>e&&e.hp>0&&dist(s.player,e)<=10&&visibleBetween(s,s.player,e)&&visibleBetween(s,c,e);
  let target=s.enemies.find(e=>e.id===c.target);
  if(!valid(target)||dist(c,s.player)>13){target=null;c.target=null;c.phase='escort';}
  if(!target&&dist(c,s.player)<5){
   target=s.enemies.filter(valid).sort((a,d)=>{
    const score=e=>dist(c,e)+(companions.some(q=>q!==c&&q.target===e.id)?3:0);
    return score(a)-score(d);
   })[0];
   if(target){c.target=target.id;c.phase='approach';}
  }
  let destination,speed;
  if(target){
   if(c.phase==='retreat'&&now<c.retreatUntil){destination=c.retreat;speed=6;}
   else{
    c.phase='approach';
    const dx=c.x-target.x,dz=c.z-target.z,d=Math.hypot(dx,dz)||1,stand=(target.radius||.5)+.3;
    destination={x:target.x+dx/d*stand,z:target.z+dz/d*stand,y:target.y??0};speed=9;
   }
  }else{
   // Independent drifting escort slots, never a shared circular orbit.
   const side=i%2?1:-1,phase=i*2.7;
   destination={x:s.player.x+side*(1.6+Math.sin(now*1.3+phase)*.4),z:s.player.z+.65+Math.sin(now*.83+phase)*.65,y:s.player.y??0};
   speed=dist(c,s.player)>4?12:3.5;c.phase='escort';
  }
  const dx=destination.x-c.x,dz=destination.z-c.z,d=Math.hypot(dx,dz),travel=Math.min(d,speed*dt),next={x:c.x+(d?dx/d*travel:0),z:c.z+(d?dz/d*travel:0),y:c.y+((destination.y??c.y)-c.y)*Math.min(1,dt*8)};
  const oldX=c.x,oldZ=c.z;
  if(visibleBetween(s,c,next)){Object.assign(c,next);}
  else{
   // Slide along an occluder instead of flying through it.
   for(const p of [{...next,z:c.z},{...next,x:c.x}])if(visibleBetween(s,c,p)){Object.assign(c,p);break;}
  }
  c.speed=dt>0?Math.hypot(c.x-oldX,c.z-oldZ)/dt:0;
  const aim=c.speed>.05?Math.atan2(c.x-oldX,c.z-oldZ):target?Math.atan2(target.x-c.x,target.z-c.z):(c.aim??0);
  const turn=Math.atan2(Math.sin(aim-(c.aim??aim)),Math.cos(aim-(c.aim??aim)));
  c.aim=(c.aim??aim)+turn*Math.min(1,dt*14);c.bank=turn*.35;
  const altitude=target?(c.phase==='retreat'?1.9:1.05):1.5;
  c.hover=(c.hover??1.5)+(altitude-(c.hover??1.5))*Math.min(1,dt*7);
  if(dt<=0||!target||c.phase!=='approach'||c.cooldown>0||dist(c,target)>(target.radius||.5)+.65||!visibleBetween(s,c,target))continue;
  c.cooldown=1/(1+(b.summonRate||0));c.attacks++;c.lastShotAt=now;
  c.aim=Math.atan2(target.x-c.x,target.z-c.z);
  strike(c,target);
  c.phase='retreat';c.retreatUntil=now+.38;
  const side=i%2?1:-1,angle=c.aim+Math.PI+side*.7;
  c.retreat={x:c.x+Math.sin(angle)*2.2,z:c.z+Math.cos(angle)*2.2,y:c.y};
 }
}

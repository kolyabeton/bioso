import {setBonuses,syncSetState,SET_TIMING} from './sets/bonuses.js';
import {soulProc} from './soul-procs.js';
import {combatTime} from './mutations.js';
import {CATALOG} from '../catalog.js';
import {summonPartBonus,droneStats,pollinatorDamage} from './summon-equipment.js';
import {spatialDistance as dist,visibleBetween} from '../elevation.js';
import {enemyTargetable} from './enemy-locomotion.js';
import {bodyTraitState,broodCompanionCount} from './body-traits.js';

export function summonTuning(s,b={}){
 const strongest=(parts,key,stat,limit)=>(parts||[]).filter(p=>p?.key===key).sort((a,b)=>summonPartBonus(b,stat)-summonPartBonus(a,stat)).slice(0,limit);
 const legs=strongest(s.legs,'swarmLeg','summonDamage',3),nodes=strongest(s.organs,'broodNode','summonDamage',2),brood=s.body?.key==='broodmother'&&bodyTraitState(s).active;
 const broodCount=brood?broodCompanionCount(s):0;
 const colonyCount=Math.max(0,Math.floor(b.summons||0));
 const sets=setBonuses(s),setCount=sets.summons;
 const baseCount=broodCount+colonyCount,drones=(s.arms||[]).filter(p=>p?.key==='drone'&&!p.disabled);
 const sharedPollinatorDamage=pollinatorDamage(s),biteDamage=6+sharedPollinatorDamage;
 const rate=1+(b.summonRate||0)+sets.summonRate;
 return{count:baseCount+setCount+drones.length,baseCount,colonyCount,setCount,drones,pollinatorDamage:sharedPollinatorDamage,biteDamage,damage:1+(b.summonDamage||0)+legs.reduce((n,p)=>n+summonPartBonus(p,'summonDamage'),0)+nodes.reduce((n,p)=>n+summonPartBonus(p,'summonDamage'),0),rate,replacementInterval:1.2/rate,speed:1,search:12,droneSearch:CATALOG.drone.range,returnDistance:18,contactInvulnerable:true,bossDamage:1+(b.summonBossDamage||0)};
}

/** Preserve progress when a temporary set boost changes attack and replacement rates. */
export function syncSwarmRate(s,rate){
 const a=s.abilities,previous=a.companionRate??rate,now=combatTime(s);a.companionRate=rate;
 if(previous===rate)return;
 for(const c of a.companions||[])c.cooldown=Math.max(0,c.cooldown||0)*previous/rate;
 for(const key of Object.keys(a.companionSummonReadyAt||{}))a.companionSummonReadyAt[key]=now+Math.max(0,a.companionSummonReadyAt[key]-now)*previous/rate;
}

export function destroySymbiont(s,c,b={},minimumDelay=0){
 const sets=syncSetState(s);if(sets.active.broodmother){sets.broodUntil=combatTime(s)+SET_TIMING.brood;soulProc(s,'set-broodmother',s.player);}
 const tuning=summonTuning(s,b),source=tuning.drones.find(p=>p.id===c.sourcePartId),naturalInterval=(source?droneStats(source).interval:1.2)/tuning.rate,interval=Math.max(naturalInterval,minimumDelay);
 syncSwarmRate(s,tuning.rate);
 const sourceKey=c.sourceKey??c.id,readyAt=combatTime(s)+interval,a=s.abilities;
 if(b.droneDeathBlast&&!c.deathBlastQueued){c.deathBlastQueued=true;(a.droneBlasts??=[]).push({x:c.x,y:c.y??0,z:c.z,radius:3,damage:tuning.biteDamage*tuning.damage*(b.droneDeathBlastDamage||1),kind:'death'});}
 a.companions=a.companions.filter(q=>q!==c);(a.companionSummonReadyAt??={})[sourceKey]=readyAt;a.swarmInterceptions=(a.swarmInterceptions||0)+1;
 return{interval,readyAt,sourceKey};
}

function recallCompanion(c,player){
 // Recover at the owner's safe position, retaining the equipped weapon and cooldown.
 c.x=player.x;c.y=player.y??0;c.z=player.z;c.target=null;c.phase='escort';
 c.speed=0;c.bank=0;c.stuckTime=0;delete c.retreat;delete c.retreatUntil;
}

// Simulation owns every flight phase. A bee can only deal damage at the target.
export function tickSymbionts(s,dt,b,strike){
 const now=combatTime(s),companions=s.abilities.companions,tuning=summonTuning(s,b);
 const dungeon=s.encounters?.active?.dungeon?s.encounters.active.id:null,eligible=e=>enemyTargetable(e)&&(!dungeon||e.challengeId===dungeon)&&dist(s.player,e)<=tuning.search&&visibleBetween(s,s.player,e);
 const sharedFocus=b.summonFocus?s.enemies.filter(eligible).sort((a,d)=>{
  const priority=e=>e.kind==='final'||e.kind==='boss'?-1000:e.kind==='elite'?-500:0;
  return priority(a)-priority(d)||dist(s.player,a)-dist(s.player,d);
 })[0]:null;
 for(const [i,c]of companions.entries()){
  // Contact damage cannot kill helpers. Intercepted helpers are removed before this flight tick.
  delete c.hp;delete c.maxHp;
  c.y??=s.player.y??0;c.cooldown=Math.max(0,c.cooldown-dt);
  // Room transitions and a fast-moving owner must not leave a weapon behind.
  if(dt>0&&(!Number.isFinite(dist(c,s.player))||dist(c,s.player)>tuning.returnDistance)){
   recallCompanion(c,s.player);continue;
  }
  const reach=c.sourcePartId!=null?tuning.droneSearch:tuning.search;
  const valid=e=>eligible(e)&&dist(s.player,e)<=reach&&visibleBetween(s,c,e);
  let target=valid(sharedFocus)?sharedFocus:s.enemies.find(e=>e.id===c.target);
  if(valid(target))c.target=target.id;
  if(!valid(target)||dist(c,s.player)>tuning.returnDistance){target=null;c.target=null;c.phase='escort';}
  if(!target&&dist(c,s.player)<5){
   target=s.enemies.filter(valid).sort((a,d)=>{
    const priority=e=>e.kind==='final'||e.kind==='boss'?-12:e.kind==='elite'?-6:0,score=e=>dist(c,e)+priority(e)+(companions.some(q=>q!==c&&q.target===e.id)?3:0);
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
    destination={x:target.x+dx/d*stand,z:target.z+dz/d*stand,y:target.y??0};speed=9*tuning.speed;
   }
  }else{
   // Independent drifting escort slots, never a shared circular orbit.
   const side=i%2?1:-1,phase=i*2.7;
   destination={x:s.player.x+side*(1.6+Math.sin(now*1.3+phase)*.4),z:s.player.z+.65+Math.sin(now*.83+phase)*.65,y:s.player.y??0};
   speed=(dist(c,s.player)>4?12:3.5)*tuning.speed;c.phase='escort';
  }
  const dx=destination.x-c.x,dz=destination.z-c.z,d=Math.hypot(dx,dz),travel=Math.min(d,speed*dt),next={x:c.x+(d?dx/d*travel:0),z:c.z+(d?dz/d*travel:0),y:c.y+((destination.y??c.y)-c.y)*Math.min(1,dt*8)};
  const oldX=c.x,oldZ=c.z;
  if(visibleBetween(s,c,next)){Object.assign(c,next);}
  else{
   // Slide along an occluder instead of flying through it.
   for(const p of [{...next,z:c.z},{...next,x:c.x}])if(visibleBetween(s,c,p)){Object.assign(c,p);break;}
  }
  if(dt>0){
   const progress=d-Math.hypot(destination.x-c.x,destination.z-c.z);
   c.stuckTime=d>.5&&progress<travel*.2?(c.stuckTime||0)+dt:0;
   // Axis sliding cannot escape every corner. Bound the time a drone can be stranded.
   if(c.stuckTime>=1.5){recallCompanion(c,s.player);continue;}
  }
  c.speed=dt>0?Math.hypot(c.x-oldX,c.z-oldZ)/dt:0;
  const aim=c.speed>.05?Math.atan2(c.x-oldX,c.z-oldZ):target?Math.atan2(target.x-c.x,target.z-c.z):(c.aim??0);
  const turn=Math.atan2(Math.sin(aim-(c.aim??aim)),Math.cos(aim-(c.aim??aim)));
  c.aim=(c.aim??aim)+turn*Math.min(1,dt*14);c.bank=turn*.35;
  const altitude=target?(c.phase==='retreat'?1.9:1.05):1.5;
  c.hover=(c.hover??1.5)+(altitude-(c.hover??1.5))*Math.min(1,dt*7);
  const source=tuning.drones.find(p=>p.id===c.sourcePartId);
  const attackReach=source?droneStats(source).attackRadius:.65;
  if(dt<=0||!target||c.phase!=='approach'||c.cooldown>0||dist(c,target)>(target.radius||.5)+attackReach||!visibleBetween(s,c,target))continue;
  c.cooldown=(source?droneStats(source).interval:1.2)/tuning.rate;c.attacks++;c.lastShotAt=now;
  c.aim=Math.atan2(target.x-c.x,target.z-c.z);
  strike(c,target);
  c.phase='retreat';c.retreatUntil=now+.38;
  const side=i%2?1:-1,angle=c.aim+Math.PI+side*.7;
  c.retreat={x:c.x+Math.sin(angle)*2.2,z:c.z+Math.cos(angle)*2.2,y:c.y};
 }
}

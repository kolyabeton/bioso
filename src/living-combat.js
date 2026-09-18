import {soulProc} from './systems/soul-procs.js';
import {combatTime} from './systems/mutations.js';
import {spatialDistance,visibleBetween} from './elevation.js';
import {moveCreature} from './gameplay-modules/event-collision.js';
import {modifiers} from './systems/abilities.js';
import {enemyMovementOwned} from './systems/enemy-locomotion.js';

export const VOLATILE={radius:3.2,trigger:3.1,fuse:1.6,every:7,start:12};
const distance=spatialDistance;

// Only automatic spawns: missions and explicit test/encounter placements stay unchanged.
export function decorateLivingEnemy(s,e,automatic){
 if(!automatic||e.kind!=='normal')return;
 s.livingSpawnSerial=(s.livingSpawnSerial||0)+1;
 if((e.waveSpawn?e.threat:s.time)>=VOLATILE.start&&s.livingSpawnSerial%VOLATILE.every===0&&e.role==='mass'&&!e.volatile){e.volatile=true;e.hp=e.maxHp=Math.max(1,Math.round(e.maxHp*.6));e.speed*=1.15;e.armor=0;}
}

/** Returns true while this enemy owns its movement (arming or spent). */
export function tickVolatile(s,e,dt,hurtEnemy,hitPlayer){
 if(!e.volatile||e.hp<=0)return false;
 if(e.fuseRemaining==null){
  if(distance(e,s.player)>VOLATILE.trigger||!visibleBetween(s,e,s.player)||e.frozenUntil>combatTime(s))return false;
  e.fuseRemaining=VOLATILE.fuse;
  e.fuseAnchor={x:e.x,z:e.z};e.kickX=e.kickZ=0;
  // Arming replaces locomotion, including the burrow's temporary invulnerability.
  delete e.locomotionState;
  s.events.push({type:'fuse-start',x:e.x,y:e.y??0,z:e.z,radius:VOLATILE.radius});
  return true;
 }
 // Also recover enemies whose fuse started before locomotion was cancelled.
 delete e.locomotionState;
 if(e.detonated){hurtEnemy(e,Number.MAX_SAFE_INTEGER);return true;}
 if(e.fuseAnchor){e.x=e.fuseAnchor.x;e.z=e.fuseAnchor.z;e.kickX=e.kickZ=0;}
 if(e.frozenUntil>combatTime(s))return true;
 e.fuseRemaining=Math.max(0,e.fuseRemaining-dt);
 if(e.fuseRemaining>1e-8)return true;
 e.detonated=true;
 s.events.push({type:'volatile-blast',x:e.x,y:e.y??0,z:e.z,radius:VOLATILE.radius});
 if(distance(e,s.player)<=VOLATILE.radius&&visibleBetween(s,e,s.player))hitPlayer();
 hurtEnemy(e,Number.MAX_SAFE_INTEGER);
 return true;
}

/** Spatial bins keep neighbour tests local. No displacement of player or fixed objectives. */
export function separateEnemies(s,dt){
 const cell=4,bins=new Map(),active=s.enemies.filter(e=>e.hp>0&&e.kind!=='objective'&&!e.flying);
 let checks=0;
 const now=combatTime(s),mobility=v=>v.bossOwner||v.bossCombat?0:v.fuseRemaining!=null||v.frozenUntil>now||enemyMovementOwned(v)?0:v.kind==='normal'?1:.15;
 for(const e of active){const x=Math.floor(e.x/cell),z=Math.floor(e.z/cell);let row=bins.get(x);if(!row)bins.set(x,row=new Map());let bin=row.get(z);if(!bin)row.set(z,bin=[]);bin.push(e);}
 for(const e of active){
  const cx=Math.floor(e.x/cell),cz=Math.floor(e.z/cell);
  for(let x=cx-1;x<=cx+1;x++)for(let z=cz-1;z<=cz+1;z++)for(const q of bins.get(x)?.get(z)||[]){
   if(q.id<=e.id||Math.abs((q.y??0)-(e.y??0))>1)continue;checks++;
   const dx=q.x-e.x,dz=q.z-e.z,d=Math.hypot(dx,dz),gap=(e.radius+q.radius)*1.15;
   if(d>=gap)continue;
   const a=((e.id*31+q.id*17)%360)*Math.PI/180,nx=d>1e-6?dx/d:Math.cos(a),nz=d>1e-6?dz/d:Math.sin(a);
   const shift=Math.min((gap-d)*.5,dt*2);
   // Armed/frozen units hold their telegraphed position; bosses are much heavier.
   moveCreature(s,e,-nx*shift*mobility(e),-nz*shift*mobility(e),e.radius);
   moveCreature(s,q,nx*shift*mobility(q),nz*shift*mobility(q),q.radius);
  }
 }
 return checks;
}

/** One generation only: direct projectile kills may produce three real damaging shards. */
export function splinterShots(s,shot,enemy,enabled=modifiers(s).splinter){
 if((shot.mode??shot.w?.mode)!=='projectile'||shot.isSplinter||shot.w?.secondary||!enabled||enemy.hp>0)return[];
 soulProc(s,'splinter',enemy,{dx:shot.dx,dz:shot.dz});
 const start=Math.atan2(shot.dz,shot.dx),w={...shot.w,damage:shot.w.damage*.35,crit:0,critPower:1,knockback:1,pierce:1,mode:'projectile'};
 return Array.from({length:3},(_,i)=>{
  const a=start+i*Math.PI*2/3;
  return{id:++s.entityId,source:shot.source,x:enemy.x,y:(enemy.y??0)+1,z:enemy.z,dy:0,dx:Math.cos(a),dz:Math.sin(a),life:.8,speed:18,w,hit:new Set([enemy.id]),remaining:1,mode:'projectile',travel:0,isSplinter:true};
 });
}

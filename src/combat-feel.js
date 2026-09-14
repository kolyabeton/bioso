import {modifiers} from './systems/abilities.js';
import {reloadDuration} from './systems/sets-loot.js';
import {carried,def,stats,weaponStats} from './assembly.js';
import {move} from './terrain.js';
import {armCanReach} from './body-facing.js';
import {spatialDistance,visibleBetween} from './elevation.js';
import {isMelee} from './systems/weapon-specialization.js';

export const SHOOT_MOVE_FACTOR=.5;
export const IDLE_RELOAD_DELAY=.8;
export const ELITE_KNOCKBACK_RESISTANCE=.15;

export function startReload(s,p){
 const w=def(p);
 if(!w.magazine||p.reloadRemaining>0||p.ammo>=w.magazine)return false;
 p.reloadDuration=reloadDuration(s,p,w.reload)*Math.max(.2,1-(modifiers(s).weaponReload||0));p.reloadRemaining=p.reloadDuration;
 s.events.push({type:'reload-start',source:p.id,key:p.key,x:s.player.x,z:s.player.z});
 return true;
}
export function tickWeapons(s,dt){
 for(const p of carried(s)){
  p.recoil=(p.recoil||0)*Math.exp(-12*dt);
  if(Number.isFinite(p.attackAge)&&p.attackAge<.32)p.attackAge=Math.min(.32,p.attackAge+dt);
  p.bloom=Math.max(0,(p.bloom||0)-dt*.8);
  if(!def(p).magazine)continue;
  p.ammo??=def(p).magazine;
  if(p.reloadRemaining>0){
   p.reloadRemaining=Math.max(0,p.reloadRemaining-dt);
   if(p.reloadRemaining<1e-8){p.reloadRemaining=0;p.ammo=def(p).magazine;p.fullSalvoReady=!!modifiers(s).fullSalvo;s.events.push({type:'reload-end',source:p.id,key:p.key,x:s.player.x,z:s.player.z});}
  }
 }
}
export function consumeRound(s,p){
 if(!def(p).magazine)return;
 p.ammo=Math.max(0,p.ammo-1);p.idleFor=0;p.recoil=1;p.attackAge=0;p.bloom=Math.min(2,(p.bloom||0)+.6);
 if(p.ammo===0)startReload(s,p);
}
// Stored on the part so switching slots never toggles a different weapon.
export function toggleWeapon(s,slot){
 const p=s.arms[slot];if(!p)return false;
 p.disabled=!p.disabled;
 return true;
}
export function movementFactor(s,st=stats(s)){
 const shooting=s.arms.some(p=>p&&!p.disabled&&['projectile','rocket','acid'].includes(def(p).mode)&&Number.isFinite(p.attackAge)&&p.attackAge<.12);
 return shooting?SHOOT_MOVE_FACTOR:1;
}
export function hitFeedback(s,e,w,direction=null){
 e.hitFlash=.16;
 if(w.knockback){
  const dx=direction?.dx??e.x-s.player.x,dz=direction?.dz??e.z-s.player.z,len=Math.hypot(dx,dz)||1;
  const resistance=e.kind==='normal'?3.5:e.kind==='elite'?ELITE_KNOCKBACK_RESISTANCE:e.kind==='objective'?0:.08;
  e.kickX=(e.kickX||0)+dx/len*w.knockback*resistance;e.kickZ=(e.kickZ||0)+dz/len*w.knockback*resistance;
  const kick=Math.hypot(e.kickX,e.kickZ),cap=e.kind==='normal'?(w.knockbackCap??22):8;
  if(kick>cap){e.kickX*=cap/kick;e.kickZ*=cap/kick;}
  if(e.kind==='normal')e.hitStagger=Math.max(e.hitStagger||0,w.hitStagger??.1);
 }
 s.events.push({type:'hit',...(w.key==='shotgun'?{key:w.key}:null),x:e.x,y:e.y??0,z:e.z,dx:direction?.dx??(e.x-s.player.x),dz:direction?.dz??(e.z-s.player.z),killed:e.hp<=0,radius:e.radius||.6});
}
export function tickImpact(s,e,dt){
 e.hitFlash=Math.max(0,(e.hitFlash||0)-dt);
 e.hitStagger=Math.max(0,(e.hitStagger||0)-dt);
 const damping=Math.exp(-8*dt),integral=(1-damping)/8;
 if(e.kickX||e.kickZ){move(s.world,e,(e.kickX||0)*integral,(e.kickZ||0)*integral,e.radius);e.kickX*=damping;e.kickZ*=damping;}
}

import {spatialDistance,visibleBetween,surfaceReach} from '../../elevation.js';
import {soulProc} from '../soul-procs.js';
import {modifiers} from '../abilities.js';
import {magazineCapacity} from './affixes.js';
import {SET_TIMING,setClock,setMelee,syncSetState} from './bonuses.js';

/** Once per emitted primary arm attack, before making any projectiles. */
export function prepareSetAttack(s,p,w,repeat=false){
 if(repeat||w.secondary||p.key==='drone')return w;
 const a=syncSetState(s),next={...w};
 if(a.active.hunter&&!setMelee(w)){
  a.hunterShots=(a.hunterShots+1)%3;next.setHunterMultiplier=a.hunterShots===0?1.6:1;
  if(next.setHunterMultiplier>1)soulProc(s,'set-hunter',s.player);
 }
 return next;
}

/** After consuming this attack's round: the third arm also receives a full magazine. */
export function finishSetAttack(s,p,w,damage){
 if(w.secondary||p.key==='drone')return;
 const a=syncSetState(s),now=setClock(s);
 if(a.active.hecaton&&now>=a.hecatonAt){
  const installed=new Set(s.arms.filter(p=>p&&!p.disabled).map(p=>String(p.id)));
  a.hands=Object.fromEntries(Object.entries(a.hands).filter(([id,at])=>installed.has(id)&&now-at<=SET_TIMING.handWindow));
  a.hands[p.id]=now;
  if(Object.keys(a.hands).length>=3){
   a.hecatonAt=now+SET_TIMING.hecaton;a.hands={};
   for(const arm of s.arms.filter(Boolean)){
    const size=magazineCapacity(arm,modifiers(s).ammoCapacity);if(!size)continue;
    arm.ammo=size;arm.reloadRemaining=0;arm.reloadDuration=0;arm.idleFor=0;
    arm.fullSalvoReady=!!modifiers(s).fullSalvo;
    s.events.push({type:'reload-end',source:arm.id,key:arm.key,x:s.player.x,z:s.player.z});
   }
   soulProc(s,'set-hecaton',s.player);
  }
 }
 if(a.active.reactor&&now>=a.reactorAt){
  a.reactorAt=now+SET_TIMING.reactor;
  const dungeon=s.encounters?.active?.dungeon?s.encounters.active.id:null;
  for(const enemy of [...s.enemies]){
   if(enemy.hp<=0||enemy.dungeonDormant||(dungeon&&enemy.challengeId!==dungeon)||spatialDistance(s.player,enemy)>4||!visibleBetween(s,s.player,enemy))continue;
   damage(enemy,w.damage*.8,'set-reactor');
   s.events.push({type:'arc',x:s.player.x,y:s.player.y??0,z:s.player.z,tx:enemy.x,ty:enemy.y??0,tz:enemy.z});
  }
  soulProc(s,'set-reactor',s.player);
 }
}

export function tickSetCollector(s){
 const a=syncSetState(s),now=setClock(s);
 if(!a.active.wanderer||now<a.collectorAt)return;
 a.collectorAt=now+SET_TIMING.collector;
 for(const drop of s.xpDrops){
  if(drop.value>0&&spatialDistance(drop,s.player)<=20&&surfaceReach(s,drop,s.player))drop.setAttracted=true;
 }
 soulProc(s,'set-collector',s.player);
}

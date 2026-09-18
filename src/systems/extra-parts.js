import {combatTime} from './mutations.js';
import {visibleBetween,spatialDistance,bodyRadius} from '../elevation.js';
import {eventObstacles,eventMovementClear,moveCreature} from '../gameplay-modules/event-collision.js';
const state=s=>s.extraParts??={springCharge:0,springReady:false,springReadyAt:0,springLeapUntil:0,springDodgeUntil:0};
export const springCooldown=p=>10-(Math.max(1,Math.min(5,Math.floor(p?.tier??1)))-1)*1.25;
export const SPRING_LEAP_DISTANCE=2.5;
export const SPRING_LEAP_DURATION=.42;

function safeSpringLanding(s,x,z,ignoredEnemy=null){
 const world=s.world,from=s.player,r=bodyRadius(s),height=world.heightAt?.(x,z);
 if(height===null||world.walkable&&!world.walkable(x,z,r)||!eventMovementClear(eventObstacles(s),from,x,z,r))return null;
 if(s.streaming&&!s.streaming.ready.has(world.tileAt?.(x,z)?.id))return null;
 const active=s.encounters?.active;if(active?.type==='sealed'&&Math.hypot(x-active.x,z-active.z)>active.radius-.7)return null;
 if(s.enemies.some(e=>e!==ignoredEnemy&&e.hp>0&&Math.hypot(x-e.x,z-e.z)<r+(e.radius??.6)+.6))return null;
 if((s.enemyAcidPools||[]).some(p=>p.life>0&&Math.hypot(x-p.x,z-p.z)<r+(p.radius??2.2)+.35))return null;
 return{x,y:height??from.y??0,z};
}

export function springLanding(s,dx,dz,ignoredEnemy=null){
 const length=Math.hypot(dx,dz);if(length<.1)return null;
 return safeSpringLanding(s,s.player.x+dx/length*SPRING_LEAP_DISTANCE,s.player.z+dz/length*SPRING_LEAP_DISTANCE,ignoredEnemy);
}
export function pullHarpoon(s,e){if(e.kind!=='normal'||e.hp<=0)return;const d=spatialDistance(e,s.player)||1,amount=Math.min(3,Math.max(0,d-e.radius-1.5));if(!visibleBetween(s,e,s.player))return;moveCreature(s,e,(s.player.x-e.x)/d*amount,(s.player.z-e.z)/d*amount,e.radius);}
export function tickExtraParts(s,dt,hurt){
 const a=state(s),t=combatTime(s);
 const m=s.motion||{},length=Math.hypot(m.x||0,m.z||0),spring=s.legs.some(p=>p?.key==='spring');
 if(!spring||length<.1){a.springCharge=0;a.direction=null;if(!spring)a.springReady=false;return;}
 const dir={x:m.x/length,z:m.z/length};
 if(!a.springReady&&t>=a.springReadyAt){a.springCharge=Math.min(3,a.springCharge+dt);if(a.springCharge>=3)a.springReady=true;}
 a.direction=dir;
}

/** Consume a charged spring on enemy contact before contact damage resolves. */
export function springContact(s,enemy){
 const a=state(s),t=combatTime(s);if(!a.springReady||t<a.springReadyAt||!s.legs.some(p=>p?.key==='spring'))return false;
 const cooldown=Math.min(...s.legs.filter(p=>p?.key==='spring').map(springCooldown));
 const motion=s.motion||{},moving=Math.hypot(motion.x||0,motion.z||0),direction=moving>.1?motion:a.direction;if(!direction)return false;
 let dx=direction.x,dz=direction.z,length=Math.hypot(dx,dz);if(length<.1)return false;dx/=length;dz/=length;
 const from={x:s.player.x,y:s.player.y??s.world.heightAt?.(s.player.x,s.player.z)??0,z:s.player.z},landing=springLanding(s,dx,dz,enemy);if(!landing)return false;
 Object.assign(s.player,landing);
 a.springReady=false;a.springCharge=0;a.springReadyAt=t+cooldown;a.springLeapUntil=t+SPRING_LEAP_DURATION;a.springDodgeUntil=t+.5;
 s.events.push({type:'spring-leap',kind:'spring',x:from.x,y:from.y,z:from.z,tx:landing.x,ty:landing.y,tz:landing.z,dx,dz,duration:SPRING_LEAP_DURATION});
 return true;
}

import {combatTime} from './mutations.js';
import {spatialDistance} from '../elevation.js';
import {eventCollisionWorld,moveCreature} from '../gameplay-modules/event-collision.js';
import {clearSegment,navigateEnemy} from '../world-navigation.js';

export const ENEMY_LOCOMOTION=Object.freeze({
 // Hoppers and diggers cover twice the ground per cycle they used to: longer leaps and
 // dives on a tighter clock, so neither reads as a slow novelty next to a plain walker.
 hop:Object.freeze({compress:.14,travel:.26,land:.2,distance:7.2}),
 burrow:Object.freeze({dive:.35,travel:.55,emerge:.45,distance:6,interval:2.1}),
 sprint:Object.freeze({build:1,multiplier:2.2,turn:80*Math.PI/180}),
 pack:Object.freeze({stage:1.6,attack:.8,radius:3.4}),
 charge:Object.freeze({windup:.65,travel:.55,recovery:.7,distance:5,minRange:4,maxRange:7,cooldown:3.2}),
});

const result=(movementOwned=false,attackLocked=false,contactAllowed=true)=>({movementOwned,attackLocked,contactAllowed});
const wrap=value=>Math.atan2(Math.sin(value),Math.cos(value));
const samePack=(a,b)=>a.challengeId===b.challengeId&&a.groupId===b.groupId;

export const enemyInvulnerable=e=>e?.locomotionState?.kind==='burrow'&&e.locomotionState.phase==='travel';
export const enemyTargetable=e=>!!e&&e.hp>0&&!enemyInvulnerable(e);
export const enemyMovementOwned=e=>!!e?.locomotionState&&['hop','burrow','charge'].includes(e.locomotionState.kind);

function safeEndpoint(s,e,target,maximum,stopDistance=0){
 const dx=target.x-e.x,dz=target.z-e.z,d=Math.hypot(dx,dz);if(d<.01)return null;
 const world=eventCollisionWorld(s),limit=Math.min(maximum,Math.max(0,d-stopDistance));
 for(let amount=limit;amount>=.25;amount-=.25){
  const point={x:e.x+dx/d*amount,z:e.z+dz/d*amount};
  if((!world.walkable||world.walkable(point.x,point.z,e.radius))&&clearSegment(world,e,point,e.radius,!!e.flying))return point;
 }
 return null;
}

function moveToProgress(s,e,state,progress){
 const x=state.from.x+(state.to.x-state.from.x)*progress,z=state.from.z+(state.to.z-state.from.z)*progress;
 const before={x:e.x,z:e.z};moveCreature(s,e,x-e.x,z-e.z,e.radius);
 return Math.hypot(e.x-before.x,e.z-before.z);
}

function clearMotion(e,delay=0,now=0){
 delete e.locomotionState;
 if(delay)e.locomotionReadyAt=Math.max(e.locomotionReadyAt||0,now+delay);
}

function frozenResult(e,now){
 if(e.locomotionState?.kind==='pack')e.locomotionState.joinCycle=Math.floor(now/(ENEMY_LOCOMOTION.pack.stage+ENEMY_LOCOMOTION.pack.attack))+1;
 else if(e.locomotionState)clearMotion(e,.5,now);
 return result(true,true,false);
}

function tickHop(s,e,target,dt,speed,stopDistance,now){
 const rules=ENEMY_LOCOMOTION.hop,total=rules.compress+rules.travel+rules.land;
 let state=e.locomotionState;
 if(state?.kind!=='hop'){
  if(now<(e.locomotionReadyAt||0))return result(true,false,spatialDistance(e,target)<=stopDistance);
  const to=safeEndpoint(s,e,target,rules.distance,stopDistance);
  if(!to){e.locomotionReadyAt=now+.3;return result(true,false,spatialDistance(e,target)<=stopDistance);}
  state=e.locomotionState={kind:'hop',phase:'compress',startedAt:now,from:{x:e.x,z:e.z},to,lastPhase:'compress'};
  s.events.push({type:'enemy-hop-start',target:e.id,x:e.x,y:e.y??0,z:e.z,tx:to.x,tz:to.z,duration:rules.travel});
 }
 const age=Math.max(0,now-state.startedAt);
 if(age>=total){clearMotion(e,0,now);e.locomotionReadyAt=now;return result(true,false,true);}
 if(age<rules.compress)state.phase='compress';
 else if(age<rules.compress+rules.travel){state.phase='travel';moveToProgress(s,e,state,(age-rules.compress)/rules.travel);}
 else {state.phase='land';moveToProgress(s,e,state,1);}
 if(state.phase==='land'&&state.lastPhase!=='land')s.events.push({type:'enemy-hop-land',target:e.id,x:e.x,y:e.y??0,z:e.z});
 state.lastPhase=state.phase;
 return result(true,state.phase!=='land',state.phase==='land');
}

function tickSpiral(s,e,target,dt,speed,stopDistance){
 const d=spatialDistance(e,target);if(d<=stopDistance)return result(false,false,true);
 const state=e.locomotionState?.kind==='spiral'?e.locomotionState:(e.locomotionState={kind:'spiral',side:e.id%2?1:-1});
 const dx=(target.x-e.x)/(d||1),dz=(target.z-e.z)/(d||1),amount=speed*dt;
 const attempt=side=>{const vx=dx*.68-dz*.74*side,vz=dz*.68+dx*.74*side,n=Math.hypot(vx,vz)||1,before={x:e.x,z:e.z};moveCreature(s,e,vx/n*amount,vz/n*amount,e.radius);return Math.hypot(e.x-before.x,e.z-before.z);};
 if(attempt(state.side)<amount*.2){state.side*=-1;attempt(state.side);}
 return result(true,false,true);
}

function tickBurrow(s,e,target,dt,speed,stopDistance,now){
 const rules=ENEMY_LOCOMOTION.burrow,total=rules.dive+rules.travel+rules.emerge;
 let state=e.locomotionState;
 if(state?.kind!=='burrow'){
  if(now<(e.locomotionReadyAt||0)||spatialDistance(e,target)<=stopDistance+.5)return result(false,false,true);
  const to=safeEndpoint(s,e,target,rules.distance,stopDistance);
  if(!to){e.locomotionReadyAt=now+.5;return result(false,false,true);}
  state=e.locomotionState={kind:'burrow',phase:'dive',startedAt:now,from:{x:e.x,z:e.z},to,lastPhase:'dive'};
  s.events.push({type:'enemy-burrow-start',target:e.id,x:e.x,y:e.y??0,z:e.z,tx:to.x,tz:to.z,duration:rules.travel});
 }
 const age=Math.max(0,now-state.startedAt);
 if(age>=total){clearMotion(e,0,now);e.locomotionReadyAt=Math.max(now,state.startedAt+rules.interval);s.events.push({type:'enemy-burrow-emerge',target:e.id,x:e.x,y:e.y??0,z:e.z});return result(true,true,false);}
 if(age<rules.dive)state.phase='dive';
 else if(age<rules.dive+rules.travel){state.phase='travel';moveToProgress(s,e,state,(age-rules.dive)/rules.travel);}
 else {state.phase='emerge';moveToProgress(s,e,state,1);}
 state.lastPhase=state.phase;
 return result(true,true,false);
}

function tickSprint(s,e,target,dt,speed,stopDistance){
 const rules=ENEMY_LOCOMOTION.sprint,d=spatialDistance(e,target);
 if(d<=stopDistance){if(e.locomotionState?.kind==='sprint')e.locomotionState.boost=0;return result(false,false,true);}
 const desired=Math.atan2(target.x-e.x,target.z-e.z),state=e.locomotionState?.kind==='sprint'?e.locomotionState:(e.locomotionState={kind:'sprint',heading:desired,boost:0});
 state.heading+=Math.max(-rules.turn*dt,Math.min(rules.turn*dt,wrap(desired-state.heading)));state.boost=Math.min(rules.build,state.boost+dt);
 const multiplier=1+(rules.multiplier-1)*state.boost/rules.build,amount=speed*multiplier*dt,before={x:e.x,z:e.z};
 moveCreature(s,e,Math.sin(state.heading)*amount,Math.cos(state.heading)*amount,e.radius);
 if(Math.hypot(e.x-before.x,e.z-before.z)<amount*.2){state.boost=0;state.heading=desired;}
 return result(true,false,true);
}

function packPeers(s,e){return s.enemies.filter(q=>q.hp>0&&q.locomotion==='pack'&&samePack(q,e)).sort((a,b)=>a.id-b.id);}
function tickPack(s,e,target,dt,speed,stopDistance,now){
 const rules=ENEMY_LOCOMOTION.pack,cycleLength=rules.stage+rules.attack,cycle=Math.floor(now/cycleLength),phase=now-cycle*cycleLength;
 let state=e.locomotionState;if(state?.kind!=='pack')state=e.locomotionState={kind:'pack',joinCycle:cycle+(phase>=rules.stage?1:0)};
 const peers=packPeers(s,e),slot=Math.max(0,peers.indexOf(e)),angle=(slot/Math.max(1,peers.length))*Math.PI*2+(cycle%2)*Math.PI/Math.max(1,peers.length);
 const staging=cycle<state.joinCycle||phase<rules.stage;
 if(staging){
  const point={x:target.x+Math.sin(angle)*rules.radius,z:target.z+Math.cos(angle)*rules.radius};
  if(Math.hypot(point.x-e.x,point.z-e.z)>.25)navigateEnemy(s,e,point,speed,dt);
  return result(true,true,false);
 }
 if(spatialDistance(e,target)>stopDistance)navigateEnemy(s,e,target,speed*1.35,dt);
 return result(true,false,true);
}

function finishCharge(e,state,now){clearMotion(e,0,now);e.locomotionReadyAt=Math.max(now+ENEMY_LOCOMOTION.charge.cooldown,state.startedAt+ENEMY_LOCOMOTION.charge.windup+ENEMY_LOCOMOTION.charge.travel+ENEMY_LOCOMOTION.charge.recovery);}
function tickCharge(s,e,target,dt,speed,stopDistance,now){
 const rules=ENEMY_LOCOMOTION.charge,total=rules.windup+rules.travel+rules.recovery;
 let state=e.locomotionState;
 if(state?.kind!=='charge'){
  const d=spatialDistance(e,target);if(now<(e.locomotionReadyAt||0)||d<rules.minRange||d>rules.maxRange)return result(false,false,true);
  const to=safeEndpoint(s,e,target,rules.distance,stopDistance);if(!to)return result(false,false,true);
  state=e.locomotionState={kind:'charge',phase:'windup',startedAt:now,from:{x:e.x,z:e.z},to};
  s.events.push({type:'enemy-charge-warning',target:e.id,x:e.x,y:e.y??0,z:e.z,tx:to.x,tz:to.z,duration:rules.windup});
 }
 const age=Math.max(0,now-state.startedAt);
 if(age>=total){finishCharge(e,state,now);return result(false,false,true);}
 if(age<rules.windup)state.phase='windup';
 else if(age<rules.windup+rules.travel){state.phase='travel';moveToProgress(s,e,state,(age-rules.windup)/rules.travel);}
 else {state.phase='recovery';moveToProgress(s,e,state,1);}
 return result(true,true,state.phase==='travel');
}

/** Owns only locomotion. Weapons and contact resolution stay in the shared combat loop. */
export function tickEnemyLocomotion(s,e,target,dt,{speed=e.speed,stopDistance=e.radius+.6}={}){
 if(!e.locomotion||e.hp<=0||e.kind==='boss'||e.kind==='final'||e.specialty||e.territory&&e.territory.state!=='engaged'&&!e.challengeId){if(e.locomotionState)delete e.locomotionState;return result();}
 const now=combatTime(s);if(e.frozenUntil>now)return frozenResult(e,now);
 switch(e.locomotion){
  case'hop':return tickHop(s,e,target,dt,speed,stopDistance,now);
  case'spiral':return tickSpiral(s,e,target,dt,speed,stopDistance);
  case'burrow':return tickBurrow(s,e,target,dt,speed,stopDistance,now);
  case'sprint':return tickSprint(s,e,target,dt,speed,stopDistance);
  case'pack':return tickPack(s,e,target,dt,speed,stopDistance,now);
  case'charge':return tickCharge(s,e,target,dt,speed,stopDistance,now);
  default:return result();
 }
}

export function enemyLocomotionPose(e,time,reducedMotion=false){
 const state=e?.locomotionState;if(!state)return{y:0,pitch:0,roll:0,scaleX:1,scaleY:1,scaleZ:1};
 const age=Math.max(0,time-(state.startedAt??time));
 if(state.kind==='hop'){
  const r=ENEMY_LOCOMOTION.hop;if(age<r.compress){const p=age/r.compress;return{y:0,pitch:0,roll:0,scaleX:1+.12*p,scaleY:1-.28*p,scaleZ:1+.12*p};}
  if(age<r.compress+r.travel){const p=(age-r.compress)/r.travel;return{y:reducedMotion?.18:Math.sin(Math.PI*p)*1.15,pitch:reducedMotion?0:-.16*Math.sin(Math.PI*p),roll:0,scaleX:1,scaleY:1,scaleZ:1};}
  const p=Math.min(1,(age-r.compress-r.travel)/r.land);return{y:0,pitch:0,roll:0,scaleX:1+.16*(1-p),scaleY:1-.24*(1-p),scaleZ:1+.16*(1-p)};
 }
 if(state.kind==='burrow'){
  const r=ENEMY_LOCOMOTION.burrow;let depth;if(age<r.dive)depth=age/r.dive;else if(age<r.dive+r.travel)depth=1;else depth=1-Math.min(1,(age-r.dive-r.travel)/r.emerge);
  return{y:-.92*depth,pitch:0,roll:0,scaleX:1,scaleY:1-.2*depth,scaleZ:1};
 }
 if(state.kind==='charge'){const p=state.phase==='windup'?Math.min(1,age/ENEMY_LOCOMOTION.charge.windup):0;return{y:0,pitch:reducedMotion?0:.12+(state.phase==='travel'?.12:0),roll:0,scaleX:1+.08*p,scaleY:1-.08*p,scaleZ:1-.12*p};}
 return{y:0,pitch:0,roll:0,scaleX:1,scaleY:1,scaleZ:1};
}

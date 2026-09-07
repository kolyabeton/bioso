import {organEffect} from './body-traits.js';
import {soulProc} from './soul-procs.js';
import {setBonuses} from './sets-loot.js';
import {combatTime,hasOrgan,isaacState,healingSuppressed} from './mutations.js';
import {HEALTH} from './balance.js';
export function createHealth(){return{invulnerableUntil:0,armorSpent:0,regenAt:HEALTH.regenDelay,vampireHits:0,vampireAt:0,revived:false,missing:0,hits:0,blocked:0,lastCause:null};}
const state=s=>s.health??=createHealth();
export const armorRemaining=(s,capacity)=>Math.min(s.hp,Math.max(0,capacity-(s.health?.armorSpent||0)));
/** Preserve missing segments, including overflow when a smaller body is fitted. */
export function preserveHealth(s,oldMax,newMax){const h=state(s);h.missing=Math.max(h.missing,oldMax-s.hp);s.hp=Math.max(0,newMax-h.missing);}
export function heal(s,max,amount=1){if(s.dead||s.hp<=0||healingSuppressed(s))return;const a=isaacState(s);if(amount>0&&s.hp>=max&&hasOrgan(s,'reverseHeart')&&combatTime(s)>=a.heartAt){a.heartAt=combatTime(s)+5;a.pulses=1;}const h=state(s);h.missing=Math.max(h.missing,max-s.hp);h.missing=Math.max(0,h.missing-amount);s.hp=Math.max(0,max-h.missing);}
/** @returns {'ignored'|'shield'|'armor'|'hurt'|'revived'} */
export function receiveHit(s,st,{damage=1,cause='contact'}={}){
 const h=state(s);if(s.dead||s.hp<=0||damage<=0||combatTime(s)<h.invulnerableUntil)return'ignored';
 h.invulnerableUntil=combatTime(s)+HEALTH.invulnerability;
 const shield=s.organs.find(p=>p?.key==='shield');
 if(shield?.shieldCharge>=1){shield.shieldCharge=0;shield.shieldDuration=setBonuses(s).shieldDelay/organEffect(s);shield.shieldReadyAt=combatTime(s)+shield.shieldDuration;h.blocked++;return'shield';}
 if(armorRemaining(s,st.armor)>0){h.armorSpent=(h.armorSpent||0)+.5;h.blocked++;soulProc(s,'armor',s.player);return'armor';}
 s.hp=Math.max(0,s.hp-1);h.missing=Math.max(h.missing,st.hp-s.hp);h.hits++;h.lastCause=cause;s.hitAgo=0;h.regenDelay=st.regenDelay??setBonuses(s).regenDelay;h.regenAt=combatTime(s)+h.regenDelay;

 s.events.push({type:'player-hit',hp:s.hp,cause});
 if(s.hp<=0&&st.revive&&!h.revived){h.revived=true;s.hp=1;h.missing=st.hp-1;h.invulnerableUntil=combatTime(s)+2;soulProc(s,'revive',s.player);return'revived';}
 return'hurt';
}
export function vampireHit(s,st){if(s.dead||s.hp<=0||healingSuppressed(s))return;const h=state(s);h.vampireHits=Math.min(HEALTH.vampireHits,h.vampireHits+1);if(h.vampireHits>=HEALTH.vampireHits&&combatTime(s)>=h.vampireAt){heal(s,st.hp);h.vampireHits=0;h.vampireAt=combatTime(s)+HEALTH.vampireDelay;}}
export function tickHealth(s,st){
 if(s.hp<=0)return;const h=state(s),shield=s.organs.find(p=>p?.key==='shield');
 if(shield){shield.shieldCharge=Math.min(1,shield.shieldCharge);if(shield.shieldReadyAt==null){shield.shieldDuration=setBonuses(s).shieldDelay/organEffect(s);shield.shieldReadyAt=combatTime(s)+shield.shieldDuration;}if(combatTime(s)>=shield.shieldReadyAt)shield.shieldCharge=1;}
 const delay=st.regenDelay??HEALTH.regenDelay;
 h.regenAt+=delay-(h.regenDelay??HEALTH.regenDelay);h.regenDelay=delay;
 if(st.regen&&combatTime(s)>=h.regenAt){const before=s.hp;heal(s,st.hp);if(s.hp>before)soulProc(s,'regen',s.player);h.regenAt=combatTime(s)+delay;}
}
export function healthView(s,max,armorMax=0){const shield=s.organs.find(p=>p?.key==='shield');return{current:s.hp,max,segments:Array.from({length:max},(_,i)=>i<s.hp),armor:armorRemaining(s,armorMax),armorMax,shield:!!(shield?.shieldCharge>=1),shieldEquipped:!!shield,shieldProgress:shield?.shieldCharge>=1?1:shield?.shieldReadyAt!=null?Math.max(0,Math.min(1,1-(shield.shieldReadyAt-combatTime(s))/(shield.shieldDuration||setBonuses(s).shieldDelay/organEffect(s)))):0,invulnerable:combatTime(s)<(s.health?.invulnerableUntil||0)};}

import {combatTime} from './mutations.js';
export const RELOAD_BONUS=Object.freeze({duration:8,speed:.5});
// Simulation calls this after advancing combat time, including challenge time.
export function reloadWorkInStep(s,dt){
 const now=combatTime(s),a=s.consumables;
 const active=a?Math.max(0,Math.min(now,a.rechargeUntil??0)-Math.max(now-dt,a.rechargeStartedAt??0)):0;
 return dt+active*RELOAD_BONUS.speed;
}
export function reloadSecondsLeft(s,work){
 const active=Math.max(0,(s.consumables?.rechargeUntil??0)-combatTime(s));
 const boosted=Math.min(work,active*(1+RELOAD_BONUS.speed));
 return work-boosted+boosted/(1+RELOAD_BONUS.speed);
}

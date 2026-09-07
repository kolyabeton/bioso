export {slotCount} from './body-slots.js';
import {hasOrgan} from './organs/compatibility.js';
export {NEW_ORGANS,RARE_ORGANS,hasOrgan,affectedHands,nearbyLootRadius} from './organs/compatibility.js';
import {FAMILIES,mutationView,activeMutation,removalWarning} from './sets/mutations.js';
export {FAMILIES,mutationView,activeMutation,removalWarning};
export const combatTime=s=>s.time+(s.isaac?.extraTime||0);
export function isaacState(s){return s.isaac??={extraTime:0,attacks:{},hiveKills:0,conductorAttacks:0,conductorAt:0,heartAt:0,pulses:0,larvae:[],slimePools:[],active:[],deals:{hpCost:0,arms:0,organs:0}};}
export function syncMutations(s){const state=isaacState(s),next=mutationView(s).filter(f=>f.active);for(const f of next)if(!state.active.includes(f.id))s.events.push({type:'notice',text:'Мутация: '+f.name});state.active=next.map(f=>f.id);}
export function inMire(s){return activeMutation(s,'mire')&&[...(s.puddles||[]),...(s.isaac?.slimePools||[])].some(p=>p.life>0&&Math.abs((p.y??0)-(s.player.y??0))<1.5&&Math.hypot(p.x-s.player.x,p.z-s.player.z)<=(p.radius??2.5)*1.5);}
export const boundPart=p=>!!p?.bound;
export function healingSuppressed(s){const a=s.encounters?.active;return a?.type==='infection'&&Math.hypot(s.player.x-a.x,s.player.z-a.z)<=a.radius;}


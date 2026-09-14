import {CATALOG} from '../../catalog.js';
export const NEW_ORGANS=['reflexNerve','returnNerve','slime','parasite','repairGland'];
export const RARE_ORGANS=['commonNerve','reverseHeart'];
export const organCount=(s,key)=>s.organs.filter(p=>p?.key===key).length;
export const hasOrgan=(s,key)=>organCount(s,key)>0;
export function affectedHands(s,key){return s.arms.filter(p=>p&&(key==='returnNerve'?['seed','needle'].includes(p.key):key==='commonNerve'?['seed','needle','rocket'].includes(p.key):key==='slime')).map(p=>CATALOG[p.key].name);}

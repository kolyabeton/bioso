import {CATALOG} from '../../catalog.js';
export const NEW_ORGANS=['returnNerve','slime','parasite'];
export const RARE_ORGANS=['commonNerve','outerStomach','reverseHeart'];
export const hasOrgan=(s,key)=>s.organs.some(p=>p?.key===key);
export function affectedHands(s,key){return s.arms.filter(p=>p&&(key==='returnNerve'?['seed','needle'].includes(p.key):key==='commonNerve'?['seed','needle','rocket'].includes(p.key):['slime','parasite'].includes(key))).map(p=>CATALOG[p.key].name);}
export const nearbyLootRadius=s=>hasOrgan(s,'outerStomach')?10:3;

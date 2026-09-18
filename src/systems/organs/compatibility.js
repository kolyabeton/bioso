import {itemAffectedHandNames} from '../hand-compatibility.js';
export const NEW_ORGANS=['reflexNerve','returnNerve','slime','parasite','repairGland','revivalCore'];
export const RARE_ORGANS=['commonNerve','reverseHeart'];
export const organCount=(s,key)=>s.organs.filter(p=>p?.key===key).length;
export const hasOrgan=(s,key)=>organCount(s,key)>0;
export const affectedHands=(s,key)=>itemAffectedHandNames(s,key);

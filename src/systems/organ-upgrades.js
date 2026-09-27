import {organEffect} from './body-traits.js';
import {BODIES,WEAPONS,INCREMENTS} from '../catalog.js';
export const stabilizerPartReduction=(s,p)=>.15*(1+.2*((p.tier??1)-1))*(1+(p.upgrades?.power||0)*INCREMENTS.power)*organEffect(s,'stabilizer');
export const stabilizerReloadReduction=s=>Math.min(.8,(s.organs||[]).filter(p=>p?.key==='stabilizer').reduce((sum,p)=>sum+stabilizerPartReduction(s,p),0));
export const ORGAN_UPGRADE_STATS=Object.freeze({mirrorGland:'resonance',reflexNerve:'sensorDodge',regen:'regenRate',repairGland:'traitBoost',armor:'plateCapacity'});
export const upgradeLimit=p=>Object.hasOwn(BODIES,p.key)?10:p.key==='repairGland'?10:p.key==='slime'?10:p.key==='armor'?2:(Object.hasOwn(WEAPONS,p.key)||ORGAN_UPGRADE_STATS[p.key]?20:10);
export const organUpgradeLevel=(p,stat)=>Math.max(0,Math.min(upgradeLimit(p),p.upgrades?.[stat]||0));
export const recoveryMultiplier=(p,stat)=>1+.03*organUpgradeLevel(p,stat);
export const sensorMultiplier=p=>1+.05*organUpgradeLevel(p,'sensorDodge');
/** The Reflector echoes the soul: every percentage bonus already invested in grows by one point per organ rank, and copies stack. */
export const RESONANCE_RANK_STEP=.01,RESONANCE_UPGRADE_STEP=.002;
const glandResonance=p=>RESONANCE_RANK_STEP*Math.max(1,Math.min(5,Math.floor(p.tier??1)))+RESONANCE_UPGRADE_STEP*organUpgradeLevel(p,'resonance');
export const resonanceBonus=s=>{
 const glands=(s?.organs||[]).filter(p=>p?.key==='mirrorGland');if(!glands.length)return 0;
 return glands.reduce((sum,p)=>sum+glandResonance(p),0)*organEffect(s,'mirrorGland');
};
/** What one reflector contributes, so an inspected spare quotes its own value instead of zero. */
export const partResonanceBonus=(s,p)=>{
 if(p?.key!=='mirrorGland')return resonanceBonus(s);
 const installed=(s?.organs||[]).includes(p);
 return (installed?resonanceBonus(s):(resonanceBonus(s)+glandResonance(p)*organEffect(s,'mirrorGland')));
};
// Preserve elapsed fraction when a running recovery duration changes.
export function rescaleRecovery(readyAt,oldDelay,newDelay,now){
 return now+Math.max(0,Math.min(1,(readyAt-now)/oldDelay))*newDelay;
}

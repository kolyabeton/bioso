import {CATALOG,INCREMENTS,MAX_ARMS} from '../catalog.js';
import {affixBonus} from './sets/affixes.js';

export const MAX_BODY_COMPANIONS=5;
export const MAX_COLONY_COMPANIONS=3;
export const MAX_COMPANIONS=MAX_BODY_COMPANIONS+MAX_COLONY_COMPANIONS+MAX_ARMS+1;
const rank=p=>Math.max(0,Math.min(4,(p.tier??1)-1));
// Preserve biomass invested into the old swarm-leg movement upgrade.
export const summonPartBonus=(p,stat)=>(CATALOG[p.key]?.[stat]||0)+.04*rank(p)+((p.upgrades?.[stat]||0)+(p.key==='swarmLeg'&&stat==='summonRate'?(p.upgrades?.speed||0):0))*(INCREMENTS[stat]||0);
export function droneStats(p){
 const d=CATALOG.drone;
 return {damage:d.damage*(1+.2*rank(p))*(p.fused?2:1)*(1+(p.upgrades?.damage||0)*INCREMENTS.damage+affixBonus(p,'damage')),interval:d.interval,attackRadius:d.attackRadius};
}

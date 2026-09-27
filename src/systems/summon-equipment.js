import {CATALOG,INCREMENTS} from '../catalog.js';
import {affixBonus} from './sets/affixes.js';

const rank=p=>Math.max(0,Math.min(4,(p.tier??1)-1));
// Saved Swarm Legs keep their old movement and swarm-rate upgrades as damage upgrades.
export const summonPartBonus=(p,stat)=>{
 if(p.key==='swarmLeg'&&stat==='summonRate')return 0;
 const legacy=p.key==='swarmLeg'&&stat==='summonDamage'?(p.upgrades?.speed||0)+(p.upgrades?.summonRate||0):0;
 return (CATALOG[p.key]?.[stat]||0)+.04*rank(p)+((p.upgrades?.[stat]||0)+legacy)*(INCREMENTS[stat]||0);
};
export function droneStats(p){
 const d=CATALOG.drone;
 return {damage:d.damage*(1+.2*rank(p))*(p.fused?2:1)*(1+(p.upgrades?.damage||0)*INCREMENTS.damage+affixBonus(p,'damage')),interval:d.interval,attackRadius:d.attackRadius};
}
export const pollinatorDamage=s=>(s?.arms||[]).filter(p=>p?.key==='drone'&&!p.disabled).reduce((sum,p)=>sum+droneStats(p).damage,0);

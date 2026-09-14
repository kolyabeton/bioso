import {CATALOG,MAX_ARMS} from '../catalog.js';
export const MAX_ORGANS=8;
const rarityBonus={common:0,uncommon:1,rare:2,relic:3};
export function organCapacity(body){
 const d=CATALOG[body.key]||body;
 const rank=Math.max(0,Math.min(4,Math.floor((body.tier??1)-1)));
 if(body.key==='hecaton')return Math.min(2,d.organs+rank+(rarityBonus[body.rarity]||0));
 if(body.key==='broodmother')return 3;
 return Math.min(d.arms>=3?3:MAX_ORGANS,d.organs+rank+(rarityBonus[body.rarity]||0));
}
export function slotCount(s,body,group){
 const d=CATALOG[body.key]||body,bonus=s.isaac?.deals?.[group]||0;
 if(group==='organs'){
  const naturalCap=d.arms+(s.isaac?.deals?.arms||0)>=3?3:MAX_ORGANS;
  return Math.min(MAX_ORGANS,Math.min(naturalCap,organCapacity(body))+bonus);
 }
 return Math.min(group==='arms'?MAX_ARMS:Infinity,d[group]+bonus);
}

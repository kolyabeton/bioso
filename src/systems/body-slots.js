import {CATALOG,MAX_ARMS} from '../catalog.js';
export const MAX_ORGANS=8;
const rarityBonus={common:0,uncommon:1,rare:2,relic:3};
// Bodies that ignore the "three arms means three organs" rule and carry their own ceiling.
const ORGAN_CAPS={hecaton:2,bastion:5};
const organCap=(body,d,armBonus=0)=>ORGAN_CAPS[body.key]??(d.arms+armBonus>=3?3:MAX_ORGANS);
export function organCapacity(body){
 const d=CATALOG[body.key]||body;
 const rank=Math.max(0,Math.min(4,Math.floor((body.tier??1)-1)));
 if(body.key==='broodmother')return 3;
 return Math.min(organCap(body,d),d.organs+rank+(rarityBonus[body.rarity]||0));
}
export function slotCount(s,body,group){
 const d=CATALOG[body.key]||body,bonus=s.isaac?.deals?.[group]||0;
 if(group==='organs'){
  const naturalCap=organCap(body,d,s.isaac?.deals?.arms||0);
  return Math.min(MAX_ORGANS,Math.min(naturalCap,organCapacity(body))+bonus);
 }
 return Math.min(group==='arms'?MAX_ARMS:Infinity,d[group]+bonus);
}

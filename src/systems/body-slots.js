import {CATALOG,MAX_ARMS} from '../catalog.js';
export const MAX_ORGANS=8;
// Bodies that ignore the "three arms means three organs" rule and carry their own ceiling.
const ORGAN_CAPS={hecaton:2,bastion:5,demolition:3,regulator:4,sentinel:3,assembler:5};
const organCap=(body,d,armBonus=0)=>ORGAN_CAPS[body.key]??(d.arms+armBonus>=3?3:MAX_ORGANS);
export function organCapacity(body){
 const d=CATALOG[body.key]||body;
 const tier=Math.max(1,Math.min(5,Math.floor(body.tier??1)));
 const rankBonus=(tier>=3?1:0)+(tier>=5?1:0),rarityBonus=body.rarity==='relic'?1:0;
 if(body.key==='broodmother')return 3;
 return Math.min(organCap(body,d),d.organs+rankBonus+rarityBonus);
}
export function slotCount(s,body,group){
 const d=CATALOG[body.key]||body,bonus=s.isaac?.deals?.[group]||0;
 if(group==='organs'){
  const naturalCap=organCap(body,d,s.isaac?.deals?.arms||0);
  return Math.min(MAX_ORGANS,Math.min(naturalCap,organCapacity(body))+bonus);
 }
 return Math.min(group==='arms'?MAX_ARMS:Infinity,d[group]+bonus);
}

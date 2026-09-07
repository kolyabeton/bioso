import {CATALOG} from './catalog.js';
/** Structural bulk: frame capacity and mount count, never temporary carried loot. */
export function bodySize(part){
 const d=CATALOG[part.key],rank=Math.max(0,Math.min(4,(part.tier??1)-1));
 const scale=Math.min(2.4,1+Math.max(0,d.arms-2)*.16+Math.max(0,d.legs-2)*.2+Math.max(0,d.capacity/100-1)*.6+rank*.05);
 return{scale,radius:.8*scale,diameter:1.6*scale};
}

export function bodyFitsHere(s,part){return s.world?.presentation!=='biomes'||bodySize(part).radius<=bodySize(s.body).radius||s.world.walkable(s.player.x,s.player.z,bodySize(part).radius);}

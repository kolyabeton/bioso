import {obstacleProfile,obstacleScale} from './architecture-collision.js';

const CELL=8,MARGIN=4,indices=new WeakMap();
function extent(item){
 const footprint=item.collisionFootprint;
 if(footprint?.shape==='box'||footprint?.shape==='boxes'){
  const boxes=footprint.shape==='boxes'?footprint.boxes:[footprint];
  return Math.max(0,...boxes.map(b=>Math.hypot(b.offsetX||0,b.offsetZ||0)+Math.hypot(b.halfX,b.halfZ)));
 }
 const profile=obstacleProfile(item);
 return profile?profile.radius*Math.abs(obstacleScale(item)):item.radius;
}
function build(items){
 const bins=new Map();
 for(const item of items){
  const radius=extent(item)+MARGIN;
  // Unknown footprints retain the original exhaustive query.
  if(!Number.isFinite(radius)||radius<0)return {length:items.length,bins:null};
  for(let x=Math.floor((item.x-radius)/CELL);x<=Math.floor((item.x+radius)/CELL);x++)for(let z=Math.floor((item.z-radius)/CELL);z<=Math.floor((item.z+radius)/CELL);z++){
   let column=bins.get(x);if(!column)bins.set(x,column=new Map());let bin=column.get(z);if(!bin)column.set(z,bin=[]);bin.push(item);
  }
 }
 return {length:items.length,bins};
}
const EMPTY=Object.freeze([]);
/** Broad phase for immutable decoration snapshots. Invalidating the world's
 * collisionDecorations array also invalidates its index; exact hull tests stay
 * in the caller. Oversized footprints use the original list. */
export function obstacleCandidates(items,x,z,r=0){
 if(r>MARGIN||!Number.isFinite(r)||r<0)return items;
 let index=indices.get(items);if(!index||index.length!==items.length){index=build(items);indices.set(items,index);}
 return index.bins?index.bins.get(Math.floor(x/CELL))?.get(Math.floor(z/CELL))||EMPTY:items;
}

/** Deterministic broad phase: queries return candidates in original array order. */
export function createSpatialIndex(items,cellSize=4){
 const bins=new Map(),order=new Map();
 for(let i=0;i<items.length;i++){
  const item=items[i],key=`${Math.floor(item.x/cellSize)},${Math.floor(item.z/cellSize)}`;
  order.set(item,i);if(!bins.has(key))bins.set(key,[]);bins.get(key).push(item);
 }
 function rectangle(minX,minZ,maxX,maxZ){
  const out=[];
  for(let x=Math.floor(minX/cellSize);x<=Math.floor(maxX/cellSize);x++)for(let z=Math.floor(minZ/cellSize);z<=Math.floor(maxZ/cellSize);z++){
   const bin=bins.get(`${x},${z}`);if(bin)out.push(...bin);
  }
  return out.sort((a,b)=>order.get(a)-order.get(b));
 }
 return{rectangle,queryCircle(x,z,r){return rectangle(x-r,z-r,x+r,z+r);}};
}

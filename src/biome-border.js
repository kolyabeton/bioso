import {seededRandom} from './simulation.js';

const DEPTH=112;
// Only the outside of the playable rectangle gets a forest skirt. Tile seams stay open.
export function forestBorder(tile,world){
 const b=world.bounds,edges=[];
 if(tile.x-32===b.minX)edges.push([-1,0]);
 if(tile.x+32===b.maxX)edges.push([1,0]);
 if(tile.z-32===b.minZ)edges.push([0,-1]);
 if(tile.z+32===b.maxZ)edges.push([0,1]);
 const rng=seededRandom(world.seed+tile.index*15427),patches=[],plants=[];
 for(const [dx,dz] of edges){
  // West/east patches own corner squares. No coplanar overlap with north/south.
  const start=(dx?tile.z:tile.x)-32-(dx&&tile.z-32===b.minZ?DEPTH:0);
  const end=(dx?tile.z:tile.x)+32+(dx&&tile.z+32===b.maxZ?DEPTH:0);
  const edge=(dx?tile.x:tile.z)+32*(dx||dz);
  patches.push(dx?{x:edge+dx*DEPTH/2,z:(start+end)/2,width:DEPTH,depth:end-start}:{x:(start+end)/2,z:edge+dz*DEPTH/2,width:end-start,depth:DEPTH});
  for(let row=0;row<9;row++)for(let along=start+3;along<end;along+=7){
   const distance=4+row*9+rng()*2,tangent=along+(rng()-.5)*4;
   plants.push({x:dx?edge+dx*distance:tangent,z:dz?edge+dz*distance:tangent,size:row===0?5+rng()*3:9+rng()*6,rotation:rng()*Math.PI*2,model:row%3===0?'veg-fern':'veg-shrub'});
  }
 }
 return{patches,plants};
}

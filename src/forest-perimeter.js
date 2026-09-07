export const FOREST_PIECES=['nw','ne','sw','se','north','south','west-0','west-1','east-0','east-1','continuous','canopy'];
export const FOREST_ASSETS=FOREST_PIECES.map(name=>`/assets/biomes/forest-perimeter-v1/${name}.png`);
export function forestPerimeterPieces(tile,world){
 const b=world.bounds,pieces=[],west=tile.x-32===b.minX,east=tile.x+32===b.maxX,north=tile.z-32===b.minZ,south=tile.z+32===b.maxZ;
 // Half-length straight sections keep the authored pixels close to their native screen size.
 for(let i=0;i<4;i++){
  const offset=-24+i*16;
  if(!(i===0&&north||i===3&&south)){
   if(west)pieces.push({name:`west-${i%2}`,x:b.minX-8,z:tile.z+offset,width:16,depth:16});
   if(east)pieces.push({name:`east-${i%2}`,x:b.maxX+8,z:tile.z+offset,width:16,depth:16});
  }
  if(!(i===0&&west||i===3&&east)){
   if(north)pieces.push({name:'north',x:tile.x+offset,z:b.minZ-12,width:16,depth:24});
   if(south)pieces.push({name:'south',x:tile.x+offset,z:b.maxZ+12,width:16,depth:24});
  }
 }
 // An L-shaped corner samples ONE uncut source with a single continuous projection.
 // The three rectangles are mesh tessellation only: no image cut or blend through a prop.
 for(const [enabled,name,x,z,sx,sz,u,v] of [[west&&north,'nw',b.minX,b.minZ,-1,-1,.25,.21],[east&&north,'ne',b.maxX,b.minZ,1,-1,.76,.21],[west&&south,'sw',b.minX,b.maxZ,-1,1,.25,.80],[east&&south,'se',b.maxX,b.maxZ,1,1,.76,.80]]){
  if(!enabled)continue;
  const projection={x,z,u,v};
  pieces.push({name,x:x+sx*8,z:z+sz*12,width:16,depth:24,projection});
  pieces.push({name,x:x-sx*8,z:z+sz*12,width:16,depth:24,projection});
  pieces.push({name,x:x+sx*8,z:z-sz*8,width:16,depth:16,projection});
 }
 return pieces;
}
export function forestCornerUV(x,z,projection){return[projection.u+(x-projection.x)/32,1-(projection.v+(z-projection.z)/56)];}

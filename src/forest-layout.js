// Survival Forest only. The art anchor and solid footprint are authored together.
// East/west cross routes at z=0 and all four safe points remain accessible.
import {FOREST_ROCK_PROFILE} from './forest-rock-profile.js';
export function forestLayout(x,z,index){
 const variant=(index-4+12)%3,shift=variant===1?1.2:variant===2?-.8:0;
 const banks=[
  [-8.3,-18.5,11.8,13.4,8.0,'canopy'],[-9.3,-8.5,10.5,10.8,6.6,'root-bank'],
  [-17.8,-10,10.2,12.4,7.0,'canopy'],[-23.2,-21,10,11.8,7.0,'root-bank'],
  [7.2,-11.3,9.2,9.5,5.4,'arch'],[11.7,-4.8,8.5,8.5,4.8,'root-bank'],
  [21.5,-20.8,12,13.5,8,'canopy'],[23,-8.5,9.2,10,5,'root-bank'],
  [-7.8,10.5,8.2,6.8,4.6,'relic'],[-8.7,24,13,13.5,8.5,'canopy'],
  [-23,12.5,10.8,12.8,7.8,'root-bank'],[-25,25,11,12,7,'canopy'],
  [8.8,13.3,12.2,13.4,8,'canopy'],[8.2,29,9.7,10,6.3,'root-bank'],
  [22.5,9.4,10.5,11.8,6.8,'root-bank'],[23,23.5,13,13.5,8.4,'canopy'],
  [-11.5,0,7,10,3,'canopy'],[12.5,3.8,7,10,2.8,'canopy'],
 ];
 const items=banks.map(([px,pz,width,height,depth,role],i)=>{
  const dx=px+(Math.abs(px)<15?shift:0),dz=pz+(role==='arch'?0:(i%3-1)*shift);
  return{x:x+dx,z:z+dz,feature:['arch','relic'].includes(role)?'ruin':'thicket',biome:'forest',forestRole:role,
   radius:width*.4,size:width,height:role==='relic'?3.3:role==='arch'?8.4:5.0,rotation:role==='arch'?-.15:0,
   collisionFootprint:role==='arch'?{shape:'boxes',boxes:[-1,1].map(side=>({halfX:.69,halfZ:1.55,offsetX:side*3.15,offsetZ:.35}))}:{shape:'box',halfX:width*.25,halfZ:depth*.27},
   forestDetail:{cell:{canopy:0,'root-bank':3,arch:1,relic:2}[role],width,height,depth},
  };
 });
 // Unequal stone outcrops interrupt the old straight strip; both sides are routable.
 for(const [px,pz,radius,height] of [[.1,-7.5,1.95,2.45],[-3.2,18,1.3,1.15],[5.3,-25,2.15,2.8],[-7.1,-3.8,1.15,.9],[6.5,6.0,1.05,1.1]]){
  items.push({x:x+px+shift*.3,z:z+pz,feature:'rock',biome:'forest',forestRole:'boulder',radius,height,size:radius*2,rotation:px*.7+pz*.3,
   collisionProfile:{...FOREST_ROCK_PROFILE,height:FOREST_ROCK_PROFILE.height*height*.9/radius}});
 }
 return items;
}

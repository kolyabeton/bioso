import {seededRandom} from './simulation.js';
import {environmentProfile} from './environment-profiles.js';

// Visual-only ankle/knee-high growth. Shared by mission and survival renderers;
// never added to the collision list and never placed across the main route.
export function environmentPockets(tile,world){
 const profile=environmentProfile(tile),rng=seededRandom((world.seed+tile.index*1499+887)>>>0);
 const points=[];if(!profile)return points;
 const density={roots:20,terraces:16,foundations:14,nests:16,heaps:9}[profile.relief];
 const centers=tile.environmentId
  ?[-1,1].flatMap(side=>[-24,-13,-2,10,23].map((z,i)=>({x:side*(6.05+(i%3)*.48),z:z+side*1.8})))
  :tile.decorations.filter(d=>d.model||d.feature).slice(0,12).map(d=>({x:d.x-tile.x,z:d.z-tile.z}));
 for(const [cluster,c]of centers.entries()){
  // Leave occasional bays rather than making another continuous green wall.
  if(cluster%7===5)continue;
  for(let n=0;n<density;n++){
   const angle=rng()*Math.PI*2,r=Math.sqrt(rng())*(profile.relief==='heaps'?2.6:2.4);
   const x=c.x+Math.cos(angle)*r,z=c.z+Math.sin(angle)*r;
   if(Math.abs(x)<3.65||Math.abs(x)>28||Math.abs(z)>28||(!tile.environmentId&&Math.abs(z)<5.2))continue;
   if(tile.safe?.some(p=>Math.hypot(p.x-tile.x-x,p.z-tile.z-z)<3.2))continue;
   const outer=Math.min(1,Math.max(0,(Math.abs(x)-3.65)/2.5));
   points.push({x:x+tile.x,z:z+tile.z,rotation:rng()*Math.PI*2,size:.7+rng()*.9+outer*1.4,height:.3+outer*.9+rng()*.12,
    kind:profile.relief==='heaps'?'dry':profile.relief==='terraces'?'grass':n%4===0?'shrub':'fern',cluster});
  }
 }
 return points;
}

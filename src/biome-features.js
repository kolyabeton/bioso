import {seededRandom} from './simulation.js';
import {forestLayout} from './forest-layout.js';

// Solid cover with a 6.8 m central passage; even the largest 4.8 m body fits.
export function biomeFeatures(x,z,biome,seed,index){
 if(biome==='forest')return forestLayout(x,z,index);
 const rng=seededRandom(seed+index*29009),items=[];
 const add=(px,pz,radius,feature)=>items.push({x:x+px,z:z+pz,radius,height:feature==='rock'?radius*1.2:3.2,feature,biome,rotation:rng()*Math.PI*2,size:radius*2});
 for(const side of [-1,1])for(const row of [-12,-8,8,12])add(side*(6.5+rng()*.7),row+(rng()-.5)*1.6,3.1,'thicket');
 // Offset outer cover creates alternate routes instead of dead-end corridors.
 for(const [px,pz] of [[-23,-9],[-23,9],[23,9]])add(px,pz,2.8,biome==='forest'?'thicket':'rock');
 // Open stone recess: two shoulders and a back wall, entered from the south.
 for(const [px,pz,r] of [[14,-14,2.6],[26,-14,2.6],[20,-20,3.6]])add(px,pz,r,'rock');
 return items;
}

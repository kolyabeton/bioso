import {environmentId} from './environment-profiles.js';
import {environmentBlendWeights} from './environment-surfaces.js';
export const WEATHER_BLEND_HALF_WIDTH=20;
export const WEATHER_BLEND_SECONDS=3;

export const ENVIRONMENT_WEATHER=Object.freeze({
 'upper-gardens':{name:'sunny-pollen',sun:'#ffe3ac',sky:'#cddfee',ground:'#727569',fog:'#bac5bd',particle:'#ead6a3',key:4.7,fill:.8,near:72,far:160,rain:0,wind:.28,density:.36},
 'root-forest':{name:'morning-mist',sun:'#e8eee0',sky:'#b7d3e2',ground:'#617675',fog:'#809eab',particle:'#c1d8ce',key:2.7,fill:1.05,near:38,far:115,rain:0,wind:.16,density:.28},
 'quiet-scrapyard':{name:'dry-dust',sun:'#ffd2a0',sky:'#c5bba7',ground:'#7e7369',fog:'#ad9780',particle:'#d7bb85',key:3.6,fill:.85,near:46,far:135,rain:0,wind:1.05,density:.75},
 'overgrown-city':{name:'overcast-rain',sun:'#b6cbdc',sky:'#b8cfe3',ground:'#596b7a',fog:'#718896',particle:'#c5dce7',key:1.35,fill:1.35,near:42,far:118,rain:1,wind:.65,density:1},
 'brood-nursery':{name:'spore-dusk',sun:'#e1b7a3',sky:'#999ab8',ground:'#62625e',fog:'#797383',particle:'#c4d6a4',key:1.8,fill:1.05,near:45,far:125,rain:0,wind:.22,density:.62},
});

/** Position-aware blending is continuous across cell boundaries, including corners. */
export function weatherWeights(world,player){
 const tile=world.tileAt(player.x,player.z);if(!tile)return{'upper-gardens':1};
 return world.missionLine?{[environmentId(tile)]:1}:environmentBlendWeights(tile,world,player.x,player.z,WEATHER_BLEND_HALF_WIDTH);
}
export function createWeatherState(){
 let world=null,weights={},time=0;
 return{
  update(s,dt=0){
   const target=weatherWeights(s.world,s.player);
   if(world!==s.world){world=s.world;weights={...target};time=0;}
   const delta=Math.max(0,Math.min(.1,dt)),a=1-Math.exp(-delta/WEATHER_BLEND_SECONDS);time+=delta;
   for(const id of Object.keys(ENVIRONMENT_WEATHER))weights[id]=(weights[id]||0)+((target[id]||0)-(weights[id]||0))*a;
   const id=Object.keys(weights).reduce((best,id)=>weights[id]>weights[best]?id:best,Object.keys(weights)[0]);
   return{weights:{...weights},time,id,name:ENVIRONMENT_WEATHER[id].name};
  },
  reset(){world=null;weights={};time=0;},
 };
}

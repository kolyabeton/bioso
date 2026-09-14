import {ENVIRONMENT_MODEL_BOUNDS} from './environment-model-bounds.js';

export const SURVIVAL_LANDMARKS=Object.freeze({
 'quiet-scrapyard':[['environment-scrap-megaturbine-v1',9],['environment-scrap-turbine-v1',8],['forest-tree-broad-v4',10]],
 'brood-nursery':[['environment-brood-cocoon-nest-v1',11],['environment-brood-hanging-cocoons-v1',10],['environment-brood-pod-v2',8]],
 'upper-gardens':[['environment-garden-irrigator-v1',8],['environment-garden-tree-v2',11],['environment-garden-bank-v1',12]],
 'overgrown-city':[['forest-ruin-arch-v2',9],['environment-city-bank-v1',11],['environment-city-cabinet-v1',7]],
});

/** Replace the three old repeated anchors, not an extra obstacle layer.
 * Keep the authored Forest/lightmaps and all mission placements untouched. */
export function applySurvivalLandmarks(items,tile,x,z){
 const id=tile.visualEnvironmentId||({gardens:'upper-gardens',scrapyard:'quiet-scrapyard',city:'overgrown-city'})[tile.biome];
 const set=SURVIVAL_LANDMARKS[id];if(!set)return;
 const positions=id==='quiet-scrapyard'?[[7.8,-7],[-8.5,16],[-9,-12]]:id==='brood-nursery'?[[9,-8],[-9,14],[-10,-16]]:id==='upper-gardens'?[[8,-10],[-9,12],[-10,-17]]:[[9,-10],[-9,13],[-10,-17]];
 items.slice(0,3).forEach((item,i)=>{
  const [model,size]=set[i];Object.assign(item,{model,size,height:size,radius:size*.71,
   x:x+positions[i][0],z:z+positions[i][1],rotation:i===0?-.25:i===1?.4:-.15,
   collisionProfile:ENVIRONMENT_MODEL_BOUNDS[model],environmentSignature:true,survivalLandmark:true});
 });
}

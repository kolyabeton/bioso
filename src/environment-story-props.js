import {ENVIRONMENT_MODEL_BOUNDS} from './environment-model-bounds.js';

// Distinct silhouettes from the five approved-direction environment references.
// All surface props reuse the Forest ceramic/bark/stone/soil atlas.
export const ENVIRONMENT_STORY_PROPS=Object.freeze({
 'upper-gardens':['environment-garden-irrigator-v1','environment-garden-basin-v1'],
 'quiet-scrapyard':['environment-scrap-turbine-v1','environment-scrap-pipes-v1'],
 'root-forest':['environment-forest-log-v1','environment-forest-cache-v1'],
 'overgrown-city':['environment-city-cabinet-v1','environment-city-duct-v1'],
 'brood-nursery':['environment-brood-clutch-v1','environment-brood-fans-v1'],
});

/** Small real obstacles, with the exact rendered model's collision footprint. */
export function survivalStoryProps(tile,x,z){
 const id=tile.visualEnvironmentId||({gardens:'upper-gardens',scrapyard:'quiet-scrapyard',city:'overgrown-city'})[tile.biome];
 // Do not invalidate the authored Forest bake or its existing placement contract.
 const ids=ENVIRONMENT_STORY_PROPS[id];if(!ids)return [];
 return ids.map((model,i)=>({model,environmentSignature:true,storyProp:true,biome:tile.biome,
  x:x+(i?-9:9),z:z+(i?17:-17),size:i?3.2:3.6,height:i?3.2:3.6,radius:2,
  rotation:i?.8:-.35,collisionProfile:ENVIRONMENT_MODEL_BOUNDS[model]}));
}

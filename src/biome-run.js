import {createBiomeWorld} from './biome-world.js';
import {createPart} from './assembly.js';
import {settleObjects} from './elevation.js';
export function prepareBiomes(s,options={}){
 s.world=createBiomeWorld(s.seed,options);s.player={...s.world.tiles[0].safe[2],y:0,vy:0,vertical:'grounded'};
 s.exploration={visited:new Set(),cells:new Set(),cleared:new Set(),groups:[],lootNotice:false};
 for(const t of s.world.tiles)if(t.index!==0&&t.kind!=='transition')s.ground.push({id:++s.entityId,...t.loot,part:createPart(s,['seed','universal','claws'][t.index%3])});
 settleObjects(s);return s;
}

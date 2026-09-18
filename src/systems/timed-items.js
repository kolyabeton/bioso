export const timedItemTier=time=>time<600?1:Math.min(5,2+Math.floor((time-600)/300));
/** Free ground items stop after minute ten; later parts come from kills and events. */
export const TIMED_ITEMS_UNTIL=600;

export function tickTimedItems(s,makeLoot){
 if(s.mode!=='survival'||s.encounters?.active)return;
 const state=s.timedItems??={nextAt:120};if(state.nextAt>TIMED_ITEMS_UNTIL||s.time<state.nextAt)return;
 const bounds=s.world.bounds||{minX:-160,maxX:160,minZ:-160,maxZ:160},margin=18,halfX=s.player.x>=0?[bounds.minX+margin,Math.min(-margin,bounds.maxX-margin)]:[Math.max(margin,bounds.minX+margin),bounds.maxX-margin];
 let p=null;for(let i=0;i<160;i++){const x=halfX[0]+s.rng()*Math.max(1,halfX[1]-halfX[0]),z=bounds.minZ+margin+s.rng()*Math.max(1,bounds.maxZ-bounds.minZ-margin*2);if(s.world.walkable(x,z,1)){p={x,z,y:s.world.heightAt?.(x,z)??0};break;}}
 if(p){const part=makeLoot();part.tier=timedItemTier(s.time);s.ground.push({id:++s.entityId,...p,part,timedSurvivalDrop:true});}
 state.nextAt+=120;
}

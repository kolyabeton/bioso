// DEV/acceptance fixture on the actual survival renderer; no production placement changes.
export function prepareLandscapeCameraReview(run,params){
 const biome=['gardens','forest','city','scrapyard'].includes(params.get('biome'))?params.get('biome'):'city';
 Object.assign(run.player,{x:0,z:0,y:0});
 if(params.get('encounter')==='all'){
  for(const [index,type] of ['nursery','slab','membrane'].entries()){
   const node=run.encounters.nodes.find(node=>node.type===type);
   Object.assign(node,{x:(index-1)*4,y:0,z:-5});
  }
  return{paused:true};
 }
 run.world.tiles[0].decorations.push({x:3,z:-4,radius:2,height:8,biome});
 return{paused:true};
}

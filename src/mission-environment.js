import {seededRandom} from './simulation.js';
import {ENVIRONMENT_PROFILES,applyEnvironmentCover} from './environment-profiles.js';
import {ENVIRONMENT_MODEL_BOUNDS} from './environment-model-bounds.js';
import {ENVIRONMENT_STORY_PROPS} from './environment-story-props.js';

export const MISSION_HALF_WIDTH=9;
export const MISSION_GATE={halfOpening:4.5,halfDepth:2,height:9.15,halfSpan:32,modelWidth:12};
export const missionGateZ=index=>-(index+.5)*64;
export const missionGateClosed=(mission,index)=>mission.floorsState?.[index]?.state!=='cleared'||mission.event?.room===index+1||mission.floorsState?.[index+1]?.entered===true;

const LEGACY_MISSION_ENVIRONMENTS=Object.freeze({
 garden:Object.freeze({
 id:'upper-gardens',name:'Верхние сады',biome:'gardens',landmark:'gardens',
  groundStyle:'atlas',perimeterStyle:'open',ambientVegetation:Object.freeze(['veg-moss','veg-grass']),ambientDensity:12,edgeVegetation:Object.freeze(['veg-moss','veg-grass']),
  buildings:Object.freeze(['arch-planter','arch-solar-panel','arch-turbine','arch-terrace','arch-pillar']),
  rooms:Object.freeze([
   Object.freeze(['arch-planter','arch-solar-panel','arch-terrace']),
   Object.freeze(['arch-turbine','arch-planter','arch-pillar']),
   Object.freeze(['arch-terrace','arch-solar-panel','arch-planter']),
  ]),
  vegetation:Object.freeze({models:Object.freeze(['veg-moss','veg-grass']),density:3,feature:'rock'}),
  bossRoom:Object.freeze({landmark:'gardens',models:Object.freeze(['arch-terrace','arch-turbine','arch-solar-panel','arch-planter'])}),
 }),
 quarantine:Object.freeze({
 id:'quiet-scrapyard',name:'Тихая свалка',biome:'scrapyard',landmark:'scrapyard',
  groundStyle:'atlas',perimeterStyle:'open',ambientVegetation:Object.freeze(['veg-grass']),ambientDensity:4,edgeVegetation:Object.freeze([]),
  buildings:Object.freeze(['arch-cistern','arch-turbine','arch-wall-straight','arch-solar-panel']),
  rooms:Object.freeze([
   Object.freeze(['arch-cistern','arch-wall-straight','arch-turbine']),
   Object.freeze(['arch-turbine','arch-cistern','arch-solar-panel']),
   Object.freeze(['arch-wall-straight','arch-turbine','arch-cistern']),
  ]),
  vegetation:Object.freeze({models:Object.freeze(['veg-grass']),density:1,feature:'rock'}),
  bossRoom:Object.freeze({landmark:'scrapyard',models:Object.freeze(['arch-cistern','arch-turbine','arch-wall-straight','arch-solar-panel'])}),
 }),
 core:Object.freeze({
 id:'root-forest',name:'Корневой лес',biome:'forest',landmark:'forest',
  groundStyle:'atlas',perimeterStyle:'open',ambientVegetation:Object.freeze(['veg-fern','veg-vine']),ambientDensity:16,edgeVegetation:Object.freeze(['veg-fern','veg-vine']),
  buildings:Object.freeze(['arch-arch','arch-pillar','arch-wall-corner','arch-planter']),
  rooms:Object.freeze([
   Object.freeze(['arch-arch','arch-pillar','arch-planter']),
   Object.freeze(['arch-wall-corner','arch-arch','arch-pillar']),
   Object.freeze(['arch-pillar','arch-planter','arch-arch']),
  ]),
  vegetation:Object.freeze({models:Object.freeze(['veg-fern','veg-vine']),density:5,feature:'thicket'}),
  bossRoom:Object.freeze({landmark:'forest',models:Object.freeze(['arch-arch','arch-pillar','arch-wall-corner','veg-vine'])}),
 }),
 nursery:Object.freeze({
 id:'overgrown-city',name:'Заросший город',biome:'city',landmark:'city',
  groundStyle:'atlas',perimeterStyle:'open',ambientVegetation:Object.freeze(['veg-vine']),ambientDensity:7,edgeVegetation:Object.freeze(['veg-vine']),
  buildings:Object.freeze(['arch-wall-straight','arch-wall-corner','arch-stairs','arch-cistern','arch-gate']),
  rooms:Object.freeze([
   Object.freeze(['arch-wall-straight','arch-stairs','arch-cistern']),
   Object.freeze(['arch-wall-corner','arch-wall-straight','arch-gate']),
   Object.freeze(['arch-cistern','arch-stairs','arch-wall-corner']),
  ]),
  vegetation:Object.freeze({models:Object.freeze(['veg-vine']),density:2,feature:'rock'}),
  bossRoom:Object.freeze({landmark:'city',models:Object.freeze(['arch-gate','arch-wall-straight','arch-wall-corner','arch-cistern'])}),
 }),
 mother:Object.freeze({
  id:'brood-nursery',name:'Роевой питомник',biome:'gardens',groundBlend:'forest',groundBlendDirection:Object.freeze([1,0]),landmark:null,
  groundStyle:'brood',perimeterStyle:'open',ambientVegetation:Object.freeze(['veg-seedpod','veg-moss']),ambientDensity:10,edgeVegetation:Object.freeze(['veg-seedpod','veg-vine']),
  buildings:Object.freeze(['arch-planter','arch-cistern']),
  rooms:Object.freeze([
   Object.freeze(['veg-seedpod','arch-planter','veg-vine']),
   Object.freeze(['arch-cistern','veg-seedpod','veg-moss']),
   Object.freeze(['veg-vine','arch-planter','veg-seedpod']),
  ]),
  vegetation:Object.freeze({models:Object.freeze(['veg-seedpod','veg-vine','veg-moss']),density:6,feature:'thicket'}),
  bossRoom:Object.freeze({landmark:null,models:Object.freeze(['veg-seedpod','veg-vine','arch-planter','veg-moss'])}),
 }),
});

export const MISSION_ENVIRONMENTS=Object.freeze(Object.fromEntries(Object.entries(LEGACY_MISSION_ENVIRONMENTS).map(([key,p])=>{
 if(p.biome==='forest')return[key,Object.freeze({...p,
  buildings:Object.freeze(['forest-ruin-arch-v2','forest-root-bank-v2','forest-relic-v3']),
  rooms:Object.freeze([
   Object.freeze(['forest-ruin-arch-v2','forest-root-bank-v2','forest-relic-v3']),
   Object.freeze(['forest-relic-v3','forest-ruin-arch-v2','forest-root-bank-v2']),
   Object.freeze(['forest-root-bank-v2','forest-relic-v3','forest-ruin-arch-v2']),
  ]),
  bossRoom:Object.freeze({...p.bossRoom,models:Object.freeze(['forest-ruin-arch-v2','forest-root-bank-v2','forest-relic-v3','forest-root-bank-v2'])}),
 })];
 const identity=ENVIRONMENT_PROFILES[p.id],[bank,accent]=identity.pieces;
 const plants=p.id==='upper-gardens'?[accent,'veg-grass']:p.id==='overgrown-city'?['forest-fern-v3']:p.id==='brood-nursery'?[accent]:[];
 return[key,Object.freeze({...p,buildings:Object.freeze([bank,accent]),
  rooms:Object.freeze([[bank,accent,bank],[accent,bank,accent],[bank,bank,accent]].map(Object.freeze)),
  ambientVegetation:Object.freeze(identity.plants),edgeVegetation:Object.freeze([]),
  vegetation:Object.freeze({models:Object.freeze(plants),density:plants.length?3:0,feature:p.vegetation.feature}),
  bossRoom:Object.freeze({...p.bossRoom,models:Object.freeze([bank,accent,bank,accent])}),
 })];
})));
export const missionEnvironment=mission=>MISSION_ENVIRONMENTS[typeof mission==='string'?mission:mission?.id]||MISSION_ENVIRONMENTS.garden;

// The persistent fence and its moving leaves share these bounds with the view.
export function missionBarrierAt(mission,x,z,r=0){
 const {halfOpening,halfDepth,halfSpan}=MISSION_GATE;
 const index=Math.round(-z/64-.5);
 return index>=0&&index<(mission.floors||5)-1&&Math.abs(z-missionGateZ(index))<halfDepth+r&&Math.abs(x)<halfSpan+r&&
  (missionGateClosed(mission,index)||Math.abs(x)+r>halfOpening);
}

const environmentSeed=(seed,id)=>{let n=seed>>>0;for(const c of id)n=Math.imul(n^c.charCodeAt(0),16777619)>>>0;return n;};
const ROOM_LAYOUTS=[
 [[-1,-12,6,0],[1,-23,4.5,1],[-1,23,4,2]],
 [[1,-10,5.5,1],[-1,-24,5,2],[1,22,4.5,3]],
 [[-1,-18,5,2],[1,-8,5.5,3],[-1,24,4.25,0]],
];

export function missionDecorations(seed,environment,index,z,bossRoom=false){
 const profile=typeof environment==='string'?(Object.values(MISSION_ENVIRONMENTS).find(p=>p.biome===environment)||MISSION_ENVIRONMENTS.garden):environment;
 const rng=seededRandom(environmentSeed(seed,profile.id)+index*7919),side=index%2?1:-1,edge=bossRoom?16:9.5;
 const model=(id,x,dz,size,rotation=0,decorationKind='structure')=>({model:id,biome:profile.biome,environmentId:profile.id,decorationKind,x,z:z+dz,size,height:size,radius:size*.58,rotation,collisionProfile:ENVIRONMENT_MODEL_BOUNDS[id]});
 const volumeLandmark=(landmarkBiome,x,dz,height)=>{
  const id={gardens:'environment-garden-bank-v1',scrapyard:'environment-scrap-bank-v1',forest:'forest-root-bank-v2',city:'environment-city-bank-v1'}[landmarkBiome];
  return{...model(id,x,dz,height,0,'landmark'),biome:landmarkBiome};
 };
 const room=profile.rooms[index%profile.rooms.length],boss=profile.bossRoom,ids=bossRoom?boss.models:room,layout=ROOM_LAYOUTS[index%ROOM_LAYOUTS.length],decorations=[];
 const landmark=bossRoom?boss.landmark:profile.landmark;
 if(landmark)decorations.push(volumeLandmark(landmark,side*edge,15,bossRoom?10:9));
 ids.forEach((id,n)=>{
  const [flank,dz,size,quarter]=bossRoom?[[ -1,10,6.5,0],[1,-10,6,1],[-1,-22,5,2],[1,23,5,3]][n]:layout[n];
  const forestArch=id==='forest-ruin-arch-v2';
  decorations.push(model(id,forestArch?7.6:flank*side*(edge+(bossRoom?0:Math.max(0,n-1))),forestArch?-15:dz,forestArch?7.5:size,forestArch?-.15:quarter*Math.PI/2,id.startsWith('veg-')?'vegetation':'structure'));
 });
 const plants=profile.vegetation.models,plantCount=plants.length?profile.vegetation.density+(bossRoom?2:0):0,plantOffsets=[17,-16,8,-7,25,-24,13,-20];
 // The view instances these exact authored placements; simulation sees the same
 // model volumes, so new visible side structures cannot become phantom cover.
 for(const [j,id] of ENVIRONMENT_PROFILES[profile.id].pieces.entries())for(const flank of [-1,1]){
  const size=7;
  decorations.push({...model(id,flank*(bossRoom?17:id.startsWith('environment-')?7.8:10.1),flank<0?-12+j*24:10-j*24,size,(index+(flank+1)/2)*1.7),radius:size*.72,environmentSignature:true});
 }
 // Smaller companion volumes fill the long empty intervals. They are real
 // obstacles using the same GLB bounds, not decorative copies of solid cover.
 if(!bossRoom){
  const pieces=ENVIRONMENT_STORY_PROPS[profile.id];
  for(const [j,[flank,dz]] of [[-1,-22],[1,-3],[-1,5],[1,20]].entries()){
   const id=pieces[(j+index)%pieces.length],size=3.0+(j%2)*.5;
   decorations.push({...model(id,flank*(6.3+(j%2)*.45),dz,size,j%2?.35:-.3+index*.3),environmentSignature:true,storyProp:true});
  }
 }
 for(let n=0;n<plantCount;n++){
  const flank=n%2?1:-1,id=plants[n%plants.length],distance=edge+(bossRoom?1.5:.5)+rng()*1.4;
  decorations.push(model(id,flank*side*distance,plantOffsets[n%plantOffsets.length]+(rng()-.5)*2,1.7+rng()*1.6,rng()*Math.PI*2,'vegetation'));
 }
 // Alternate pockets along the edges; preserve the combat centre, spawns and event site.
 for(let n=0;n<6;n++){
  const flank=n%2?1:-1,radius=1.1+rng()*.7;
  decorations.push({biome:profile.biome,environmentId:profile.id,decorationKind:'cover',feature:profile.vegetation.feature,
   x:flank*(bossRoom?17:7.8+rng()*1.3),z:z+[18,-17,9,-8,24,-24][n]+(rng()-.5)*2,
   radius,height:1.6+rng()*1.3,size:radius*2,rotation:rng()*Math.PI*2});
 }
 applyEnvironmentCover(decorations,{environmentId:profile.id});
 return decorations;
}

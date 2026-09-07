// Metres, shared by collision, encounters, map and the scene. No UI-only objectives.
export const DEPOT={x:0,z:-480},CAMP={x:0,z:480};
export const LANDMARKS=[
 {id:'camp',name:'Выход · старая лестница',...CAMP,shape:'exit'},
 {id:'greenhouse',name:'Разрушенная оранжерея',x:0,z:150,shape:'greenhouse'},
 {id:'collector',name:'Водосборник',x:190,z:30,shape:'collector'},
 {id:'nursery',name:'Заросший питомник',x:190,z:-190,shape:'nursery'},
 {id:'depot',name:'Хранилище ядра',...DEPOT,shape:'depot'},
 {id:'near-exit',name:'Выход · северный шлюз',x:330,z:-480,shape:'exit'},
 {id:'stash',name:'Забытый тайник',x:-225,z:-135,shape:'stash'},
];
export const ROADS=[[[0,480],[0,150],[0,-98],[0,-448],[0,-480]],[[0,150],[190,150],[190,30],[190,-190],[190,-560],[0,-560],[0,-480]],[[0,-98],[-225,-135]],[[0,-480],[330,-480]]];
const group=(id,x,z,roles,threat=0,extra={})=>({id,x,z,roles,threat,...extra});
export const GROUPS=[
 group('stairs',0,315,['mass','mass','fast','mass']),
 group('greenhouse',0,150,['mass','armored','mass','fast','volatile','mass'],120),
 group('junction',0,-98,['fast','mass','armored','ranged','mass','fast'],180),
 group('gate-guard',0,-420,['armored','armored','ranged','ranged','mass','fast','mass','mass'],360,{elites:2}),
 group('collector',190,30,['mass','fast','mass','ranged'],120,{patrol:16}),
 group('nursery',190,-190,['mass','armored','ranged','fast','mass'],180,{patrol:14}),
 group('stash',-225,-135,['armored','fast','mass','ranged','mass','mass'],240,{stash:true}),
 group('near-exit',305,-480,['armored','armored','ranged','fast','fast','mass','mass','mass'],480,{elites:2}),
 group('pursuit',0,-480,['fast','fast','mass','ranged','mass','armored'],240,{dormant:true,pursuit:true}),
];
export const MISSION_PLACEMENTS={garden:[[0,150],[190,30],[190,-190]],quarantine:[[0,150],[190,30],[-225,-135],[0,-420]],core:[[0,-480],[0,480],[330,-480],[190,30],[190,-190],[0,-448]],nursery:[[0,150]],mother:[[0,150],[190,-190],[-225,-135]]};
export function segmentDistance(x,z,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)));return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz);}
export function onRoad(x,z,margin=9){return ROADS.some(path=>path.some((p,i)=>i&&segmentDistance(x,z,path[i-1],p)<margin));}
export const LANDMARK_COLLIDERS=LANDMARKS.flatMap(p=>{
 const at=(x,z,radius,height)=>({x:p.x+x,z:p.z+z,radius,height,architecture:true});
 if(p.shape==='greenhouse')return [-18,-9,9,18].flatMap(z=>[-15,15].map(x=>at(x,z,.5,8)));
 if(p.shape==='collector')return [at(-14,0,9,2)];
 if(p.shape==='nursery')return [-14,14].flatMap(x=>[-14,-7,0,7,14].map(z=>at(x,z,3.6,1.4)));
 if(p.shape==='depot')return [-20,20].map(x=>at(x,-10,3.5,10));
 if(p.shape==='exit')return [-6,6].map(x=>p.id==='near-exit'?at(0,x,1,6):at(x,0,1,6));
 return [];
});

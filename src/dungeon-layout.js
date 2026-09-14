import {dungeonDressing} from './dungeon-dressing.js';
export const DUNGEON_SCALE=1.8;
const TEMPLATE_NODES=[
 [0,0],[0,-7],[0,-15],
 [-10,-19],[-19,-13],[-24,-25],[-13,-31],
 [10,-20],[20,-14],[25,-25],[14,-32],
 [0,-30],[0,-42],[-12,-45],[-22,-53],[12,-46],[22,-39],
];

const TEMPLATE_EDGES=[
 [0,1],[1,2],
 [2,3],[3,4],[4,5],[5,6],[6,2],
 [2,7],[7,8],[8,9],[9,10],[10,7],
 [2,11],[11,12],[6,11],[10,11],
 [12,13],[13,14],[12,15],[15,16],
];

const distanceToSegment=(point,a,b)=>{
 const dx=b.x-a.x,dz=b.z-a.z,length=dx*dx+dz*dz||1;
 const t=Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.z-a.z)*dz)/length));
 return Math.hypot(point.x-(a.x+dx*t),point.z-(a.z+dz*t));
};

/** One mission-floor-sized network: branching corridors, loops and dead ends, with no gates or rooms. */
export function createDungeonLayout(s,n,type){
 // Rotate the template so its negative-Z entrance axis points from the map marker toward the map centre.
 const heading=Math.atan2(-n.z,-n.x)+Math.PI/2,cos=Math.cos(heading),sin=Math.sin(heading);
 const rooted=type==='dungeon_roots',skew=rooted?.12:-.08;
 const nodes=TEMPLATE_NODES.map(([lx,lz],id)=>{
  const bend=lx*skew*Math.sin(Math.abs(lz)/11),x=n.x+(lx*cos-lz*sin+bend*cos)*DUNGEON_SCALE,z=n.z+(lx*sin+lz*cos+bend*sin)*DUNGEON_SCALE;
  return{id,x,z,y:s.world.heightAt?.(x,z)??n.y??0};
 });
 const edges=TEMPLATE_EDGES.map(([from,to],id)=>({id,from,to}));
 const degree=nodes.map(()=>0);for(const edge of edges){degree[edge.from]++;degree[edge.to]++;}
 const deadEnds=nodes.filter((node,index)=>degree[index]===1&&index!==0).map(node=>node.id);
 const branches=nodes.filter((node,index)=>degree[index]>=3).map(node=>node.id);
 const layout={width:rooted?10:10.8,nodes,edges,entrance:0,branches,deadEnds,extent:64*DUNGEON_SCALE};
 layout.dressing=dungeonDressing(layout,type);
 layout.platforms=layout.dressing.map(p=>({x:p.x,z:p.z,radius:p.radius+.5,anchor:{x:p.groundX,z:p.groundZ}}));
 layout.platforms.push({x:nodes[0].x+3.4,z:nodes[0].z,radius:2.4,anchor:{x:nodes[0].x-3.4,z:nodes[0].z}});
 return layout;
}

function dungeonCandidates(layout,world){
 const candidates=[];
 for(const edge of layout.edges){
  const a=layout.nodes[edge.from],b=layout.nodes[edge.to];
  for(const t of [.12,.24,.36,.48,.6,.72,.84,.92]){
   const point={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t,edgeId:edge.id};
   if(!world?.walkable||world.walkable(point.x,point.z,2.4))candidates.push(point);
  }
 }
 return candidates;
}

export function dungeonSpawnPoints(layout,count,world){
 const candidates=dungeonCandidates(layout,world);if(!candidates.length)return[];
 return Array.from({length:count},(_,index)=>candidates[Math.floor(index*candidates.length/count)]);
}

/** Fixed encounter points with compact packs. Entering one point wakes only its 3-5 elites. */
export function dungeonAggroZones(layout,count,world){
 const anchors=(count<=12?[4,9,14]:[4,9,14,16]).map(id=>layout.nodes[id]);
 const candidates=dungeonCandidates(layout,world),used=new Set(),base=Math.floor(count/anchors.length),remainder=count%anchors.length;
 return anchors.map((anchor,index)=>{
  const size=base+(index<remainder?1:0),points=[];
  for(const candidate of [...candidates].sort((a,b)=>Math.hypot(a.x-anchor.x,a.z-anchor.z)-Math.hypot(b.x-anchor.x,b.z-anchor.z))){
   const key=`${candidate.edgeId}:${candidate.x.toFixed(3)}:${candidate.z.toFixed(3)}`;
   if(used.has(key)||points.some(p=>Math.hypot(p.x-candidate.x,p.z-candidate.z)<1.4))continue;
   used.add(key);points.push(candidate);if(points.length===size)break;
  }
  return{id:`aggro-${index+1}`,anchorNodeId:anchor.id,x:anchor.x,y:anchor.y,z:anchor.z,radius:8,state:'idle',members:[],points};
 });
}

export const dungeonRouteDistance=(layout,point)=>Math.min(...layout.edges.map(edge=>distanceToSegment(point,layout.nodes[edge.from],layout.nodes[edge.to])));

/** Rounded union of corridor capsules. The renderer and movement share this contour. */
export function dungeonSurfaceDistance(layout,point){
 const blend=4.5,half=layout.width*.5;let distance=Infinity;
 for(const edge of layout.edges){
  const d=distanceToSegment(point,layout.nodes[edge.from],layout.nodes[edge.to])-half;
  const h=Math.max(blend-Math.abs(distance-d),0)/blend;
  distance=Math.min(distance,d)-h*h*blend*.25;
 }
 for(const platform of layout.platforms||[]){
  const d=distanceToSegment(point,platform.anchor,platform)-platform.radius;
  const h=Math.max(1.4-Math.abs(distance-d),0)/1.4;
  distance=Math.min(distance,d)-h*h*1.4*.25;
 }
 return distance;
}

export function insideDungeonLayout(layout,point,radius=0){
 const half=layout.width*.5,distance=dungeonRouteDistance(layout,point);
 if(radius>half)return false;
 if(distance+radius<=half)return true;
 if(dungeonSurfaceDistance(layout,point)>0)return false;
 if(radius<=0)return true;
 for(let i=0;i<24;i++){const a=i*Math.PI/12;if(dungeonSurfaceDistance(layout,{x:point.x+Math.cos(a)*radius,z:point.z+Math.sin(a)*radius})>-.015)return false;}
 return true;
}

export function dungeonLayoutStats(layout){
 return{nodes:layout.nodes.length,edges:layout.edges.length,branches:layout.branches.length,deadEnds:layout.deadEnds.length,loops:layout.edges.length-layout.nodes.length+1,extent:layout.extent};
}

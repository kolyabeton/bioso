import {dungeonRouteDistance} from './dungeon-layout.js';

const THEMES={
 dungeon_roots:[['forest-boulder-v3',1.8],['forest-shrub-v3',1.6],['forest-fern-v3',1.4],['environment-scrap-pipes-v1',2.4]],
 dungeon_catacombs:[['forest-boulder-v3',1.8],['forest-shrub-v3',1.6],['environment-scrap-pipes-v1',2.4],['environment-scrap-bank-v1',2.2]],
};
const RUINS={dungeon_roots:['forest-ruin-arch-v2','forest-relic-v3'],dungeon_catacombs:['environment-city-pier-v2','environment-scrap-engine-v2','forest-ruin-arch-v2']};

/** Dressing occupies the shoulders, with a continuous 6.6 m clear lane. */
export function dungeonDressing(graph,type){
 if(graph.dressing)return graph.dressing;
 const props=[],theme=THEMES[type]||THEMES.dungeon_roots,ruins=RUINS[type]||RUINS.dungeon_roots;
 for(const edge of graph.edges){
  const a=graph.nodes[edge.from],b=graph.nodes[edge.to],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz),angle=Math.atan2(dx,dz);
  for(const [slot,t] of [.22,.5,.78].entries())for(const side of [-1,1]){
   const index=edge.id*6+slot*2+(side>0?1:0),large=slot===1&&edge.id%3===0&&side===(edge.id%2?1:-1);
   const [model,base]=large?[ruins[Math.floor(edge.id/3)%ruins.length],4]:theme[index%theme.length];
   const size=base*(.9+(index%5)*.055),radius=size*.71,offset=3.3+radius;
   const x=a.x+dx*t+dz/len*offset*side,z=a.z+dz*t-dx/len*offset*side;
   if(dungeonRouteDistance(graph,{x,z})<3.3+radius-.01)continue;
   if(props.some(p=>Math.hypot(p.x-x,p.z-z)<(p.radius+radius)*.78))continue;
   props.push({model,x,z,size,radius,rotation:angle+side*.7+(index%3)*.5,large,groundX:a.x+dx*t,groundZ:a.z+dz*t});
  }
 }
 return props;
}

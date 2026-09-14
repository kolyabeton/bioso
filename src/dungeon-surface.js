import {dungeonSurfaceDistance} from './dungeon-layout.js';
const surfaces=new WeakMap();

/** One welded terrain surface, clipped to the rounded corridor union. */
export function dungeonSurface(layout){
 if(surfaces.has(layout))return surfaces.get(layout);
 const spacing=.25;
 const pad=layout.width,minX=Math.min(...layout.nodes.map(p=>p.x))-pad,minZ=Math.min(...layout.nodes.map(p=>p.z))-pad;
 const cols=Math.ceil((Math.max(...layout.nodes.map(p=>p.x))+pad-minX)/spacing)+1;
 const rows=Math.ceil((Math.max(...layout.nodes.map(p=>p.z))+pad-minZ)/spacing)+1;
 const grid=Array.from({length:cols*rows},(_,id)=>{const p={id,x:minX+(id%cols)*spacing,z:minZ+Math.floor(id/cols)*spacing};p.d=dungeonSurfaceDistance(layout,p);return p;});
 const vertices=[],indices=[],boundary=[],vertexIds=new Map(),crossings=new Map();
 const vertex=p=>{if(!vertexIds.has(p.id)){vertexIds.set(p.id,vertices.length);vertices.push({x:p.x,z:p.z});}return vertexIds.get(p.id);};
 const cross=(a,b)=>{
  const id=a.id<b.id?`${a.id}:${b.id}`:`${b.id}:${a.id}`;
  if(!crossings.has(id)){
   let lo=a.d<=0?a:b,hi=a.d<=0?b:a;
   for(let i=0;i<12;i++){const p={x:(lo.x+hi.x)/2,z:(lo.z+hi.z)/2};if(dungeonSurfaceDistance(layout,p)<=0)lo=p;else hi=p;}
   crossings.set(id,{...lo,id});
  }
  return crossings.get(id);
 };
 const triangle=points=>{
  const polygon=[];
  for(let i=0;i<3;i++){const a=points[i],b=points[(i+1)%3];if(a.d<=0)polygon.push(a);if((a.d<=0)!==(b.d<=0))polygon.push(cross(a,b));}
  if(polygon.length<3)return;
  const ids=polygon.map(vertex);
  for(let i=1;i<ids.length-1;i++)indices.push(ids[0],ids[i+1],ids[i]);
  for(let i=0;i<polygon.length;i++)if(typeof polygon[i].id==='string'&&typeof polygon[(i+1)%polygon.length].id==='string')boundary.push([ids[i],ids[(i+1)%ids.length]]);
 };
 for(let z=0;z<rows-1;z++)for(let x=0;x<cols-1;x++){
  const a=grid[z*cols+x],b=grid[z*cols+x+1],c=grid[(z+1)*cols+x+1],d=grid[(z+1)*cols+x];
  triangle([a,b,c]);triangle([a,c,d]);
 }
 const next=new Map(boundary),seen=new Set(),contours=[];
 for(const [start] of boundary){
  if(seen.has(start))continue;
  const contour=[];let id=start;
  while(id!==undefined&&!seen.has(id)){seen.add(id);contour.push(vertices[id]);id=next.get(id);}
  contours.push(contour);
 }
 const result={vertices,indices,boundary,contours};surfaces.set(layout,result);return result;
}

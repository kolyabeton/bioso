import test from 'node:test';
import assert from 'node:assert/strict';
import {createDungeonLayout,dungeonSurfaceDistance,insideDungeonLayout} from '../src/dungeon-layout.js';
import {dungeonSurface} from '../src/dungeon-surface.js';

test('inner right-angle turns become a smooth, walkable fillet',()=>{
 const layout={width:10,nodes:[{x:0,z:0},{x:0,z:-20},{x:20,z:-20}],edges:[{from:0,to:1},{from:1,to:2}]};
 assert(insideDungeonLayout(layout,{x:5.5,z:-14.5}),'the old sharp void corner becomes floor');
 assert(!insideDungeonLayout(layout,{x:8,z:-12}),'rounding preserves the surrounding void');
 const surface=dungeonSurface(layout);
 for(const contour of surface.contours)for(let i=0;i<contour.length;i++){
  const a=contour[i],b=contour[(i+1)%contour.length],c=contour[(i+2)%contour.length];
  const ux=b.x-a.x,uz=b.z-a.z,vx=c.x-b.x,vz=c.z-b.z,lu=Math.hypot(ux,uz),lv=Math.hypot(vx,vz);
  if(Math.min(lu,lv)<.015)continue;
  const cosine=Math.max(-1,Math.min(1,(ux*vx+uz*vz)/lu/lv));
  assert(Math.acos(cosine)<Math.PI/9,'no sharp direction changes along the rounded border');
 }
});

for(const type of ['dungeon_roots','dungeon_catacombs'])test(`${type}: floor and cliff share a closed contour matching movement`,()=>{
 const graph=createDungeonLayout({world:{}},{x:0,z:26},type),surface=dungeonSurface(graph);
 const areas=surface.contours.map(c=>c.reduce((sum,p,i)=>{const q=c[(i+1)%c.length];return sum+p.x*q.z-q.x*p.z;},0)/2);
 assert.equal(areas.filter(a=>a>0).length,1,'service bays remain connected to the main platform, with no floating islands');
 assert(areas.filter(a=>a< -10).length>=3,'major sky openings remain between branches');
 assert.equal(dungeonSurface(graph),surface,'terrain and map reuse cached geometry');
 const outgoing=new Map(),incoming=new Map();
 for(const [a,b] of surface.boundary){outgoing.set(a,(outgoing.get(a)||0)+1);incoming.set(b,(incoming.get(b)||0)+1);}
 for(const [id,count] of outgoing){
  assert.equal(count,1);assert.equal(incoming.get(id),1,'cliff contour has no cracks or dangling walls');
  const p=surface.vertices[id];assert(Math.abs(dungeonSurfaceDistance(graph,p))<.001,'rendered rim matches the collision contour');
 }
 for(let i=0;i<surface.indices.length;i+=3){
  const [a,b,c]=surface.indices.slice(i,i+3).map(id=>surface.vertices[id]);
  const center={x:(a.x+b.x+c.x)/3,z:(a.z+b.z+c.z)/3};
  assert(dungeonSurfaceDistance(graph,center)<.02,'no visible triangle crosses the void');
 }
});

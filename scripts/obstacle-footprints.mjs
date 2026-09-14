import fs from 'node:fs';
import * as T from 'three';
import {createRockGeometry,ROCK_TILT} from '../src/rock-shape.js';
import {ARCHITECTURE_BOUNDS} from '../src/architecture-collision.js';
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
export function hull(points){
 const sorted=[...new Map(points.map(p=>[p.join(','),p])).values()].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
 const half=list=>{const out=[];for(const p of list){while(out.length>=2&&cross(out.at(-2),out.at(-1),p)<=0)out.pop();out.push(p);}return out;};
 return [...half(sorted).slice(0,-1),...half(sorted.toReversed()).slice(0,-1)];
}
export function modelPoints(id,{normalize=true}={}){
 const b=fs.readFileSync(new URL(`../public/assets/kit/${id}.glb`,import.meta.url)),jsonLength=b.readUInt32LE(12);
 const g=JSON.parse(b.subarray(20,20+jsonLength).toString()),bin=b.subarray(28+jsonLength),points=[];
 function visit(i,parent){
  const n=g.nodes[i],m=n.matrix?new T.Matrix4().fromArray(n.matrix):new T.Matrix4().compose(new T.Vector3(...(n.translation||[0,0,0])),new T.Quaternion(...(n.rotation||[0,0,0,1])),new T.Vector3(...(n.scale||[1,1,1])));m.premultiply(parent);
  if(n.mesh!==undefined)for(const primitive of g.meshes[n.mesh].primitives){
   const a=g.accessors[primitive.attributes.POSITION],v=g.bufferViews[a.bufferView];if(a.componentType!==5126||a.sparse)throw Error('Unsupported position accessor');
   for(let j=0;j<a.count;j++){const offset=(v.byteOffset||0)+(a.byteOffset||0)+j*(v.byteStride||12);points.push(new T.Vector3(bin.readFloatLE(offset),bin.readFloatLE(offset+4),bin.readFloatLE(offset+8)).applyMatrix4(m));}
  }
  for(const child of n.children||[])visit(child,m);
 }
 for(const i of g.scenes[g.scene||0].nodes)visit(i,new T.Matrix4());
 if(!normalize)return points;
 const box=new T.Box3().setFromPoints(points),d=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3()),scale=1/Math.max(d.x,d.y,d.z);center.y=box.min.y;
 return points.map(p=>p.sub(center).multiplyScalar(scale));
}
export function generate(){
 const data={};for(const id of [...Object.keys(ARCHITECTURE_BOUNDS),'veg-shrub']){
  const points=modelPoints(id);data[id]={hull:hull(points.map(p=>[p.x,p.z])),height:Math.max(...points.map(p=>p.y))};
 }
 const rock=createRockGeometry(),p=rock.attributes.position,points=[],rotation=new T.Euler(...ROCK_TILT,'YXZ');
 for(let i=0;i<p.count;i++)points.push(new T.Vector3(p.getX(i),p.getY(i)*1.2*.7,p.getZ(i)).applyEuler(rotation));
 data.rock={hull:hull(points.map(p=>[p.x,p.z])),height:Math.max(...points.map(p=>p.y))+1.2*.32};rock.dispose();return data;
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 const output=new URL('../src/obstacle-footprints.json',import.meta.url),data=generate();
 if(process.argv.includes('--check')){if(JSON.stringify(JSON.parse(fs.readFileSync(output)))!==JSON.stringify(data))throw Error('Footprints are stale; run node scripts/obstacle-footprints.mjs');console.log('All 9 footprints match rendered geometry');}
 else{fs.writeFileSync(output,JSON.stringify(data,null,2)+'\n');console.log(Object.fromEntries(Object.entries(data).map(([key,value])=>[key,value.hull.length])));}
}

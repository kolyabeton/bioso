// Verify collision metadata against GLB geometry without loading textures or a browser.
import fs from 'node:fs';
import * as T from 'three';
import assert from 'node:assert/strict';
import {ARCHITECTURE_BOUNDS} from '../src/architecture-collision.js';
for(const [id,expected] of Object.entries(ARCHITECTURE_BOUNDS)){
 const b=fs.readFileSync(new URL(`../public/assets/kit/${id}.glb`,import.meta.url));
 const g=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString()),box=new T.Box3();
 function visit(i,parent){
  const n=g.nodes[i],m=n.matrix?new T.Matrix4().fromArray(n.matrix):new T.Matrix4().compose(new T.Vector3(...(n.translation||[0,0,0])),new T.Quaternion(...(n.rotation||[0,0,0,1])),new T.Vector3(...(n.scale||[1,1,1])));m.premultiply(parent);
  if(n.mesh!==undefined)for(const p of g.meshes[n.mesh].primitives){const a=g.accessors[p.attributes.POSITION];box.union(new T.Box3(new T.Vector3(...a.min),new T.Vector3(...a.max)).applyMatrix4(m));}
  for(const child of n.children||[])visit(child,m);
 }
 for(const i of g.scenes[g.scene||0].nodes)visit(i,new T.Matrix4());
 const d=box.getSize(new T.Vector3()),max=Math.max(d.x,d.y,d.z),actual=[d.x/max,d.y/max,d.z/max];
 assert.ok(actual.every((v,i)=>Math.abs(v-expected[i])<1e-7),`${id}: update bounds to ${JSON.stringify(actual)}`);
 console.log(`${id}: bounds match GLB`);
}

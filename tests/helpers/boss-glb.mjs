import fs from 'node:fs';
import * as T from 'three';
/** Geometry-only GLB reader for testing shipped rig transforms without DOM/image decoding. */
export function readBossGeometry(id){
 const b=fs.readFileSync(new URL(`../../public/assets/kit/${id}.glb`,import.meta.url)),jsonLength=b.readUInt32LE(12),g=JSON.parse(b.subarray(20,20+jsonLength)),bin=b.subarray(28+jsonLength);
 function attribute(index){const a=g.accessors[index],v=g.bufferViews[a.bufferView],size={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type],bytes={5126:4,5125:4,5123:2,5121:1}[a.componentType],read={5126:'readFloatLE',5125:'readUInt32LE',5123:'readUInt16LE',5121:'readUInt8'}[a.componentType],values=[];for(let i=0;i<a.count;i++)for(let k=0;k<size;k++)values.push(bin[read]((v.byteOffset||0)+(a.byteOffset||0)+i*(v.byteStride||size*bytes)+k*bytes));return new (a.componentType===5126?T.Float32BufferAttribute:T.Uint32BufferAttribute)(values,size);}
 const nodes=g.nodes.map(n=>{let o=new T.Group();if(n.mesh!==undefined)for(const p of g.meshes[n.mesh].primitives){const geom=new T.BufferGeometry();geom.setAttribute('position',attribute(p.attributes.POSITION));if(p.indices!==undefined)geom.setIndex(attribute(p.indices));o.add(new T.Mesh(geom,new T.MeshStandardMaterial()));}o.name=n.name;o.userData={...n.extras};if(n.matrix)o.applyMatrix4(new T.Matrix4().fromArray(n.matrix));else{if(n.translation)o.position.fromArray(n.translation);if(n.rotation)o.quaternion.fromArray(n.rotation);if(n.scale)o.scale.fromArray(n.scale);}return o;});
 g.nodes.forEach((n,i)=>{for(const child of n.children??[])nodes[i].add(nodes[child]);});const root=new T.Group();for(const n of g.scenes[g.scene??0].nodes)root.add(nodes[n]);return root;
}

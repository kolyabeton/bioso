import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import * as T from 'three';

// Read the actual GLB geometry in Node without a browser/image decoder.
export function architectureGLB(id){
 const file=readFileSync(new URL(`../../public/assets/kit/${id}.glb`,import.meta.url)),jsonLength=file.readUInt32LE(12),gltf=JSON.parse(file.subarray(20,20+jsonLength)),bin=28+jsonLength;
 const read=index=>{
  const a=gltf.accessors[index],v=gltf.bufferViews[a.bufferView],sizes={SCALAR:1,VEC2:2,VEC3:3,VEC4:4},n=sizes[a.type],types={5126:[4,'getFloat32'],5125:[4,'getUint32'],5123:[2,'getUint16']},[bytes,method]=types[a.componentType],view=new DataView(file.buffer,file.byteOffset,file.byteLength),values=[];
  for(let i=0;i<a.count;i++)for(let c=0;c<n;c++)values.push(view[method](bin+(v.byteOffset||0)+(a.byteOffset||0)+i*(v.byteStride||n*bytes)+c*bytes,true));
  return {values,size:n};
 };
 assert.equal(gltf.nodes.length,1);assert.equal(gltf.nodes[0].matrix,undefined);
 const primitive=gltf.meshes[0].primitives[0],geometry=new T.BufferGeometry();
 for(const [semantic,name] of Object.entries({POSITION:'position',NORMAL:'normal',TEXCOORD_0:'uv'})){
  const a=read(primitive.attributes[semantic]);geometry.setAttribute(name,new T.Float32BufferAttribute(a.values,a.size));
 }
 geometry.setIndex(read(primitive.indices).values);geometry.computeBoundingBox();geometry.computeBoundingSphere();
 const material=new T.MeshStandardMaterial();material.name=id+'-source-material';const model=new T.Group();model.add(new T.Mesh(geometry,material));return model;
}

import {BufferAttribute} from 'three';

/** Index complete bitwise-identical vertices. Triangle order, seams, normals,
 * colors and morph deformation stay exact; no rounding or simplification. */
export function indexGeometryExact(geometry){
 if(geometry.index)return geometry;
 const count=geometry.attributes.position?.count;if(!count)return geometry;
 const streams=[...Object.entries(geometry.attributes).map(([name,attribute])=>({name,attribute})),...Object.entries(geometry.morphAttributes).flatMap(([name,list])=>list.map((attribute,target)=>({name,attribute,target})))];
 if(streams.some(({attribute:a})=>a.isInterleavedBufferAttribute||a.isFloat16BufferAttribute||a.isInstancedBufferAttribute||!a.array||a.count!==count))return geometry;
 for(const stream of streams){const a=stream.attribute;stream.bytes=new Uint8Array(a.array.buffer,a.array.byteOffset,a.array.byteLength);stream.stride=a.itemSize*a.array.BYTES_PER_ELEMENT;}
 const heads=new Map(),next=new Int32Array(count).fill(-1),remap=new Uint32Array(count),unique=[];
 const equal=(a,b)=>{for(const {bytes,stride}of streams)for(let j=0;j<stride;j++)if(bytes[a*stride+j]!==bytes[b*stride+j])return false;return true;};
 for(let i=0;i<count;i++){
  let hash=2166136261;for(const {bytes,stride}of streams)for(let j=0;j<stride;j++)hash=Math.imul(hash^bytes[i*stride+j],16777619);
  let match=heads.get(hash)??-1;while(match!==-1&&!equal(i,match))match=next[match];
  if(match!==-1)remap[i]=remap[match];else{remap[i]=unique.length;unique.push(i);next[i]=heads.get(hash)??-1;heads.set(hash,i);}
 }
 for(const {name,attribute:a,target}of streams){
  const array=new a.array.constructor(unique.length*a.itemSize);for(let i=0;i<unique.length;i++)array.set(a.array.subarray(unique[i]*a.itemSize,(unique[i]+1)*a.itemSize),i*a.itemSize);
  const attribute=new BufferAttribute(array,a.itemSize,a.normalized).setUsage(a.usage);attribute.name=a.name;attribute.gpuType=a.gpuType;
  if(target===undefined)geometry.setAttribute(name,attribute);else geometry.morphAttributes[name][target]=attribute;
 }
 geometry.setIndex(new BufferAttribute(unique.length<=65535?new Uint16Array(remap):remap,1));return geometry;
}

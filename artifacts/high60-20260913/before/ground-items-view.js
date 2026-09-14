import * as T from 'three';
import {loadModel,fittedModel,partModelId} from './asset-models.js';

const PARTICLES_PER_ITEM=24;

/** Shared model and highlight pools keep large loot piles to a bounded draw count. */
export function createGroundItemsView(scene,load=loadModel){
 const root=new T.Group();root.name='ground-items';scene.add(root);
 const sources=new Map(),pending=new Set(),fitted=new Map(),batches=new Map(),pools=new Map();
 const world=new T.Object3D(),matrix=new T.Matrix4();let visibleCount=0;
 const uniforms={tint:{value:new T.Color(0xf1c66e)},strength:{value:1}};
 const haloMaterial=new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,toneMapped:false,
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:'varying vec2 vUv;uniform vec3 tint;uniform float strength;void main(){float d=length(vUv-.5)*2.;float glow=pow(max(0.,1.-d),2.)*.32;float rim=exp(-pow((d-.70)*22.,2.))*.24;gl_FragColor=vec4(tint,(glow+rim)*strength);}'
 });
 const halo=new T.InstancedMesh(new T.PlaneGeometry(3.36,3.36),haloMaterial,2048);halo.name='ground-item-halos';halo.instanceMatrix.setUsage(T.DynamicDrawUsage);halo.frustumCulled=false;root.add(halo);
 const pointerMaterial=new T.MeshStandardMaterial({color:0xf1c66e,emissive:0xf1c66e,emissiveIntensity:.6,roughness:.35,metalness:.25,transparent:true});
 const pointerGeometry=new T.ConeGeometry(.72,1.2,3);pointerGeometry.rotateX(Math.PI);
 const pointers=new T.InstancedMesh(pointerGeometry,pointerMaterial,2048);pointers.name='ground-item-pointers';pointers.instanceMatrix.setUsage(T.DynamicDrawUsage);pointers.frustumCulled=false;root.add(pointers);
 let particleCapacity=0,particleGeometry,particles;
 function ensureParticles(count){
  if(count<=particleCapacity)return;particleCapacity=Math.max(256,2**Math.ceil(Math.log2(count)));
  particleGeometry?.dispose();particles?.removeFromParent();
  particleGeometry=new T.BufferGeometry();particleGeometry.setAttribute('position',new T.BufferAttribute(new Float32Array(particleCapacity*3),3).setUsage(T.DynamicDrawUsage));particleGeometry.setAttribute('sparkSize',new T.BufferAttribute(new Float32Array(particleCapacity),1));particleGeometry.setAttribute('sparkAlpha',new T.BufferAttribute(new Float32Array(particleCapacity),1).setUsage(T.DynamicDrawUsage));
  const sizes=particleGeometry.attributes.sparkSize.array;for(let i=0;i<particleCapacity;i++)sizes[i]=4+(i%4)*1.3;
  particles=new T.Points(particleGeometry,new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,
   vertexShader:'attribute float sparkSize;attribute float sparkAlpha;varying float alpha;void main(){alpha=sparkAlpha;gl_PointSize=sparkSize;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
   fragmentShader:'uniform vec3 tint;uniform float strength;varying float alpha;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;float soft=pow(1.-d,1.5);gl_FragColor=vec4(mix(tint,vec3(1.),.25),soft*alpha*strength);}'
  }));particles.name='ground-item-particles';particles.frustumCulled=false;root.add(particles);
 }
 function request(id){if(pending.has(id))return;pending.add(id);load(id).then(source=>{if(source)sources.set(id,source);});}
 function meshes(id){if(fitted.has(id))return fitted.get(id);const source=sources.get(id);if(!source)return [];const model=fittedModel(source,{size:1.5,anchor:'bottom'});model.updateMatrixWorld(true);const result=[];model.traverse(o=>{if(o.isMesh)result.push({geometry:o.geometry,material:o.material,matrix:o.matrixWorld.clone(),key:`${id}:${result.length}`});});fitted.set(id,result);return result;}
 function update(items,scale=1,time=0,reducedMotion=false){
  visibleCount=items.length;for(const batch of batches.values())batch.count=0;
  halo.count=Math.min(items.length,halo.instanceMatrix.count);pointers.count=Math.min(items.length,pointers.instanceMatrix.count);
  ensureParticles(Math.max(1,items.length*PARTICLES_PER_ITEM));const positions=particleGeometry.attributes.position.array,alphas=particleGeometry.attributes.sparkAlpha.array;
  uniforms.strength.value=reducedMotion?1:.92+Math.sin(time*.9)*.08;pointerMaterial.opacity=Math.min(1,uniforms.strength.value);
  for(let index=0;index<items.length;index++){
   const q=items[index],id=partModelId(q.part||{key:q.lore?.modelKey});request(id);world.position.set(q.x,(q.y??0)+.04,q.z);world.rotation.set(0,0,0);world.scale.setScalar(scale);world.updateMatrix();
   for(const m of meshes(id)){matrix.multiplyMatrices(world.matrix,m.matrix);if(!batches.has(m.key))batches.set(m.key,{...m,transforms:[],count:0});const batch=batches.get(m.key),target=batch.transforms[batch.count]??=new T.Matrix4();target.copy(matrix);batch.count++;}
   if(index<halo.count){world.position.set(q.x,(q.y??0)+.04+.065*scale,q.z);world.rotation.set(-Math.PI/2,0,0);world.scale.setScalar(scale);world.updateMatrix();halo.setMatrixAt(index,world.matrix);}
   if(index<pointers.count){world.position.set(q.x,(q.y??0)+.04+(2.5+(reducedMotion?0:Math.sin(time*1.4)*.12))*scale,q.z);world.rotation.set(0,reducedMotion?0:time*.9,0);world.scale.setScalar(scale);world.updateMatrix();pointers.setMatrixAt(index,world.matrix);}
   for(let i=0;i<PARTICLES_PER_ITEM;i++){const at=index*PARTICLES_PER_ITEM+i,phase=(time*.12+i*.61803398875)%1,angle=i*2.39996+time*.12,r=1.2*(.55+(i%5)*.09)*scale;positions[at*3]=q.x+Math.cos(angle)*r;positions[at*3+1]=(q.y??0)+.04+(.15+phase*1.5)*scale;positions[at*3+2]=q.z+Math.sin(angle)*r;alphas[at]=Math.sin(phase*Math.PI)*(.6+(i%3)*.18);}
  }
  for(const pool of pools.values())pool.count=0;
  for(const [key,batch]of batches){if(!batch.count)continue;let pool=pools.get(key);if(!pool||pool.instanceMatrix.count<batch.count){if(pool){root.remove(pool);pool.dispose();}pool=new T.InstancedMesh(batch.geometry,batch.material,Math.max(128,2**Math.ceil(Math.log2(batch.count))));pool.instanceMatrix.setUsage(T.DynamicDrawUsage);pool.frustumCulled=false;pool.castShadow=pool.receiveShadow=false;root.add(pool);pools.set(key,pool);}pool.count=batch.count;for(let i=0;i<batch.count;i++)pool.setMatrixAt(i,batch.transforms[i]);pool.instanceMatrix.needsUpdate=true;}
  halo.instanceMatrix.needsUpdate=halo.count>0;pointers.instanceMatrix.needsUpdate=pointers.count>0;particles.visible=!reducedMotion;particleGeometry.setDrawRange(0,reducedMotion?0:items.length*PARTICLES_PER_ITEM);particleGeometry.attributes.position.needsUpdate=true;particleGeometry.attributes.sparkAlpha.needsUpdate=true;
 }
 function reset(){visibleCount=halo.count=pointers.count=0;for(const p of pools.values())p.count=0;if(particleGeometry)particleGeometry.setDrawRange(0,0);}
 return {update,reset,info:()=>({visibleGroundItems:visibleCount,groundItemDrawBatches:[...pools.values()].filter(p=>p.count).length+(visibleCount?2+(particles?.visible?1:0):0)})};
}

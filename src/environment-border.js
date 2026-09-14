import * as T from 'three';
import {seededRandom} from './simulation.js';
import {environmentProfile} from './environment-profiles.js';
import {loadModel,fittedModel} from './asset-models.js';
import {forestSurfaceMaterial} from './forest-surface.js';
import {forestPlantMaterial} from './forest-light.js';
import {environmentMetalMaterial} from './environment-metal.js';

export function environmentBorderHeight(tile,world,x,z){
 // Preserve the already sculpted Forest roots and their baked placement heights.
 if(tile.biome==='forest'&&!tile.environmentId)return 0;
 const b=world.bounds,d=Math.max(0,b.minX-x,x-b.maxX,b.minZ-z,z-b.maxZ);
 const t=Math.min(1,d/10),height=environmentProfile(tile)?.relief==='heaps'?6.5:5.5;
 return height*t*t*(3-2*t);
}

/** Visual-only margin: never changes the walkable rectangle or tile decorations. */
export function environmentBorderPlacements(tile,world){
 const authoredForest=tile.biome==='forest'&&!tile.environmentId;
 const profile=environmentProfile(tile),b=world.bounds,edges=[],items=[];
 if(!profile)return items;
 if(tile.x-32===b.minX)edges.push([-1,0]);if(tile.x+32===b.maxX)edges.push([1,0]);
 if(tile.z-32===b.minZ)edges.push([0,-1]);if(tile.z+32===b.maxZ)edges.push([0,1]);
 const rng=seededRandom(world.seed+tile.index*15427);
 for(const [dx,dz] of edges){
  const start=dx&&tile.z-32===b.minZ?-60:-28,end=dx&&tile.z+32===b.maxZ?60:28;
  for(let row=0;row<(authoredForest?1:3);row++)for(let along=start;along<=end;along+=7){
   // A closed, irregular boundary: no inviting paths between isolated props.
   const a=along+(rng()-.5)*2,size=row===0?8+rng()*2:10+rng()*3;
   const depth=row===0?size*.71+.4:8+row*9+rng()*3;
   const model=profile.pieces[row>0&&rng()>.55?1:0];
   const item={model,x:tile.x+(dx?dx*(32+depth):a),z:tile.z+(dz?dz*(32+depth):a),size,rotation:rng()*Math.PI*2};
   // The raised scrap berm and front fence are sufficient: omit rear junk walls.
   // Still consume the same random sequence so the approved front edge stays put.
   if(row===0||profile.relief!=='heaps')items.push(item);
   if(row===0)for(let j=0;j<4;j++){
    const tangent=a+(rng()-.5)*10,d=3.6+rng()*7;
    items.push({model:'forest-boulder-v3',x:tile.x+(dx?dx*(32+d):tangent),z:tile.z+(dz?dz*(32+d):tangent),size:1.3+rng()*2.7,rotation:rng()*Math.PI*2});
   }
  }
 }
 return items;
}

export async function addEnvironmentBorder(group,tile,world,atlas,uniforms,work=fn=>fn()){
 const items=environmentBorderPlacements(tile,world),pose=new T.Object3D();
 for(const id of new Set(items.map(p=>p.model))){
  const source=await loadModel(id);if(!source)throw Error('Border model unavailable: '+id);
  const template=await work(()=>fittedModel(source,{size:1,anchor:'bottom'}));template.updateMatrixWorld(true);
  const positions=items.filter(p=>p.model===id);
  const meshes=[];template.traverse(o=>{if(o.isMesh)meshes.push(o);});
  for(const o of meshes)await work(()=>{
   const material=source=>{
    const leaves=source.name.includes('geometric-leaves'),mint=source.name.includes('mint');
    const m=leaves?forestPlantMaterial(source,uniforms):mint?source.clone():source.name==='environment-aged-metal'?environmentMetalMaterial(source):forestSurfaceMaterial(source,atlas);
    if(leaves){m.side=T.DoubleSide;m.color.set('#d2d5bb');}
    m.roughness=Math.max(.85,m.roughness);if(mint)m.emissiveIntensity=.3;
    return m;
   };
   const mesh=new T.InstancedMesh(o.geometry,Array.isArray(o.material)?o.material.map(material):material(o.material),positions.length);
   mesh.name='environment-border-3d-'+id;mesh.userData.sharedPlant=mesh.userData.borderMaterial=true;
   positions.forEach((p,i)=>{pose.position.set(p.x,environmentBorderHeight(tile,world,p.x,p.z)-.025,p.z);pose.rotation.set(0,p.rotation,0);pose.scale.setScalar(p.size);pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix.clone().multiply(o.matrixWorld));});
   mesh.computeBoundingSphere();group.add(mesh);
  });
 }
}

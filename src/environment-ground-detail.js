import * as T from 'three';
import {createRockGeometry} from './rock-shape.js';
import {seededRandom} from './simulation.js';
import {forestSurfaceMaterial} from './forest-surface.js';

/** Ankle-high fragments inside the scenery shoulders, not new solid cover. */
export function addEnvironmentGroundDetail(group,tile,world,profile,atlas){
 const rng=seededRandom((world.seed+tile.index*1103+631)>>>0),pose=new T.Object3D();
 const anchors=tile.decorations.filter(d=>d.environmentSignature||d.decorationKind==='structure');
 if(!anchors.length)return;
 const metal=profile.relief==='heaps',geometry=metal?new T.BoxGeometry(1,1,1):createRockGeometry();
 const uv=geometry.getAttribute('uv');
 // Reuse the stone cell; tiny steel fragments need no additional texture.
 if(uv)for(let i=0;i<uv.count;i++)uv.setXY(i,.02+uv.getX(i)*.46,.52+uv.getY(i)*.46);
 const material=metal?new T.MeshStandardMaterial():forestSurfaceMaterial(new T.MeshStandardMaterial(),atlas);
 material.color.set(metal?'#9faaa9':profile.relief==='nests'?'#aba692':'#b7b8ad');
 material.metalness=metal?.22:0;material.roughness=.93;
 const transforms=[];
 for(const anchor of anchors)for(let n=0;n<14;n++){
  const a=rng()*Math.PI*2,r=(anchor.size||4)*(.25+rng()*.35);
  const x=anchor.x+Math.cos(a)*r,z=anchor.z+Math.sin(a)*r;
  const lx=x-tile.x,lz=z-tile.z;
  if(Math.abs(lx)>29||Math.abs(lz)>28||Math.abs(lx)<5.2||(!tile.environmentId&&Math.abs(lz)<5.2))continue;
  if(tile.safe?.some(p=>Math.hypot(p.x-x,p.z-z)<3))continue;
  const size=.18+rng()*.46;
  pose.position.set(x,(world.heightAt(x,z)??0)+.03,z);
  pose.rotation.set(rng()*.2,rng()*Math.PI*2,rng()*.25);
  pose.scale.set(size*(metal?2.1:1.3),size*(profile.relief==='terraces'||profile.relief==='foundations'?.23:.46),size*(metal?.3:1));
  pose.updateMatrix();transforms.push(pose.matrix.clone());
 }
 const mesh=new T.InstancedMesh(geometry,material,transforms.length);
 mesh.name='environment-ground-fragments';
 mesh.userData.sharedPlant=mesh.userData.borderMaterial=mesh.userData.ownedGeometry=true;
 transforms.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));mesh.computeBoundingSphere();group.add(mesh);
}

import {enableProjectileFade,projectileOpacity,setProjectileOpacity} from './projectile-fade.js';
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createSymbiontView} from './systems/symbiont-view.js';

const WINGS_PER_BEE=4;
export const RICOCHET_BEE_SCALE=.5;

/** Presentation-only spacing keeps the three homing bees readable as a formation. */
export function rocketFlightOffset(shot,time=0,reducedMotion=false){
 const horizontal=Math.hypot(shot.dx,shot.dz)||1,sideX=shot.dz/horizontal,sideZ=-shot.dx/horizontal,formation=((shot.id%3)-1)*.36,weave=reducedMotion?0:Math.sin(time*3.4+shot.id*.91)*.09;
 return{x:sideX*(formation+weave),y:Math.abs(formation)*.22,z:sideZ*(formation+weave)};
}

/** Reuses the articulated mechanical-bee model as a batched weapon projectile. */
export function createRocketBeeView(parent,capacity=96,{scale=1.24,formation=true}={}){
 const sourceRoot=new T.Group(),sourceView=createSymbiontView(sourceRoot,{initialCount:1}),template=sourceRoot.getObjectByName('mechanical-bee-0');
 template.updateMatrixWorld(true);
 const groups=new Map();
 const body=template.children.find(child=>child.isGroup);
 for(const mesh of body.children){
  if(!mesh.isMesh)continue;
  const geometry=(mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone()).applyMatrix4(mesh.matrixWorld);
  const key=mesh.material.uuid;
  if(!groups.has(key)){
   const material=mesh.material.clone();
   // Keep the ceramic/metal construction readable under the arena's moving light.
   if(material.isMeshStandardMaterial){
    material.roughness=Math.max(.32,(material.roughness??.7)-.14);
    material.metalness=Math.min(1,(material.metalness??0)+.1);
    if(material.emissiveIntensity)material.emissiveIntensity*=1.45;
   }
   groups.set(key,{material,geometries:[]});
  }
  groups.get(key).geometries.push(geometry);
 }
 const meshes=[];
 for(const {material,geometries}of groups.values()){
  const geometry=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());
  const mesh=new T.InstancedMesh(geometry,material,capacity);mesh.name='rocket-bees';mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);parent.add(mesh);meshes.push(mesh);
 }
 sourceView.dispose();

 // An animated translucent sheet keeps the baked bee model batched while restoring
 // the four-wing silhouette and specular movement at projectile scale.
 const wingShape=new T.Shape();
 wingShape.moveTo(0,0);wingShape.lineTo(.2,.16);wingShape.lineTo(.72,.13);wingShape.lineTo(.98,0);wingShape.lineTo(.7,-.15);wingShape.lineTo(.18,-.13);wingShape.closePath();
 const wingGeometry=new T.ShapeGeometry(wingShape);wingGeometry.rotateX(Math.PI/2);
 const wingMaterial=new T.MeshStandardMaterial({color:0xc8ded5,emissive:0x28675d,emissiveIntensity:.45,transparent:true,opacity:.26,side:T.DoubleSide,depthWrite:false,roughness:.42,metalness:.2});
 const wingBlur=new T.InstancedMesh(wingGeometry,wingMaterial,capacity*WINGS_PER_BEE);wingBlur.name='rocket-bee-wing-motion';wingBlur.count=0;wingBlur.frustumCulled=false;wingBlur.instanceMatrix.setUsage(T.DynamicDrawUsage);parent.add(wingBlur);

 const engineGeometry=new T.SphereGeometry(1,8,5),engineMaterial=new T.MeshBasicMaterial({color:0xffd19a,toneMapped:false});
 const engineGlow=new T.InstancedMesh(engineGeometry,engineMaterial,capacity);engineGlow.name='rocket-bee-engine-glow';engineGlow.count=0;engineGlow.frustumCulled=false;engineGlow.instanceMatrix.setUsage(T.DynamicDrawUsage);parent.add(engineGlow);

 for(const mesh of [...meshes,wingBlur,engineGlow])enableProjectileFade(mesh);
 const root=new T.Object3D(),part=new T.Object3D(),rootMatrix=new T.Matrix4(),worldMatrix=new T.Matrix4();
 const headings=new Map();
 const wrapAngle=value=>Math.atan2(Math.sin(value),Math.cos(value));
 function placePart(mesh,index,x,y,z,rx,ry,rz,sx,sy,sz){
  part.position.set(x,y,z);part.rotation.set(rx,ry,rz,'XYZ');part.scale.set(sx,sy,sz);part.updateMatrix();
  worldMatrix.multiplyMatrices(rootMatrix,part.matrix);mesh.setMatrixAt(index,worldMatrix);
 }
 return{
  update(shots,height,time=0,reducedMotion=false){
   const count=Math.min(capacity,shots.length);
   const live=new Set();
   for(let i=0;i<count;i++){
    const shot=shots[i],horizontal=Math.hypot(shot.dx,shot.dz)||1,desiredYaw=Math.atan2(shot.dx,shot.dz),desiredPitch=-Math.atan2(shot.dy??0,horizontal);live.add(shot.id);
    let pose=headings.get(shot.id);if(!pose){pose={yaw:desiredYaw,pitch:desiredPitch};headings.set(shot.id,pose);}
    const yawDelta=wrapAngle(desiredYaw-pose.yaw),turn=reducedMotion?yawDelta:Math.max(-.12,Math.min(.12,yawDelta));pose.yaw=wrapAngle(pose.yaw+turn);pose.pitch+=reducedMotion?desiredPitch-pose.pitch:(desiredPitch-pose.pitch)*.32;
    const phase=time*3.4+shot.id*.91,offset=formation?rocketFlightOffset(shot,time,reducedMotion):{x:0,y:0,z:0};
    const bank=reducedMotion?0:-turn*2.1+Math.sin(phase*.72)*.075,hover=reducedMotion?0:Math.sin(time*6.2+shot.id*.9)*.035;
    root.position.set(shot.x+offset.x,height(shot)+hover+offset.y,shot.z+offset.z);root.rotation.set(pose.pitch,pose.yaw,bank,'YXZ');root.scale.setScalar(scale);root.updateMatrix();rootMatrix.copy(root.matrix);
    const alpha=projectileOpacity(shot);for(const mesh of meshes){setProjectileOpacity(mesh,i,alpha);mesh.setMatrixAt(i,rootMatrix);}setProjectileOpacity(engineGlow,i,alpha);

    for(let sideIndex=0;sideIndex<2;sideIndex++)for(let row=0;row<2;row++){
     const side=sideIndex?1:-1,index=i*WINGS_PER_BEE+sideIndex*2+row;
     setProjectileOpacity(wingBlur,index,alpha);
     const flap=reducedMotion ? .14 : .16+Math.sin(time*32+shot.id*1.31+row*.9)*.4;
     placePart(wingBlur,index,side*.19,.11,.18-row*.37,0,side*(row?.34:-.12),side*flap,side*(row?.68:.84),1,row?.74:.92);
    }
    const pulse=reducedMotion?1:.92+Math.sin(time*29+shot.id)*.08;
    placePart(engineGlow,i,0,-.035,-.62,0,0,0,.055*pulse,.055*pulse,.028);
   }
   for(const id of headings.keys())if(!live.has(id))headings.delete(id);
   for(const mesh of meshes){mesh.count=count;mesh.instanceMatrix.needsUpdate=true;}
   wingBlur.count=count*WINGS_PER_BEE;wingBlur.instanceMatrix.needsUpdate=true;
   engineGlow.count=count;engineGlow.instanceMatrix.needsUpdate=true;
  },
  reset(){headings.clear();for(const mesh of meshes)mesh.count=0;wingBlur.count=engineGlow.count=0;},
  count(){return meshes[0]?.count??0;},
  dispose(){
   for(const mesh of meshes){parent.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();}
   parent.remove(wingBlur,engineGlow);wingGeometry.dispose();wingMaterial.dispose();engineGeometry.dispose();engineMaterial.dispose();
  }
 };
}

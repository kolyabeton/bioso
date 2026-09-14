import {enableProjectileFade,projectileOpacity,setProjectileOpacity} from './projectile-fade.js';
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// A solid barbed spear and a physical tether; presentation never moves the shot.
export function createHarpoonView(parent,capacity=128){
 const shaft=new T.CylinderGeometry(.065,.075,1.5,8);shaft.rotateX(Math.PI/2);shaft.translate(0,0,-.3);
 const bladeShape=new T.Shape();
 bladeShape.moveTo(0,1.05);bladeShape.lineTo(.34,.17);bladeShape.lineTo(.12,.29);bladeShape.lineTo(.085,.02);bladeShape.lineTo(-.085,.02);bladeShape.lineTo(-.12,.29);bladeShape.lineTo(-.34,.17);bladeShape.closePath();
 const blade=new T.ExtrudeGeometry(bladeShape,{depth:.07,bevelEnabled:true,bevelThickness:.018,bevelSize:.02,bevelSegments:1,steps:1});blade.translate(0,0,-.035);blade.rotateX(Math.PI/2);
 const collar=new T.CylinderGeometry(.105,.105,.16,8);collar.rotateX(Math.PI/2);collar.translate(0,0,-.78);
 const eye=new T.TorusGeometry(.09,.027,5,10);eye.translate(0,0,-1.09);
 const parts=[shaft,blade,collar,eye],geometry=mergeGeometries(parts.map(g=>g.index?g.toNonIndexed():g));
 parts.forEach(g=>g.dispose());
 const steel=new T.MeshStandardMaterial({color:0xb0b5b0,metalness:.55,roughness:.48});
 const tendon=new T.MeshStandardMaterial({color:0x827560,metalness:.12,roughness:.9});
 function batch(name,geo,material,size){const mesh=new T.InstancedMesh(geo,material,size);mesh.name=name;mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);parent.add(mesh);return enableProjectileFade(mesh);}
 const spears=batch('harpoon-steel',geometry,steel,capacity),cables=batch('harpoon-tether',new T.CylinderGeometry(1,1,1,5),tendon,capacity*8);
 const pose=new T.Object3D(),direction=new T.Vector3(),forward=new T.Vector3(0,0,1),up=new T.Vector3(0,1,0),tail=new T.Vector3(),anchor=new T.Vector3(),a=new T.Vector3(),b=new T.Vector3();
 function reserve(mesh,count){if(count<=mesh.instanceMatrix.count)return;mesh.dispose();mesh.instanceMatrix=new T.InstancedBufferAttribute(new Float32Array(count*32),16).setUsage(T.DynamicDrawUsage);}
 return{
  update(shots,height,origin){
   reserve(spears,shots.length);reserve(cables,shots.length*8);let segments=0;
   shots.forEach((shot,i)=>{
    const alpha=projectileOpacity(shot);setProjectileOpacity(spears,i,alpha);
    direction.set(shot.dx,shot.dy??0,shot.dz).normalize();if(!direction.lengthSq())direction.copy(forward);
    pose.position.set(shot.x,height(shot),shot.z);pose.quaternion.setFromUnitVectors(forward,direction);pose.scale.setScalar(1);pose.updateMatrix();spears.setMatrixAt(i,pose.matrix);
    tail.copy(direction).multiplyScalar(-1.18).add(pose.position);
    if(!origin(shot,anchor))return;
    const distance=anchor.distanceTo(tail),sag=Math.min(.32,distance*.035);
    a.copy(anchor);
    for(let j=1;j<=8;j++){
     const t=j/8;b.lerpVectors(anchor,tail,t);b.y-=Math.sin(t*Math.PI)*sag;
     direction.subVectors(b,a);const length=direction.length();
     pose.position.copy(a).add(b).multiplyScalar(.5);pose.quaternion.setFromUnitVectors(up,direction.normalize());pose.scale.set(.023,Math.max(.0001,length),.023);pose.updateMatrix();setProjectileOpacity(cables,segments,alpha);cables.setMatrixAt(segments++,pose.matrix);a.copy(b);
    }
   });
   spears.count=shots.length;cables.count=segments;spears.instanceMatrix.needsUpdate=true;cables.instanceMatrix.needsUpdate=true;
  },
  count:()=>spears.count,
  reset(){spears.count=cables.count=0;},
  dispose(){for(const mesh of [spears,cables]){parent.remove(mesh);mesh.dispose();mesh.geometry.dispose();mesh.material.dispose();}}
 };
}

import * as T from 'three';
import {createBioParticles,FX_CAPACITY} from './bio-fx.js';
export function createBioFxView(scene) {
  const model=createBioParticles(),energyGeometry=new T.IcosahedronGeometry(1,0),bloodGeometry=new T.SphereGeometry(1,12,8);
  const energyMaterial=new T.MeshBasicMaterial({transparent:true,opacity:.85,depthWrite:false,toneMapped:false}),bloodMaterial=new T.MeshStandardMaterial({roughness:.12,metalness:0,emissive:0x061006,emissiveIntensity:.45,transparent:true,opacity:.95,depthWrite:true});
  const energyMesh=new T.InstancedMesh(energyGeometry,energyMaterial,FX_CAPACITY),bloodMesh=new T.InstancedMesh(bloodGeometry,bloodMaterial,FX_CAPACITY),dummy=new T.Object3D(),color=new T.Color();
  energyMesh.name='bio-energy-particles';bloodMesh.name='bio-blood-droplets';for(const mesh of [energyMesh,bloodMesh]){mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);scene.add(mesh);}
  function updateEnergy(p,i){dummy.position.set(p.x,p.y,p.z);dummy.scale.set(p.size,p.size,p.length?p.length*.6:p.size).multiplyScalar(Math.min(1,p.life/p.duration*2));dummy.rotation.set(p.pitch,p.angle,0,'YXZ');dummy.updateMatrix();energyMesh.setMatrixAt(i,dummy.matrix);energyMesh.setColorAt(i,color.setHex(p.color).multiplyScalar(.5+.5*p.life/p.duration));}
  function updateBlood(p,i){
    dummy.position.set(p.x,p.y,p.z);if(p.grounded){const settle=.72+.28*p.life/.55;dummy.scale.set(p.size*3.4*settle,.018,p.size*2.2*settle);dummy.rotation.set(0,p.angle,0);}else{const horizontal=Math.hypot(p.vx,p.vz),speed=Math.hypot(horizontal,p.vy),stretch=1+Math.min(5,speed*.65);dummy.scale.set(p.size*.72,p.size*.72,p.size*stretch);dummy.rotation.set(-Math.atan2(p.vy,horizontal||.001),Math.atan2(p.vx,p.vz),0,'YXZ');}dummy.updateMatrix();bloodMesh.setMatrixAt(i,dummy.matrix);bloodMesh.setColorAt(i,color.setHex(p.color).multiplyScalar(p.grounded?.64:.86+.14*p.life/p.duration));
  }
  return {event:model.emit,configure:model.configure,reset(){model.reset();energyMesh.count=bloodMesh.count=0;},update(dt){
    model.step(dt);let energyCount=0,bloodCount=0;for(const p of model.particles)if(p.life>0){if(p.kind==='blood')updateBlood(p,bloodCount++);else updateEnergy(p,energyCount++);}
    energyMesh.count=energyCount;bloodMesh.count=bloodCount;for(const mesh of [energyMesh,bloodMesh]){mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}
  },count:model.count,dispose(){for(const mesh of [energyMesh,bloodMesh]){scene.remove(mesh);mesh.dispose();}energyGeometry.dispose();bloodGeometry.dispose();energyMaterial.dispose();bloodMaterial.dispose();}};
}

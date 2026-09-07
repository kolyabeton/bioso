import * as T from 'three';
import {createBioParticles,FX_CAPACITY} from './bio-fx.js';
export function createBioFxView(scene) {
  const model=createBioParticles(), geometry=new T.IcosahedronGeometry(1,0);
  const material=new T.MeshBasicMaterial({transparent:true,opacity:.85,depthWrite:false,toneMapped:false});
  const mesh=new T.InstancedMesh(geometry,material,FX_CAPACITY),dummy=new T.Object3D(),color=new T.Color();
  mesh.name='bio-energy-particles';mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);scene.add(mesh);
  return {event:model.emit,configure:model.configure,reset(){model.reset();mesh.count=0;},update(dt){
    model.step(dt);let i=0;for(const p of model.particles)if(p.life>0){dummy.position.set(p.x,p.y,p.z);dummy.scale.set(p.size,p.size,p.length?p.length*.6:p.size).multiplyScalar(Math.min(1,p.life/p.duration*2));dummy.rotation.set(p.pitch,p.angle,0,'YXZ');dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i++,color.setHex(p.color).multiplyScalar(.5+.5*p.life/p.duration));}
    mesh.count=i;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
  },count:model.count,dispose(){scene.remove(mesh);mesh.dispose();geometry.dispose();material.dispose();}};
}

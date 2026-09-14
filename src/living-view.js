import * as T from 'three';
import {ATTACK_WARNING_OPACITY} from './attack-warning-style.js';

/** Read-only, bounded pools; painted ground and camera remain untouched. */
export function createLivingView(scene,canvas=null){
 const root=new T.Group();scene.add(root);root.name='living-combat';
 const dummy=new T.Object3D();
 function pool(geometry,color,opacity,capacity){const material=new T.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,toneMapped:false}),mesh=new T.InstancedMesh(geometry,material,capacity);mesh.count=0;mesh.frustumCulled=false;root.add(mesh);return mesh;}
 const aimGeo=new T.PlaneGeometry(.12,13).rotateX(-Math.PI/2),aims=pool(aimGeo,'#ffdf8a',ATTACK_WARNING_OPACITY,100);
 function event(){}
 function update(s,reducedMotion=false){
  const volatile=s.enemies.filter(e=>e.hp>0&&e.volatile).slice(0,100),arming=volatile.filter(e=>e.fuseRemaining!=null);
  const aiming=s.enemies.filter(e=>e.hp>0&&e.windup).slice(0,100);aims.count=aiming.length;aiming.forEach((e,i)=>{dummy.position.set(e.x+e.windup.dx*6.5,(e.y??0)+.2,e.z+e.windup.dz*6.5);dummy.rotation.set(0,Math.atan2(e.windup.dx,e.windup.dz),0);dummy.scale.set(1,1,1);dummy.updateMatrix();aims.setMatrixAt(i,dummy.matrix);});
  const modularWarning=s.enemies.some(e=>e.hp>0&&e.enemyAttack?.warning);
  const description=modularWarning?'Противник готовит удар: выйдите из отмеченной области или линии.':aiming.length?'Стрелок готовит выстрел по светлой линии.':arming.length?'Опасность взрыва: отойдите от раскалённой области.':'';
  if(canvas&&canvas.getAttribute('aria-description')!==description)canvas.setAttribute('aria-description',description);
  aims.instanceMatrix.needsUpdate=true;
 }
 function reset(){aims.count=0;}
 function dispose(){scene.remove(root);aims.dispose();aims.material.dispose();aimGeo.dispose();}
 return{update,event,reset,dispose};
}

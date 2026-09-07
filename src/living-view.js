import {combatTime} from './systems/mutations.js';
import * as T from 'three';

/** Read-only, bounded pools; painted ground and camera remain untouched. */
export function createLivingView(scene,canvas=null){
 const root=new T.Group();scene.add(root);root.name='living-combat';
 const ringGeo=new T.TorusGeometry(1,.035,4,48),diskGeo=new T.CircleGeometry(1,48);
 const dummy=new T.Object3D();
 function pool(geometry,color,opacity,capacity){const material=new T.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,toneMapped:false}),mesh=new T.InstancedMesh(geometry,material,capacity);mesh.count=0;mesh.frustumCulled=false;root.add(mesh);return mesh;}
 const aimGeo=new T.BoxGeometry(.12,.05,13),aims=pool(aimGeo,'#ffdf8a',.9,100);
 const guard=pool(ringGeo,'#c0fff0',.9,1);
 function put(mesh,i,x,y,z,scale,flat=false){dummy.position.set(x,y,z);dummy.rotation.set(flat?-Math.PI/2:0,0,0);dummy.scale.setScalar(scale);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);}
 function event(){}
 function update(s,reducedMotion=false){
  const volatile=s.enemies.filter(e=>e.hp>0&&e.volatile).slice(0,100),arming=volatile.filter(e=>e.fuseRemaining!=null);
  const aiming=s.enemies.filter(e=>e.hp>0&&e.windup).slice(0,100);aims.count=aiming.length;aiming.forEach((e,i)=>{dummy.position.set(e.x+e.windup.dx*6.5,(e.y??0)+.2,e.z+e.windup.dz*6.5);dummy.rotation.set(0,Math.atan2(e.windup.dx,e.windup.dz),0);dummy.scale.set(1,1,1);dummy.updateMatrix();aims.setMatrixAt(i,dummy.matrix);});
  const modularWarning=s.enemies.some(e=>e.hp>0&&e.enemyAttack?.warning);
  const description=modularWarning?'Противник готовит удар: выйдите из отмеченной области или линии.':aiming.length?'Стрелок готовит выстрел по светлой линии.':arming.length?'Опасность взрыва: отойдите от раскалённой области.':'';
  if(canvas&&canvas.getAttribute('aria-description')!==description)canvas.setAttribute('aria-description',description);
  guard.count=!s.dead&&s.health?.invulnerableUntil>combatTime(s)?1:0;
  if(guard.count)put(guard,0,s.player.x,(s.player.y??0)+.15,s.player.z,1.65+(reducedMotion?0:Math.sin(combatTime(s)*25)*.1),true);
  for(const mesh of [guard,aims])mesh.instanceMatrix.needsUpdate=true;
 }
 function reset(){for(const mesh of [guard,aims])mesh.count=0;}
 function dispose(){scene.remove(root);for(const mesh of [guard,aims]){mesh.dispose();mesh.material.dispose();}ringGeo.dispose();diskGeo.dispose();aimGeo.dispose();}
 return{update,event,reset,dispose};
}

import * as T from 'three';
import {createSymbiontView} from './symbiont-view.js';
/** Optional renderer adapter. Does not own world, camera, UI or creature models. */
export function createEffectsView(scene){
 const group=new T.Group();group.name='ability-effects';scene.add(group);
 const symbionts=createSymbiontView(group);
 const geometry=new T.SphereGeometry(1,8,6),matrix=new T.Object3D(),pools={};
 for(const [key,color,capacity]of [['friendly',0xd8ffc2,32],['hostile',0xff6046,128],['roles',0xbf84d7,100]]){const material=new T.MeshBasicMaterial({color,transparent:true,opacity:key==='roles'?.65:1}),mesh=new T.InstancedMesh(geometry,material,capacity);mesh.frustumCulled=false;mesh.count=0;group.add(mesh);pools[key]={mesh,capacity};}
 function fill(key,items,radius,height){const {mesh,capacity}=pools[key];mesh.count=Math.min(items.length,capacity);for(let i=0;i<mesh.count;i++){matrix.position.set(items[i].x,(items[i].y??0)+(key==='hostile'?0:height),items[i].z);matrix.scale.setScalar(radius);matrix.updateMatrix();mesh.setMatrixAt(i,matrix.matrix);}mesh.instanceMatrix.needsUpdate=true;}
 return{update(s,reduced=false){symbionts.update(s,reduced);fill('friendly',(s.abilities?.summonShots||[]).filter(q=>q.delay<=0&&q.life>0),.11,1.1);fill('hostile',s.hostileShots||[],.22,1);fill('roles',s.enemies.filter(e=>e.hp>0&&e.role==='ranged'),.17,2.8);},reset(){symbionts.reset();for(const {mesh}of Object.values(pools))mesh.count=0;},dispose(){symbionts.dispose();scene.remove(group);for(const {mesh}of Object.values(pools)){mesh.dispose();mesh.material.dispose();if(mesh.geometry!==geometry)mesh.geometry.dispose();}geometry.dispose();}};
}

import {createProjectileAfterglow,enableProjectileFade,projectileOpacity,setProjectileOpacity} from '../projectile-fade.js';
import * as T from 'three';
import {combatTime} from './mutations.js';
import {createSymbiontView} from './symbiont-view.js';
import {createEnemyProjectileView} from '../enemy-projectile-view.js';
/** Optional renderer adapter. Does not own world, camera, UI or creature models. */
export function createEffectsView(scene){
 const hostileAfterglow=createProjectileAfterglow(128),summonAfterglow=createProjectileAfterglow(32);
 const group=new T.Group();group.name='ability-effects';scene.add(group);
 const symbionts=createSymbiontView(group),enemyProjectiles=createEnemyProjectileView(group);
 const geometry=new T.SphereGeometry(1,8,6),matrix=new T.Object3D(),pools={};
 for(const [key,color,capacity]of [['friendly',0xd8ffc2,32]]){const material=new T.MeshBasicMaterial({color,transparent:true,opacity:1}),mesh=new T.InstancedMesh(geometry.clone(),material,capacity);mesh.frustumCulled=false;mesh.count=0;group.add(mesh);pools[key]={mesh,capacity};enableProjectileFade(mesh);}
 function fill(key,items,radius,height){const {mesh,capacity}=pools[key];mesh.count=Math.min(items.length,capacity);for(let i=0;i<mesh.count;i++){if(key==='friendly')setProjectileOpacity(mesh,i,projectileOpacity(items[i],true));matrix.position.set(items[i].x,(items[i].y??0)+height,items[i].z);matrix.scale.setScalar(radius);matrix.updateMatrix();mesh.setMatrixAt(i,matrix.matrix);}mesh.instanceMatrix.needsUpdate=true;}
 return{update(s,reduced=false){symbionts.update(s,reduced);enemyProjectiles.update(hostileAfterglow.update((s.hostileShots||[]).filter(q=>!q.reflectedByMirror),combatTime(s),s.world),combatTime(s),reduced);fill('friendly',summonAfterglow.update((s.abilities?.summonShots||[]).filter(q=>q.delay<=0&&q.life>0),combatTime(s),s.world),.11,1.1);},reset(){hostileAfterglow.reset();summonAfterglow.reset();symbionts.reset();enemyProjectiles.reset();for(const {mesh}of Object.values(pools))mesh.count=0;},dispose(){symbionts.dispose();enemyProjectiles.dispose();scene.remove(group);for(const {mesh}of Object.values(pools)){mesh.dispose();mesh.material.dispose();if(mesh.geometry!==geometry)mesh.geometry.dispose();}geometry.dispose();}};
}

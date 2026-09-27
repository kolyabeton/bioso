import * as T from 'three';
import {combatTime,activeMutation} from './systems/mutations.js';
import {createLarvaView} from './systems/larva-view.js';
import {createGameplayModulesView} from './gameplay-modules/view.js';
import {createSlimeSurfaceGeometry,createSlimeSurfaceMaterial} from './slime-surface.js';
/** Bounded read-only pools. Friendly effects stay below hostile warning rings. */
export function createIsaacView(scene){
 const modules=createGameplayModulesView(scene),larvae=createLarvaView(scene);
 const root=new T.Group();root.name='isaac-effects';scene.add(root);const dummy=new T.Object3D();
 const geometries=[new T.SphereGeometry(1,8,5),new T.RingGeometry(.92,1,40),createSlimeSurfaceGeometry(80)];
 function pool(g,color,capacity,opacity=1){const mesh=new T.InstancedMesh(g,new T.MeshBasicMaterial({color,transparent:opacity<1,opacity,depthWrite:false,side:T.DoubleSide,toneMapped:false}),capacity);mesh.count=0;mesh.frustumCulled=false;root.add(mesh);return mesh;}
 const slime=new T.InstancedMesh(geometries[2],createSlimeSurfaceMaterial(true),80);slime.name='isaac-slime-pools';slime.count=0;slime.frustumCulled=false;slime.renderOrder=1;root.add(slime);
 const pulse=pool(geometries[1],'#d6f7c9',1,.8);let heartAt=-99;
 const targets=pool(geometries[1],'#ffe5a3',8),eggs=pool(geometries[0],'#cdf4b2',160);const meshes=[slime,pulse,targets,eggs];
 function put(m,i,p,size,y=0,flat=false){dummy.position.set(p.x,(p.y??0)+y,p.z);dummy.rotation.set(flat?-Math.PI/2:0,0,0);dummy.scale.setScalar(size);dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix);}
 function update(s,reducedMotion=false){const a=s.isaac,t=combatTime(s),ps=a?.slimePools||[],slimeData=slime.geometry.getAttribute('effectData');larvae.update(s,reducedMotion);slime.count=Math.min(80,ps.length);ps.slice(0,80).forEach((p,i)=>{const duration=p.duration??3,age=Math.max(0,duration-p.life),grow=Math.min(1,age/.24),spread=.18+.88*(1-(1-grow)**3),settle=age>.24?1.06-Math.min(1,(age-.24)/.18)*.06:spread;dummy.position.set(p.x,(p.y??0)+.018,p.z);dummy.rotation.set(0,(Number(p.id)||i+1)*2.399,0);dummy.scale.setScalar(p.radius*(activeMutation(s,'mire')?1.5:1)*settle);dummy.updateMatrix();slime.setMatrixAt(i,dummy.matrix);slimeData.setXY(i,Math.min(1,age/duration),(Number(p.id)||i+1)*.731);});slimeData.needsUpdate=slime.count>0;slime.material.uniforms.clock.value=t;
 const infected=s.enemies.filter(e=>e.hp>0&&e.clutch?.until>t).slice(0,160);eggs.count=infected.length;infected.forEach((e,i)=>put(eggs,i,e,.18,1.7));
 modules.update(s,{time:t,reducedMotion});
 const active=s.encounters?.active;const enemies=s.enemies.filter(e=>active&&e.challengeId===active.id&&e.hp>0).slice(0,8);targets.count=enemies.length;enemies.forEach((e,i)=>put(targets,i,e,(e.radius||1)*1.3,.22,true));
 pulse.count=t-heartAt<.5?1:0;if(pulse.count)put(pulse,0,s.player,5*Math.min(1,(t-heartAt)/.3),.2,true);
 for(const m of meshes)m.instanceMatrix.needsUpdate=true;
 }
 return{update,event(e,s){if(e.type==='heart-pulse')heartAt=combatTime(s);},reset(){larvae.reset();modules.reset();heartAt=-99;for(const m of meshes)m.count=0;},dispose(){larvae.dispose();modules.dispose();scene.remove(root);for(const m of meshes){m.dispose();m.material.dispose();}for(const g of geometries)g.dispose();}};
}

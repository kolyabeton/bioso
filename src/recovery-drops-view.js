import * as T from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

/** Shared geometry/materials keep rare consumables inexpensive. */
export function createRecoveryDropsView(scene,renderer){
 const active=new Map(),circle=new T.CircleGeometry(.34,24),rim=new T.RingGeometry(.34,.40,24);
 const ingot=new T.CylinderGeometry(.32,.45,.28,4);ingot.rotateY(Math.PI/4);ingot.scale(1.55,1,1);
 const red=new T.MeshBasicMaterial({color:'#ed3945',toneMapped:false});
 const redRim=new T.MeshBasicMaterial({color:'#ffb0a4',toneMapped:false});
 const steel=new T.MeshStandardMaterial({color:'#f4faff',metalness:1,roughness:.045,envMapIntensity:2.2});
 const edges=new T.EdgesGeometry(ingot),edgeMaterial=new T.LineBasicMaterial({color:'#e3f4ff',transparent:true,opacity:.7,toneMapped:false});
 let reflection=null;
 // Bake once, only when armor first appears; reflections belong to this material.
 function prepareMirror(){
  if(!renderer||reflection)return;
  const room=new RoomEnvironment(),pmrem=new T.PMREMGenerator(renderer);
  reflection=pmrem.fromScene(room,.02);steel.envMap=reflection.texture;steel.needsUpdate=true;
  room.dispose();pmrem.dispose();
 }
 function update(items,camera,time=0,reducedMotion=false){
  const keep=new Set(items.map(q=>q.id));for(const [id,g] of active)if(!keep.has(id)){scene.remove(g);active.delete(id);}
  for(const q of items){
   let g=active.get(q.id);
   if(!g){g=new T.Group();g.name='recovery-drop:'+q.kind;g.add(new T.Mesh(q.kind==='health'?circle:ingot,q.kind==='health'?red:steel));if(q.kind==='health')g.add(new T.Mesh(rim,redRim));else{prepareMirror();g.add(new T.LineSegments(edges,edgeMaterial));}active.set(q.id,g);scene.add(g);}
   g.position.set(q.x,(q.y??0)+.55+(reducedMotion?0:Math.sin(time*2+q.id)*.07),q.z);
   if(q.kind==='health')g.quaternion.copy(camera.quaternion);else g.rotation.y=reducedMotion?.3:time*.6;
  }
 }
 function reset(){for(const g of active.values())scene.remove(g);active.clear();}
 function dispose(){reset();reflection?.dispose();for(const resource of [circle,rim,ingot,red,redRim,steel,edges,edgeMaterial])resource.dispose();}
 return{update,reset,dispose};
}

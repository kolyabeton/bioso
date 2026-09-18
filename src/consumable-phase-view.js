import * as T from 'three';

// Borrow hero geometry, as dodge-afterimage does; never clone or dispose its assets.
export function createConsumablePhaseView(scene){
 const group=new T.Group();group.name='consumable-phase-shell';group.visible=false;scene.add(group);
 const material=new T.MeshBasicMaterial({color:'#b4a8c8',transparent:true,opacity:0,depthWrite:false,toneMapped:false,side:T.DoubleSide});
 const meshes=[];let life=0,duration=1,wasActive=false,reduced=false,returning=false;
 function snapshot(hero,end=false){
  if(!hero||reduced)return;
  hero.updateMatrixWorld(true);let count=0;
  hero.traverse(o=>{
   if(count>=64||!o.isMesh||o.isInstancedMesh||o.parent?.isMesh||o.name.includes('sweep'))return;
   let parent=o;while(parent&&parent!==hero){if(!parent.visible)return;parent=parent.parent;}
   let mesh=meshes[count];if(!mesh){mesh=new T.Mesh(o.geometry,material);mesh.matrixAutoUpdate=false;meshes.push(mesh);group.add(mesh);}
   mesh.geometry=o.geometry;mesh.matrix.copy(o.matrixWorld);mesh.visible=true;count++;
  });
  for(let i=count;i<meshes.length;i++)meshes[i].visible=false;
  life=duration=end?.45:1;returning=end;group.position.set(0,0,0);group.visible=count>0;
 }
 function event(e,hero){if(e.type==='pickup'&&e.kind==='phase')snapshot(hero);}
 function update(s,hero,time,dt,nextReduced){
  reduced=nextReduced;const active=!s.dead&&s.consumables?.phaseUntil>time;
  if(wasActive&&!active&&!s.dead)snapshot(hero,true);wasActive=active;
  life=reduced||s.dead?0:Math.max(0,life-dt);const u=1-life/duration;
  group.visible=life>0;group.position.y=returning?(1-u)*.3:u*.65;
  material.opacity=(returning?.25:.22)*Math.sin(Math.PI*Math.min(1,u*1.3))*(1-u);
 }
 function reset(){life=0;wasActive=false;group.visible=false;for(const mesh of meshes)mesh.visible=false;}
 return{event,update,reset,dispose(){reset();scene.remove(group);material.dispose();}};
}

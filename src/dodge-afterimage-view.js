import * as T from 'three';

export const DODGE_AFTERIMAGE_SECONDS=.15;
const POOL_SIZE=2,MAX_MESHES=96,START_OPACITY=.34,TRAIL_OFFSET=.28;

export function createDodgeAfterimageView(scene){
 const root=new T.Group();root.name='dodge-afterimages';scene.add(root);
 const ghosts=Array.from({length:POOL_SIZE},(_,index)=>{
  const group=new T.Group();group.name=`dodge-afterimage-${index}`;group.visible=false;root.add(group);
  const material=new T.MeshBasicMaterial({color:0x55d7cf,transparent:true,opacity:0,depthWrite:false,depthTest:true,toneMapped:false,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1});
  return{group,material,life:0};
 });
 let cursor=0,reducedMotion=false;

 function snapshot(hero,event){
  if(!hero||reducedMotion)return false;
  const ghost=ghosts[cursor++%ghosts.length];ghost.group.clear();hero.updateMatrixWorld(true);
  let count=0;
  hero.traverse(object=>{
   if(count>=MAX_MESHES||!object.isMesh||object.isInstancedMesh||!object.visible||object.parent?.isMesh||object.name.includes('sweep'))return;
   const mesh=new T.Mesh(object.geometry,ghost.material);mesh.matrixAutoUpdate=false;mesh.matrix.copy(object.matrixWorld);mesh.renderOrder=6;ghost.group.add(mesh);count++;
  });
  if(!count)return false;
  const length=Math.hypot(event.dx??0,event.dz??0)||1;
  ghost.group.position.set(-(event.dx??0)/length*TRAIL_OFFSET,0,-(event.dz??0)/length*TRAIL_OFFSET);
  ghost.material.opacity=START_OPACITY;ghost.life=DODGE_AFTERIMAGE_SECONDS;ghost.group.visible=true;return true;
 }
 function event(value,hero){return value?.type==='dodge'&&snapshot(hero,value);}
 function update(dt,nextReducedMotion=reducedMotion){
  reducedMotion=Boolean(nextReducedMotion);
  for(const ghost of ghosts){ghost.life=reducedMotion?0:Math.max(0,ghost.life-Math.max(0,dt));if(ghost.life<1e-6)ghost.life=0;ghost.group.visible=ghost.life>0;ghost.material.opacity=START_OPACITY*(ghost.life/DODGE_AFTERIMAGE_SECONDS);}
 }
 function reset(){cursor=0;reducedMotion=false;for(const ghost of ghosts){ghost.life=0;ghost.group.visible=false;ghost.group.clear();ghost.material.opacity=0;}}
 function info(){return{active:ghosts.filter(ghost=>ghost.life>0).length,duration:DODGE_AFTERIMAGE_SECONDS,reducedMotion};}
 function dispose(){root.removeFromParent();for(const ghost of ghosts)ghost.material.dispose();}
 return{event,update,reset,info,dispose};
}

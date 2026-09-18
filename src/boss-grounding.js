import * as T from 'three';

const box=new T.Box3(),point=new T.Vector3();
/** Last clearance guard for an IK target outside a leg's reach or a pitched hull. */
export function groundBossModel(model,heightAt,baseY=0){
 model.updateMatrixWorld(true);
 let lift=0;
 model.traverseVisible(mesh=>{
  if(!mesh.isMesh)return;
  if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();
  box.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld);
  for(const [x,z]of [[box.min.x,box.min.z],[box.min.x,box.max.z],[box.max.x,box.min.z],[box.max.x,box.max.z],[(box.min.x+box.max.x)/2,(box.min.z+box.max.z)/2]]){
   const h=heightAt?heightAt(x,z):baseY;
   if(Number.isFinite(h))lift=Math.max(lift,h-box.min.y);
  }
 });
 if(lift>0){
  model.getWorldPosition(point);point.y+=lift+.015;
  model.position.copy(model.parent?model.parent.worldToLocal(point):point);model.updateMatrixWorld(true);
 }
 return lift;
}

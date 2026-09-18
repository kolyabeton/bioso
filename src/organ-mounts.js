import * as T from 'three';

const front=new T.Vector3(0,0,1);
// Slots keep their positions when another organ is removed. Crown positions
// leave the side limb bearings and the lower central eye unobstructed.
export function organMountDirection(slot,count){
 const rows=Math.ceil(count/2),row=Math.floor(slot/2);
 if(count===1)return new T.Vector3(0,1,.55).normalize();
 const lone=slot===count-1&&count%2;
 return new T.Vector3(lone?0:slot%2?-.68:.68,1,rows===1?.6:.72-row*1.15).normalize();
}

export function mountOrgan(root,body,model,{slot,count,partId,key,assetId}){
 // Work in creature-local coordinates even if the hero has already moved.
 const chassis=body.clone(true);chassis.updateMatrixWorld(true);
 let hull;chassis.traverse(o=>{if(o.isMesh&&o.name.endsWith('-steel'))hull=o;});
 const surface=hull||chassis,box=new T.Box3().setFromObject(surface),center=box.getCenter(new T.Vector3());
 const direction=organMountDirection(slot,count),distance=box.getSize(new T.Vector3()).length()+1;
 const hit=new T.Raycaster(center.clone().addScaledVector(direction,distance),direction.clone().negate()).intersectObject(surface,true)[0];
 if(!hit)return null;
 const normal=hit.face?hit.face.normal.clone().applyNormalMatrix(new T.Matrix3().getNormalMatrix(hit.object.matrixWorld)).normalize():direction;
 if(normal.dot(direction)<0)normal.negate();
 const mount=new T.Group();mount.name=`organ-mount-${slot}`;mount.userData={organMount:true,slot,partId,key,assetId,surfacePoint:hit.point.toArray(),surfaceNormal:normal.toArray()};
 // The authored rear connector sits slightly inside the ceramic skin.
 const bounds=new T.Box3().setFromObject(model);model.position.z-=bounds.min.z+.012;
 mount.add(model);mount.position.copy(hit.point).addScaledVector(normal,.032);mount.quaternion.setFromUnitVectors(front,normal);root.add(mount);
 return mount;
}

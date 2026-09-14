import * as T from 'three';

const point=new T.Vector3(),origin=new T.Vector3(),direction=new T.Vector3(),axis=new T.Vector3(0,0,1),rotation=new T.Quaternion();
const smooth=x=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};
/** Rigid telescoping sleeves, not a scaled spiral or stretched drill head. */
export function createDrillSleeves(root){
 const sleeves=[];
 for(let i=0;i<2;i++){
  const geometry=new T.CylinderGeometry(i?.105:.16,i?.105:.16,1,24);geometry.rotateX(Math.PI/2);
  const mesh=new T.Mesh(geometry,new T.MeshStandardMaterial({color:i?0xa4a29a:0x555b57,metalness:.82,roughness:.3}));mesh.name=`drill-telescope-${i}`;mesh.userData.noHeroOutline=true;mesh.visible=false;root.add(mesh);sleeves.push(mesh);
 }
 root.userData.sleeves=sleeves;
}
export function updateDrillExtension(arm,strike,hero){
 const effect=arm.userData.meleeTrail,asset=arm.userData.drillAsset;
 if(!effect)return;
 const restTip=arm.userData.drillTipZ??1.08;
 if(!strike||!Number.isFinite(strike.tx)||!Number.isFinite(strike.tz)){
  if(asset)asset.position.z=0;effect.position.set(0,0,restTip);for(const mesh of effect.userData.sleeves??[])mesh.visible=false;return;
 }
 // World-space contact on the near surface, transformed through actual body
 // scale and the occupied mount. Body sizes and sloped shots need no constants.
 hero.updateWorldMatrix(true,true);arm.getWorldPosition(origin);
 point.set(strike.tx,(strike.ty??0)+Math.min(.65,(strike.targetRadius??.48)*.8),strike.tz);
 direction.subVectors(point,origin);const distance=direction.length(),radius=Math.min(strike.targetRadius??.48,distance*.4);direction.normalize();point.addScaledVector(direction,-radius);
 hero.getWorldQuaternion(rotation).invert();direction.applyQuaternion(rotation);arm.quaternion.setFromUnitVectors(axis,direction);arm.updateWorldMatrix(false,true);
 arm.worldToLocal(point);const contactZ=Math.max(restTip,point.z),drive=smooth((strike.phase-.02)/.2)*(1-smooth((strike.phase-.78)/.22)),extension=(contactZ-restTip)*drive;
 if(asset)asset.position.z=extension;
 effect.position.set(0,0,restTip+extension);
 for(const [i,mesh] of (effect.userData.sleeves??[]).entries()){
  const length=extension*.56;mesh.visible=length>.02;mesh.scale.z=Math.max(.001,length);
  mesh.position.set(0,0,-restTip-extension+(i?.73:.28)*extension);
 }
 strike.drillContact=drive>.9;
}

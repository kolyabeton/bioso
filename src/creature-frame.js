import * as T from 'three';
import {equipmentSurfaceUV} from './equipment-surface.js';
import {equipmentLayout} from './equipment-mounts.js';
import {JOINT_GEOMETRIES} from './creature-joint-geometry.js';

import {CHASSIS_MATERIALS} from './creature-materials.js';
const {steel,brass:collar,ceramic:armor}=CHASSIS_MATERIALS;
const sphere=equipmentSurfaceUV(new T.SphereGeometry(1,24,16),'steel'),ceramicSphere=equipmentSurfaceUV(new T.SphereGeometry(1,24,16),'ceramic'),cylinder=equipmentSurfaceUV(new T.CylinderGeometry(1,1,1,20),'brass'),ceramicCylinder=equipmentSurfaceUV(new T.CylinderGeometry(1,1,1,20),'ceramic');
const up=new T.Vector3(0,1,0);
export const FRAME_SURFACES={liner:{geometry:ceramicSphere,material:armor},drive:{geometry:cylinder,material:collar},housing:{geometry:JOINT_GEOMETRIES.housing,material:steel},machined:{geometry:JOINT_GEOMETRIES.machined,material:collar},ceramic:{geometry:JOINT_GEOMETRIES.ceramic,material:armor}};
export const JOINT_SURFACES=['housing','machined','ceramic'];
function mesh(parent,name,geometry,material,position,scale){
 const m=new T.Mesh(geometry,material);m.name=name;m.position.set(...position);m.scale.set(...scale);m.userData.noHeroOutline=true;parent.add(m);return m;
}
export function createLimbBearing(parent,radius){
 // Smooth metal ball sits inside the sleeve; never wrap a whole limb texture onto it.
 const joint=mesh(parent,'mounting-joint',sphere,steel,[0,0,0],[radius*.55,radius*.55,radius*.55]);
 joint.userData.structuralBearing=true;return joint;
}
export function createCreatureFrame(root,state){
 const frame=new T.Group();frame.name='structural-frame';root.add(frame);
 const liner=mesh(frame,'closed-body-liner',ceramicSphere,armor,[0,1.06,0],[.35,.72,.36]);
 const pelvis=mesh(frame,'pelvic-cradle',sphere,steel,[0,.65,0],[.4,.22,.36]);
 const neck=mesh(frame,'neck-bearing',cylinder,collar,[0,1.72,.16],[.125,.22,.125]);
 const links=[];
 for(const limb of [...root.userData.legs,...root.userData.arms.values()]){
  const arm=root.userData.arms.has(limb.userData.partId),radius=arm?.135:.12;
  const sleeve=new T.Group();sleeve.name=arm?'shoulder-coupling':'hip-coupling';frame.add(sleeve);
  mesh(sleeve,'sealed-drive',cylinder,collar,[0,0,0],[radius*.48,1,radius*.48]);
  const cover=mesh(sleeve,'ceramic-drive-cover',ceramicCylinder,armor,[0,0,0],[radius*.70,.18,radius*.70]);
  const hardware=new T.Group();hardware.name=arm?'shoulder-yoke':'hip-yoke';hardware.scale.setScalar(radius);frame.add(hardware);
  for(const key of JOINT_SURFACES){const surface=FRAME_SURFACES[key];mesh(hardware,'joint-'+key,surface.geometry,surface.material,[0,0,0],[1,1,1]);}
  links.push({limb,arm,sleeve,cover,hardware,radius,anchor:new T.Vector3(),end:new T.Vector3(),direction:new T.Vector3()});
 }
 const ports=[];
 if(state){
  const layout=equipmentLayout(state,{authoredChassis:true});
  for(const [kind,slots]of [['arms',layout.arms],['legs',layout.legs]])for(const slot of slots){
   const occupied=!!state[kind][slot.slot],arm=kind==='arms',radius=arm?.145:.13;
   const group=new T.Group();group.name=`equipment-port-${kind}-${slot.slot}`;group.userData={equipmentPort:true,kind,slot:slot.slot,occupied};frame.add(group);
   const casing=equipmentSurfaceUV(new T.LatheGeometry([[0,-.06],[radius,-.06],[radius*1.1,-.03],[radius*1.1,.02],[radius*.91,.05],[0,.05]].map(p=>new T.Vector2(...p)),24),'ceramic');
   mesh(group,'sealed-socket-casing',casing,armor,[0,0,0],[1,1,1]);
   mesh(group,'socket-flange',cylinder,collar,[0,.052,0],[radius*.89,.025,radius*.89]);
   const cap=mesh(group,'socket-blanking-cap',ceramicCylinder,armor,[0,.073,0],[radius*.72,.028,radius*.72]);cap.visible=!occupied;
   const port={group,cap,kind,slot:slot.slot,occupied,rest:new T.Vector3(...slot.position),point:new T.Vector3(),normal:new T.Vector3()};ports.push(port);
   const link=links.find(l=>l.arm===arm&&l.limb.userData.slot===slot.slot);if(link)link.port=port;
  }
 }
 let halfWidth=.4,halfDepth=.42,halfHeight=.7,centerY=1.06,authored=false;
 const spine=new T.Vector3(0,1.06,0);
 function update(){
  for(const link of links){
   const {limb,arm,anchor,end,direction,sleeve,cover,hardware,radius}=link,rest=limb.userData.rest||limb.position;
   // Start well inside the closed liner. End overlaps the moving bearing.
   const anchorY=authored?Math.max(spine.y-halfHeight*.06,Math.min(spine.y+halfHeight*.06,rest.y)):arm?Math.max(.7,Math.min(1.45,rest.y)):.65;
   if(authored&&link.port)anchor.copy(link.port.point).addScaledVector(link.port.normal,-.025);else anchor.set(Math.sign(rest.x)*halfWidth*(authored?.12:.48),anchorY,authored?spine.z+Math.max(-halfDepth*.06,Math.min(halfDepth*.06,rest.z-spine.z)):Math.max(-halfDepth*.45,Math.min(halfDepth*.45,rest.z)));
   end.copy(limb.position);direction.subVectors(end,anchor);const length=direction.length();
   sleeve.position.copy(anchor).add(end).multiplyScalar(.5);sleeve.quaternion.setFromUnitVectors(up,direction.normalize());sleeve.scale.y=length+.12;
   // The ceramic cuff is rigid too; extension exposes the brass telescopic drive.
   cover.scale.y=.18/(length+.12);cover.position.y=.5-.20/(length+.12);
   // Fixed machined parts never stretch when the arm recoils or reaches forward.
   hardware.position.copy(end).addScaledVector(direction,-radius*.72);hardware.quaternion.copy(sleeve.quaternion);
  }
 }
 function fit(body){
  // Read body-local geometry, independent of the hero's world transform/preview turn.
  const copy=body.clone(true);copy.updateMatrixWorld(true);const box=new T.Box3().setFromObject(copy),size=box.getSize(new T.Vector3());
  halfWidth=size.x*.5;halfDepth=size.z*.5;halfHeight=size.y*.5;centerY=box.getCenter(new T.Vector3()).y;
  const closed=body.userData.assetId?.endsWith('-v3');authored=!!closed;liner.visible=!closed;pelvis.visible=!closed;neck.visible=!closed;
  if(closed)copy.traverse(node=>{if(node.userData.closedChassis)node.getWorldPosition(spine);});
  if(closed){
   let hull;copy.traverse(node=>{if(node.name.endsWith('-steel')&&node.isMesh)hull=node;});
   for(const port of ports){
    port.normal.subVectors(port.rest,spine).normalize();
    const material=hull.material,side=material.side;material.side=T.DoubleSide;
    const hits=new T.Raycaster(spine,port.normal).intersectObject(hull,false);material.side=side;
    if(!hits.length)throw new Error('No chassis surface for '+port.group.name);
    port.point.copy(hits[0].point).addScaledVector(port.normal,.020);
    port.group.position.copy(port.point);port.group.quaternion.setFromUnitVectors(up,port.normal);
   }
  }
  liner.position.copy(box.getCenter(new T.Vector3()));liner.scale.set(halfWidth*.88,size.y*.48,halfDepth*.88);
  pelvis.scale.set(Math.max(.32,halfWidth*.83),.22,Math.max(.3,halfDepth*.74));update();
 }
 update();root.userData.structuralFrame={fit,update,links,ports};return frame;
}

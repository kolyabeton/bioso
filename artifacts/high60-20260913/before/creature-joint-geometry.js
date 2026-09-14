import * as T from 'three';
import {equipmentSurfaceUV} from './equipment-surface.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Authored from docs/art/creature-joints-v2/reference.png. Longitudinal axis is Y.
// Three fixed-size material batches per joint; only the separate drive shaft extends.
const groups={housing:[],machined:[],ceramic:[]};
function add(kind,g,p=[0,0,0],r=[0,0,0]){
 g.rotateX(r[0]);g.rotateY(r[1]);g.rotateZ(r[2]);g.translate(...p);
 groups[kind].push(g.index?g.toNonIndexed():g);if(g.index)g.dispose();
}
function turned(kind,profile,p=[0,0,0],r=[0,0,0]){
 add(kind,new T.LatheGeometry(profile.map(([x,y])=>new T.Vector2(x,y)),24),p,r);
}
function rod(kind,a,b,radius){
 const start=new T.Vector3(...a),end=new T.Vector3(...b),direction=end.clone().sub(start);
 const g=new T.CylinderGeometry(radius,radius,direction.length(),10);
 g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize()));g.translate(...start.add(end).multiplyScalar(.5).toArray());add(kind,g);
}
// Bearing recessed between flanged seats, not a exposed sphere between thick rings.
add('housing',new T.SphereGeometry(.69,24,14));
turned('machined',[[0,-1.14],[.78,-1.14],[.96,-1.08],[.96,-.91],[.9,-.85],[.61,-.85],[.58,-.69],[0,-.69]]);
turned('machined',[[0,.58],[.55,.58],[.61,.78],[.79,.82],[.84,.88],[.84,1.04],[.78,1.1],[0,1.1]]);
// Narrow polished flange lips, not repeated decorative bands.
turned('machined',[[.73,1.085],[.78,1.085],[.79,1.1],[.78,1.12],[.73,1.12],[.73,1.085]]);
turned('machined',[[.9,-1.09],[.95,-1.09],[.965,-1.07],[.965,-1.04],[.92,-1.04],[.9,-1.09]]);
// Forged fork cheeks with a real central opening and beveled edges.
const fork=new T.Shape();fork.moveTo(-.74,-1.02);fork.lineTo(.74,-1.02);fork.lineTo(.9,-.79);fork.lineTo(.78,-.24);fork.quadraticCurveTo(1.0,0,.78,.26);fork.lineTo(.64,.9);fork.lineTo(-.64,.9);fork.lineTo(-.78,.26);fork.quadraticCurveTo(-1.0,0,-.78,-.24);fork.lineTo(-.9,-.79);fork.closePath();
const opening=new T.Path();opening.absellipse(0,-.05,.40,.53,0,Math.PI*2,true);fork.holes.push(opening);
for(const side of [-1,1]){
 add('ceramic',new T.ExtrudeGeometry(fork,{depth:.12,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.045,bevelThickness:.035,curveSegments:8}),[0,0,side*.62-(side<0?.12:0)]);
 // Transverse axle: concentric machined cap with a small recessed central fastener.
 turned('machined',[[0,0],[.32,0],[.37,.045],[.37,.12],[.31,.15],[.31,.2],[.26,.24],[0,.24]],[0,0,side*.72],[side*Math.PI/2,0,0]);
 add('housing',new T.CylinderGeometry(.07,.07,.025,6),[0,0,side*.955],[Math.PI/2,0,0]);
}
// Six flange fasteners. Their small dark seats give them depth without oversized studs.
for(let i=0;i<6;i++){
 const angle=i*Math.PI/3,x=Math.sin(angle)*.78,z=Math.cos(angle)*.78;
 add('machined',new T.CylinderGeometry(.075,.075,.045,6),[x,-1.16,z]);
 add('housing',new T.CylinderGeometry(.031,.031,.05,6),[x,-1.185,z]);
 const dx=Math.sin(angle)*.64,dz=Math.cos(angle)*.64;
 add('machined',new T.CylinderGeometry(.06,.06,.035,6),[dx,1.12,dz]);
 add('housing',new T.CylinderGeometry(.025,.025,.04,6),[dx,1.14,dz]);
}
// A short protected oil line stays recessed between the ceramic cheeks.
rod('housing',[.65,-.68,.18],[.65,.53,.18],.045);
// A closed curved ceramic saddle over the proximal flange, with a beveled rim.
const saddle=new T.Shape();saddle.absarc(0,0,1.095,.14,Math.PI*1.75,false);saddle.absarc(0,0,.95,Math.PI*1.75,.14,true);saddle.closePath();
add('ceramic',new T.ExtrudeGeometry(saddle,{depth:.38,bevelEnabled:true,bevelSize:.045,bevelThickness:.04,bevelSegments:2,steps:1,curveSegments:14}),[0,-.87,0],[Math.PI/2,0,0]);
export const JOINT_GEOMETRIES=Object.fromEntries(Object.entries(groups).map(([key,parts])=>{
 const geometry=mergeGeometries(parts);parts.forEach(g=>g.dispose());equipmentSurfaceUV(geometry,({housing:'steel',machined:'brass',ceramic:'ceramic'})[key]);geometry.computeBoundingBox();return[key,geometry];
}));

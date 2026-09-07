import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {combatTime} from './mutations.js';

/** Articulated, instanced summons. Only observes simulation positions; never deals damage. */
export function createLarvaView(parent){
 const capacity=120,segments=5,root=new T.Group();root.name='mechanical-larvae';parent.add(root);
 const materials={shell:new T.MeshStandardMaterial({color:0xbebda9,roughness:.82,metalness:.18}),metal:new T.MeshStandardMaterial({color:0x303934,roughness:.7,metalness:.7}),seam:new T.MeshStandardMaterial({color:0x82775b,roughness:.85,metalness:.45}),glow:new T.MeshStandardMaterial({color:0x9ce3d1,emissive:0x53bda4,emissiveIntensity:1.1,roughness:.4})};
 const dome=new T.SphereGeometry(1,12,8,0,Math.PI*2,0,Math.PI*.64),sphere=new T.SphereGeometry(1,10,6),box=new T.BoxGeometry(1,1,1),rod=new T.CylinderGeometry(1,1,1,6);
 const outline=new T.Shape();outline.moveTo(-.7,-1);outline.lineTo(.7,-1);outline.lineTo(1,-.6);outline.lineTo(1,.6);outline.lineTo(.7,1);outline.lineTo(-.7,1);outline.lineTo(-1,.6);outline.lineTo(-1,-.6);outline.closePath();
 const plate=new T.ExtrudeGeometry(outline,{depth:.6,steps:1,bevelEnabled:true,bevelSegments:1,bevelSize:.12,bevelThickness:.12});plate.center();plate.rotateX(Math.PI/2);
 const stamp=new T.Object3D(),body=new T.Object3D(),local=new T.Object3D(),matrix=new T.Matrix4(),pools=[];
 function shape(g,pos,scale,rotation=[0,0,0]){stamp.position.set(...pos);stamp.scale.set(...scale);stamp.rotation.set(...rotation);stamp.updateMatrix();return(g.index?g.toNonIndexed():g.clone()).applyMatrix4(stamp.matrix);}
 function strut(a,b,width){const p=new T.Vector3(...a),q=new T.Vector3(...b),d=q.clone().sub(p);stamp.position.copy(p.add(q).multiplyScalar(.5));stamp.scale.set(width,d.length(),width);stamp.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());stamp.updateMatrix();return rod.toNonIndexed().applyMatrix4(stamp.matrix);}
 function pool(name,material,count,parts){const geometry=mergeGeometries(parts);parts.forEach(g=>g.dispose());const mesh=new T.InstancedMesh(geometry,materials[material],count);mesh.name=name;mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);root.add(mesh);pools.push(mesh);return mesh;}
 const shell=pool('larva-carapace','shell',capacity*segments,[shape(dome,[0,.015,0],[.24,.24,.125]),shape(plate,[-.19,.015,0],[.065,.15,.105],[0,0,-.38]),shape(plate,[.19,.015,0],[.065,.15,.105],[0,0,.38])]);
 const spine=pool('larva-flexible-spine','metal',capacity*segments,[shape(sphere,[0,0,0],[.21,.15,.145])]);
 const seams=pool('larva-fasteners','seam',capacity*segments,[-1,1].flatMap(side=>[shape(sphere,[side*.18,.21,.035],[.025,.016,.025]),shape(box,[side*.23,.04,0],[.024,.06,.11])]));
 const vents=pool('larva-dorsal-core','glow',capacity*segments,[shape(box,[0,.225,0],[.045,.018,.08])]);
 const head=pool('larva-head','shell',capacity,[shape(plate,[0,.055,0],[.225,.28,.18])]);
 const face=pool('larva-face','metal',capacity,[shape(sphere,[0,-.01,.12],[.2,.13,.115]),shape(box,[0,.05,.215],[.32,.065,.04])]);
 const eyes=pool('larva-sensors','glow',capacity,[-1,1].map(side=>shape(sphere,[side*.1,.065,.241],[.045,.027,.02])));
 const rightJaw=pool('larva-mandibles-right','seam',capacity,[strut([0,0,0],[.09,-.035,.14],.042),strut([.09,-.035,.14],[.015,-.025,.25],.026),shape(sphere,[0,0,0],[.055,.055,.055])]);
 const rightLeg=pool('larva-legs-right','metal',capacity*segments,[strut([0,0,0],[.1,-.035,-.025],.032),strut([.1,-.035,-.025],[.15,-.14,.035],.024),shape(box,[.15,-.14,.05],[.06,.035,.095])]);
 // Mirror in geometry with corrected winding; negative instance scales are unsupported.
 function mirror(source,name){const g=source.geometry.clone().scale(-1,1,1),indices=[];for(let i=0;i<g.attributes.position.count;i+=3)indices.push(i,i+2,i+1);g.setIndex(indices);const m=new T.InstancedMesh(g,source.material,source.instanceMatrix.count);m.name=name;m.count=0;m.frustumCulled=false;m.instanceMatrix.setUsage(T.DynamicDrawUsage);root.add(m);pools.push(m);return m;}
 const jaws=[mirror(rightJaw,'larva-mandibles-left'),rightJaw],legs=[mirror(rightLeg,'larva-legs-left'),rightLeg];
 for(const mesh of pools)mesh.castShadow=true;
 for(const g of [dome,sphere,box,rod,plate])g.dispose();
 let previous=new Map();
 function put(mesh,index,x,y,z,sx=1,sy=1,sz=1,ry=0,rz=0){local.position.set(x,y,z);local.scale.set(sx,sy,sz);local.rotation.set(0,ry,rz);local.updateMatrix();matrix.multiplyMatrices(body.matrix,local.matrix);mesh.setMatrixAt(index,matrix);}
 function update(s,reduced=false){const larvae=(s.isaac?.larvae||[]).slice(0,capacity),time=combatTime(s),next=new Map();
  for(const mesh of [shell,spine,seams,vents])mesh.count=larvae.length*segments;
  for(const mesh of [head,face,eyes])mesh.count=larvae.length;
  for(const mesh of jaws)mesh.count=larvae.length;for(const mesh of legs)mesh.count=larvae.length*segments;
  larvae.forEach((l,i)=>{const key=l.id??l,old=previous.get(key),dx=old?l.x-old.x:0,dz=old?l.z-old.z:0,moved=Math.hypot(dx,dz)>1e-5;
   const aim=moved?Math.atan2(dx,dz):(old?.aim??0);next.set(key,{x:l.x,z:l.z,aim});
   const phase=time*24+(typeof l.id==='number'?l.id:i)*2.4,preparing=l.prepare>0;
   body.position.set(l.x,(l.y??0)+.21,l.z);body.rotation.set(0,aim,0);body.scale.setScalar(.8);body.updateMatrix();
   for(let j=0;j<segments;j++){const taper=1-j*.12,wave=reduced?0:Math.sin(phase-j*.85),bend=wave*.035*j/segments,bob=reduced?0:Math.cos(phase-j*.85)*.016;
    for(const mesh of [shell,spine,seams,vents])put(mesh,i*segments+j,bend,bob,-j*.21,taper,taper,1,wave*.07);
    for(let side=0;side<2;side++){const sign=side?1:-1;put(legs[side],i*segments+j,bend+sign*.19*taper,-.015+bob,-j*.21,taper,taper,1,(reduced?0:wave*.35)*sign);}
   }
   for(const mesh of [head,face,eyes])put(mesh,i,0,preparing?.03:0,.25);
   for(let side=0;side<2;side++){const sign=side?1:-1,open=preparing?.35:.12+(reduced?0:Math.sin(phase)*.08);put(jaws[side],i,sign*.135,-.045,.39,1,1,1,sign*open);}
  });
  previous=next;for(const mesh of pools)mesh.instanceMatrix.needsUpdate=true;
 }
 return{update,reset(){previous.clear();for(const mesh of pools)mesh.count=0;},dispose(){previous.clear();parent.remove(root);for(const mesh of pools){mesh.dispose();mesh.geometry.dispose();}for(const m of Object.values(materials))m.dispose();}};
}

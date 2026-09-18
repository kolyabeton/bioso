import * as T from 'three';
import {createRocketBeeView} from './rocket-bee-view.js';
import {combatTime} from './systems/mutations.js';

/** Targetable feeding roots / command relays, and the same mechanical bees used by the rocket hive. */
export function createBossMechanicsView(scene){
 const root=new T.Group();root.name='boss-combat-parts';scene.add(root);
 const bees=createRocketBeeView(root,8),parts=new Map();let lastBeeTime=null,lastReduced=null;
 const ceramic=new T.MeshStandardMaterial({color:'#ded9c7',roughness:.7,metalness:.08});
 const metal=new T.MeshStandardMaterial({color:'#515d58',roughness:.65,metalness:.3});
 const glow=new T.MeshStandardMaterial({color:'#9df6db',emissive:'#4ae0ac',emissiveIntensity:.8,roughness:.4});
 const ringGeometry=new T.TorusGeometry(.65,.15,8,24),coreGeometry=new T.IcosahedronGeometry(.43,2),footGeometry=new T.BoxGeometry(.22,.3,.62);
 const supportBaseGeometry=new T.CylinderGeometry(.78,.86,.24,16),supportCollarGeometry=new T.CylinderGeometry(.38,.48,.5,12),supportLensGeometry=new T.CylinderGeometry(.24,.29,.08,16);
 const supportJawGeometry=new T.BoxGeometry(.24,.34,.88),supportStrutGeometry=new T.CylinderGeometry(.105,.15,1,8),supportMountGeometry=new T.BoxGeometry(.78,.32,.46);
 const ringMat=new T.MeshBasicMaterial({color:'#ffd08b',transparent:true,opacity:.7,depthWrite:false});
 const haloGeometry=new T.RingGeometry(.87,.94,32);haloGeometry.rotateX(-Math.PI/2);
 const attachedRole=role=>role==='support'||role==='command';
 const yAxis=new T.Vector3(0,1,0),from=new T.Vector3(),to=new T.Vector3(),delta=new T.Vector3(),inward=new T.Vector3(),side=new T.Vector3();
 function placeStrut(mesh,a,b){
  delta.copy(b).sub(a);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.scale.set(1,delta.length(),1);mesh.quaternion.setFromUnitVectors(yAxis,delta.normalize());
 }
 function createSupport(g){
  const base=new T.Mesh(supportBaseGeometry,metal);base.name='support-foot';base.position.y=.12;g.add(base);
  const collar=new T.Mesh(supportCollarGeometry,ceramic);collar.name='support-collar';collar.position.y=.43;g.add(collar);
  const lens=new T.Mesh(supportLensGeometry,glow);lens.name='support-load-indicator';lens.position.y=.72;g.add(lens);g.userData.core=lens;
  const hardware=new T.Group();hardware.name='support-link';
  for(let i=0;i<2;i++){const jaw=new T.Mesh(supportJawGeometry,metal);jaw.name=`support-jaw-${i}`;hardware.add(jaw);const strut=new T.Mesh(supportStrutGeometry,i?ceramic:metal);strut.name=`support-strut-${i}`;hardware.add(strut);}
  const mount=new T.Mesh(supportMountGeometry,metal);mount.name='support-leg-clamp';hardware.add(mount);g.add(hardware);g.userData.supportHardware=hardware;
 }
 function createGenericPart(g){
  const ring=new T.Mesh(ringGeometry,ceramic);ring.rotation.x=-Math.PI/2;ring.position.y=.5;g.add(ring);const core=new T.Mesh(coreGeometry,glow);core.position.y=.63;g.add(core);g.userData.core=core;
  for(let i=0;i<4;i++){const foot=new T.Mesh(footGeometry,metal);const a=i*Math.PI/2;foot.position.set(Math.sin(a)*.61,.2,Math.cos(a)*.61);foot.rotation.y=a;g.add(foot);}
 }
 function updateSupport(g,e,owner){
  if(!owner)return;
  inward.set(owner.x-e.x,0,owner.z-e.z);if(inward.lengthSq()<1e-6)inward.set(0,0,1);else inward.normalize();side.set(inward.z,0,-inward.x);
  const hardware=g.userData.supportHardware,yaw=Math.atan2(inward.x,inward.z);
  for(let i=0;i<2;i++){
   const sign=i?1:-1,jaw=hardware.getObjectByName(`support-jaw-${i}`),strut=hardware.getObjectByName(`support-strut-${i}`);
   jaw.position.copy(side).multiplyScalar(sign*.42).addScaledVector(inward,.1);jaw.position.y=.42;jaw.rotation.y=yaw;
   from.copy(side).multiplyScalar(sign*.22);from.y=.62;to.copy(inward).multiplyScalar(1.55).addScaledVector(side,sign*.22);to.y=2.15;placeStrut(strut,from,to);
  }
  const mount=hardware.getObjectByName('support-leg-clamp');mount.position.copy(inward).multiplyScalar(1.55);mount.position.y=2.15;mount.rotation.y=yaw;
  g.userData.supportMount={x:mount.position.x,y:mount.position.y,z:mount.position.z};
 }
 function update(s,reducedMotion=false){
  const alive=s.enemies.filter(e=>e.hp>0&&e.bossOwner),entities=new Map(s.enemies.map(e=>[e.id,e])),keep=new Set(),time=combatTime(s);
  for(const e of alive.filter(e=>e.kind==='boss-part')){
   keep.add(e.id);let g=parts.get(e.id);
   if(!g){g=new T.Group();g.name=`boss-weakpoint:${e.role}:${e.id}`;if(attachedRole(e.role))createSupport(g);else createGenericPart(g);const halo=new T.Mesh(haloGeometry,ringMat);halo.name='boss-part-target';halo.position.y=.09;if(attachedRole(e.role))halo.scale.setScalar(.9);g.add(halo);root.add(g);parts.set(e.id,g);}
   g.position.set(e.x,e.y??0,e.z);const core=g.userData.core;core.scale.setScalar(.75+.25*e.hp/e.maxHp);core.rotation.y=reducedMotion?0:time*.6;if(attachedRole(e.role))updateSupport(g,e,entities.get(e.bossOwner));
  }
  for(const [id,g]of parts)if(!keep.has(id)){root.remove(g);parts.delete(id);}
  if(time!==lastBeeTime||reducedMotion!==lastReduced){bees.update(alive.filter(e=>e.kind==='boss-drone').map(e=>({...e,dx:e.dx??0,dz:e.dz??1})),e=>(e.y??0)+1,time,reducedMotion);lastBeeTime=time;lastReduced=reducedMotion;}
 }
 function reset(){for(const g of parts.values())root.remove(g);parts.clear();bees.reset();lastBeeTime=null;lastReduced=null;}
 return{update,reset,dispose(){reset();bees.dispose();for(const o of [ceramic,metal,glow,ringMat,ringGeometry,coreGeometry,footGeometry,supportBaseGeometry,supportCollarGeometry,supportLensGeometry,supportJawGeometry,supportStrutGeometry,supportMountGeometry,haloGeometry])o.dispose();scene.remove(root);}};
}

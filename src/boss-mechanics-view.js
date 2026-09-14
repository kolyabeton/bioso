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
 const ringMat=new T.MeshBasicMaterial({color:'#ffd08b',transparent:true,opacity:.7,depthWrite:false});
 const haloGeometry=new T.RingGeometry(.87,.94,32);haloGeometry.rotateX(-Math.PI/2);
 function update(s,reducedMotion=false){
  const alive=s.enemies.filter(e=>e.hp>0&&e.bossOwner),keep=new Set(),time=combatTime(s);
  for(const e of alive.filter(e=>e.kind==='boss-part')){
   keep.add(e.id);let g=parts.get(e.id);
   if(!g){g=new T.Group();g.name=`boss-weakpoint:${e.role}:${e.id}`;const ring=new T.Mesh(ringGeometry,ceramic);ring.rotation.x=-Math.PI/2;ring.position.y=.5;g.add(ring);const core=new T.Mesh(coreGeometry,glow);core.position.y=.63;g.add(core);for(let i=0;i<4;i++){const foot=new T.Mesh(footGeometry,metal);const a=i*Math.PI/2;foot.position.set(Math.sin(a)*.61,.2,Math.cos(a)*.61);foot.rotation.y=a;g.add(foot);}const halo=new T.Mesh(haloGeometry,ringMat);halo.position.y=.09;g.add(halo);root.add(g);parts.set(e.id,g);}
   g.position.set(e.x,e.y??0,e.z);g.children[1].scale.setScalar(.75+.25*e.hp/e.maxHp);g.children[1].rotation.y=reducedMotion?0:time*.6;
  }
  for(const [id,g]of parts)if(!keep.has(id)){root.remove(g);parts.delete(id);}
  if(time!==lastBeeTime||reducedMotion!==lastReduced){bees.update(alive.filter(e=>e.kind==='boss-drone').map(e=>({...e,dx:e.dx??0,dz:e.dz??1})),e=>(e.y??0)+1,time,reducedMotion);lastBeeTime=time;lastReduced=reducedMotion;}
 }
 function reset(){for(const g of parts.values())root.remove(g);parts.clear();bees.reset();lastBeeTime=null;lastReduced=null;}
 return{update,reset,dispose(){reset();bees.dispose();for(const o of [ceramic,metal,glow,ringMat,ringGeometry,coreGeometry,footGeometry,haloGeometry])o.dispose();scene.remove(root);}};
}

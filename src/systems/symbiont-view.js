import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {combatTime} from './mutations.js';

/** Shared pooled models for skill companions and arm drones. */
export function createSymbiontView(parent,{initialCount=0}={}){
 const shell=new T.MeshStandardMaterial({color:0xbebda9,roughness:.82,metalness:.18});
 const metal=new T.MeshStandardMaterial({color:0x303934,roughness:.7,metalness:.7});
 const seam=new T.MeshStandardMaterial({color:0x82775b,roughness:.85,metalness:.45});
 const glow=new T.MeshStandardMaterial({color:0x9ce3d1,emissive:0x53bda4,emissiveIntensity:1.4,roughness:.35});
 const membrane=new T.MeshStandardMaterial({color:0xb7d1c7,transparent:true,opacity:.32,side:T.DoubleSide,depthWrite:false,roughness:.45,metalness:.3});
 const sphere=new T.SphereGeometry(1,10,6),rod=new T.CylinderGeometry(1,1,1,8);
 const box=new T.BoxGeometry(1,1,1),ring=new T.TorusGeometry(1,.22,5,12);
 // Chamfered armour silhouette with bevels that catch light at game scale.
 const outline=new T.Shape();outline.moveTo(-.7,-1);outline.lineTo(.7,-1);outline.lineTo(1,-.6);outline.lineTo(1,.6);outline.lineTo(.6,1);outline.lineTo(-.6,1);outline.lineTo(-1,.6);outline.lineTo(-1,-.6);outline.closePath();
 const plate=new T.ExtrudeGeometry(outline,{depth:.6,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.12,bevelThickness:.12});plate.center();plate.rotateX(Math.PI/2);
 const wingOutline=new T.Shape();wingOutline.moveTo(0,0);wingOutline.lineTo(.23,.15);wingOutline.lineTo(.77,.08);wingOutline.lineTo(.89,-.04);wingOutline.lineTo(.64,-.19);wingOutline.lineTo(.19,-.12);wingOutline.closePath();
 const wingPanel=new T.ShapeGeometry(wingOutline);wingPanel.rotateX(Math.PI/2);
 const resources=[shell,metal,seam,glow,membrane,sphere,rod,box,ring,plate,wingPanel];
 function part(parent,geometry,material,position,scale){const mesh=new T.Mesh(geometry,material);mesh.position.set(...position);mesh.scale.set(...scale);parent.add(mesh);return mesh;}
 function strut(parent,a,b,width,material=metal){const p=new T.Vector3(...a),q=new T.Vector3(...b),d=q.clone().sub(p);const mesh=part(parent,rod,material,p.add(q).multiplyScalar(.5).toArray(),[width,d.length(),width]);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return mesh;}
 const createBee=index=>{
  const root=new T.Group();root.name=`mechanical-bee-${index}`;root.visible=false;parent.add(root);
  root.scale.setScalar(.65);
  const body=new T.Group();root.add(body);
  // Exposed spine and separate overlapping ceramic carapace panels.
  part(body,box,metal,[0,0,-.04],[.32,.25,.88]);
  for(const side of [-1,1]){
   const cover=part(body,plate,shell,[side*.13,.15,.02],[.115,.16,.29]);cover.rotation.z=-side*.12;
   strut(body,[side*.24,-.06,.26],[side*.24,-.06,-.45],.038,seam);
   for(let j=0;j<3;j++){
    part(body,box,metal,[side*.2,.225,-.17+j*.115],[.095,.027,.04]);
    part(body,sphere,seam,[side*.2,.23,.25-j*.22],[.022,.014,.022]);
   }
  }
  for(let j=0;j<3;j++){
   const z=-.34-j*.16,w=.23-j*.045;
   part(body,plate,j===1?seam:shell,[0,.04-j*.025,z],[w,.24,.065]);
   part(body,box,metal,[0,.155-j*.025,z-.075],[w*1.5,.035,.045]);
  }
  // Rear turbine, nozzle rim and a restrained exhaust core.
  part(body,ring,seam,[0,-.04,-.78],[.105,.105,.105]);
  part(body,sphere,metal,[0,-.04,-.785],[.088,.088,.018]);
  part(body,sphere,glow,[0,-.04,-.803],[.036,.036,.012]);
  part(body,plate,metal,[0,.01,.4],[.21,.23,.17]);
  part(body,plate,shell,[0,.14,.4],[.19,.12,.14]);
  part(body,box,metal,[0,.01,.585],[.3,.085,.04]);
  part(body,box,glow,[0,.012,.609],[.18,.028,.018]);
  for(const side of [-1,1]){
   strut(body,[side*.15,.14,.48],[side*.24,.3,.58],.022);
   part(body,box,seam,[side*.24,.31,.58],[.05,.055,.075]);
   for(let leg=0;leg<3;leg++){
    const z=.22-leg*.23;
    part(body,sphere,seam,[side*.2,-.08,z],[.06,.06,.06]);
    strut(body,[side*.2,-.08,z],[side*.36,-.23,z-.07],.031);
    strut(body,[side*.36,-.23,z-.07],[side*.25,-.38,z+.03],.022,seam);
    part(body,box,metal,[side*.25,-.38,z+.03],[.06,.035,.09]);
   }
  }
  // Underslung dart cannon: barrel, cooling sleeve and muzzle collar.
  part(body,box,metal,[0,-.17,.35],[.16,.14,.29]);
  strut(body,[0,-.17,.43],[0,-.17,.76],.042,seam);
  for(let j=0;j<3;j++)part(body,ring,metal,[0,-.17,.47+j*.065],[.066,.066,.04]);
  part(body,ring,seam,[0,-.17,.78],[.07,.07,.05]);
  const muzzle=part(body,sphere,glow,[0,-.17,.792],[.04,.04,.018]);
  const wings=[];
  for(const side of [-1,1])for(let row=0;row<2;row++){
   const z=.14-row*.36;
   strut(body,[side*.17,.08,z],[side*.3,.16,z],.065);
   const motor=part(body,rod,metal,[side*.28,.16,z],[.09,.16,.09]);motor.rotation.z=Math.PI/2;
   const pivot=new T.Group();pivot.position.set(side*.29,.16,z);pivot.rotation.y=side*(row?.4:-.16);body.add(pivot);
   part(pivot,wingPanel,membrane,[0,0,0],[side,1,row?.74:1]);
   const edge=[[0,0,0],[side*.23,0,-.15],[side*.77,0,-.08],[side*.89,0,.04],[side*.64,0,.19],[side*.19,0,.12],[0,0,0]];
   for(let j=1;j<edge.length;j++)strut(pivot,edge[j-1],edge[j],.018,seam);
   strut(pivot,[0,.01,0],[side*.77,.01,.05],.029,metal);
   strut(pivot,[side*.23,0,-.15],[side*.64,0,.19],.013,metal);
   strut(pivot,[side*.49,0,-.11],[side*.49,0,.13],.012,metal);
   const blade=part(pivot,plate,shell,[side*.59,.015,-.085],[.22,.035,.055]);blade.rotation.y=side*.1;
   for(let j=0;j<4;j++){const tooth=part(pivot,box,seam,[side*.055,.035,0],[.055,.035,.12]);tooth.rotation.y=j*Math.PI/4;}
   wings.push({pivot,side,row});
  }
  // Bake stationary parts by material; extra modelling does not mean hundreds of draw calls.
  function batchParts(group,exclude=[]){
   const meshes=group.children.filter(o=>o.isMesh&&!exclude.includes(o)),batches=new Map();
   for(const mesh of meshes){mesh.updateMatrix();const geometry=(mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone()).applyMatrix4(mesh.matrix);if(!batches.has(mesh.material))batches.set(mesh.material,[]);batches.get(mesh.material).push(geometry);group.remove(mesh);}
   for(const [material,geometries]of batches){const geometry=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());resources.push(geometry);group.add(new T.Mesh(geometry,material));}
  }
  for(const {pivot}of wings)batchParts(pivot);
  batchParts(body,[muzzle]);
  return{root,body,wings,muzzle};
 };
 const bees=[];
 for(let i=0;i<initialCount;i++)bees.push(createBee(i));
 return{
  update(s,reduced=false){const time=combatTime(s);
   while(bees.length<(s.abilities?.companions?.length||0))bees.push(createBee(bees.length));
   bees.forEach((bee,i)=>{const c=s.abilities?.companions?.[i];bee.root.visible=!!c&&c.phase!=='dead';if(!c||c.phase==='dead')return;
    const phase=time*.8+i*Math.PI,age=time-(c.lastShotAt??-100),kick=Math.max(0,1-age/.18);
    bee.root.position.set(c.x,(c.y??0)+(c.hover??1.5)+(reduced?0:Math.sin(time*4+i*2)*.075),c.z);
    bee.root.rotation.y=c.aim??-phase;
    bee.body.position.z=kick*.1;bee.body.rotation.x=reduced?0:(c.phase==='retreat'?-.25:Math.min(.3,(c.speed||0)*.035))+kick*.18;
    bee.body.rotation.z=reduced?0:Math.max(-.45,Math.min(.45,c.bank||0))+Math.sin(time*2+i)*.06;
    for(const {pivot,side,row}of bee.wings)pivot.rotation.z=side*(.15+(reduced?0:Math.sin(time*48+row*.8)*.42));
    bee.muzzle.scale.set(.04*(1+kick*1.8),.04*(1+kick*1.8),.018);
   });
  },
  reset(){for(const bee of bees)bee.root.visible=false;},
  dispose(){for(const bee of bees)parent.remove(bee.root);for(const resource of resources)resource.dispose();}
 };
}

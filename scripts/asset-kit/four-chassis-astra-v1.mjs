// Standalone proposals. Never writes public assets, manifests or game sources.
import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
import {writeFile} from 'node:fs/promises';
import {equipmentSurfaceUV} from '../../src/equipment-surface.js';
import {CHASSIS_MATERIALS} from '../../src/creature-materials.js';
import {CHASSIS_PROFILES} from '../../src/chassis-profiles.js';
import {equipmentLayout} from '../../src/equipment-mounts.js';
import {fittedModel,legMountOptions} from '../../src/asset-models.js';
import {mountOrgan} from '../../src/organ-mounts.js';
import {createCreatureFrame,createLimbBearing} from '../../src/creature-frame.js';
const OUT=new URL('../../docs/art/four-chassis-20260918/astra-models-v1/',import.meta.url),KIT=new URL('../../public/assets/kit/',import.meta.url);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
globalThis.FileReader=class{readAsArrayBuffer(b){b.arrayBuffer().then(r=>{this.result=r;this.onloadend?.();});}readAsDataURL(b){b.arrayBuffer().then(r=>{this.result=`data:${b.type};base64,${Buffer.from(r).toString('base64')}`;this.onloadend?.();});}};
const source=await io.read(new URL('leg-worker.glb',KIT).pathname),sourceMaterial=source.getRoot().listMaterials()[0],materialSources=new Map();
for(const [kind,m]of Object.entries(CHASSIS_MATERIALS))if(['ceramic','steel','brass'].includes(kind))materialSources.set(m.name,sourceMaterial);
const V=a=>new T.Vector3(...a),up=V([0,1,0]);
function build(key){
 const root=new T.Group();root.name=`body-${key}-astra-v3`;root.userData={closedChassis:true,chassisKey:key,proposal:true};
 const parts={ceramic:[],brass:[],steel:[],light:[],glass:[]};
 function add(k,g,p=[0,0,0],r=[0,0,0]){g.applyMatrix4(new T.Matrix4().makeRotationFromEuler(new T.Euler(...r)));g.translate(...p);equipmentSurfaceUV(g,k,parts[k].length);parts[k].push(g.index?g.toNonIndexed():g);}
 function box(k,p,s,r=[0,0,0],b=.025){
  add(k,new RoundedBoxGeometry(...s,2,Math.min(b,k==='ceramic'?.055:b)),p,r);
  if(k==='ceramic'&&s[0]>.3&&s[2]>.19){
   for(const x of [-1,1])for(const z of [-1,1]){
    const pt=V([x*(s[0]/2-.045),s[1]/2+.006,z*(s[2]/2-.045)]).applyEuler(new T.Euler(...r)).add(V(p));
    cyl('steel',pt.toArray(),.016,.014,[0,1,0],6);
   }
  }
 }
 function cyl(k,p,r,h,axis=[0,1,0],n=24){const g=new T.CylinderGeometry(r,r,h,n);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(up,V(axis).normalize()));add(k,g,p);}
 function ring(k,p,r,t,axis=[0,1,0]){const g=new T.TorusGeometry(r,t,8,32);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(V([0,0,1]),V(axis).normalize()));add(k,g,p);}
 function bolts(p,r,axis=[0,1,0],n=8){const q=new T.Quaternion().setFromUnitVectors(up,V(axis));for(let i=0;i<n;i++){const v=V([Math.cos(i*2*Math.PI/n)*r,0,Math.sin(i*2*Math.PI/n)*r]).applyQuaternion(q).add(V(p));cyl('brass',v.toArray(),.012,.018,axis,6);}}
 function socket(p,r=.105,axis=[0,0,1]){cyl('steel',p,r,.025,axis);ring('brass',p,r,.012,axis);ring('steel',V(p).addScaledVector(V(axis),.012).toArray(),r*.70,.01,axis);bolts(p,r*.9,axis,6);}
 // A closed convex hull, separate from detail meshes, is the raycast target.
 let hull;
 if(key==='regulator'){hull=new RoundedBoxGeometry(.80,1.39,.60,3,.16);}else if(key==='sentinel'){
  hull=new T.CylinderGeometry(.73,.64,.63,5,1);hull.rotateY(Math.PI);hull.scale(1,1,.86);
 }else hull=new RoundedBoxGeometry(key==='demolition'?1.44:1.30,.63,1.03,3,.19);
 equipmentSurfaceUV(hull,'steel');const hm=new T.Mesh(hull,CHASSIS_MATERIALS.steel.clone());hm.material.map=null;hm.name=key+'-steel';root.add(hm);
 if(key==='demolition'){
  // Four broad split plates surround a genuinely open-topped recessed service chamber.
  for(const side of [-1,1]){
   box('ceramic',[side*.50,.16,0],[.39,.56,.91],[0,0,-side*.10],.13);
   for(const z of [-.38,.38])box('ceramic',[side*.20,.16,z],[.35,.54,.24],[0,side*z*.13,0],.065);
   box('steel',[side*.69,-.12,0],[.075,.18,.54]);
   for(let z=-.2;z<.25;z+=.1)box('brass',[side*.732,-.12,z],[.024,.14,.025]);
  }
  cyl('steel',[0,.327,0],.272,.03);ring('brass',[0,.345,0],.244,.021);ring('steel',[0,.36,0],.198,.024);ring('brass',[0,.363,0],.147,.012);cyl('glass',[0,.36,0],.114,.01);cyl('light',[0,.37,0],.055,.012);bolts([0,.366,0],.223);
  for(const z of [-.52,.52]){box('steel',[0,-.025,z],[.44,.29,.06]);for(let i=-2;i<=2;i++)box('brass',[i*.075,-.02,z*1.045],[.027,.16,.02]);}
  for(const x of [-.6,.6])socket([x,.30,-.37],.07,[0,1,0]);
 }else if(key==='regulator'){
  for(const side of [-1,1]){
   box('ceramic',[side*.36,-.015,.015],[.22,1.19,.58],[0,0,-side*.085],.10);
   box('steel',[side*.20,.52,-.04],[.08,.28,.43]);
   for(let y=-.36;y<.3;y+=.13)box('brass',[side*.455,y,-.09],[.022,.034,.25]);
   socket([side*.475,-.12,.04],.094,[side,0,0]);
  }
  box('ceramic',[0,-.03,.314],[.32,1.12,.12],[0,0,0],.075);
  box('steel',[0,-.02,.39],[.19,.68,.035],[0,0,0],.06);
  box('brass',[0,-.02,.415],[.125,.55,.017],[0,0,0],.04);
  box('glass',[0,-.02,.426],[.087,.49,.017],[0,0,0],.035);
  box('light',[0,.39,.39],[.023,.10,.014]);
  for(const side of [-1,1])box('steel',[side*.24,.73,-.08],[.028,.37,.59],[0,0,0],.009);
  for(let i=0;i<3;i++)box('steel',[0,.71+i*.09,.12-i*.19],[.65,.041,.14],[.13,0,0],.02);
  for(let i=0;i<5;i++)box('brass',[0,-.45+i*.038,-.326],[.40,.015,.025]);
 }else if(key==='sentinel'){
  // Five armour sectors with a centre hatch and exactly three dormant ring drives.
  for(let i=0;i<5;i++){
   const a=i*2*Math.PI/5,px=Math.sin(a)*.38,pz=Math.cos(a)*.38;
   box('ceramic',[px,.19,pz*.86],[.56,.27,.47],[0,a,0],.075);
   box('ceramic',[Math.sin(a)*.56,-.085,Math.cos(a)*.49],[.34,.28,.17],[0,a,0],.045);
   for(const dx of [-.11,.11]){const p=V([dx,.342,.06]).applyAxisAngle(up,a).add(V([px,0,pz*.86]));cyl('brass',p.toArray(),.013,.012,[0,1,0],6);}
  }
  cyl('steel',[0,.35,0],.24,.07);cyl('ceramic',[0,.395,0],.203,.033);ring('brass',[0,.418,0],.205,.009);box('steel',[0,.418,0],[.025,.015,.14]);
  for(const a of [0,2*Math.PI/3,4*Math.PI/3]){const p=[Math.sin(a)*.49,.355,Math.cos(a)*.425];socket(p,.101,[0,1,0]);cyl('brass',p,.036,.018);}
 }else{
  for(const side of [-1,1]){
   box('ceramic',[side*.435,.12,0],[.39,.48,.94],[0,0,-side*.04],.11);
   box('ceramic',[side*.19,.16,.47],[.34,.38,.20],[0,0,0],.055);
   box('steel',[side*.21,.335,-.02],[.034,.052,.61]);
   for(let z=-.18;z<.23;z+=.16)box('brass',[side*.18,.35,z],[.038,.034,.075]);
  }
  box('steel',[0,.327,-.06],[.31,.025,.53]);box('brass',[0,.35,-.22],[.29,.035,.045]);
  for(let i=-2;i<=2;i++){box('steel',[i*.13,.40,-.43],[.117,.20,.22],[.12,0,0]);box('ceramic',[i*.13,.438,-.415],[.088,.14,.19],[.12,0,0],.018);box('brass',[i*.13,.435,-.30],[.04,.04,.02]);}
  box('steel',[0,-.06,.51],[.26,.20,.04]);box('light',[0,-.035,.538],[.075,.015,.008]);
 }
 // Common underside inspection plate and fasteners, reused construction vocabulary.
 box('brass',[0,-(key==='regulator'?.704:.328),0],[.30,.025,.30]);
 for(const x of [-.11,.11])for(const z of [-.11,.11])cyl('steel',[x,-(key==='regulator'?.725:.35),z],.016,.017,[0,1,0],6);
 for(const [kind,arr]of Object.entries(parts)){if(!arr.length)continue;const g=mergeGeometries(arr),m=CHASSIS_MATERIALS[kind].clone();m.map=null;m.envMap=null;const mesh=new T.Mesh(g,m);mesh.name=key+'-detail-'+(kind==='steel'?'metal':kind);root.add(mesh);}
 root.rotation.y=Math.PI;root.updateMatrixWorld(true);return root;
}
async function save(root,name){
 const copy=root.clone(true);copy.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.map=null;o.material.normalMap=null;o.material.roughnessMap=null;o.material.metalnessMap=null;o.material.aoMap=null;o.material.emissiveMap=null;}});
 const bytes=await new GLTFExporter().parseAsync(copy,{binary:true}),doc=await io.readBinary(new Uint8Array(bytes));
 for(const m of doc.getRoot().listMaterials()){
  const s=materialSources.get(m.getName());if(!s)continue;
  m.setBaseColorFactor(s.getBaseColorFactor()).setMetallicFactor(s.getMetallicFactor()).setRoughnessFactor(s.getRoughnessFactor()).setDoubleSided(s.getDoubleSided()).setNormalScale(s.getNormalScale()).setOcclusionStrength(s.getOcclusionStrength());
  for(const prop of ['BaseColor','MetallicRoughness','Normal','Occlusion','Emissive']){const t=s['get'+prop+'Texture']();if(!t)continue;let target=doc.getRoot().listTextures().find(v=>v.getName()===t.getName());if(!target)target=doc.createTexture(t.getName()).setImage(t.getImage()).setMimeType(t.getMimeType());m['set'+prop+'Texture'](target);}
 }
 const bin=await io.writeBinary(doc);await writeFile(new URL(name+'.glb',OUT),bin);
 return {file:name+'.glb',bytes:bin.length,triangles:doc.getRoot().listMeshes().flatMap(m=>m.listPrimitives()).reduce((s,p)=>s+(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3,0),materials:doc.getRoot().listMaterials().length,textures:doc.getRoot().listTextures().length,bounds:new T.Box3().setFromObject(root).getSize(new T.Vector3()).toArray()};
}
async function load(id){
 const doc=await io.read(new URL(id+'.glb',KIT).pathname);let mi=0;
 const mats=new Map(doc.getRoot().listMaterials().map(m=>{const name=id+'::'+(mi++);materialSources.set(name,m);const tm=new T.MeshStandardMaterial({name,color:new T.Color().fromArray(m.getBaseColorFactor()),metalness:m.getMetallicFactor(),roughness:m.getRoughnessFactor()});return[m,tm];}));
 function node(n){const g=new T.Group();g.name=n.getName();g.position.fromArray(n.getTranslation());g.quaternion.fromArray(n.getRotation());g.scale.fromArray(n.getScale());if(n.getMesh())for(const p of n.getMesh().listPrimitives()){const geo=new T.BufferGeometry();for(const sem of p.listSemantics()){const a=p.getAttribute(sem),names={POSITION:'position',NORMAL:'normal',TEXCOORD_0:'uv',COLOR_0:'color'};if(names[sem])geo.setAttribute(names[sem],new T.BufferAttribute(a.getArray().slice(),a.getElementSize(),a.getNormalized()));}if(p.getIndices())geo.setIndex(new T.BufferAttribute(p.getIndices().getArray().slice(),1));g.add(new T.Mesh(geo,mats.get(p.getMaterial())));}for(const c of n.listChildren())g.add(node(c));return g;}
 const g=new T.Group();for(const n of doc.getRoot().listScenes()[0].listChildren())g.add(node(n));g.updateMatrixWorld(true);return g;
}
const config={demolition:[3,4,3,['drill','needle','hammer']],regulator:[2,3,4,['acid','harpoon']],sentinel:[2,5,3,['claws','shield']],assembler:[3,3,5,['arc','arc','pistol']]};
const stats=[],checks=[];
for(const [key,[ac,lc,oc,weapons]] of Object.entries(config)){
 const model=build(key);stats.push({key,...await save(model,model.name)});
 const state={body:{key},arms:Array.from({length:ac},(_,i)=>({id:'arm'+i})),legs:Array.from({length:lc},()=>({})),organs:Array.from({length:oc},()=>({}))};
 const layout=equipmentLayout(state,{authoredChassis:true}),root=new T.Group();root.name=key+'-assembled';root.userData={legs:[],arms:new Map()};
 const body=fittedModel(model,{size:1.65,rotation:[0,Math.PI,0]});body.position.set(0,1.06,0);body.userData.assetId=model.name;root.add(body);
 for(const [kind,slots]of [['arms',layout.arms],['legs',layout.legs]])for(const slot of slots){const g=new T.Group();g.position.fromArray(slot.position);g.userData={slot:slot.slot,partId:'arm'+slot.slot,rest:g.position.clone()};root.add(g);createLimbBearing(g,kind==='arms'?.135:.12);
 if(kind==='legs'){root.userData.legs.push(g);const id=key==='sentinel'?'leg-plated-icon-v2':'leg-universal-icon-v2';g.add(fittedModel(await load(id),legMountOptions(slot.side,g.position.y)));}else{root.userData.arms.set('arm'+slot.slot,g);const w=weapons[slot.slot],id=w==='pistol'?'arm-pistol-v1':w==='shield'?'arm-shield':`arm-${w}-icon-v1`;g.add(fittedModel(await load(id),{size:w==='pistol'?1.05:1.1,anchor:w==='pistol'?'socket':w==='shield'?'center':'top',rotation:w==='shield'?[0,0,0]:[-Math.PI/2,0,0],envelope:w==='shield'?[.95,1.05,.62]:[.8,.52,1.1]}));}}
 createCreatureFrame(root,state);root.userData.structuralFrame.fit(body);const organChecks=[];
 for(let i=0;i<oc;i++){const id=['organ-armor-icon-v1','organ-stabilizer-icon-v1','organ-regen-icon-v1','organ-digestion-icon-v1','organ-accelerator-icon-v1'][i];const m=fittedModel(await load(id),{size:.43});const mounted=mountOrgan(root,body,m,{slot:i,count:oc,partId:'organ'+i,key:id,assetId:id});if(!mounted)throw new Error('Missing organ mount '+key+i);organChecks.push(mounted.userData);}
 // Export serializable geometry only; runtime callbacks/maps stay in memory.
 const ports=root.userData.structuralFrame.ports.map(p=>({kind:p.kind,slot:p.slot,point:p.point.toArray(),normal:p.normal.toArray()}));
 root.traverse(o=>{o.userData={};});checks.push({key,arms:ac,legs:lc,organs:oc,layout,ports,organChecks,headAdded:false,structuralFit:'PASS'});await save(root,key+'-assembled');
}
await writeFile(new URL('metrics.json',OUT),JSON.stringify(stats,null,2));await writeFile(new URL('mount-checks.json',OUT),JSON.stringify(checks,null,2));await writeFile(new URL('proposed-profiles.json',OUT),JSON.stringify(Object.fromEntries(Object.keys(config).map(k=>[k,{...CHASSIS_PROFILES[k],modelId:`body-${k}-astra-v3`,status:'awaiting approval'}])),null,2));console.log(JSON.stringify(stats,null,2));

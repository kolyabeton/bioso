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
const OUT=new URL('../../docs/art/four-chassis-20260918/astra-sentinel-polish/',import.meta.url),KIT=new URL('../../public/assets/kit/',import.meta.url);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
globalThis.FileReader=class{readAsArrayBuffer(b){b.arrayBuffer().then(r=>{this.result=r;this.onloadend?.();});}readAsDataURL(b){b.arrayBuffer().then(r=>{this.result=`data:${b.type};base64,${Buffer.from(r).toString('base64')}`;this.onloadend?.();});}};
const source=await io.read(new URL('leg-worker.glb',KIT).pathname),sourceMaterial=source.getRoot().listMaterials()[0],materialSources=new Map();
for(const [kind,m]of Object.entries(CHASSIS_MATERIALS))if(['ceramic','steel','brass'].includes(kind))materialSources.set(m.name,sourceMaterial);
const V=a=>new T.Vector3(...a),up=V([0,1,0]);
function build(key){
 const root=new T.Group();root.name=`body-${key}-astra-polish-v3`;root.userData={closedChassis:true,chassisKey:key,proposal:true};
 const groups={ceramic:[],steel:[],brass:[],glass:[],light:[]};let panels=0;
 function add(k,g,p=[0,0,0]){g.translate(...p);if(k==='ceramic'){const uv=g.getAttribute('uv');if(uv)for(let i=0;i<uv.count;i++)uv.setXY(i,32/56+uv.getX(i)*24/56,28/56+uv.getY(i)*24/56);}equipmentSurfaceUV(g,k,0);if(!g.getAttribute('color'))g.setAttribute('color',new T.Float32BufferAttribute(Array(g.attributes.position.count*3).fill(1),3));groups[k].push(g.index?g.toNonIndexed():g);}
 function cyl(k,p,r,h,axis=[0,1,0],n=24){const g=new T.CylinderGeometry(r,r,h,n);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(up,V(axis).normalize()));add(k,g,p);}
 function ring(k,p,r,t,axis=[0,1,0]){const g=new T.TorusGeometry(r,t,6,24);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(V([0,0,1]),V(axis).normalize()));add(k,g,p);}
 function box(k,p,s,rot=[0,0,0]){const g=new RoundedBoxGeometry(...s,1,.014);g.applyMatrix4(new T.Matrix4().makeRotationFromEuler(new T.Euler(...rot)));add(k,g,p);}
 function ellip(c,s){return (lat,lon)=>[c[0]+s[0]*Math.cos(lat)*Math.sin(lon),c[1]+s[1]*Math.sin(lat),c[2]+s[2]*Math.cos(lat)*Math.cos(lon)];}
 const dome=(lat,lon)=>{const co=Math.cos(lat),x=.80*co*Math.sin(lon),z=.66*co*Math.cos(lon);return[x,.37*Math.sin(lat)-(lat>0?.16*Math.exp(-((x/.27)**2+(z/.27)**2)):0),z];};
 const pent=(lat,lon)=>{const a=((lon+Math.PI/5)%(2*Math.PI/5)+2*Math.PI/5)%(2*Math.PI/5)-Math.PI/5,r=.79*(.92*Math.cos(Math.PI/5)/Math.cos(a)+.08)*Math.max(0,Math.cos(lat))**.35;return[Math.sin(lon)*r,.43*Math.sin(lat),Math.cos(lon)*r*.90];};
 const station=(lat,lon)=>{const c=Math.cos(lat),ss=Math.sin(lon),cc=Math.cos(lon),x=.74*Math.sign(ss)*Math.abs(ss)**.50*c**.55,z=.59*Math.sign(cc)*Math.abs(cc)**.50*c**.55;return[x,.25*Math.sin(lat)-(lat>0?.055*Math.exp(-((x/.28)**4+(z/.35)**4)):0),z];};
 const hullSurface=key==='demolition'?dome:key==='regulator'?ellip([0,0,0],[.49,.77,.32]):key==='sentinel'?pent:station;
 function surfaceGeom(fn,width=40,height=24){const g=new T.SphereGeometry(1,width,height),p=g.attributes.position;for(let i=0;i<p.count;i++){const lat=Math.asin(Math.max(-1,Math.min(1,p.getY(i)))),lon=Math.atan2(p.getX(i),p.getZ(i));p.setXYZ(i,...fn(lat,lon));}g.computeVertexNormals();return g;}
 function cap(p,s){add('ceramic',surfaceGeom(ellip([0,0,0],s),20,12),p);}
 const hull=surfaceGeom(hullSurface);equipmentSurfaceUV(hull,'steel');const hmat=CHASSIS_MATERIALS.steel.clone();hmat.map=null;const hm=new T.Mesh(hull,hmat);hm.name=key+'-steel';if(key==='sentinel')hm.scale.y=.70;root.add(hm);
 // Large genuinely curved panels: sampled clipped polygon rings, thin bevels and sealed rear rim.
 function plate(fn,la,lb,oa,ob,depth=.012){
  const corners=[[-.90,-1],[.90,-1],[1,-.86],[1,.86],[.90,1],[-.90,1],[-1,.86],[-1,-.86]],boundary=[];
  for(let i=0;i<8;i++)for(let j=0;j<2;j++){const a=corners[i],b=corners[(i+1)%8],t=j/2;boundary.push([a[0]*(1-t)+b[0]*t,a[1]*(1-t)+b[1]*t]);}
  const pos=[],uv=[],col=[],idx=[],count=boundary.length;
  function point(u,v,d){const lat=(la+lb)/2+v*(lb-la)/2,lon=(oa+ob)/2+u*(ob-oa)/2,p=V(fn(lat,lon)),du=V(fn(lat,lon+.0001)).sub(V(fn(lat,lon-.0001))),dv=V(fn(lat+.0001,lon)).sub(V(fn(lat-.0001,lon))),normal=du.cross(dv).normalize();return p.addScaledVector(normal,d).toArray();}
  const rings=[[1,depth-.018],[1,depth],[.965,depth+.009],[.72,depth+.012],[.46,depth+.012],[.22,depth+.012]];
  for(let r=0;r<rings.length;r++)for(const [u,v]of boundary){const [f,d]=rings[r];pos.push(...point(u*f,v*f,d));uv.push((u*f+1)/2,(v*f+1)/2);const shade=r<2?.56:1;col.push(shade,shade,shade);}
  const center=pos.length/3;pos.push(...point(0,0,depth+.012));uv.push(.5,.5);col.push(1,1,1);
  for(let r=0;r<rings.length-1;r++)for(let i=0;i<count;i++){const j=(i+1)%count,a=r*count+i,b=r*count+j,c=(r+1)*count+j,d=(r+1)*count+i;idx.push(a,b,d,b,c,d);}
  for(let i=0;i<count;i++)idx.push((rings.length-1)*count+i,(rings.length-1)*count+(i+1)%count,center);
  for(let i=1;i<count-1;i++)idx.push(0,i+1,i);
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('color',new T.Float32BufferAttribute(col,3));g.setIndex(idx);g.computeVertexNormals();add('ceramic',g);panels++;
  for(const u of [-.78,.78]){const p=point(u,-.75,depth+.021),q=point(u,-.75,depth+.025);cyl('brass',p,.008,.010,V(q).sub(V(p)).toArray(),6);}
 }
 function shell(fn,rows,cols,range=[-Math.PI,Math.PI]){add('steel',surfaceGeom(fn));for(const [lo,hi]of rows)for(let j=0;j<cols;j++){const step=(range[1]-range[0])/cols;plate(fn,lo+.013,hi-.013,range[0]+j*step+.014,range[0]+(j+1)*step-.014);}}
 function dock(p,r,axis){
  const n=V(axis).normalize(),q=new T.Quaternion().setFromUnitVectors(up,n);
  const tube=new T.CylinderGeometry(r,r,.073,32,1,true);tube.applyQuaternion(q);add('steel',tube,p);
  ring('brass',V(p).addScaledVector(n,.036).toArray(),r*.90,.016,axis);
  ring('steel',V(p).addScaledVector(n,.031).toArray(),r*.68,.015,axis);
  cyl('steel',V(p).addScaledVector(n,-.028).toArray(),r*.72,.009,axis);
  for(let i=0;i<8;i++){
   const offset=V([Math.cos(i*Math.PI/4)*r*.84,0,Math.sin(i*Math.PI/4)*r*.84]).applyQuaternion(q);
   cyl('steel',offset.clone().add(V(p)).addScaledVector(n,.047).toArray(),.013,.011,axis,8);
  }
  for(let i=0;i<6;i++){
   const a=i*Math.PI/3,v=V([Math.cos(a)*r*.59,0,Math.sin(a)*r*.59]).applyQuaternion(q).add(V(p));
   cyl('brass',v.toArray(),.015,.04,axis,6);
  }
 }
 if(key==='demolition'){
  // Four broad dome sectors; the centre is a real concave surface, not a box opening.
  for(let j=0;j<4;j++){const a=j*Math.PI/2;plate(dome,.08,.61,a+.025,a+Math.PI/2-.025);plate(dome,.64,1.08,a+.025,a+Math.PI/2-.025);}
  for(let j=0;j<8;j++)plate(dome,-.58,.045,j*Math.PI/4+.025,(j+1)*Math.PI/4-.025,.006);
  cyl('steel',[0,.228,0],.27,.024);for(const [r,y,t]of [[.27,.26,.022],[.223,.257,.020],[.15,.256,.018]])ring('brass',[0,y,0],r,t);
  cyl('glass',[0,.253,0],.128,.012);ring('steel',[0,.270,0],.102,.009);cyl('light',[0,.275,0],.048,.009);
  for(const side of [-1,1]){dock([side*.69,.06,.12],.132,[side,.2,.15]);dock([side*.47,.28,-.35],.10,[side*.25,1,-.1]);}
  for(let j=0;j<16;j++){const a=j*Math.PI/8,p=dome(-.57,a);box('steel',p,[.047,.13,.037],[0,a,0]);}
  for(const side of [-1,1]){box('steel',[side*.12,-.01,.641],[.16,.13,.06]);for(let j=0;j<3;j++)box('brass',[side*.12,-.055+j*.035,.676],[.125,.010,.012]);}
 }else if(key==='regulator'){
  // Convex independent cheeks, dark separation channels and a narrow curved central shell.
  for(const side of [-1,1]){
   const fn=ellip([side*.37,-.02,0],[.215,.68,.35]);shell(fn,[[-1.43,-.45],[-.42,.48],[.51,1.42]],4);
   cap([side*.37,.668,0],[.066,.025,.10]);
   dock([side*.53,-.20,.235],.115,[side*.75,0,.65]);
  }
  const mid=ellip([0,-.01,.15],[.20,.77,.255]);shell(mid,[[-1.4,-.65],[-.62,.63],[.66,1.40]],2,[-1.14,1.14]);
  cap([0,.77,.15],[.064,.025,.084]);
  box('steel',[0,.04,.415],[.15,.65,.04]);box('brass',[0,.04,.438],[.117,.56,.014]);box('glass',[0,.04,.449],[.082,.50,.009]);box('light',[0,.48,.392],[.021,.09,.013]);
  for(let i=0;i<3;i++){const y=.58+i*.105,z=.04-i*.16;box('steel',[0,y,z],[.64,.05,.13],[.20,0,0]);for(const side of [-1,1])box('brass',[side*.23,y-.035,z],[.045,.10,.10],[.20,0,0]);}
  for(let j=0;j<3;j++)dock([(j-1)*.25,-.65,j===1?.27:0],.102,[(j-1)*.3,-.8,.55]);
 }else if(key==='sentinel'){
  // Five substantial compound-beveled roof sectors follow the actual pentagon.
  function armorPolygon(points){
   const center=points.reduce((v,p)=>v.add(V(p)),new T.Vector3()).multiplyScalar(1/points.length);
   const positions=[],uv=[],idx=[],cols=[],count=points.length;
   for(const [scale,dy,shade] of [[1,-.035,.64],[1,-.004,.86],[.975,.009,1]])for(const p of points){const v=V(p).sub(center).multiplyScalar(scale).add(center);positions.push(v.x,v.y+dy,v.z);uv.push((v.x+.85)/1.7,(v.z+.85)/1.7);cols.push(shade,shade,shade);}
   positions.push(center.x,center.y+.009,center.z);uv.push((center.x+.85)/1.7,(center.z+.85)/1.7);cols.push(1,1,1);
   for(let j=0;j<count;j++){const n=(j+1)%count;for(let k=0;k<2;k++){const a=k*count+j,b=k*count+n,c=(k+1)*count+n,d=(k+1)*count+j;idx.push(a,b,d,b,c,d);}idx.push(2*count+j,2*count+n,3*count);}
   for(let j=1;j<count-1;j++)idx.push(0,j+1,j);
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('color',new T.Float32BufferAttribute(cols,3));g.setIndex(idx);g.computeVertexNormals();add('ceramic',g);panels++;
  }
  const polar=(a,r,y)=>[Math.sin(a)*r,y,Math.cos(a)*r*.90];
  for(let j=0;j<5;j++){
   const a=j*Math.PI*2/5;
   const outline=[[-.58,.294,.425],[-.615,.32,.415],[-.615,.69,.24],[-.58,.735,.22],[.58,.735,.22],[.615,.69,.24],[.615,.32,.415],[.58,.294,.425]];
   armorPolygon(outline.map(([da,rad,y])=>polar(a+da,rad,y)));
   // Armored sidewall with a framed vent inset between corner bearings.
   plate(pent,-.55,.34,a-.53,a+.53,.014);
   const p=polar(a,.686,-.01);
   box('steel',p,[.25,.12,.035],[0,a,0]);
   for(let v=0;v<4;v++)box('brass',[p[0]+Math.sin(a)*.023,p[1]-.039+v*.027,p[2]+Math.cos(a)*.023],[.204,.006,.012],[0,a,0]);
   // Small metal fasteners and inspection slot on each large ceramic face.
   for(const da of [-.38,.38])cyl('steel',polar(a+da,.58,.301),.011,.012,[Math.sin(a)*.25,1,Math.cos(a)*.25],8);
   const slot=polar(a+.32,.49,.358);box('steel',slot,[.022,.008,.065],[0,a+.32,0]);
  }
  // Inset center hatch: real retaining race, large white disk and lock.
  cyl('steel',[0,.399,0],.302,.055);ring('brass',[0,.429,0],.283,.017);
  cyl('ceramic',[0,.431,0],.260,.028,[0,1,0],48);ring('steel',[0,.449,0],.106,.011);
  cyl('steel',[0,.448,0],.104,.015);box('brass',[0,.458,0],[.017,.014,.128]);
  for(let j=0;j<4;j++){const a=j*Math.PI/2,p=polar(a,.262,.443);box('steel',p,[.084,.033,.057],[0,a,0]);cyl('brass',polar(a,.217,.454),.009,.008,[0,1,0],8);}
  // Three broad integrated drive rings around the hatch.
  for(const a of [0,Math.PI*2/3,Math.PI*4/3]){
   const axis=[Math.sin(a)*.35,1,Math.cos(a)*.35],p=polar(a,.604,.29);
   cyl('steel',p,.144,.065,axis,32);ring('brass',V(p).addScaledVector(V(axis).normalize(),.041).toArray(),.125,.015,axis);
   cyl('steel',V(p).addScaledVector(V(axis).normalize(),.046).toArray(),.093,.020,axis,32);
   for(let j=0;j<8;j++){const a2=j*Math.PI/4,q=new T.Quaternion().setFromUnitVectors(up,V(axis).normalize()),v=V([Math.cos(a2)*.125,.061,Math.sin(a2)*.125]).applyQuaternion(q).add(V(p));cyl('steel',v.toArray(),.009,.010,axis,6);}
   const top=V(p).addScaledVector(V(axis).normalize(),.064).toArray();box('brass',top,[.072,.011,.012],[0,a,0]);
  }
  // Five substantial outward, dark recessed bearing throats.
  for(let j=0;j<5;j++){
   const a=j*2*Math.PI/5+Math.PI/5,p=polar(a,.805,-.13),axis=[Math.sin(a),-.12,Math.cos(a)];
   dock(p,.16,axis);
   for(const side of [-1,1]){const t=a+side*.15,pos=polar(t,.776,-.055);box('steel',pos,[.070,.13,.085],[0,t,0]);}
  }
 }else{
  // A broad low U-shaped station with convex continuous shoulders around a rectangular machine bed.
  for(const side of [-1,1]){
   const fn=ellip([side*.43,.025,0],[.285,.30,.585]);shell(fn,[[-.65,.12],[.15,.81],[.84,1.42]],4);
   cap([side*.43,.343,0],[.095,.025,.165]);
   dock([side*.65,-.08,.16],.12,[side,.0,.3]);
  }
  const bridge=ellip([0,.005,.37],[.59,.225,.27]);shell(bridge,[[-.55,.36],[.39,1.40]],3,[-1.3,1.3]);
  cap([0,.232,.37],[.21,.025,.145]);
  box('steel',[0,.218,-.045],[.36,.025,.56]);for(const side of [-1,1]){box('brass',[side*.168,.241,-.05],[.024,.034,.46]);for(const z of [-.19,.02,.17])box('steel',[side*.137,.255,z],[.04,.045,.05]);}
  box('steel',[0,.26,-.29],[.37,.11,.06]);for(let i=-2;i<=2;i++){box('steel',[i*.13,.29,-.43],[.119,.23,.19],[.20,0,0]);const cap=ellip([i*.13,.33,-.43],[.051,.085,.092]);plate(cap,-.2,1.4,-1.5,1.5);box('brass',[i*.13,.285,-.319],[.03,.07,.012]);}
  dock([0,-.12,.57],.11,[0,-.05,1]);
 }
 for(const [kind,arr]of Object.entries(groups)){if(!arr.length)continue;const m=CHASSIS_MATERIALS[kind].clone();m.map=null;m.envMap=null;m.vertexColors=true;const mesh=new T.Mesh(mergeGeometries(arr),m);mesh.name=key+'-detail-'+(kind==='steel'?'metal':kind);root.add(mesh);}
 root.userData.ceramicPanelCount=panels;root.rotation.y=Math.PI;root.updateMatrixWorld(true);return root;
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
const config={sentinel:[2,5,3,['whip','shield']]};
const stats=[],checks=[];
for(const [key,[ac,lc,oc,weapons]] of Object.entries(config)){
 const model=build(key);stats.push({key,...await save(model,model.name)});
 if(process.argv.includes('--cores-only'))continue;
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
await writeFile(new URL('metrics.json',OUT),JSON.stringify(stats,null,2));await writeFile(new URL('mount-checks.json',OUT),JSON.stringify(checks,null,2));await writeFile(new URL('proposed-profiles.json',OUT),JSON.stringify(Object.fromEntries(Object.keys(config).map(k=>[k,{...CHASSIS_PROFILES[k],modelId:`body-${k}-astra-polish-v3`,status:'awaiting approval'}])),null,2));console.log(JSON.stringify(stats,null,2));

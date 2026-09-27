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
import {CHASSIS_PROFILES as RUNTIME_PROFILES} from '../../src/chassis-profiles.js';
import {equipmentLayout} from '../../src/equipment-mounts.js';
import {fittedModel,legMountOptions} from '../../src/asset-models.js';
import {mountOrgan} from '../../src/organ-mounts.js';
import {createCreatureFrame,createLimbBearing} from '../../src/creature-frame.js';
const OUT=new URL('../../docs/art/four-chassis-20260918/astra-models-v2/',import.meta.url),KIT=new URL('../../public/assets/kit/',import.meta.url);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
globalThis.FileReader=class{readAsArrayBuffer(b){b.arrayBuffer().then(r=>{this.result=r;this.onloadend?.();});}readAsDataURL(b){b.arrayBuffer().then(r=>{this.result=`data:${b.type};base64,${Buffer.from(r).toString('base64')}`;this.onloadend?.();});}};
const source=await io.read(new URL('leg-worker.glb',KIT).pathname),sourceMaterial=source.getRoot().listMaterials()[0],materialSources=new Map();
for(const [kind,m]of Object.entries(CHASSIS_MATERIALS))if(['ceramic','steel','brass'].includes(kind))materialSources.set(m.name,sourceMaterial);
const V=a=>new T.Vector3(...a),up=V([0,1,0]),front=V([0,0,1]);

const CHASSIS_PROFILES={
 demolition:{width:.76,height:.43,depth:.60,power:.70,cross:.90,taper:0},
 regulator:{width:.46,height:.84,depth:.41,power:.82,cross:.92,taper:.13},
 sentinel:{width:.77,height:.48,depth:.63,power:.60,cross:.84,taper:-.02},
 assembler:{width:.71,height:.47,depth:.59,power:.66,cross:.86,taper:0}
};
function chassisPoint(key,lat,lon,offset=0){
 const p=CHASSIS_PROFILES[key],s=Math.sin(lat),c=Math.cos(lat),r=Math.max(0,c)**p.power*(1+p.taper*s);
 const round=v=>Math.sign(v)*Math.abs(v)**p.cross;
 const x=round(Math.sin(lon))*(p.width*r+offset*c),z=round(Math.cos(lon))*(p.depth*r+offset*c);
 let y=p.height*s+offset*s;
 if(key==='demolition'&&s>0)y-=.12*Math.exp(-((x/.22)**2+(z/.22)**2));
 if(key==='assembler'&&s>0)y-=.09*Math.exp(-((x/.21)**4+(z/.24)**4));
 return [x,y,z];
}
function build(key){
 const profile=CHASSIS_PROFILES[key],groups=Object.fromEntries(Object.keys(CHASSIS_MATERIALS).map(k=>[k,[]]));
 function add(kind,g,p=[0,0,0],scale=[1,1,1],axis=null){g.scale(...scale);if(axis)g.applyQuaternion(new T.Quaternion().setFromUnitVectors(up,new T.Vector3(...axis).normalize()));g.translate(...p);equipmentSurfaceUV(g,kind,groups[kind].length);if(!g.getAttribute('color'))g.setAttribute('color',new T.Float32BufferAttribute(Array(g.attributes.position.count*3).fill(1),3));groups[kind].push(g.index?g.toNonIndexed():g);}
 function ball(kind,p,s){add(kind,new T.SphereGeometry(1,24,16),p,s);}
 function cylinder(kind,p,r,h,axis=[0,0,1],segments=24){add(kind,new T.CylinderGeometry(r,r,h,segments),p,[1,1,1],axis);}
 function ring(kind,p,r,t,axis=[0,0,1]){const g=new T.TorusGeometry(r,t,8,32);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(front,new T.Vector3(...axis).normalize()));add(kind,g,p);}
 function rod(kind,a,b,r){const va=new T.Vector3(...a),vb=new T.Vector3(...b),d=vb.clone().sub(va);cylinder(kind,va.add(vb).multiplyScalar(.5).toArray(),r,d.length(),d.toArray(),10);}
 // Watertight load-bearing underbody follows the panel silhouette exactly.
 const inner=new T.SphereGeometry(1,40,28),pos=inner.attributes.position;
 for(let i=0;i<pos.count;i++){const lat=Math.asin(Math.max(-1,Math.min(1,pos.getY(i)))),lon=Math.atan2(pos.getX(i),pos.getZ(i)),p=chassisPoint(key,lat,lon,-.018);pos.setXYZ(i,...p);}
 inner.computeVertexNormals();add('steel',inner);const steelHull=groups.steel.pop();
 // Irregular clipped-corner ceramic plates, closed with bevel and inner rim.
 const corners=[[-.88,-1],[.86,-1],[1,-.82],[1,.85],[.86,1],[-.87,1],[-1,.83],[-1,-.84]];
 let panelCount=0;
 for(let row=0;row<8;row++){
  const low=-Math.PI/2+row*Math.PI/8,high=low+Math.PI/8,lat=(low+high)/2,n=row===0||row===7?6:12;
  for(let col=0;col<n;col++){
   const lon=(col+(row%2)*.5)/n*Math.PI*2,at=chassisPoint(key,lat,lon);
   if(key==='demolition'&&row===7)continue;
   if(key==='assembler'&&row===7)continue;
   const verts=[],uv=[],ids=[],colors=[],span=Math.PI/n*.978,half=(high-low)*.5*.978;
   for(const [factor,depth] of [[1,-.006],[1,.012],[.965,.022]])for(const [x,y]of corners){const p=chassisPoint(key,lat+y*half*factor,lon+x*span*factor,depth);verts.push(...p);uv.push((x*factor+1)/2,(y*factor+1)/2);}
   const center=chassisPoint(key,lat,lon,.026);verts.push(...center);uv.push(.5,.5);
   for(let i=0;i<8;i++){const j=(i+1)%8;for(let r=0;r<2;r++){const a=r*8+i,b=r*8+j,c=(r+1)*8+j,d=(r+1)*8+i;ids.push(a,b,d,b,c,d);}ids.push(16+i,16+j,24);}
   // Recessed bevels and uneven edge wear stay legible at the gameplay camera scale.
   const shade=1;
   for(let k=0;k<25;k++){const edge=k<16?.36+(k%3)*.07:shade;colors.push(edge,edge,edge);}
   const g=new T.BufferGeometry();g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ids);g.computeVertexNormals();const exposed=(key==='hecaton'&&Math.abs(Math.sin(lon))>.90)||(profile.nursery&&row%3===1&&Math.abs(Math.sin(lon))>.5);add(exposed?'brass':'ceramic',g);panelCount++;
   if(!exposed&&row>0&&row<7&&(row*3+col)%4===0){
    const crack=[[-.85,-.43],[-.44,-.32],[-.29,-.06],[.04,.02],[.23,.30]];
    for(let k=1;k<crack.length;k++){
     const a=crack[k-1],b=crack[k];
     rod('steel',chassisPoint(key,lat+a[1]*half,lon+a[0]*span,.028),chassisPoint(key,lat+b[1]*half,lon+b[0]*span,.028),.0018);
    }
   }
   if(row>0&&row<7&&col%3===0){const p=chassisPoint(key,lat+half*.88,lon+span*.5,.023);add('steel',new T.IcosahedronGeometry(1,0),p,[.018,.006,.009]);}
   if(row>0&&row<7&&col%2===0){const p=chassisPoint(key,lat-half*.65,lon-span*.5,.032),axis=[p[0]/profile.width**2,p[1]/profile.height**2,p[2]/profile.depth**2];cylinder('brass',p,.011,.009,axis,6);}
  }
 }

 function box(kind,p,s,rot=[0,0,0]){const g=new RoundedBoxGeometry(...s,2,.012);g.applyMatrix4(new T.Matrix4().makeRotationFromEuler(new T.Euler(...rot)));add(kind,g,p);}
 function port(p,r,axis=[0,1,0]){cylinder('steel',p,r,.033,axis);ring('brass',V(p).addScaledVector(V(axis),.02).toArray(),r*.88,.012,axis);cylinder('glass',V(p).addScaledVector(V(axis),.022).toArray(),r*.67,.01,axis);for(let i=0;i<8;i++){const a=i*Math.PI/4,v=V([Math.cos(a)*r*.89,0,Math.sin(a)*r*.89]).applyQuaternion(new T.Quaternion().setFromUnitVectors(up,V(axis))).add(V(p)).addScaledVector(V(axis),.034);cylinder('brass',v.toArray(),.009,.012,axis,6);}}
 // Shared canonical low front optic; machinery belongs inside the curved panel envelope.
 const eyeY=-profile.height*.32,eyeZ=chassisPoint(key,Math.asin(eyeY/profile.height),0)[2],eye=[0,eyeY,eyeZ+.015];
 const er=key==='regulator'?.10:.125;
 cylinder('steel',eye,er*1.1,.05);ring('brass',[0,eyeY,eyeZ+.047],er,.013);ball('glass',[0,eyeY,eyeZ+.044],[er*.84,er*.84,.02]);ring('steel',[0,eyeY,eyeZ+.06],er*.54,.01);ball('light',[0,eyeY,eyeZ+.063],[er*.29,er*.29,.012]);
 if(key==='demolition'){
  port([0,.337,0],.21);ring('steel',[0,.35,0],.147,.014,[0,1,0]);cylinder('light',[0,.375,0],.047,.012,[0,1,0]);
  for(const side of [-1,1])for(let i=0;i<3;i++){const lat=.68+i*.11,lon=side*.78,p=chassisPoint(key,lat,lon,.026);box('steel',p,[.115,.019,.030],[0,side*.28,0]);}
 }else if(key==='regulator'){
  // Slim inset coolant channel on the front, framed by the surrounding curved plates.
  box('steel',[0,.26,.428],[.17,.46,.038]);box('brass',[0,.26,.45],[.12,.37,.013]);box('glass',[0,.26,.461],[.079,.33,.010]);
  for(const side of [-1,1])rod('brass',[side*.052,.11,.464],[side*.052,.41,.464],.006);
  for(let i=0;i<3;i++){const z=.14-i*.14,y=.867-Math.abs(z)*.18;box('steel',[0,y,z],[.39,.025,.065]);for(const side of [-1,1])box('brass',[side*.145,y-.013,z],[.024,.055,.070]);}
 }else if(key==='sentinel'){
  for(const lon of [0,Math.PI*2/3,Math.PI*4/3]){const p=chassisPoint(key,.98,lon,.014),normal=V([p[0]/profile.width**2,p[1]/profile.height**2,p[2]/profile.depth**2]).normalize().toArray();port(p,.088,normal);}
  const p=chassisPoint(key,Math.PI/2,0,.018);cylinder('steel',p,.105,.024,[0,1,0]);cylinder('ceramic',[p[0],p[1]+.016,p[2]],.085,.015,[0,1,0]);box('steel',[0,p[1]+.026,0],[.014,.008,.065]);
 }else{
  // Compact recessed work bed, surrounded by canonical curved ceramic, plus five small cartridges.
  box('steel',[0,.407,0],[.285,.02,.275]);
  for(const side of [-1,1])box('brass',[side*.135,.422,0],[.017,.018,.25]);
  for(let i=0;i<3;i++)box('steel',[0,.431,-.07+i*.07],[.20,.018,.014]);
  for(let i=-2;i<=2;i++){const x=i*.080,z=-.255,y=chassisPoint(key,1.05,Math.PI)[1];box('steel',[x,y+.019,z],[.069,.092,.12],[.17,0,0]);box('ceramic',[x,y+.058,z],[.051,.018,.10],[.17,0,0]);}
 }
 const root=new T.Group();root.name=`body-${key}-astra2-v3`;root.userData={chassisKey:key,closedChassis:true,proposal:true,ceramicPanelCount:panelCount};
 const hullMat=CHASSIS_MATERIALS.steel.clone();hullMat.map=null;hullMat.vertexColors=true;const hullMesh=new T.Mesh(steelHull,hullMat);hullMesh.name=key+'-steel';root.add(hullMesh);
 for(const [kind,arr]of Object.entries(groups)){if(!arr.length)continue;const g=mergeGeometries(arr),m=CHASSIS_MATERIALS[kind].clone();m.map=null;m.envMap=null;m.vertexColors=true;const mesh=new T.Mesh(g,m);mesh.name=key+'-'+(kind==='steel'?'metal':kind);root.add(mesh);}
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
 if(process.argv.includes('--demolition-only')&&key!=='demolition')continue;
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
await writeFile(new URL('metrics.json',OUT),JSON.stringify(stats,null,2));await writeFile(new URL('mount-checks.json',OUT),JSON.stringify(checks,null,2));await writeFile(new URL('proposed-profiles.json',OUT),JSON.stringify(Object.fromEntries(Object.keys(config).map(k=>[k,{...RUNTIME_PROFILES[k],modelId:`body-${k}-astra2-v3`,status:'awaiting approval'}])),null,2));console.log(JSON.stringify(stats,null,2));

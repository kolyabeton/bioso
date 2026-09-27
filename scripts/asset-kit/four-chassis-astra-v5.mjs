// Standalone proposals. Never writes public assets, manifests or game sources.
import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
import {writeFile,mkdir} from 'node:fs/promises';
import {equipmentSurfaceUV} from '../../src/equipment-surface.js';
import {CHASSIS_MATERIALS} from '../../src/creature-materials.js';
import {CHASSIS_PROFILES} from '../../src/chassis-profiles.js';
import {equipmentLayout} from '../../src/equipment-mounts.js';
import {fittedModel,legMountOptions} from '../../src/asset-models.js';
import {mountOrgan} from '../../src/organ-mounts.js';
import {createCreatureFrame,createLimbBearing} from '../../src/creature-frame.js';
const OUT=new URL('../../docs/art/four-chassis-20260918/astra-models-v5/',import.meta.url),KIT=new URL('../../public/assets/kit/',import.meta.url);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
globalThis.FileReader=class{readAsArrayBuffer(b){b.arrayBuffer().then(r=>{this.result=r;this.onloadend?.();});}readAsDataURL(b){b.arrayBuffer().then(r=>{this.result=`data:${b.type};base64,${Buffer.from(r).toString('base64')}`;this.onloadend?.();});}};
await mkdir(OUT,{recursive:true});
const source=await io.read(new URL('leg-worker.glb',KIT).pathname),sourceMaterial=source.getRoot().listMaterials()[0],materialSources=new Map();
for(const [kind,m]of Object.entries(CHASSIS_MATERIALS))if(['ceramic','steel','brass'].includes(kind))materialSources.set(m.name,sourceMaterial);
const V=a=>new T.Vector3(...a),up=V([0,1,0]);
function build(key){
 const root=new T.Group();root.name=`body-${key}-astra5-v3`;root.userData={closedChassis:true,chassisKey:key,proposal:true};
 const groups={ceramic:[],steel:[],brass:[],glass:[],light:[]};let panels=0;
 function add(k,g,p=[0,0,0]){g.translate(...p);if(!g.userData?.mapped)equipmentSurfaceUV(g,k,groups[k].length);if(!g.getAttribute('color'))g.setAttribute('color',new T.Float32BufferAttribute(Array(g.attributes.position.count*3).fill(1),3));groups[k].push(g.index?g.toNonIndexed():g);}
 function cyl(k,p,r,h,axis=[0,1,0],n=24){const g=new T.CylinderGeometry(r,r,h,n);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(up,V(axis).normalize()));add(k,g,p);}
 function ring(k,p,r,t,axis=[0,1,0]){const g=new T.TorusGeometry(r,t,8,28);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(V([0,0,1]),V(axis).normalize()));add(k,g,p);}
 function box(k,p,s,rot=[0,0,0]){const g=new RoundedBoxGeometry(...s,1,.014);g.applyMatrix4(new T.Matrix4().makeRotationFromEuler(new T.Euler(...rot)));add(k,g,p);}
 function ellip(c,s){return (lat,lon)=>[c[0]+s[0]*Math.cos(lat)*Math.sin(lon),c[1]+s[1]*Math.sin(lat),c[2]+s[2]*Math.cos(lat)*Math.cos(lon)];}
 const dome=(lat,lon)=>{const co=Math.cos(lat),x=.79*co*Math.sin(lon),z=.68*co*Math.cos(lon);let y=lat<=0?.24*Math.sin(lat):.30*Math.sin(lat)-.43*Math.exp(-((x/.32)**6+(z/.30)**6));return[x,y,z];};
 const pent=(lat,lon)=>{const a=((lon+Math.PI/5)%(2*Math.PI/5)+2*Math.PI/5)%(2*Math.PI/5)-Math.PI/5,r=.79*(.92*Math.cos(Math.PI/5)/Math.cos(a)+.08)*Math.max(0,Math.cos(lat))**.35;return[Math.sin(lon)*r,.37*Math.sin(lat),Math.cos(lon)*r*.90];};
 const station=(lat,lon)=>{const c=Math.cos(lat),ss=Math.sin(lon),cc=Math.cos(lon),x=.74*Math.sign(ss)*Math.abs(ss)**.50*c**.55,z=.59*Math.sign(cc)*Math.abs(cc)**.50*c**.55;return[x,.25*Math.sin(lat)-(lat>0?.055*Math.exp(-((x/.28)**4+(z/.35)**4)):0),z];};
 const hullSurface=key==='demolition'?dome:key==='regulator'?ellip([0,0,0],[.49,.77,.32]):key==='sentinel'?pent:station;
 function surfaceGeom(fn,width=40,height=24){const g=new T.SphereGeometry(1,width,height),p=g.attributes.position;for(let i=0;i<p.count;i++){const lat=Math.asin(Math.max(-1,Math.min(1,p.getY(i)))),lon=Math.atan2(p.getX(i),p.getZ(i));p.setXYZ(i,...fn(lat,lon));}g.computeVertexNormals();return g;}
 function cap(p,s){add('ceramic',surfaceGeom(ellip([0,0,0],s),20,12),p);}
 const hull=surfaceGeom(hullSurface);equipmentSurfaceUV(hull,'steel');const hmat=CHASSIS_MATERIALS.steel.clone();hmat.map=null;const hm=new T.Mesh(hull,hmat);hm.name=key+'-steel';root.add(hm);
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
 function dock(p,r,axis){const n=V(axis).normalize();cyl('steel',p,r,.07,axis);ring('brass',V(p).addScaledVector(n,.034).toArray(),r*.87,.014,axis);cyl('steel',V(p).addScaledVector(n,.028).toArray(),r*.66,.016,axis);ring('steel',V(p).addScaledVector(n,.041).toArray(),r*.57,.010,axis);for(let i=0;i<8;i++){const v=V([Math.cos(i*Math.PI/4)*r*.82,0,Math.sin(i*Math.PI/4)*r*.82]).applyQuaternion(new T.Quaternion().setFromUnitVectors(up,n)).add(V(p)).addScaledVector(n,.045);cyl('brass',v.toArray(),.010,.011,axis,6);}}
 if(key==='demolition'){
  // Four sculpted, broad shoulders. Parameterized crown panels have curved,
  // non-radial seam cuts and an actual vertical inner wall around the machine well.
  function mapped(g,k,repeat=1){const uv=g.attributes.uv,rect=k==='ceramic'?[264,348,24,24]:[32,244,20,20];for(let i=0;i<uv.count;i++){const mirror=x=>1-Math.abs(((x%2)+2)%2-1);uv.setXY(i,(rect[0]+mirror(uv.getX(i)*repeat)*rect[2])/512,(rect[1]+mirror(uv.getY(i)*repeat)*rect[3])/512);}g.userData={mapped:true};return g;}
  function crown(j,u0,u1){
   const n=24,m=18,pos=[],uv=[],colors=[],idx=[];
   for(let v=0;v<=m;v++)for(let u=0;u<=n;u++){
    const f=u/n,q=v/m,t=u0+(u1-u0)*f;
    const angle=j*Math.PI/2+.012+t*(Math.PI/2-.024)+.018*Math.sin(q*Math.PI);
    const radius=.325+q*.445,round=Math.sin(t*Math.PI)**.7;
    const y=.242+.045*Math.sin(q*Math.PI)-.203*q**3+.009*round;
    const edge=Math.min(f,1-f,q,1-q),bevel=.012*Math.max(0,1-edge/.05);
    pos.push(Math.sin(angle)*radius*(1+.025*round),y-bevel,Math.cos(angle)*radius*.89);
    uv.push(f,q);const shade=edge<.015?.72:1;colors.push(shade,shade,shade);
   }
   for(let v=0;v<m;v++)for(let u=0;u<n;u++){const x=v*(n+1)+u;idx.push(x,x+n+1,x+1,x+1,x+n+1,x+n+2);}
   // Thick closed skirt with beveled edges rather than a zero-thickness sheet.
   const boundary=[];for(let u=0;u<=n;u++)boundary.push(u);for(let v=1;v<=m;v++)boundary.push(v*(n+1)+n);for(let u=n-1;u>=0;u--)boundary.push(m*(n+1)+u);for(let v=m-1;v>0;v--)boundary.push(v*(n+1));
   const start=pos.length/3;for(const i of boundary){pos.push(pos[i*3],pos[i*3+1]-.035,pos[i*3+2]);uv.push(uv[i*2],uv[i*2+1]);colors.push(.48,.48,.48);}
   for(let i=0;i<boundary.length;i++){const k=(i+1)%boundary.length;idx.push(boundary[i],start+i,boundary[k],boundary[k],start+i,start+k);}
   const bottom=pos.length/3;const mid=boundary.reduce((a,i)=>a.map((v,k)=>v+pos[i*3+k]/boundary.length),[0,0,0]);pos.push(mid[0],mid[1]-.08,mid[2]);uv.push(.5,.5);colors.push(.4,.4,.4);for(let i=0;i<boundary.length;i++)idx.push(start+i,bottom,start+(i+1)%boundary.length);
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(idx);g.computeVertexNormals();mapped(g,'ceramic',1);add('ceramic',g);panels++;
  }
  for(let j=0;j<4;j++){crown(j,0,.67);crown(j,.679,1);}
  // Small mechanical fastener wells belong to the panels instead of decorative rings.
  for(let j=0;j<4;j++)for(const t of [.13,.85]){const q=.74,a=j*Math.PI/2+.012+t*(Math.PI/2-.024)+.018*Math.sin(q*Math.PI),r=.325+q*.445,round=Math.sin(t*Math.PI)**.7,y=.242+.045*Math.sin(q*Math.PI)-.203*q**3+.009*round,p=[Math.sin(a)*r*(1+.025*round),y+.003,Math.cos(a)*r*.89],axis=[Math.sin(a)*.45,1,Math.cos(a)*.45];cyl('steel',p,.014,.008,axis,12);cyl('brass',V(p).addScaledVector(V(axis).normalize(),.004).toArray(),.007,.009,axis,6);}
  // Lathed closed sockets and chamber walls have depth, with the core below the roof.
  function lathe(k,profile,p=[0,0,0],axis=[0,1,0],segments=48){const g=new T.LatheGeometry(profile.map(a=>new T.Vector2(...a)),segments);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(up,V(axis).normalize()));add(k,g,p);}
  lathe('steel',[[0,-.155],[.335,-.155],[.335,.238],[.309,.248],[.288,.202],[.268,-.04],[0,-.04]]);
  ring('brass',[0,.22,0],.302,.009);ring('steel',[0,-.025,0],.247,.018);
  // Individually machined retaining blocks sit down in the chamber.
  for(let j=0;j<12;j++){const a=j*Math.PI/6;box('steel',[Math.sin(a)*.285,.125,Math.cos(a)*.285],[.093,.106,.061],[.20*Math.cos(a),a,-.20*Math.sin(a)]);box('brass',[Math.sin(a)*.285,.18,Math.cos(a)*.285],[.073,.012,.047],[0,a,0]);cyl('steel',[Math.sin(a)*.284,.192,Math.cos(a)*.284],.009,.008,[0,1,0],8);}
  lathe('steel',[[0,-.038],[.171,-.038],[.171,.02],[.144,.059],[.085,.059],[.075,.02],[0,.02]]);
  ring('brass',[0,.055,0],.139,.008);ring('steel',[0,.059,0],.090,.012);cyl('glass',[0,.029,0],.071,.012);cyl('light',[0,.036,0],.048,.008);
  for(let j=0;j<8;j++){const a=j*Math.PI/4;box('brass',[Math.sin(a)*.16,.012,Math.cos(a)*.16],[.023,.033,.016],[0,a,0]);}
  // Low bulbous outboard ceramic socket housings, recess carved by revolved section.
  for(const side of [-1,1]){
   const p=[side*.647,.005,side*.19],axis=[side*.16,1,0];
   lathe('ceramic',[[.095,-.10],[.165,-.10],[.177,-.04],[.160,.072],[.125,.115],[.105,.108],[.095,.064],[.095,-.10]],p,axis,32);
   const shift=d=>V(p).addScaledVector(V(axis).normalize(),d).toArray();
   lathe('steel',[[.082,-.1],[.109,-.1],[.12,.113],[.106,.126],[.082,.103],[.082,-.1]],p,axis,32);ring('brass',shift(.118),.105,.006,axis);cyl('steel',shift(-.073),.084,.014,axis);
   for(let j=0;j<4;j++){const a=j*Math.PI/2;const q=V([Math.sin(a)*.121,.112,Math.cos(a)*.121]).applyQuaternion(new T.Quaternion().setFromUnitVectors(up,V(axis).normalize())).add(V(p));cyl('steel',q.toArray(),.012,.014,axis,8);}
  }
  // Continuous lower belt with buttressed plates, dark vents and restrained fasteners.
  lathe('steel',[[0,-.225],[.60,-.225],[.665,-.155],[.692,-.033],[.67,.016],[.65,-.06],[0,-.17]], [0,0,0]);
  for(let j=0;j<24;j++){const a=j*Math.PI/12;box('steel',[Math.sin(a)*.726,-.115,Math.cos(a)*.65],[.103,.147,.035],[0,a,0]);box('steel',[Math.sin(a)*.748,-.12,Math.cos(a)*.673],[.021,.095,.026],[0,a,0]);if(j%2===0)cyl('brass',[Math.sin(a)*.751,-.061,Math.cos(a)*.677],.009,.015,[Math.sin(a),0,Math.cos(a)],8);}
  // Two front vent housings with genuine depth and separate inset louvers.
  for(const side of [-1,1]){box('steel',[side*.11,.042,.639],[.205,.205,.137]);box('brass',[side*.11,.024,.715],[.153,.112,.017]);box('steel',[side*.11,.024,.731],[.128,.085,.015]);for(let j=0;j<4;j++)box('steel',[side*.11,-.009+j*.023,.745],[.117,.009,.016]);}
  // Two lower lateral recessed machine sockets integrated into the structural belt.
  for(const side of [-1,1]){const p=[side*.46,-.105,.485],axis=[side*.62,.03,.78];lathe('steel',[[.067,-.073],[.14,-.073],[.148,-.008],[.126,.037],[.095,.046],[.076,.025],[.067,-.073]],p,axis,28);ring('brass',V(p).addScaledVector(V(axis).normalize(),.032).toArray(),.112,.009,axis);cyl('steel',V(p).addScaledVector(V(axis).normalize(),-.06).toArray(),.07,.01,axis);for(let j=0;j<6;j++){const a=j*Math.PI/3,q=V([Math.sin(a)*.116,.04,Math.cos(a)*.116]).applyQuaternion(new T.Quaternion().setFromUnitVectors(up,V(axis).normalize())).add(V(p));cyl('steel',q.toArray(),.012,.013,axis,8);}}
  // Rear service exhausts and short hinge cylinders break the uniform saucer profile.
  for(const side of [-1,1]){box('steel',[side*.40,.215,-.49],[.14,.103,.12],[-.28,0,0]);for(let j=0;j<4;j++)box('brass',[side*.40-.045+j*.030,.267,-.482],[.009,.009,.076],[-.28,0,0]);cyl('steel',[side*.22,.209,.469],.025,.13,[1,0,0],16);}
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
  const roof=(v,a)=>{const rim=pent(1.02,a),rr=Math.hypot(rim[0],rim[2]/.90),r=rr*(1-v)+.18*v;return[Math.sin(a)*r,.37-.055*(1-v)**2,Math.cos(a)*r*.90];};
  for(let j=0;j<5;j++){const a=j*2*Math.PI/5;plate(pent,.22,1.05,a-Math.PI/5+.022,a+Math.PI/5-.022);plate(roof,0,1,a-Math.PI/5+.018,a+Math.PI/5-.018);plate(pent,-.77,.18,a-Math.PI/5+.025,a+Math.PI/5-.025);}
  cyl('steel',[0,.367,0],.22,.025);cyl('ceramic',[0,.389,0],.195,.016);ring('brass',[0,.40,0],.193,.009);box('steel',[0,.405,0],[.023,.01,.09]);
  for(const a of [0,Math.PI*2/3,Math.PI*4/3]){const p=pent(.78,a);dock([p[0],p[1]+.027,p[2]],.093,[0,1,0]);}
  for(let j=0;j<5;j++){const a=j*2*Math.PI/5+Math.PI/5,p=pent(-.39,a);dock(p,.133,[Math.sin(a),-.18,Math.cos(a)]);}
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
 for(const [kind,arr]of Object.entries(groups)){if(!arr.length)continue;const m=CHASSIS_MATERIALS[kind].clone();m.map=null;m.envMap=null;m.vertexColors=true;const mesh=new T.Mesh(mergeVertices(mergeGeometries(arr),1e-6),m);mesh.name=key+'-detail-'+(kind==='steel'?'metal':kind);root.add(mesh);}
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
const config={demolition:[3,4,3,['drill','needle','hammer']]};
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
await writeFile(new URL('metrics.json',OUT),JSON.stringify(stats,null,2));await writeFile(new URL('mount-checks.json',OUT),JSON.stringify(checks,null,2));await writeFile(new URL('proposed-profiles.json',OUT),JSON.stringify(Object.fromEntries(Object.keys(config).map(k=>[k,{...CHASSIS_PROFILES[k],modelId:`body-${k}-astra5-v3`,status:'awaiting approval'}])),null,2));console.log(JSON.stringify(stats,null,2));

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
const OUT=new URL('../../docs/art/four-chassis-20260918/astra-assembler-polish/',import.meta.url),KIT=new URL('../../public/assets/kit/',import.meta.url);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
globalThis.FileReader=class{readAsArrayBuffer(b){b.arrayBuffer().then(r=>{this.result=r;this.onloadend?.();});}readAsDataURL(b){b.arrayBuffer().then(r=>{this.result=`data:${b.type};base64,${Buffer.from(r).toString('base64')}`;this.onloadend?.();});}};
await mkdir(OUT,{recursive:true});
const source=await io.read(new URL('leg-worker.glb',KIT).pathname),sourceMaterial=source.getRoot().listMaterials()[0],materialSources=new Map();
for(const [kind,m]of Object.entries(CHASSIS_MATERIALS))if(['ceramic','steel','brass'].includes(kind))materialSources.set(m.name,sourceMaterial);
const V=a=>new T.Vector3(...a),up=V([0,1,0]);
function build(key){
 const root=new T.Group();root.name=`body-${key}-astra5-v3`;root.userData={closedChassis:true,chassisKey:key,proposal:true};
 const groups={ceramic:[],steel:[],brass:[],glass:[],light:[]};let panels=0;
 function add(k,g,p=[0,0,0]){g.translate(...p);if(k==='ceramic'){const uv=g.attributes.uv;if(uv)for(let i=0;i<uv.count;i++)uv.setXY(i,(264+24*uv.getX(i))/512,(348+24*uv.getY(i))/512);}else equipmentSurfaceUV(g,k,groups[k].length);if(!g.getAttribute('color'))g.setAttribute('color',new T.Float32BufferAttribute(Array(g.attributes.position.count*3).fill(1),3));groups[k].push(g.index?g.toNonIndexed():g);}
 function cyl(k,p,r,h,axis=[0,1,0],n=24){const g=new T.CylinderGeometry(r,r,h,n);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(up,V(axis).normalize()));add(k,g,p);}
 function ring(k,p,r,t,axis=[0,1,0]){const g=new T.TorusGeometry(r,t,8,28);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(V([0,0,1]),V(axis).normalize()));add(k,g,p);}
 function box(k,p,s,rot=[0,0,0]){const g=new RoundedBoxGeometry(...s,1,.012);g.applyMatrix4(new T.Matrix4().makeRotationFromEuler(new T.Euler(...rot)));add(k,g,p);}
 function ellip(c,s){return (lat,lon)=>[c[0]+s[0]*Math.cos(lat)*Math.sin(lon),c[1]+s[1]*Math.sin(lat),c[2]+s[2]*Math.cos(lat)*Math.cos(lon)];}
 const dome=(lat,lon)=>{const co=Math.cos(lat),x=.80*co*Math.sin(lon),z=.66*co*Math.cos(lon);return[x,.37*Math.sin(lat)-(lat>0?.16*Math.exp(-((x/.27)**2+(z/.27)**2)):0),z];};
 const pent=(lat,lon)=>{const a=((lon+Math.PI/5)%(2*Math.PI/5)+2*Math.PI/5)%(2*Math.PI/5)-Math.PI/5,r=.79*(.92*Math.cos(Math.PI/5)/Math.cos(a)+.08)*Math.max(0,Math.cos(lat))**.35;return[Math.sin(lon)*r,.37*Math.sin(lat),Math.cos(lon)*r*.90];};
 const station=(lat,lon)=>{const c=Math.cos(lat),ss=Math.sin(lon),cc=Math.cos(lon),x=.74*Math.sign(ss)*Math.abs(ss)**.50*c**.55,z=.59*Math.sign(cc)*Math.abs(cc)**.50*c**.55;return[x,lat>0?.015+.04*Math.sin(lat)-.04*Math.exp(-((x/.31)**8+(z/.40)**8)):.22*Math.sin(lat),z];};
 const hullSurface=key==='demolition'?dome:key==='regulator'?ellip([0,0,0],[.49,.77,.32]):key==='sentinel'?pent:station;
 function surfaceGeom(fn,width=40,height=24){const g=new T.SphereGeometry(1,width,height),p=g.attributes.position;for(let i=0;i<p.count;i++){const lat=Math.asin(Math.max(-1,Math.min(1,p.getY(i)))),lon=Math.atan2(p.getX(i),p.getZ(i));p.setXYZ(i,...fn(lat,lon));}g.computeVertexNormals();return g;}
 function cap(p,s){add('ceramic',surfaceGeom(ellip([0,0,0],s),20,12),p);}
 const hull=surfaceGeom(hullSurface);equipmentSurfaceUV(hull,'steel');const hmat=CHASSIS_MATERIALS.steel.clone();hmat.map=null;const hm=new T.Mesh(hull,hmat);hm.name=key+'-steel';hm.scale.set(.95,1,.92);root.add(hm);
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
  const roof=(v,a)=>{const rim=pent(1.02,a),rr=Math.hypot(rim[0],rim[2]/.90),r=rr*(1-v)+.18*v;return[Math.sin(a)*r,.37-.055*(1-v)**2,Math.cos(a)*r*.90];};
  for(let j=0;j<5;j++){const a=j*2*Math.PI/5;plate(pent,.22,1.05,a-Math.PI/5+.022,a+Math.PI/5-.022);plate(roof,0,1,a-Math.PI/5+.018,a+Math.PI/5-.018);plate(pent,-.77,.18,a-Math.PI/5+.025,a+Math.PI/5-.025);}
  cyl('steel',[0,.367,0],.22,.025);cyl('ceramic',[0,.389,0],.195,.016);ring('brass',[0,.40,0],.193,.009);box('steel',[0,.405,0],[.023,.01,.09]);
  for(const a of [0,Math.PI*2/3,Math.PI*4/3]){const p=pent(.78,a);dock([p[0],p[1]+.027,p[2]],.093,[0,1,0]);}
  for(let j=0;j<5;j++){const a=j*2*Math.PI/5+Math.PI/5,p=pent(-.39,a);dock(p,.133,[Math.sin(a),-.18,Math.cos(a)]);}
 }else{
  // Continuous curved armored shoulders, with rectangular bed and front bridge.
  function armor(fn,na=20,nb=14){
   const pos=[],uv=[],color=[],idx=[];
   for(let j=0;j<=nb;j++)for(let i=0;i<=na;i++){const u=i/na,v=j/nb,p=fn(u,v),edge=Math.min(u,1-u,v,1-v);p[1]-=.012*Math.max(0,1-edge/.06);pos.push(...p);uv.push(u,v);const c=edge===0?.72:1;color.push(c,c,c);}
   for(let j=0;j<nb;j++)for(let i=0;i<na;i++){const a=j*(na+1)+i;idx.push(a,a+na+1,a+1,a+1,a+na+1,a+na+2);}
   const boundary=[];for(let i=0;i<=na;i++)boundary.push(i);for(let j=1;j<=nb;j++)boundary.push(j*(na+1)+na);for(let i=na-1;i>=0;i--)boundary.push(nb*(na+1)+i);for(let j=nb-1;j>0;j--)boundary.push(j*(na+1));
   const start=pos.length/3;for(const i of boundary){pos.push(pos[i*3],pos[i*3+1]-.032,pos[i*3+2]);uv.push(uv[i*2],uv[i*2+1]);color.push(.48,.48,.48);}for(let i=0;i<boundary.length;i++){const k=(i+1)%boundary.length;idx.push(boundary[i],start+i,boundary[k],boundary[k],start+i,start+k);}for(let i=1;i<boundary.length-1;i++)idx.push(start,start+i+1,start+i);
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('color',new T.Float32BufferAttribute(color,3));g.setIndex(idx);g.computeVertexNormals();add('ceramic',g);panels++;
  }
  function shoulder(side,s,z){const x=side*(.269+.447*s)*(1-.065*(Math.abs(z)/.55)**4),y=.12+.215*Math.sin(Math.PI*s)**.65-.079*s-.039*(Math.abs(z)/.55)**4;return[x,y,z];}
  for(const side of [-1,1]){
   for(const [a,b]of [[-.505,-.075],[-.066,.30],[.309,.51]])armor((u,v)=>shoulder(side,side>0?u:1-u,a+(b-a)*v));
   // Lower ceramic outer side plates are curved surfaces, not oval cover badges.
   for(const [a,b]of [[-.45,-.02],[-.01,.40]])armor((u,v)=>{const z=a+(b-a)*v,s=side>0?u:1-u;return[side*(.70-.085*s*s),.04-.19*s,z];},12,10);
   for(const z of [-.40,.20,.44]){const p=shoulder(side,.63,z);cyl('steel',[p[0],p[1]+.004,p[2]],.013,.012,[side*.3,1,0],10);cyl('brass',[p[0],p[1]+.011,p[2]],.006,.009,[0,1,0],6);}
   // Long side service strip and recessed vent faces in the aft armor shoulder.
   box('steel',[side*.446,.309,-.354],[.09,.013,.13],[0,0,side*.12]);for(let j=0;j<4;j++)box('brass',[side*.446,.319,-.397+j*.027],[.065,.005,.009]);
  }
  // Rounded closed forward shoulder ends wrap down into the lower hull.
  for(const side of [-1,1])armor((u,v)=>{const q=side>0?u:1-u,p=shoulder(side,q,.51),a=v*Math.PI/2;return[p[0]*(1-.045*Math.sin(a)),p[1]*Math.cos(a)-.161*Math.sin(a),.51+.088*Math.sin(a)];},20,12);
  armor((u,v)=>{const x=-.274+u*.548,z=.32+v*.268;return[x,.195-.145*v*v+.02*(1-(x/.274)**2),z];},22,14);
  armor((u,v)=>{const x=-.274+u*.548,a=v*Math.PI/2;return[x*(1-.04*Math.sin(a)),(.05+.02*(1-(x/.274)**2))*Math.cos(a)-.16*Math.sin(a),.588+.026*Math.sin(a)];},20,10);
  // Front bridge service hatch, seated into its curved skin rather than an oval cap.
  box('steel',[0,.186,.408],[.16,.018,.097],[.28,0,0]);box('brass',[0,.199,.408],[.13,.01,.065],[.28,0,0]);box('steel',[0,.207,.409],[.098,.012,.045],[.28,0,0]);
  // Deep bounded rectangular machine bed: low floor, walls and twin runners.
  box('steel',[0,.004,-.04],[.526,.04,.742]);box('steel',[0,.127,-.401],[.522,.263,.049]);
  for(const side of [-1,1]){box('steel',[side*.251,.093,-.037],[.05,.18,.70]);box('brass',[side*.206,.039,-.035],[.026,.025,.611]);box('steel',[side*.167,.059,-.028],[.045,.04,.58]);
   for(const z of [-.23,.075]){box('steel',[side*.169,.115,z],[.08,.11,.112],[0,0,-side*.23]);cyl('brass',[side*.15,.143,z],.043,.047,[1,0,0],16);cyl('steel',[side*.12,.143,z],.022,.019,[1,0,0],12);box('brass',[side*.19,.07,z+.10],[.045,.031,.053]);}
   box('steel',[side*.212,.074,.267],[.067,.096,.065]);
  }
  for(const z of [-.22,.0,.19])box('steel',[0,.029,z],[.25,.016,.185]);box('brass',[0,.043,.16],[.077,.009,.047]);box('steel',[0,.047,.16],[.059,.006,.028]);
  // Five stepped cassettes; bent ceramic lids, dark inset vent faces and hinge axles.
  for(let j=-2;j<=2;j++){const x=j*.159,y=.264+.025*(2-Math.abs(j));box('steel',[x,y,-.478],[.149,.245,.207],[-.17,0,0]);box('ceramic',[x,y+.117,-.494],[.128,.026,.178],[-.17,0,0]);box('ceramic',[x,y+.03,-.370],[.13,.145,.025],[-.17,0,0]);box('steel',[x,y+.025,-.348],[.085,.104,.018],[-.17,0,0]);for(let k=0;k<4;k++)box('brass',[x,y-.009+k*.021,-.332],[.061,.007,.013]);cyl('steel',[x,y+.088,-.367],.016,.136,[1,0,0],12);for(const side of [-1,1])cyl('brass',[x+side*.051,y+.136,-.456],.006,.008,[0,1,0],6);}
  // True dark-backed outward sockets. The cavity floor lies beyond the armor skin.
  function well(p,axis,r){const n=V(axis).normalize(),g=new T.LatheGeometry([[r*.58,.052],[r,.052],[r*1.04,.085],[r*.91,.142],[r*.69,.155],[r*.58,.131],[r*.58,.052]].map(a=>new T.Vector2(...a)),32);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(up,n));add('steel',g,p);ring('brass',V(p).addScaledVector(n,.146).toArray(),r*.80,.008,axis);cyl('steel',V(p).addScaledVector(n,.106).toArray(),r*.59,.012,axis,24);ring('steel',V(p).addScaledVector(n,.123).toArray(),r*.61,.009,axis);for(let j=0;j<6;j++){const a=j*Math.PI/3,q=V([Math.sin(a)*r*.87,.145,Math.cos(a)*r*.87]).applyQuaternion(new T.Quaternion().setFromUnitVectors(up,n)).add(V(p));cyl('steel',q.toArray(),.013,.013,axis,8);}}
  for(const side of [-1,1])well([side*.68,-.015,.13],[side,0,0],.151);well([0,-.018,.54],[0,-.05,1],.141);
  // Mechanical base with visible corner bearings and exposed lower fastening strip.
  for(const side of [-1,1])for(const z of [-.32,.31]){cyl('steel',[side*.46,-.179,z],.099,.083,[0,1,0],20);ring('brass',[side*.46,-.21,z],.084,.008);}
  for(let j=-3;j<=3;j++){box('steel',[j*.16,-.145,.52],[.116,.063,.063]);cyl('brass',[j*.16,-.137,.557],.008,.01,[0,0,1],6);}

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
const config={assembler:[3,3,5,['arc','arc','pistol']]};
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

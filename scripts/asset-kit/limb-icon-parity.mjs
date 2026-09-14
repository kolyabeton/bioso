// Repair inventory silhouettes by reusing the pistol's authored shoulder/panels,
// the existing equipment generators' fittings, and the canonical leg-worker PBR atlas.
// node scripts/asset-kit/limb-icon-parity.mjs — never overwrites source variants.
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {weld,dedup,prune,simplify} from '@gltf-transform/functions';
import {MeshoptSimplifier} from 'meshoptimizer';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {equipmentSurfaceUV} from '../../src/equipment-surface.js';
import {CHASSIS_MATERIALS} from '../../src/creature-materials.js';
globalThis.ProgressEvent??=class{};
globalThis.FileReader=class{readAsArrayBuffer(b){b.arrayBuffer().then(r=>{this.result=r;this.onloadend?.();});}readAsDataURL(b){b.arrayBuffer().then(r=>{this.result=`data:${b.type};base64,${Buffer.from(r).toString('base64')}`;this.onloadend?.();});}};
const kit=new URL('../../public/assets/kit/',import.meta.url),io=new NodeIO().registerExtensions(ALL_EXTENSIONS),exporter=new GLTFExporter();
const atlas=(await io.read(new URL('leg-worker.glb',kit).pathname)).getRoot().listMaterials()[0];
await MeshoptSimplifier.ready;
const bytes=await readFile(new URL('arm-pistol-v1.glb',kit)),length=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+length));
json.buffers=[{byteLength:bytes.readUInt32LE(20+length),uri:'data:application/octet-stream;base64,'+bytes.subarray(28+length).toString('base64')}];delete json.images;delete json.textures;
for(const m of json.materials){delete m.normalTexture;delete m.occlusionTexture;delete m.emissiveTexture;if(m.pbrMetallicRoughness){delete m.pbrMetallicRoughness.baseColorTexture;delete m.pbrMetallicRoughness.metallicRoughnessTexture;}}
const source=(await new GLTFLoader().parseAsync(JSON.stringify(json),'')).scene;
source.updateMatrixWorld(true);
// Bake one real upper arm, undo its assembly lean, and retain its ceramic plates,
// collar, bolts, hydraulic channels and hinge instead of making another socket.
const upper=source.getObjectByName('Pistol_arm_upper_assembly');
const straight=new T.Matrix4().makeRotationZ(-25*Math.PI/180).multiply(upper.matrixWorld);
const sourceParts=[];
upper.traverse(o=>{if(!o.isMesh)return;const raw=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();
 for(const group of raw.groups.length?raw.groups:[{start:0,count:raw.attributes.position.count,materialIndex:0}]){
  const material=Array.isArray(o.material)?o.material[group.materialIndex]:o.material;
  const kind=/ceramic/i.test(material.name)?'ceramic':/collar/i.test(material.name)?'brass':'steel';
  const g=new T.BufferGeometry();for(const a of ['position','normal','uv']){const v=raw.attributes[a];if(v)g.setAttribute(a,new T.BufferAttribute(v.array.slice(group.start*v.itemSize,(group.start+group.count)*v.itemSize),v.itemSize));}g.applyMatrix4(straight);sourceParts.push({kind,g});
 }});
let groups,features,reused;
const up=new T.Vector3(0,1,0),front=new T.Vector3(0,0,1);
function add(kind,g,p=[0,0,0],scale=[1,1,1],axis=null){g.scale(...scale);if(axis)g.applyQuaternion(new T.Quaternion().setFromUnitVectors(up,new T.Vector3(...axis).normalize()));g.translate(...p);equipmentSurfaceUV(g,kind,groups[kind].length);g=g.index?g.toNonIndexed():g;if(!g.attributes.uv)g.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));for(const a of Object.keys(g.attributes))if(!['position','normal','uv'].includes(a))g.deleteAttribute(a);groups[kind].push(g);}
function ball(kind,p,s){add(kind,new T.SphereGeometry(1,20,12),p,s);}
function cyl(kind,p,r,h,axis=[0,1,0],r2=r,n=24){add(kind,new T.CylinderGeometry(r2,r,h,n),p,[1,1,1],axis);}
function rod(kind,a,b,r,r2=r){const av=new T.Vector3(...a),bv=new T.Vector3(...b),d=bv.clone().sub(av);cyl(kind,av.add(bv).multiplyScalar(.5).toArray(),r,d.length(),d.toArray(),r2,12);}
function ring(kind,p,r,t,axis=[0,1,0]){const g=new T.TorusGeometry(r,t,8,32);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(front,new T.Vector3(...axis).normalize()));add(kind,g,p);}
function box(kind,p,s){add(kind,new RoundedBoxGeometry(...s,2,Math.min(...s)*.13),p);}
function tube(p,r,h){cyl('steel',p,r,h);for(const side of [-1,1])ring('brass',[p[0],p[1]+side*h*.5,p[2]],r,.012);cyl('steel',[p[0],p[1]-h*.5-.008,p[2]],r*.74,.008);}
function bearing(p,r=.12,width=.35){cyl('steel',p,r,width,[1,0,0]);for(const side of [-1,1]){const q=[p[0]+side*(width/2+.005),p[1],p[2]];ring('brass',q,r*.84,.017,[1,0,0]);cyl('brass',q,r*.34,.015,[1,0,0],r*.34,8);}}
function receiver(scale=.55,compact=false){for(const {kind,g} of sourceParts)add(kind,g.clone(),[0,-.03,0],[scale,scale*(compact?.72:1),scale]);reused.push('arm-pistol-v1:Pistol arm upper assembly');}
// Curved ceramic scutes over a sealed dark core, following the pistol shell design.
function shell(a,b,rx,rz){const av=new T.Vector3(...a),bv=new T.Vector3(...b),d=bv.clone().sub(av),mid=av.add(bv).multiplyScalar(.5);
 ball('steel',mid.toArray(),[rx*.92,d.length()*.54,rz*.88]);
 for(const side of [-1,1]){const g=new T.SphereGeometry(1,20,12,side>0?-.15:Math.PI-.15,Math.PI*.86,.32,Math.PI-.64);g.scale(rx,d.length()*.54,rz);const solid=new T.BufferGeometry();const out=g.toNonIndexed();solid.copy(out);add('ceramic',solid,mid.toArray(),[1,1,1],d.toArray());}
 for(const y of [-.30,.26])for(const side of [-1,1])cyl('brass',[mid.x+side*rx*.86,mid.y+d.length()*y,mid.z+rz*.6],.014,.012,[0,0,1],.014,6);
}
function claw(points,width=.10,kind='brass'){for(let i=1;i<points.length;i++){const t=(i-1)/(points.length-1);rod('steel',points[i-1],points[i],width*(1-t)*.65,.008);const a=points[i-1].map((v,k)=>v+(k===2?.014:0)),b=points[i].map((v,k)=>v+(k===2?.014:0));rod(kind,a,b,width*(1-t),i===points.length-1?.002:width*(1-i/(points.length-1)));}}
function toes(y,z,key){
 // Inventory feet have blunt load-bearing phalanges, not the weapon claw helper.
 // Reuse the existing rounded plate, axle, retaining ring and fastener geometry.
 const plated=key==='plated',ceramicToes=plated||key==='spring'||key==='swarmLeg';
 const width=plated?.125:key==='runner'?.082:.104,gap=plated?.084:.071;
 const reach=key==='runner'?.28:key==='spring'?.29:.255;
 function joint(p,r,w){cyl('steel',p,r,w,[1,0,0]);for(const side of [-1,1]){const q=[p[0]+side*(w/2+.003),p[1],p[2]];ring('brass',q,r*.72,.006,[1,0,0]);cyl('brass',q,r*.29,.008,[1,0,0],r*.29,8);}}
 function segment(a,b,w,h,armour){const av=new T.Vector3(...a),bv=new T.Vector3(...b),d=bv.clone().sub(av),p=av.add(bv).multiplyScalar(.5),q=new T.Quaternion().setFromUnitVectors(front,d.clone().normalize());
  const base=new RoundedBoxGeometry(w,h,d.length(),2,.012);base.applyQuaternion(q);add('steel',base,p.toArray());
  const cover=new RoundedBoxGeometry(w*.87,.024,d.length()*.78,2,.007);cover.applyQuaternion(q);add(armour?'ceramic':'brass',cover,[p.x,p.y+h*.46,p.z]);
  for(const s of [-1,1])cyl('brass',[p.x+s*w*.30,p.y+h*.64,p.z],.009,.006,[0,1,0],.009,6);
 }
 // A compact metatarsal bridge sits below the existing ankle axle.
 box('steel',[0,y-.025,z-.035],[gap*2+width,.085,.135]);
 for(const side of [-1,1]){
  const x=side*gap,a=[x,y-.04,z-.075],b=[x+side*.018,y-.112,z-reach*.56],c=[x+side*.028,y-.125,z-reach];
  joint(a,.038,width*.94);segment(a,b,width,.060,ceramicToes);joint(b,.035,width*.98);segment(b,c,width*.91,.055,ceramicToes);
  // Broad flat toe cap; a dark rubber/metal sole, never a pointed hook.
  box('steel',[c[0],y-.128,c[2]-.016],[width*.86,.058,.060]);
  for(const t of [-1,1])box('brass',[c[0],y-.096,c[2]+t*.013],[width*.64,.007,.012]);
 }
 // Short posterior stabiliser, lower and narrower than the main toes.
 const heelA=[0,y-.05,z+.018],heelB=[0,y-.12,z+.115];joint(heelA,.034,.075);segment(heelA,heelB,.073,.055,ceramicToes);
 features.push('two blunt articulated forefoot digits','short posterior support','individual narrow toe axles','flat toe pads');
}
function helix(a,b,r,turns=7,wire=.015){const av=new T.Vector3(...a),bv=new T.Vector3(...b),d=bv.clone().sub(av),q=new T.Quaternion().setFromUnitVectors(up,d.clone().normalize()),pts=[];for(let i=0;i<=turns*18;i++){const t=i/(turns*18);pts.push(new T.Vector3(r*Math.cos(t*turns*Math.PI*2),t*d.length(),r*Math.sin(t*turns*Math.PI*2)).applyQuaternion(q).add(av).toArray());}for(let i=1;i<pts.length;i++)rod('brass',pts[i-1],pts[i],wire);}
function build(key){groups=Object.fromEntries(['ceramic','steel','brass','glass','light'].map(k=>[k,[]]));features=[];reused=[];
 const legs=['runner','universal','plated','spring','swarmLeg'];
 receiver(legs.includes(key)?.53:key==='harpoon'?.48:.56,!legs.includes(key));
 const receiverCounts=Object.fromEntries(Object.entries(groups).map(([k,g])=>[k,g.length]));
 if(legs.includes(key)){
  const knee=[0,-.60,.09],ankle=[0,-1.14,-.12];bearing(knee,.13);shell([0,-.62,.08],[0,-.86,-.02],key==='plated'?.19:.115,.12);
  for(const x of [-.07,.07]){rod('steel',[x,-.68,.08],[x,-1.12,-.12],.033);rod('brass',[x,-.80,.03],[x,-1.09,-.11],.023);}
  bearing(ankle,.075,.22);toes(-1.17,-.12,key);features.push('articulated knee','exposed shin pistons');
  if(key==='spring'){helix([.11,-.64,.1],[.11,-1.06,-.10],.067,7);features.push('shin spring');}
  if(key==='universal'){shell([0,-.72,.01],[0,-1.04,-.10],.12,.105);features.push('ceramic shin guard');}
  if(key==='plated'){for(let i=0;i<3;i++)box('ceramic',[0,-.78-i*.12,-.09],[.35-i*.015,.16,.22]);features.push('overlapping shin armour');}
  if(key==='swarmLeg'){shell([0,-.65,-.01],[0,-1.02,-.10],.14,.14);for(let i=0;i<3;i++){ring('brass',[0,-.74-i*.09,-.215],.041,.01,[0,0,1]);ball('glass',[0,-.74-i*.09,-.215],[.032,.032,.014]);}features.push('three recessed brood cells');}
  if(key==='runner')features.push('slender digitigrade shin');
 }else if(['claws','fangs','arc'].includes(key)){
  bearing([0,-.62,0],.12);shell([0,-.51,0],[0,-.70,0],.18,.15);
  for(const side of [-1,1]){const x=side*.17;rod('steel',[x,-.61,0],[side*.26,-.91,0],.037);claw([[x,-.70,0],[side*.30,-.94,0],[side*.25,-1.12,0],[side*.09,-1.29,0]],key==='fangs'?.105:.085,key==='fangs'?'ceramic':'brass');ring('brass',[x,-.70,.057],.055,.014,[0,0,1]);}
  features.push('paired curved working jaws','jaw actuators');
  if(key==='arc'){for(let i=0;i<5;i++)ring('brass',[0,-.83-i*.07,0],.076,.012);rod('glass',[0,-.79,0],[0,-1.15,0],.049);ball('light',[0,-1.15,0],[.043,.028,.043]);features.push('central mint induction coil');}
  if(key==='fangs'){for(const side of [-1,1])rod('steel',[side*.12,-.38,-.11],[side*.17,-.88,-.10],.023);features.push('feeding tubes');}
 }else if(key==='hammer'){
  rod('steel',[0,-.49,0],[0,-.86,0],.073);bearing([0,-.68,0],.10);box('steel',[0,-.98,0],[.62,.35,.43]);
  box('ceramic',[0,-.98,0],[.70,.38,.47]);for(const x of [-.24,.24])rod('steel',[x,-.81,.24],[x,-1.15,.24],.013);for(const x of [-.28,.28])cyl('brass',[x,-.91,.24],.018,.009,[0,0,1],.018,6);features.push('heavy rectangular ceramic striking head');
 }else if(key==='drill'){
  ring('brass',[0,-.58,0],.18,.035);cyl('steel',[0,-.91,0],.025,.68,[0,1,0],.23);
  // Tapering helical cutting flight, not a bent anatomical forearm.
  const pts=[];for(let i=0;i<=180;i++){const t=i/180,r=.228*(1-t)+.009;pts.push([r*Math.cos(t*Math.PI*10),-.59-t*.70,r*Math.sin(t*Math.PI*10)]);}for(let i=1;i<pts.length;i++)rod('brass',pts[i-1],pts[i],.026*(1-i/210));features.push('conical helical drill bit');
 }else if(key==='seed'||key==='rocket'){
  const count=key==='seed'?6:4,r=key==='seed'?.13:.145,start=key==='seed'?-.65:-.62,end=key==='seed'?-1.25:-1.09;
  for(let i=0;i<count;i++){const a=i*Math.PI*2/count,x=Math.cos(a)*r,z=Math.sin(a)*r;tube([x,(start+end)/2,z],key==='seed'?.047:.091,start-end);}
  if(key==='seed'){for(const y of [-.69,-1.04])ring('brass',[0,y,0],.20,.025);features.push('six exposed gatling barrels');}
  else{shell([0,-.40,0],[0,-.82,0],.245,.245);features.push('four large launch tubes');}
 }else if(key==='needle'||key==='harpoon'){
  const end=key==='harpoon'?-1.41:-1.44;rod('steel',[0,-.51,0],[0,end+.23,0],.055);for(const x of [-.082,.082])rod('brass',[x,-.55,0],[x,end+.33,0],.014);
  for(const y of [-.62,-.89,-1.15])ring('brass',[0,y,0],.074,.019);rod('brass',[0,end+.27,0],[0,end,0],key==='harpoon'?.062:.025,.001);features.push('long exposed linear shaft');
  if(key==='harpoon'){for(const side of [-1,1])claw([[0,-1.25,0],[side*.17,-1.07,0],[side*.18,-.96,0]],.04);features.push('backward harpoon barbs');}
  else features.push('single fine dart');
 }else if(key==='acid'){
  // Inventory gland is a metal-bound translucent vessel, without a white forearm.
  ball('glass',[0,-.86,0],[.22,.38,.22]);for(const y of [-.58,-1.06,-1.15])ring('brass',[0,y,0],y===-1.15?.12:.21,.027);
  for(let i=0;i<6;i++){const a=i*Math.PI/3;rod('steel',[Math.cos(a)*.2,-.61,Math.sin(a)*.2],[Math.cos(a)*.2,-1.07,Math.sin(a)*.2],.021);}tube([0,-1.24,0],.072,.19);features.push('olive translucent reservoir','six retaining ribs','outlet nozzle');
 }else if(key==='whip'){
  const pts=[];for(let i=0;i<=38;i++){const t=i/38,a=-.7+t*5.2;pts.push([.42*(Math.sin(a)-Math.sin(-.7)), -.52-.90*t+.48*t*t, .12*Math.sin(t*Math.PI)]);}
  for(let i=1;i<pts.length;i++){rod('steel',pts[i-1],pts[i],.067*(1-i/47));if(i<34){const g=new T.SphereGeometry(1,12,8);add(i%3===0?'ceramic':'brass',g,pts[i],[.061*(1-i/46),.037,.061*(1-i/46)]);}}
  features.push('curled articulated vertebral cable');
 }else if(key==='drone'){
  bearing([0,-.59,0],.105);shell([0,-.58,0],[0,-1.16,0],.21,.17);for(let i=0;i<7;i++)box('steel',[0,-.68-i*.055,-.16],[.19,.026,.04]);for(const side of [-1,1])rod('brass',[side*.16,-.59,-.11],[side*.16,-1.14,-.11],.025);ring('brass',[0,-.73,-.19],.06,.012,[0,0,1]);ball('glass',[0,-.73,-.20],[.045,.045,.018]);features.push('oval open service housing','vented central channel','mint cell');
 }
 if(!legs.includes(key))for(const [kind,list]of Object.entries(groups))for(const g of list.slice(receiverCounts[kind]))g.translate(0,.16,0);
 const root=new T.Group();root.name=`${legs.includes(key)?'leg':'arm'}-${key}-icon-${legs.includes(key)?'v2':'v1'}`;root.userData={equipmentKey:key,reference:'canonical partArt',geometryReuse:reused,features,materialSource:'leg-worker.glb',uvWindows:'src/equipment-surface.js'};
 for(const [kind,list]of Object.entries(groups)){if(!list.length)continue;const g=mergeGeometries(list);g.computeBoundingBox();const m=CHASSIS_MATERIALS[kind].clone();m.map=null;m.envMap=null;const mesh=new T.Mesh(g,m);mesh.name=root.name+'-'+kind;root.add(mesh);}return root;
}
const entries=[],report=[];
const keys=process.argv.includes('--legs-only')?['runner','universal','plated','spring','swarmLeg']:['claws','fangs','hammer','drill','seed','rocket','needle','harpoon','acid','arc','whip','drone','runner','universal','plated','spring','swarmLeg'];
for(const key of keys){
 const root=build(key),doc=await io.readBinary(new Uint8Array(await exporter.parseAsync(root,{binary:true})));
 for(const m of doc.getRoot().listMaterials()){
  if(!['ceramic','steel','brass'].some(k=>CHASSIS_MATERIALS[k].name===m.getName()))continue;
  m.setBaseColorFactor(atlas.getBaseColorFactor()).setMetallicFactor(atlas.getMetallicFactor()).setRoughnessFactor(atlas.getRoughnessFactor()).setDoubleSided(true).setNormalScale(atlas.getNormalScale()).setOcclusionStrength(atlas.getOcclusionStrength());
  for(const property of ['BaseColor','MetallicRoughness','Normal','Occlusion','Emissive']){const texture=atlas['get'+property+'Texture']();if(!texture)continue;let target=doc.getRoot().listTextures().find(t=>t.getName()===texture.getName());if(!target)target=doc.createTexture(texture.getName()).setImage(texture.getImage()).setMimeType(texture.getMimeType());m['set'+property+'Texture'](target);}
 }
 await doc.transform(weld(),simplify({simplifier:MeshoptSimplifier,ratio:.28,error:.008}),dedup(),prune());
 const result=await io.writeBinary(doc),id=root.name;await writeFile(new URL(id+'.glb',kit),result);entries.push({id,file:id+'.glb',bytes:result.length,source:'scripts/asset-kit/limb-icon-parity.mjs'});report.push({id,...root.userData,bytes:result.length,primitives:doc.getRoot().listMeshes().reduce((n,m)=>n+m.listPrimitives().length,0)});console.log(id,result.length);
}
const manifest=JSON.parse(await readFile(new URL('manifest.json',kit),'utf8')),ids=new Set(entries.map(e=>e.id));await writeFile(new URL('manifest.json',kit),JSON.stringify([...manifest.filter(e=>!ids.has(e.id)),...entries],null,2)+'\n');
const proof=new URL('../../docs/proof/foot-shape-20260913/',import.meta.url);await mkdir(proof,{recursive:true});await writeFile(new URL('assets.json',proof),JSON.stringify(report,null,2)+'\n');

// Authored closed chassis matching the existing inventory silhouettes. No source kit slicing.
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {NodeIO} from '@gltf-transform/core';
import sharp from 'sharp';
import {writeFile,readFile} from 'node:fs/promises';
import {CHASSIS_PROFILES,chassisPoint,chassisModelId} from '../../src/chassis-profiles.js';
import {equipmentSurfaceUV} from '../../src/equipment-surface.js';
import {CHASSIS_MATERIALS} from '../../src/creature-materials.js';
sharp.concurrency(1);sharp.cache(false);
globalThis.FileReader=class{readAsArrayBuffer(b){b.arrayBuffer().then(r=>{this.result=r;this.onloadend?.();});}readAsDataURL(b){b.arrayBuffer().then(r=>{this.result=`data:${b.type};base64,${Buffer.from(r).toString('base64')}`;this.onloadend?.();});}};
const up=new T.Vector3(0,1,0),front=new T.Vector3(0,0,1);
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
 inner.computeVertexNormals();add('steel',inner);
 // Irregular clipped-corner ceramic plates, closed with bevel and inner rim.
 const corners=[[-.88,-1],[.86,-1],[1,-.82],[1,.85],[.86,1],[-.87,1],[-1,.83],[-1,-.84]];
 let panelCount=0;
 for(let row=0;row<8;row++){
  const low=-Math.PI/2+row*Math.PI/8,high=low+Math.PI/8,lat=(low+high)/2,n=row===0||row===7?6:12;
  for(let col=0;col<n;col++){
   const lon=(col+(row%2)*.5)/n*Math.PI*2,at=chassisPoint(key,lat,lon);
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
 const lat=Math.asin(profile.lensY/profile.height),z=chassisPoint(key,lat,0)[2],lens=[0,profile.lensY,z+.015],r=profile.lens;
 cylinder('steel',lens,r*1.17,.085);ring('brass',[0,lens[1],lens[2]+.052],r*1.01,.018);
 ball('glass',[0,lens[1],lens[2]+.055],[r*.89,r*.89,.048]);ring('brass',[0,lens[1],lens[2]+.092],r*.7,.008);
 ring('steel',[0,lens[1],lens[2]+.096],r*.51,.017);
 ring('brass',[0,lens[1],lens[2]+.108],r*.45,.009);
 ball('light',[0,lens[1],lens[2]+.094],[r*.29,r*.29,.027]);
 for(let j=0;j<20;j++){const a=j*Math.PI/10,p=[Math.sin(a)*r*.84,lens[1]+Math.cos(a)*r*.84,lens[2]+.077],g=new T.BoxGeometry(r*.055,r*.17,.019);g.rotateZ(-a);add('brass',g,p);}
 for(let j=0;j<8;j++){const a=j*Math.PI/4,p=[Math.sin(a)*r*1.09,lens[1]+Math.cos(a)*r*1.09,lens[2]+.062];cylinder('brass',p,.012,.013,[0,0,1],6);}
 // Thin stacked upper service vents and a smaller inset upper optic.
 for(let j=0;j<3;j++){const y=profile.height*(.54+j*.083),zz=chassisPoint(key,Math.asin(y/profile.height),0)[2];add('steel',new T.BoxGeometry(.11,.028,.018),[0,y,zz+.021]);rod('brass',[-.049,y-.014,zz+.031],[.049,y-.014,zz+.031],.005);}
 if(['wanderer','bastion'].includes(key)){const y=.24,zz=chassisPoint(key,Math.asin(y/profile.height),0)[2];cylinder('brass',[0,y,zz+.017],.068,.028);ball('glass',[0,y,zz+.038],[.052,.052,.015]);}
 // Equipment sockets are created from actual runtime slots in creature-frame.js.
 if(profile.nursery){
  // Sealed side incubation chambers on a segmented horizontal abdomen.
  for(const side of [-1,1])for(let j=0;j<3;j++){
   const lat=-.32+j*.39,base=chassisPoint(key,lat,side*1.14,.005),axis=[side*.83,.12,.55];
   ball('steel',base,[.16,.18,.15]);
   const p=base.map((v,i)=>v+axis[i]*.08);
   ring('brass',p,.126,.024,axis);
   ball('glass',p,[.118,.143,.105]);
   for(const dy of [-.085,.085])rod('brass',[p[0]-side*.08,p[1]+dy,p[2]+.06],[p[0]+side*.06,p[1]+dy,p[2]+.09],.011);
  }
  for(let j=0;j<4;j++){
   const lat=.05+j*.27,points=Array.from({length:21},(_,i)=>chassisPoint(key,lat,-1.45+i*.145,.044));
   for(let i=1;i<points.length;i++)rod('brass',points[i-1],points[i],.013);
  }
 }

 if(profile.moss){
  if(key==='rootwalker'){
   // Uneven mats cling to the upper ceramic and join the small growth clusters.
   const vertices=[],uv=[],indices=[];
   const field=(lat,lon)=>Math.sin(lon*3+lat*9)+Math.sin(lon*7-lat*13)*.45+Math.cos(lon*13+lat*19)*.2-(lat<.45?1.12:.30);
   for(let j=0;j<36;j++)for(let i=0;i<100;i++){
    const lat=.28+j*.031,lon=i*Math.PI/50,corners=[[lat,lon],[lat,lon+Math.PI/50],[lat+.031,lon+Math.PI/50],[lat+.031,lon]];
    for(const tri of [[0,1,2],[0,2,3]]){
     const input=tri.map(k=>corners[k]),poly=[];
     for(let n=0;n<3;n++){const a=input[n],b=input[(n+1)%3],fa=field(...a),fb=field(...b);if(fa>=0)poly.push(a);if((fa>=0)!==(fb>=0)){const t=fa/(fa-fb);poly.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}}
     if(poly.length<3)continue;const k=vertices.length/3;
     for(const [la,lo]of poly){vertices.push(...chassisPoint(key,la,lo,.029+.003*Math.sin(lo*89+la*137)));uv.push(lo*1.3,la*3);}
     for(let n=1;n<poly.length-1;n++)indices.push(k,k+n,k+n+1);
    }
   }
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();add('moss',g);
  }
  // Small attached growth in panel seams, not large floating vegetation spheres.
  for(let i=0;i<(key==='rootwalker'?105:55);i++){const cluster=i%5,lat=.58+Math.sin(i*19.1)*.13+(cluster%2)*.25,lon=[-.6,.4,2.1,3.5,5.5][cluster]+Math.cos(i*11.3)*.18,p=chassisPoint(key,lat,lon,.027),r=.009+(i%7)*.002;add('moss',new T.IcosahedronGeometry(1,1),p,[r*1.4,r*.4,r*.85]);}
  for(const side of [-1,1]){const points=Array.from({length:9},(_,i)=>chassisPoint(key,.95-i*.11,side*.66+Math.sin(i)*.045,.042));for(let i=1;i<points.length;i++)rod('moss',points[i-1],points[i],.005);}
 }
 const root=new T.Group();root.name=chassisModelId(key);root.userData={chassisKey:key,closedChassis:true,reference:'canonical inventory icon',ceramicPanelCount:panelCount,attachmentSockets:'runtime-slots'};
 for(const [kind,parts]of Object.entries(groups)){if(!parts.length)continue;const g=mergeGeometries(parts);g.rotateX(profile.pitch||0);g.computeBoundingBox();const material=CHASSIS_MATERIALS[kind].clone();material.map=null;material.envMap=null;material.vertexColors=true;const mesh=new T.Mesh(g,material);mesh.name=key+'-'+kind;root.add(mesh);}
 // Existing asset dressing rotates GLB fronts by PI; author the file to that convention.
 root.rotation.y=Math.PI;root.updateMatrixWorld(true);return root;
}
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),exporter=new GLTFExporter(),out=new URL('../../public/assets/kit/',import.meta.url),entries=[];
const sourceDoc=await io.read(new URL('leg-worker.glb',out).pathname),sourceMaterial=sourceDoc.getRoot().listMaterials()[0];
for(const key of Object.keys(CHASSIS_PROFILES)){
 // Explicit model IDs are separately authored assets, not this generator's output.
 if(CHASSIS_PROFILES[key].modelId)continue;
 const root=build(key),bytes=await exporter.parseAsync(root,{binary:true}),doc=await io.readBinary(new Uint8Array(bytes));
 for(const material of doc.getRoot().listMaterials()){
  const kind=Object.keys(CHASSIS_MATERIALS).find(k=>CHASSIS_MATERIALS[k].name===material.getName());
  if(['ceramic','brass','steel'].includes(kind)){
   material.setBaseColorFactor(sourceMaterial.getBaseColorFactor()).setRoughnessFactor(sourceMaterial.getRoughnessFactor()).setMetallicFactor(sourceMaterial.getMetallicFactor()).setDoubleSided(sourceMaterial.getDoubleSided()).setEmissiveFactor(sourceMaterial.getEmissiveFactor()).setNormalScale(sourceMaterial.getNormalScale()).setOcclusionStrength(sourceMaterial.getOcclusionStrength());
   for(const property of ['BaseColor','MetallicRoughness','Normal','Occlusion','Emissive']){
    const texture=sourceMaterial['get'+property+'Texture']();if(!texture)continue;
    let target=doc.getRoot().listTextures().find(t=>t.getName()===texture.getName());
    if(!target)target=doc.createTexture(texture.getName()).setImage(texture.getImage()).setMimeType(texture.getMimeType());
    material['set'+property+'Texture'](target);
   }
  }else{
   const source=CHASSIS_MATERIALS[kind];if(!source?.map)continue;
   const {data,width,height}=source.map.image,png=await sharp(Buffer.from(data),{raw:{width,height,channels:4}}).png().toBuffer();
   material.setBaseColorTexture(doc.createTexture(source.map.name).setImage(png).setMimeType('image/png'));
  }
 }
 const binary=await io.writeBinary(doc),id=chassisModelId(key);await writeFile(new URL(id+'.glb',out),binary);entries.push({id,file:id+'.glb',bytes:binary.length,source:'scripts/asset-kit/chassis-v3.mjs'});
 console.log(id,binary.length,'bytes');
}
const manifest=JSON.parse(await readFile(new URL('manifest.json',out),'utf8')),ids=new Set(entries.map(e=>e.id));await writeFile(new URL('manifest.json',out),JSON.stringify([...manifest.filter(e=>!ids.has(e.id)),...entries],null,2)+'\n');

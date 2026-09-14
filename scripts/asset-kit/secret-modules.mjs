import * as T from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {readFile,writeFile} from 'node:fs/promises';

globalThis.FileReader=class{readAsArrayBuffer(blob){blob.arrayBuffer().then(value=>{this.result=value;this.onloadend?.();});}};

const materials={
 ceramic:new T.MeshStandardMaterial({name:'weathered-warm-ceramic',color:0xa7a596,roughness:.92,metalness:.04}),
 steel:new T.MeshStandardMaterial({name:'aged-dark-steel',color:0x303a39,roughness:.78,metalness:.62}),
 stone:new T.MeshStandardMaterial({name:'fractured-gray-stone',color:0x676d67,roughness:1,metalness:0}),
 root:new T.MeshStandardMaterial({name:'desaturated-root',color:0x4f5742,roughness:1,metalness:0}),
 glow:new T.MeshStandardMaterial({name:'restrained-mint-light',color:0x77b4a4,emissive:0x477f73,emissiveIntensity:.65,roughness:.45,metalness:.12}),
};
const box=new T.BoxGeometry(1,1,1),sphere=new T.SphereGeometry(1,20,12),cylinder=new T.CylinderGeometry(1,1,1,20),torus=new T.TorusGeometry(1,.08,8,28);
const add=(root,geometry,material,position,scale,rotation=[0,0,0],name='detail')=>{const mesh=new T.Mesh(geometry,material);mesh.name=name;mesh.position.set(...position);mesh.scale.set(...scale);mesh.rotation.set(...rotation);root.add(mesh);return mesh;};
const base=(name)=>{const root=new T.Group();root.name=name;add(root,cylinder,materials.stone,[0,.12,0],[1.15,.18,1.15],[0,0,0],'grounded-base');return root;};

function membrane(){const root=base('secret-membrane-v1');add(root,sphere,materials.root,[0,.72,0],[.95,.68,.82],[0,0,0],'living-membrane');for(let i=0;i<6;i++){const a=i*Math.PI/3;add(root,torus,materials.steel,[Math.cos(a)*.58,.72,Math.sin(a)*.58],[.34,.34,.34],[Math.PI/2,a,0],'retaining-rib');}for(const side of [-1,1])add(root,cylinder,materials.ceramic,[side*.82,.72,0],[.14,.72,.14],[0,0,side*.17],'ceramic-support');add(root,sphere,materials.glow,[0,.78,.7],[.11,.11,.08],[0,0,0],'sealed-core');return root;}
function slab(){const root=base('secret-slab-v1');for(let i=0;i<3;i++)add(root,box,materials.stone,[(i-1)*.7,.31+(i%2)*.03,(i-1)*.07],[.66,.25,1.42],[0,(i-1)*.055,(i-1)*.035],'fractured-slab');for(let i=0;i<4;i++){const x=-.7+i*.47;add(root,box,materials.steel,[x,.14,.2-Math.abs(x)*.15],[.035,.055,1.12],[0,.12*x,0],'exposed-rebar');}add(root,box,materials.glow,[.52,.58,.65],[.22,.035,.06],[-.08,0,.04],'buried-signal');return root;}
function nursery(){const root=base('secret-nursery-v1');add(root,box,materials.steel,[0,.92,-.45],[1.5,1.45,.16],[0,0,0],'service-rack');for(let i=0;i<3;i++){const x=(i-1)*.72;add(root,sphere,materials.ceramic,[x,.72,0],[.43,.62,.45],[0,0,0],'ceramic-pod');add(root,torus,materials.steel,[x,.73,.42],[.31,.31,.31],[0,0,0],'pod-collar');add(root,sphere,materials.glow,[x,.76,.43],[.14,.18,.05],[0,0,0],'sleeping-core');}for(const side of [-1,1])add(root,cylinder,materials.steel,[side*1.35,.77,-.2],[.11,.92,.11],[0,0,side*.08],'rack-leg');return root;}

const exporter=new GLTFExporter(),out=new URL('../../public/assets/kit/',import.meta.url),entries=[];
for(const [id,create] of Object.entries({'secret-membrane-v1':membrane,'secret-slab-v1':slab,'secret-nursery-v1':nursery})){
 const bytes=new Uint8Array(await exporter.parseAsync(create(),{binary:true,trs:true,onlyVisible:true}));
 await writeFile(new URL(id+'.glb',out),bytes);entries.push({id,file:id+'.glb',bytes:bytes.length,source:'scripts/asset-kit/secret-modules.mjs'});console.log(id,bytes.length,'bytes');
}
const manifest=JSON.parse(await readFile(new URL('manifest.json',out),'utf8')),ids=new Set(entries.map(entry=>entry.id));
await writeFile(new URL('manifest.json',out),JSON.stringify([...manifest.filter(entry=>!ids.has(entry.id)),...entries],null,2)+'\n');

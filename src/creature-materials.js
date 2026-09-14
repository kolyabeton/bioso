import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';

// CPU-backed shared maps work in the world and inventory WebGL contexts.
function map(name,kind){
 const n=256,data=new Uint8Array(n*n*4);
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const h=(Math.imul(x+91,374761393)^Math.imul(y+37,668265263))>>>0,r=((h^(h>>>13))>>>0)%997/997;
  const cloud=(Math.sin(x*.053+Math.sin(y*.032)*2.7)+Math.sin(y*.069-x*.023)+Math.cos(x*.117+y*.043))/3;
  const pore=r<.025,stain=Math.max(0,cloud-.12),i=(y*n+x)*4;
  let rgb;
  if(kind==='ceramic'){const wear=stain*.48+(pore?.27:0);rgb=[225-wear*153,220-wear*167,203-wear*164];}
  else if(kind==='moss'){rgb=[70+cloud*24,72+cloud*23,37+cloud*17];}
  else if(kind==='brass'){const patina=Math.max(0,cloud-.27)*1.8,rust=Math.max(0,-cloud-.25);rgb=[133+cloud*34-patina*72+rust*12,107+cloud*26-patina*31-rust*28,67+cloud*19-patina*4-rust*20];}
  else{const rust=Math.max(0,cloud-.05)*.9;rgb=[49+rust*111,46+rust*29,35+rust*7];}
  for(let k=0;k<3;k++)data[i+k]=Math.max(0,Math.min(255,rgb[k]+(r-.5)*13));data[i+3]=255;
 }
 const texture=new T.DataTexture(data,n,n);texture.name=name;texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;return texture;
}
const ceramic=new T.MeshStandardMaterial({name:'Aged ivory ceramic',color:'#d7d0b9',roughness:1,metalness:1});
const brass=new T.MeshStandardMaterial({name:'Oxidised brass',color:'#766b4f',roughness:1,metalness:1});
const steel=new T.MeshStandardMaterial({name:'Rusted inner mechanism',color:'#37372d',roughness:1,metalness:1});
const glass=new T.MeshStandardMaterial({name:'Deep jade optical glass',color:'#254d3e',roughness:.24,metalness:.45,emissive:'#416f59',emissiveIntensity:.17});
const light=new T.MeshStandardMaterial({name:'Small mint emitter',color:'#b9e1c5',roughness:.42,emissive:'#8fd2ac',emissiveIntensity:.65});
const moss=new T.MeshStandardMaterial({name:'Dry olive moss',map:map('Dry moss and lichen grain','moss'),roughness:1,metalness:0});
const pixels=new Uint8Array(128*64*4);
for(let y=0;y<64;y++)for(let x=0;x<128;x++){const sky=Math.max(0,1-y/48),soft=Math.exp(-(((x-34)/16)**2)-(((y-16)/10)**2)),i=(y*128+x)*4;pixels[i]=28+sky*110+soft*105;pixels[i+1]=32+sky*112+soft*95;pixels[i+2]=30+sky*108+soft*82;pixels[i+3]=255;}
const reflections=new T.DataTexture(pixels,128,64);reflections.mapping=T.EquirectangularReflectionMapping;reflections.colorSpace=T.SRGBColorSpace;reflections.needsUpdate=true;
for(const material of [brass,glass]){material.envMap=reflections;material.envMapIntensity=.65;}
for(const material of [ceramic,brass,steel])material.userData.sourceModel='leg-worker';
export const CHASSIS_MATERIALS={ceramic,brass,steel,glass,light,moss};

// Bodies carry authored edge wear in vertex colors; bearings use the same maps without that attribute.
export const CHASSIS_BODY_MATERIALS=Object.fromEntries(Object.entries(CHASSIS_MATERIALS).map(([key,source])=>{const material=source.clone();material.vertexColors=true;return [key,material];}));

export const equipmentMaterialsReady=typeof document==='undefined'?Promise.resolve():new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync('/assets/kit/leg-worker.glb').then(gltf=>{
 let original;gltf.scene.traverse(o=>{if(o.isMesh&&!original)original=o.material;});
 for(const key of ['ceramic','brass','steel']){
  const target=CHASSIS_MATERIALS[key],name=target.name;target.copy(original);target.name=name;target.vertexColors=false;target.userData.sourceModel='leg-worker';target.needsUpdate=true;
  CHASSIS_BODY_MATERIALS[key].copy(target);CHASSIS_BODY_MATERIALS[key].vertexColors=true;CHASSIS_BODY_MATERIALS[key].needsUpdate=true;
 }
});

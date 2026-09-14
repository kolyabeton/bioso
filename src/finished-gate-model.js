import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {prepareGateModel} from './mission-gate-model.js';
let ceramicTexture=new T.Texture();
export const gateMaterialsReady=typeof document==='undefined'?Promise.resolve():new T.TextureLoader().loadAsync('/assets/textures/chassis-ceramic-v3.png').then(texture=>{
 ceramicTexture=texture;ceramicTexture.name='chassis-ceramic-v3';ceramicTexture.colorSpace=T.SRGBColorSpace;ceramicTexture.anisotropy=4;
});

// Missions and lair entrances share the repaired split geometry and the authored
// ceramic texture already used by chassis and environmental modules.
export function prepareFinishedGateModel(template,width){
 const prepared=prepareGateModel(template,width),owned=[];
 const ceramic=new T.MeshStandardMaterial({map:ceramicTexture,roughness:.86,metalness:.04,side:T.DoubleSide});
 const foliage=new T.MeshStandardMaterial({color:0x65744c,roughness:.96,side:T.DoubleSide,vertexColors:true});
 const stems=new T.MeshStandardMaterial({color:0x41482d,roughness:1});
 ceramic.name='arch-gate-equipment-ceramic';foliage.name='arch-gate-ivy';stems.name='arch-gate-ivy-stems';
 ceramic.userData.sourceTexture='/assets/textures/chassis-ceramic-v3.png';
 ceramic.onBeforeCompile=shader=>{
  shader.uniforms.finishedGateWidth={value:width};
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float finishedGateWidth; varying vec3 finishedGatePosition;')
   .replace('#include <begin_vertex>','#include <begin_vertex>\nfinishedGatePosition=position/finishedGateWidth;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
   varying vec3 finishedGatePosition;
   float gateNoise(vec3 p){
    vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
    float n=dot(i,vec3(1.0,57.0,113.0));
    vec4 a=fract(sin(n+vec4(0.0,1.0,57.0,58.0))*43758.5453);
    vec4 b=fract(sin(n+vec4(113.0,114.0,170.0,171.0))*43758.5453);
    return mix(mix(mix(a.x,a.y,f.x),mix(a.z,a.w,f.x),f.y),mix(mix(b.x,b.y,f.x),mix(b.z,b.w,f.x),f.y),f.z);
   }
   vec2 finishedGateUV(){
    vec3 p=finishedGatePosition;
    return 1.0-abs(mod(vec2(p.x+p.z*.25,p.y)*vec2(3.0,4.0),2.0)-1.0);
   }`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',T.ShaderChunk.map_fragment.replaceAll('vMapUv','finishedGateUV()')+`
   vec3 p=finishedGatePosition;
   // The old x=.365 cutoff bisected the round posts. Cover each complete post;
   // blend the finish on the adjoining frame, with no planar cut through a part.
   float finishBoundary=abs(p.x)+(gateNoise(p*17.0)-.5)*.025;
   float gateSteel=smoothstep(.29,.345,finishBoundary)*smoothstep(.065,.105,p.y);
   float grain=gateNoise(p*85.0),rustCloud=gateNoise(p*vec3(36.0,15.0,29.0));
   float gateRust=smoothstep(.38,.68,rustCloud+grain*.22)*gateSteel;
   diffuseColor.rgb*=mix(vec3(1.0),vec3(.105,.125,.12),gateSteel);
   diffuseColor.rgb=mix(diffuseColor.rgb,mix(vec3(.13,.037,.012),vec3(.38,.145,.045),grain),gateRust*.86);
   float damp=(1.0-smoothstep(.08,.22,p.y))*smoothstep(.25,.38,abs(p.x))*smoothstep(.35,.7,rustCloud);
   diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.09,.13,.045),damp*.6);
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(mix(roughnessFactor,.68,gateSteel),.98,gateRust);').replace('#include <metalnessmap_fragment>','#include <metalnessmap_fragment>\nmetalnessFactor=mix(metalnessFactor,.65,gateSteel)*(1.0-gateRust);');
 };
 ceramic.customProgramCacheKey=()=> 'arch-gate-ceramic-rust-ivy-v2';
 const ray=new T.Raycaster(),direction=new T.Vector3(0,0,-1);
 prepared.halves.forEach((half,index)=>{
  half.traverse(o=>{if(o.isMesh){o.material=ceramic;o.castShadow=true;o.receiveShadow=true;}});
  half.updateMatrixWorld(true);
  const leaves=[],branches=[],side=index?1:-1;
  // Sample the gate before attaching greenery. Every root sits on the existing
  // surface; separate vines remain on their own moving leaf, clear of the seam.
  const front=(x,y)=>{
   ray.set(new T.Vector3(x*width,y*width,width*3),direction);
   const hit=ray.intersectObject(half,true)[0];
   return hit?hit.point.z:null;
  };
  const shape=new T.Shape();shape.moveTo(0,0);shape.bezierCurveTo(-.5,.22,-.52,.58,0,1);shape.bezierCurveTo(.52,.58,.5,.22,0,0);
  for(let vine=0;vine<3;vine++){
   const points=[];
   for(let j=0;j<20;j++){
    const t=j/19,y=.12+t*(.39+vine*.025),x=side*(.27+vine*.043+Math.sin(t*8+vine*2+index)*.017),z=front(x,y);
    if(z===null)continue;
    const point=new T.Vector3(x*width,y*width,z+width*.003);points.push(point);
    if(j%2===0){
     const leaf=new T.ShapeGeometry(shape,8),size=width*(.031+(Math.sin(j*8+vine)+1)*.008);
     leaf.scale(size,size,1);leaf.rotateY(Math.sin(j+vine)*.4);leaf.rotateZ((j%4?1:-1)*(1.05+Math.sin(j)*.3));leaf.translate(point.x,point.y,point.z+width*.004);
     const p=leaf.attributes.position,colors=new Float32Array(p.count*3),color=new T.Color();
     for(let k=0;k<p.count;k++){const shade=.7+((k+j+vine)%5)*.09;color.setRGB(shade,shade,shade*.9);color.toArray(colors,k*3);}
     leaf.setAttribute('color',new T.BufferAttribute(colors,3));leaves.push(leaf);
    }
   }
   if(points.length>1)branches.push(new T.TubeGeometry(new T.CatmullRomCurve3(points),36,width*.0018,5,false));
  }
  for(const [parts,material,name] of [[leaves,foliage,'arch-gate-greenery'],[branches,stems,'arch-gate-vines']])if(parts.length){
   const geometry=mergeGeometries(parts);parts.forEach(g=>g.dispose());owned.push(geometry);
   const mesh=new T.Mesh(geometry,material);mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;half.add(mesh);
  }
 });
 return{halves:prepared.halves,dispose(){owned.forEach(g=>g.dispose());ceramic.dispose();foliage.dispose();stems.dispose();prepared.dispose();}};
}

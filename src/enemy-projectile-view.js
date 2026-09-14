import {enableProjectileFade,projectileOpacity,setProjectileOpacity} from './projectile-fade.js';
import * as T from 'three';

const smoothstep=value=>{const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t);};

// Presentation only: projectile dimensions never participate in collision or timing.
export const ENEMY_PROJECTILE_STYLES=Object.freeze({
 seed:Object.freeze({shape:'pod',width:.42/3,height:.32/3,length:.62/3,trail:1.05/3,trailWidth:.14/3,color:0x8f632d,glow:0xe5bd68,pulse:.06,spin:5,motes:3}),
 needle:Object.freeze({shape:'dart',width:.18,height:.18,length:.7875,trail:1.05,trailWidth:.06375,color:0xc9ddd9,glow:0x58d8d0,pulse:.025,spin:2,motes:2}),
 legacy:Object.freeze({shape:'shell',width:.31,height:.28,length:.95,trail:1.65,trailWidth:.085,color:0x45321f,glow:0xffb85c,pulse:.025,spin:1.8,motes:4}),
});
export const enemyProjectileStyle=shot=>ENEMY_PROJECTILE_STYLES[shot?.key]||ENEMY_PROJECTILE_STYLES.legacy;
const enemyProjectileKey=shot=>shot?.key in ENEMY_PROJECTILE_STYLES?shot.key:'legacy';

export function createProjectileBodyGeometry(shape){
 if(shape==='dart'||shape==='droplet'){
  const geometry=new T.SphereGeometry(1,24,16),p=geometry.attributes.position;
  for(let i=0;i<p.count;i++){
   const z=p.getY(i),x=p.getX(i),y=-p.getZ(i);
   // Both ends close smoothly; the droplet carries its volume toward the nose.
   const radius=shape==='dart'?.62*(.68-.32*z):.82+.18*z;
   p.setXYZ(i,x*radius,y*radius,shape==='dart'?z*.9+.15:z);
  }
  geometry.computeVertexNormals();return geometry;
 }
 // Continuous curved shell. Rounded seed lobes and swept boss ribs share no
 // polygonal petal gaps; normals follow the sculpted surface all the way round.
 const shell=new T.SphereGeometry(1,shape==='shell'?48:40,28),p=shell.attributes.position;
 for(let i=0;i<p.count;i++){
  const y=p.getY(i),v=(y+1)/2,a=Math.atan2(p.getZ(i),p.getX(i)),twist=a+v*.55;
  const ribs=1+.095*Math.cos(a*7+v*5)*Math.sin(Math.PI*v),taper=(1.02-.36*v)*ribs;
  const r=Math.sqrt(Math.max(0,1-y*y))*taper;
  p.setXYZ(i,Math.cos(twist)*r,-Math.sin(twist)*r,y*(y>0?1.18:1));
 }
 shell.computeVertexNormals();shell.userData.carapace=true;return shell;
}
export function createProjectileShellMaterial(style){
 const material=new T.MeshStandardMaterial({color:style.color,emissive:style.glow,emissiveIntensity:.45,roughness:.43,metalness:.18});
 material.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec2 shellUv;\n'+shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nshellUv=uv;');
  shader.fragmentShader='varying vec2 shellUv;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float ridge=.5+.5*sin(shellUv.x*43.9823+shellUv.y*5.+sin(shellUv.y*19.)*.34);
   float grain=.5+.5*sin(shellUv.x*367.+sin(shellUv.y*271.)*2.7)*sin(shellUv.y*419.);
   float vein=pow(max(0.,ridge),22.)*(.25+.75*pow(.5+.5*sin(shellUv.y*31.+shellUv.x*17.),3.));
   diffuseColor.rgb*=.56+.45*ridge+.16*grain;`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor+grain*.18-ridge*.12,.2,.8);');
  shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance*=vein*.9+.025;');
 };
 material.customProgramCacheKey=()=> 'organic-projectile-shell-v3';return material;
}
function accentGeometry(shape){
 if(shape==='dart'){const geometry=new T.TorusGeometry(.65,.07,8,24);return geometry;}
 return new T.SphereGeometry(.16,16,10);
}
function makeMesh(geometry,material,capacity,name){const mesh=new T.InstancedMesh(geometry,material,capacity);mesh.name=name;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.frustumCulled=false;mesh.count=0;return enableProjectileFade(mesh,{trail:name.endsWith('-trail')});}
const additive=(color,opacity)=>new T.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false});

/** Fixed presentation pools; simulation remains the sole owner of positions and lifetime. */
export function createEnemyProjectileView(scene,capacity=128){
 const root=new T.Group();root.name='enemy-projectiles';scene.add(root);const pools={};
 for(const [key,style] of Object.entries(ENEMY_PROJECTILE_STYLES)){
  const body=makeMesh(createProjectileBodyGeometry(style.shape),key==='needle'?new T.MeshStandardMaterial({color:style.color,emissive:style.glow,emissiveIntensity:.42,roughness:.3,metalness:.08}):createProjectileShellMaterial(style),capacity,`enemy-projectile-${key}-body`);
  const core=makeMesh(new T.SphereGeometry(1,16,10),additive(style.glow,key==='legacy'?.95:key==='needle'?.82:.72),capacity,`enemy-projectile-${key}-core`);
  const accent=makeMesh(accentGeometry(style.shape),additive(key==='legacy'?0xffd27c:style.glow,key==='legacy'?.78:key==='needle'?.72:.48),capacity,`enemy-projectile-${key}-accent`);
  const trailGeometry=new T.ConeGeometry(1,1,10,1,true);trailGeometry.rotateX(-Math.PI/2);
  const trail=makeMesh(trailGeometry,additive(style.glow,key==='legacy'?.46:key==='needle'?.32:.2),capacity,`enemy-projectile-${key}-trail`);
  const wake=makeMesh(new T.TorusGeometry(1,.09,6,22),additive(style.glow,.25),capacity*2,`enemy-projectile-${key}-wake`);
  const mote=makeMesh(new T.TetrahedronGeometry(1,0),new T.MeshStandardMaterial({color:key==='seed'?0x79552c:key==='needle'?0x9fd5d2:0x3f403b,emissive:style.glow,emissiveIntensity:.12,roughness:.78,metalness:key==='legacy'?.42:.06}),capacity*4,`enemy-projectile-${key}-motes`);
  root.add(trail,wake,mote,core,accent,body);pools[key]={body,core,accent,trail,wake,mote,style};
 }
 const matrix=new T.Object3D(),direction=new T.Vector3(),forward=new T.Vector3(0,0,1),spin=new T.Quaternion(),side=new T.Vector3(),up=new T.Vector3();
 let alpha=1,trailAlpha=1;
 function setTransform(mesh,index,x,y,z,dx,dy,dz,sx,sy,sz,roll=0){
  setProjectileOpacity(mesh,index,/-(trail|wake|motes)$/.test(mesh.name)?trailAlpha:alpha);matrix.position.set(x,y,z);direction.set(dx,dy,dz);if(direction.lengthSq()<1e-8)direction.copy(forward);else direction.normalize();matrix.quaternion.setFromUnitVectors(forward,direction);if(roll)matrix.quaternion.multiply(spin.setFromAxisAngle(forward,roll));matrix.scale.set(sx,sy,sz);matrix.updateMatrix();mesh.setMatrixAt(index,matrix.matrix);
 }
 function update(shots,time=0,reducedMotion=false){
  for(const pool of Object.values(pools))for(const mesh of [pool.body,pool.core,pool.accent,pool.trail,pool.wake,pool.mote])mesh.count=0;
  for(let i=0;i<shots.length;i++){
   const shot=shots[i],key=enemyProjectileKey(shot),pool=pools[key],slot=pool.body.count;if(slot>=capacity)continue;alpha=projectileOpacity(shot);trailAlpha=projectileOpacity(shot,true);
   const style=pool.style,dx=shot.dx??0,dy=shot.dy??0,dz=shot.dz??0,d=Math.hypot(dx,dy,dz)||1,nx=dx/d,ny=dy/d,nz=dz/d,boss=['boss','final'].includes(shot.kind),scale=boss?(key==='needle'?2.15:1.6):1,pulse=reducedMotion?1:1+Math.sin(time*12+i*1.73)*style.pulse,roll=reducedMotion?0:time*style.spin+i*.71;
   const x=shot.x,y=shot.y??1,z=shot.z,travel=shot.travel??style.trail,launch=smoothstep(Math.min(1,travel/Math.max(.01,style.length*1.15))),trailLength=Math.min(style.trail,travel)*(reducedMotion?.38:1),launchWidth=1.28-.28*launch,launchLength=.38+.62*launch;
   setTransform(pool.body,slot,x,y,z,nx,ny,nz,style.width*pulse*scale*launchWidth,style.height*pulse*scale*launchWidth,style.length*scale*launchLength,roll);
   const coreScale=key==='needle'?.34:.65,coreOffset=key==='needle'?.24:0;setTransform(pool.core,slot,x+nx*style.length*coreOffset*scale,y+ny*style.length*coreOffset*scale,z+nz*style.length*coreOffset*scale,nx,ny,nz,style.width*coreScale*scale,style.height*coreScale*scale,style.length*(key==='needle'?.46:.75)*scale,key==='needle'?roll*.4:roll);
   const accentOffset=key==='needle'?-.04:.8*scale;setTransform(pool.accent,slot,x+nx*style.length*accentOffset,y+ny*style.length*accentOffset,z+nz*style.length*accentOffset,nx,ny,nz,style.width*1.08*scale,style.height*1.08*scale,style.length*.72*scale,-roll*.7);
   setTransform(pool.trail,slot,x-nx*trailLength*.52,y-ny*trailLength*.52,z-nz*trailLength*.52,nx,ny,nz,style.trailWidth*scale,style.trailWidth*scale,Math.max(.001,trailLength*scale),roll);
   const wakeSlot=pool.wake.count,wakeCount=key==='needle'?(boss?2:1):0;for(let ring=0;ring<wakeCount&&wakeSlot+ring<capacity*2;ring++){const behind=trailLength*(.35+ring*.42),ringScale=style.trailWidth*scale*(boss?2.7+ring*.75:1.85);setTransform(pool.wake,wakeSlot+ring,x-nx*behind,y-ny*behind,z-nz*behind,nx,ny,nz,ringScale,ringScale,.62+ring*.2,roll*.25);}
   pool.wake.count=wakeSlot+wakeCount;
   direction.set(nx,ny,nz);side.set(-nz,0,nx);if(side.lengthSq()<.01)side.set(1,0,0);else side.normalize();up.crossVectors(direction,side).normalize();const moteCount=reducedMotion?0:style.motes+(boss?2:0);
   for(let j=0;j<moteCount&&pool.mote.count<capacity*4;j++){const moteSlot=pool.mote.count++,a=roll+j*2.39996323,r=style.width*scale*(.55+(j%3)*.35),behind=style.length*scale*(.25+j*.18),mx=x-nx*behind+side.x*Math.cos(a)*r+up.x*Math.sin(a)*r,my=y-ny*behind+side.y*Math.cos(a)*r+up.y*Math.sin(a)*r,mz=z-nz*behind+side.z*Math.cos(a)*r+up.z*Math.sin(a)*r,size=style.width*scale*(.12+(j%2)*.06);setTransform(pool.mote,moteSlot,mx,my,mz,nx,ny,nz,size,size*.7,size*1.6,-roll-j);}
   pool.body.count=pool.core.count=pool.accent.count=pool.trail.count=slot+1;
  }
  for(const pool of Object.values(pools))for(const mesh of [pool.body,pool.core,pool.accent,pool.trail,pool.wake,pool.mote])mesh.instanceMatrix.needsUpdate=true;
 }
 function reset(){for(const pool of Object.values(pools))for(const mesh of [pool.body,pool.core,pool.accent,pool.trail,pool.wake,pool.mote])mesh.count=0;}
 function dispose(){scene.remove(root);for(const pool of Object.values(pools))for(const mesh of [pool.body,pool.core,pool.accent,pool.trail,pool.wake,pool.mote]){mesh.geometry.dispose();mesh.material.dispose();mesh.dispose();}}
 return{update,reset,dispose,info:()=>Object.fromEntries(Object.entries(pools).map(([key,pool])=>[key,pool.body.count]))};
}

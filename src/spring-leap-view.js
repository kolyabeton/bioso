import * as T from 'three';
import {SPRING_LEAP_DURATION} from './systems/extra-parts.js';

export const SPRING_LEAP_ARC_HEIGHT=1.8;
const SEGMENTS=24,TRAIL_POINTS=14,LANDING_LIFE=.24;

export function createSpringLeapView(scene){
 const root=new T.Group();root.name='spring-leap-vfx';scene.add(root);
 const pathGeometry=new T.BufferGeometry(),positions=new Float32Array((SEGMENTS+1)*3);pathGeometry.setAttribute('position',new T.BufferAttribute(positions,3));
 const pathMaterial=new T.LineBasicMaterial({color:0x72eee1,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false});
 const path=new T.Line(pathGeometry,pathMaterial);path.name='spring-leap-arc';path.frustumCulled=false;root.add(path);
 const trailGeometry=new T.SphereGeometry(.1,8,6),trailMaterial=new T.MeshBasicMaterial({color:0x72eee1,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}),trail=new T.InstancedMesh(trailGeometry,trailMaterial,TRAIL_POINTS),trailDummy=new T.Object3D();trail.name='spring-leap-trail';trail.frustumCulled=false;trail.count=0;root.add(trail);
 const ringGeometry=new T.RingGeometry(.48,.82,32).rotateX(-Math.PI/2),ringMaterial=()=>new T.MeshBasicMaterial({color:0x72eee1,transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,toneMapped:false});
 const launch=new T.Mesh(ringGeometry,ringMaterial()),landing=new T.Mesh(ringGeometry,ringMaterial());launch.name='spring-leap-launch';landing.name='spring-leap-landing';root.add(launch,landing);
 let leap=null,elapsed=0,landingLife=0;

 function event(value){
  if(value?.type!=='spring-leap'||![value.x,value.y,value.z,value.tx,value.ty,value.tz].every(Number.isFinite))return false;
  const duration=Math.max(.1,value.duration||SPRING_LEAP_DURATION);leap={from:{x:value.x,y:value.y,z:value.z},to:{x:value.tx,y:value.ty,z:value.tz},duration};elapsed=0;landingLife=0;root.visible=true;
  for(let i=0;i<=SEGMENTS;i++){const t=i/SEGMENTS,index=i*3;positions[index]=value.x+(value.tx-value.x)*t;positions[index+1]=value.y+(value.ty-value.y)*t+Math.sin(Math.PI*t)*SPRING_LEAP_ARC_HEIGHT+.12;positions[index+2]=value.z+(value.tz-value.z)*t;}
  for(let i=0;i<TRAIL_POINTS;i++){const t=i/(TRAIL_POINTS-1);trailDummy.position.set(value.x+(value.tx-value.x)*t,value.y+(value.ty-value.y)*t+Math.sin(Math.PI*t)*SPRING_LEAP_ARC_HEIGHT+.12,value.z+(value.tz-value.z)*t);trailDummy.scale.setScalar(.65+Math.sin(Math.PI*t)*.75);trailDummy.updateMatrix();trail.setMatrixAt(i,trailDummy.matrix);}trail.instanceMatrix.needsUpdate=true;trail.count=1;
  pathGeometry.attributes.position.needsUpdate=true;pathGeometry.computeBoundingSphere();path.geometry.setDrawRange(0,2);
  launch.position.set(value.x,value.y+.055,value.z);landing.position.set(value.tx,value.ty+.055,value.tz);launch.scale.setScalar(.65);landing.scale.setScalar(.72);return true;
 }

 function update(dt,target,reducedMotion=false){
  const fallback={x:target.x,y:target.y??0,groundY:target.y??0,z:target.z,progress:1,airborne:false};
  if(reducedMotion){reset();return fallback;}
  if(leap){
   elapsed=Math.min(leap.duration,elapsed+Math.max(0,dt));const progress=elapsed/leap.duration,eased=progress*progress*(3-2*progress),arc=Math.sin(Math.PI*progress);
   path.geometry.setDrawRange(0,Math.max(2,Math.ceil(progress*SEGMENTS)+1));pathMaterial.opacity=.18+.52*(1-progress);trail.count=Math.max(1,Math.ceil(progress*TRAIL_POINTS));trailMaterial.opacity=.28+.52*(1-progress);
   launch.material.opacity=.58*Math.max(0,1-progress*3);launch.scale.setScalar(.65+progress*.75);
   landing.material.opacity=.28+.34*arc;landing.scale.setScalar(.72+progress*.3);
   const groundY=leap.from.y+(leap.to.y-leap.from.y)*eased,pose={x:leap.from.x+(leap.to.x-leap.from.x)*eased,y:groundY+arc*SPRING_LEAP_ARC_HEIGHT,groundY,z:leap.from.z+(leap.to.z-leap.from.z)*eased,progress,airborne:progress<1};
   if(progress>=1){leap=null;landingLife=LANDING_LIFE;pathMaterial.opacity=trailMaterial.opacity=0;trail.count=0;launch.material.opacity=0;}
   return pose;
  }
  if(landingLife>0){landingLife=Math.max(0,landingLife-Math.max(0,dt));const life=landingLife/LANDING_LIFE;landing.material.opacity=.7*life;landing.scale.setScalar(1+(1-life)*.9);if(!landingLife)root.visible=false;}
  return fallback;
 }
 function reset(){leap=null;elapsed=landingLife=0;root.visible=false;pathMaterial.opacity=trailMaterial.opacity=launch.material.opacity=landing.material.opacity=0;path.geometry.setDrawRange(0,0);trail.count=0;}
 function info(){return{active:root.visible,airborne:!!leap,progress:leap?elapsed/leap.duration:1};}
 function dispose(){scene.remove(root);pathGeometry.dispose();trailGeometry.dispose();ringGeometry.dispose();pathMaterial.dispose();trailMaterial.dispose();trail.dispose();launch.material.dispose();landing.material.dispose();}
 reset();return{event,update,reset,info,dispose};
}

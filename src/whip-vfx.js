import {WHIP_HIT_PHASE,WHIP_PULL_PHASE} from './whip-timing.js';
import * as T from 'three';

const SEGMENTS=56,SIDES=8;
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{const t=clamp(x);return t*t*(3-2*t);};
const point=new T.Vector3(),origin=new T.Vector3(),direction=new T.Vector3(),tangent=new T.Vector3(),normal=new T.Vector3(),binormal=new T.Vector3(),up=new T.Vector3(0,1,0),dummy=new T.Object3D();

export function createWhipVfx(){
 const root=new T.Group();root.name='melee-sweep';root.position.z=.55;root.visible=false;root.userData.whip=true;root.userData.target=new T.Vector3(0,0,5);root.userData.side=1;
 const positions=new Float32Array((SEGMENTS+1)*(SIDES+1)*3),normals=new Float32Array(positions.length),indices=[];
 for(let i=0;i<SEGMENTS;i++)for(let j=0;j<SIDES;j++){const a=i*(SIDES+1)+j,b=a+SIDES+1;indices.push(a,b,a+1,b,b+1,a+1);}
 const colors=new Float32Array(positions.length),shade=new T.Color();
 for(let i=0;i<=SEGMENTS;i++)for(let j=0;j<=SIDES;j++){shade.set(i%4===0?0x92734b:0x342e20);shade.multiplyScalar(.8+.2*Math.cos(j/SIDES*Math.PI*2+i*.7));shade.toArray(colors,(i*(SIDES+1)+j)*3);}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));geometry.setAttribute('normal',new T.BufferAttribute(normals,3).setUsage(T.DynamicDrawUsage));geometry.setAttribute('color',new T.BufferAttribute(colors,3));geometry.setIndex(indices);
 const material=new T.MeshStandardMaterial({vertexColors:true,emissive:0xffb957,emissiveIntensity:.025,roughness:.42,metalness:.35});
 const cable=new T.Mesh(geometry,material);cable.name='whip-living-cable';cable.userData.noHeroOutline=true;cable.frustumCulled=false;root.add(cable);root.userData.cable=cable;root.userData.points=Array.from({length:SEGMENTS+1},()=>new T.Vector3());
 const sparks=new T.InstancedMesh(new T.OctahedronGeometry(1,0),new T.MeshBasicMaterial({color:0xffdd9e,transparent:true,opacity:.9,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}),12);sparks.name='whip-tip-sparks';sparks.count=0;sparks.frustumCulled=false;sparks.instanceMatrix.setUsage(T.DynamicDrawUsage);root.add(sparks);root.userData.sparks=sparks;
 const flash=new T.Mesh(new T.PlaneGeometry(1,1),new T.ShaderMaterial({uniforms:{strength:{value:0}},transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;vec4 center=modelViewMatrix*vec4(0.,0.,0.,1.);center.xy+=position.xy*.62;gl_Position=projectionMatrix*center;}',
  fragmentShader:'varying vec2 vUv;uniform float strength;void main(){vec2 p=(vUv-.5)*2.;float core=exp(-dot(p,p)*18.);float rays=exp(-abs(p.x)*32.)*exp(-abs(p.y)*4.)+exp(-abs(p.y)*32.)*exp(-abs(p.x)*4.);gl_FragColor=vec4(1.,.8,.43,(core+rays*.35)*strength);}'
 }));flash.name='whip-tip-crack';root.add(flash);root.userData.flash=flash;
 const hooks=new T.LineSegments(new T.BufferGeometry(),new T.LineBasicMaterial({color:0x92734b,transparent:true,opacity:.8}));hooks.name='whip-grab-tethers';hooks.frustumCulled=false;root.add(hooks);root.userData.hooks=hooks;root.userData.hookTargets=[];return root;
}

/** The curve starts at the actual hand and terminates on the target surface,
 * even while the arm rotates, lunges or belongs to a differently sized body. */
export function alignWhipVfx(root,arm,strike,hero){
 if(!strike)return;
 hero.updateWorldMatrix(true,true);arm.localToWorld(origin.set(0,0,.55));
 point.set(strike.tx,(strike.ty??0)+Math.min(.7,(strike.targetRadius??.48)*.8),strike.tz);
 if(strike.strikeRange)point.set((strike.originX??hero.position.x)+Math.sin(strike.aim)*strike.strikeRange,point.y,(strike.originZ??hero.position.z)+Math.cos(strike.aim)*strike.strikeRange);
 if(!Number.isFinite(point.x)||!Number.isFinite(point.z))return;
 direction.subVectors(point,origin);const distance=direction.length();direction.normalize();if(!strike.strikeRange)point.addScaledVector(direction,-Math.min(strike.targetRadius??.48,distance*.4));arm.worldToLocal(point);
 root.userData.target.copy(point).sub(root.position);root.userData.side=arm.userData.side??1;
 root.userData.hookTargets=(strike.targets||[]).filter(e=>e.hp>0).map(e=>{const v=new T.Vector3(e.x,(e.y??0)+Math.min(.7,(e.radius??.48)*.8),e.z);arm.worldToLocal(v);return v.sub(root.position);});
}

export function updateWhipVfx(root,strike,reduced=false){
 const data=root.userData;
 if(!strike){root.visible=false;data.previousPhase=null;data.sparks.count=0;data.hooks.visible=false;return false;}
 const phase=clamp(strike.phase??0),previous=data.previousPhase;data.previousPhase=phase;root.visible=phase>.035&&phase<.97;
 const target=data.target,length=target.length(),horizontal=Math.hypot(target.x,target.z)||1,sideX=target.z/horizontal,sideZ=-target.x/horizontal;
 const throwOut=smooth((phase-.12)/(WHIP_HIT_PHASE-.12)),returning=smooth((phase-WHIP_PULL_PHASE)/.43),reach=(.15+.85*throwOut)*(1-returning*.98);
 const curl=(1-throwOut)*1.15+returning*.9,travel=phase*2.2;
 for(let i=0;i<=SEGMENTS;i++){
  const u=i/SEGMENTS,wave=Math.sin(u*Math.PI*2.1-travel*5.3)*Math.sin(Math.PI*u),bend=(reduced?0:wave*curl*Math.min(length*.32,1.7)*data.side);
  const sweep=data.side*(smooth((phase-.16)/.32)-.5)*2.8*(1-returning),c=Math.cos(sweep),sn=Math.sin(sweep);
  data.points[i].set((target.x*c+target.z*sn)*u*reach+sideX*bend,target.y*u*reach+(reduced?0:Math.sin(Math.PI*u)*curl*.55),(target.z*c-target.x*sn)*u*reach+sideZ*bend);
 }
 const positions=data.cable.geometry.attributes.position,normals=data.cable.geometry.attributes.normal;
 for(let i=0;i<=SEGMENTS;i++){
  tangent.subVectors(data.points[Math.min(SEGMENTS,i+1)],data.points[Math.max(0,i-1)]).normalize();normal.crossVectors(tangent,up);if(normal.lengthSq()<.001)normal.set(1,0,0);else normal.normalize();binormal.crossVectors(normal,tangent).normalize();
  const radius=(.1*Math.pow(1-i/SEGMENTS,.65)+.018)*(i%4===0?1.08:1);
  for(let j=0;j<=SIDES;j++){
   const angle=j/SIDES*Math.PI*2,c=Math.cos(angle),s=Math.sin(angle),index=i*(SIDES+1)+j;direction.copy(normal).multiplyScalar(c).addScaledVector(binormal,s);point.copy(data.points[i]).addScaledVector(direction,radius);positions.setXYZ(index,point.x,point.y,point.z);normals.setXYZ(index,direction.x,direction.y,direction.z);
  }
 }
 positions.needsUpdate=normals.needsUpdate=true;
 const crack=smooth((phase-(WHIP_HIT_PHASE-.035))/.035)*(1-smooth((phase-WHIP_HIT_PHASE)/.14));data.cable.material.emissiveIntensity=.025+crack*.16;
 data.flash.position.copy(data.points[SEGMENTS]);data.flash.material.uniforms.strength.value=crack*(reduced?.35:1);
 const sparks=data.sparks,age=(phase-WHIP_HIT_PHASE)*(strike.duration??.42);sparks.count=!reduced&&age>0&&age<.14?12:0;
 for(let i=0;i<sparks.count;i++){
  const a=i*2.39996,speed=.8+(i%4)*.5,fade=1-age/.14;dummy.position.copy(target).add(point.set(Math.cos(a)*speed*age,age*(1+i%3)-age*age*5,Math.sin(a)*speed*age));dummy.rotation.set(a,phase*12+i,a*.5);dummy.scale.set(.025*fade,.025*fade,.1*fade);dummy.updateMatrix();sparks.setMatrixAt(i,dummy.matrix);
 }
 sparks.instanceMatrix.needsUpdate=true;
 const hooks=data.hooks;hooks.visible=!!strike.whipGather&&phase>=WHIP_PULL_PHASE&&phase<.95&&data.hookTargets.length>0;
 if(hooks.visible){const values=[];for(const target of data.hookTargets){for(let i=0;i<12;i++){for(const u of [i/12,(i+1)/12]){values.push(target.x*u,target.y*u+Math.sin(u*Math.PI)*.12*(1-returning),target.z*u);}}}const existing=hooks.geometry.attributes.position;if(existing?.array.length===values.length){existing.array.set(values);existing.needsUpdate=true;}else hooks.geometry.setAttribute('position',new T.Float32BufferAttribute(values,3));hooks.material.opacity=.8*(1-smooth((phase-.8)/.15));}
 return previous!=null&&previous<WHIP_HIT_PHASE&&phase>=WHIP_HIT_PHASE;
}

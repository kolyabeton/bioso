import * as T from 'three';
import {HERO_MELEE_RANGE_MULTIPLIER} from './melee-range.js';
import {createDrillSleeves} from './drill-extension.js';

const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{const t=clamp(x);return t*t*(3-2*t);};
const dummy=new T.Object3D(),velocity=new T.Vector3(),axis=new T.Vector3(0,0,1);
const inverse=new T.Quaternion(),aimRotation=new T.Quaternion(),yawAxis=new T.Vector3(0,1,0);
const additive=color=>new T.MeshBasicMaterial({color,transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false});
function pool(root,name,geometry,material,count){
 const mesh=new T.InstancedMesh(geometry,material,count);mesh.name=name;mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);root.add(mesh);return mesh;
}
// Camera-facing soft particles: no opaque smoke spheres, rings or cone overlays.
function softMaterial(color,opacity){return new T.ShaderMaterial({
 uniforms:{tint:{value:new T.Color(color)},opacity:{value:opacity}},transparent:true,depthWrite:false,toneMapped:false,
 vertexShader:`varying vec2 vUv;void main(){vUv=uv;vec4 center=modelViewMatrix*instanceMatrix*vec4(0.,0.,0.,1.);vec2 size=vec2(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz));center.xy+=position.xy*size;gl_Position=projectionMatrix*center;}`,
 fragmentShader:`varying vec2 vUv;uniform vec3 tint;uniform float opacity;void main(){vec2 p=vUv*2.-1.;float r=length(p);float wisps=.78+.22*sin(p.x*12.+sin(p.y*9.));float a=pow(max(0.,1.-r*r),3.)*wisps*opacity;gl_FragColor=vec4(tint,a);}`,
 });}
function cutPoint(u,lane){return {x:-.83+lane*.27+.98*u*u,z:.65+2.35*u-1.02*u*u,y:.12+Math.sin(u*Math.PI)*.18+lane*.015};}
function cutGeometry(lane){
 const positions=[],uv=[],indices=[];
 for(let i=0;i<=48;i++){
  const u=i/48,p=cutPoint(u,lane),dx=1.96*u,dz=2.35-2.04*u,n=Math.hypot(dx,dz),w=.105*Math.pow(Math.sin(Math.PI*u),.75);
  for(let edge=0;edge<2;edge++){const s=(edge-.5)*w;positions.push(p.x-dz/n*s,p.y,p.z+dx/n*s);uv.push(u,edge);}
  if(i<48){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);return geometry;
}
function cutMaterial(lane){return new T.ShaderMaterial({
 uniforms:{phase:{value:0},strength:{value:0},lane:{value:lane}},transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,toneMapped:false,
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:`varying vec2 vUv;uniform float phase;uniform float strength;uniform float lane;
 void main(){float head=phase*1.85-lane*.045;float reveal=1.-smoothstep(head-.025,head+.045,vUv.x);float age=max(0.,head-vUv.x);float fade=1.-smoothstep(.26,1.12,age);float d=abs(vUv.y-.5)*2.;float core=exp(-d*d*38.);float fringe=exp(-d*d*5.);vec3 gold=vec3(1.,.48,.12);vec3 hot=vec3(1.,.96,.76);float a=(core+.3*fringe)*reveal*fade*strength;gl_FragColor=vec4(mix(gold,hot,core),a);}`,
 });}
export function createContactVfx(key){
 const root=new T.Group();root.name='melee-sweep';root.userData.contactKind=key;root.visible=false;
 if(key==='claws'){
  root.scale.setScalar(1.35*HERO_MELEE_RANGE_MULTIPLIER);
  root.userData.blades=Array.from({length:3},(_,lane)=>{const mesh=new T.Mesh(cutGeometry(lane-1),cutMaterial(lane));mesh.name=`claw-cut-${lane}`;root.add(mesh);return mesh;});
  root.userData.sparks=pool(root,'claw-contact-sparks',new T.OctahedronGeometry(1,0),additive(0xffdf9c),18);
 }else{
  root.position.z=1.08; // Actual fitted drill model ends at 1.1 local units.
  root.userData.sparks=pool(root,'drill-contact-sparks',new T.OctahedronGeometry(1,0),additive(0xffd18a),32);
  root.userData.debris=pool(root,'drill-contact-debris',new T.IcosahedronGeometry(1,0),new T.MeshStandardMaterial({color:0x534331,roughness:.94}),12);
  root.userData.smoke=pool(root,'drill-contact-smoke',new T.PlaneGeometry(1,1),softMaterial(0x998976,.28),9);
  const glowMaterial=softMaterial(0xffcc86,.9);glowMaterial.blending=T.AdditiveBlending;glowMaterial.uniforms.tint.value.multiplyScalar(2);
  root.userData.glow=pool(root,'drill-contact-glow',new T.PlaneGeometry(1,1),glowMaterial,1);
  createDrillSleeves(root);
 }
 return root;
}
/** Express an aim-aligned hero-space cut in the animated mount's local space.
 * Inverting the full mount quaternion also cancels pitch, roll and extension. */
export function alignContactVfx(trail,arm,key,aim=0){
 if(key!=='claws')return;
 inverse.copy(arm.quaternion).invert();
 trail.position.set(0,arm.userData.rest?.y??arm.position.y,0).sub(arm.position).applyQuaternion(inverse);
 trail.quaternion.copy(inverse).multiply(aimRotation.setFromAxisAngle(yawAxis,aim));
}
function put(mesh,i,x,y,z,sx,sy,sz,dx=0,dy=0,dz=1){
 dummy.position.set(x,y,z);velocity.set(dx,dy,dz).normalize();dummy.quaternion.setFromUnitVectors(axis,velocity);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
}
export function updateContactVfx(root,strike,reduced=false){
 const data=root.userData;
 if(!strike){root.visible=false;data.previousPhase=null;for(const mesh of [data.sparks,data.debris,data.smoke,data.glow])if(mesh)mesh.count=0;return false;}
 const phase=clamp(strike.phase??0),previous=data.previousPhase;data.previousPhase=phase;
 root.visible=phase>.1&&phase<1;
 if(data.contactKind==='claws'){
  const t=clamp((phase-.1)/.72),strength=smooth(t/.12)*(1-smooth((t-.72)/.28))*(reduced?.6:1);
  for(const blade of data.blades){blade.material.uniforms.phase.value=t;blade.material.uniforms.strength.value=strength;}
  const sparks=data.sparks;sparks.count=0;
  if(!reduced)for(let i=0;i<18;i++){
   const birth=.16+(i%6)*.045,age=(phase-birth)*.42;if(age<0||age>.18)continue;
   const p=cutPoint(clamp((birth-.1)/.72*1.85),i%3-1),a=i*2.39996,vx=Math.cos(a)*1.1,vy=.5+(i%4)*.25,vz=Math.sin(a)*.7,fade=1-age/.18;
   put(sparks,sparks.count++,p.x+vx*age,p.y+vy*age-4*age*age,p.z+vz*age,.013*fade,.013*fade,.045*fade,vx,vy-8*age,vz);
  }
  sparks.instanceMatrix.needsUpdate=true;
 }else{
  const t=phase*.46,fade=1-smooth((phase-.72)/.28),sparks=data.sparks,debris=data.debris,smoke=data.smoke,glow=data.glow;
  sparks.count=debris.count=smoke.count=0;
  const touching=strike.drillContact!==false;
  for(let i=0;i<(reduced||!touching?0:32);i++){
   const age=t-(.07+(i%8)*.025);if(age<0||age>.23)continue;
   const a=i*2.39996,speed=2.8+(i%5)*.65,vx=Math.cos(a)*speed,vy=.9+(i%7)*.4,vz=Math.sin(a)*speed*.7,life=1-age/.23;
   put(sparks,sparks.count++,vx*age,vy*age-5*age*age,vz*age,.028*life,.028*life,(.13+speed*.025)*life,vx,vy-10*age,vz);
  }
  for(let i=0;i<(reduced||!touching?0:12);i++){
   const age=t-.09-(i%3)*.025;if(age<0)continue;const a=i*2.39996,speed=.9+(i%4)*.4,vx=Math.cos(a)*speed,vz=Math.sin(a)*speed*.65,vy=1.4+(i%3)*.45,size=(.025+(i%3)*.013)*fade;
   put(debris,debris.count++,vx*age,vy*age-4.9*age*age,vz*age,size,size*.7,size*1.2,Math.sin(age*15+i),1,Math.cos(age*18+i));
  }
  for(let i=0;i<(touching?(reduced?3:9):0);i++){
   const age=t-.085-i*.015;if(age<0)continue;const a=i*2.39996,size=(.25+age*1.3)*fade;
   put(smoke,smoke.count++,Math.cos(a)*age*1.15,.03+age*.6,Math.sin(a)*age*.8,size,size,1);
  }
  const contact=touching?smooth((phase-.12)/.13)*(1-smooth((phase-.66)/.25)):0;glow.count=contact>0?1:0;put(glow,0,0,0,0,.64*contact,.64*contact,1);
  for(const mesh of [sparks,debris,smoke,glow])mesh.instanceMatrix.needsUpdate=true;
 }
 return previous!=null&&previous<.32&&phase>=.32;
}

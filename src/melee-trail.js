import * as T from 'three';
import {HERO_MELEE_RANGE_MULTIPLIER} from './melee-range.js';
import {createContactVfx,alignContactVfx,updateContactVfx} from './contact-vfx.js';
import {createWhipVfx,updateWhipVfx} from './whip-vfx.js';

const segments=56;
function ribbonGeometry(lane=0){
 const positions=[],uvs=[],indices=[];
 for(let i=0;i<=segments;i++){
  const u=i/segments,x=-1.18+u*1.56+lane*.17,z=.66+u*.72+Math.sin(Math.PI*u)*.62+lane*.06,width=.058*Math.pow(Math.sin(Math.PI*u),.72),dx=1.56,dz=.72+Math.PI*.62*Math.cos(Math.PI*u),length=Math.hypot(dx,dz),nx=-dz/length,nz=dx/length;
  for(let j=0;j<2;j++){const offset=(j-.5)*width;positions.push(x+nx*offset,lane*.025,z+nz*offset);uvs.push(u,j);}
  if(i<segments){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);return geometry;
}
function bladeMaterial(lane=0){return new T.ShaderMaterial({
 uniforms:{strength:{value:0},phase:{value:0},lane:{value:lane}},transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,toneMapped:false,
 vertexShader:'varying vec2 trailUv; void main(){trailUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
 fragmentShader:`varying vec2 trailUv; uniform float strength; uniform float phase; uniform float lane;
 void main(){
  float crosswise=(trailUv.y-.5)*2.0;
  float core=exp(-crosswise*crosswise*46.0);
  float ion=exp(-crosswise*crosswise*9.0);
  float head=smoothstep(phase-.62,phase-.1,trailUv.x)*(1.0-smoothstep(phase+.08,phase+.42,trailUv.x));
  float torn=.76+.24*sin(trailUv.x*83.0+lane*7.0+crosswise*5.0);
  float ends=pow(sin(trailUv.x*3.14159265),.72);
  float alpha=(core+ion*.08)*head*ends*torn*strength;
  vec3 color=mix(vec3(.45,.72,.64),vec3(1.0,.94,.77),smoothstep(.08,.65,core));
  gl_FragColor=vec4(color,alpha);
 }`
});}

export function createMeleeTrail(key){
 if(key==='whip')return createWhipVfx();
 if(key==='claws'||key==='drill')return createContactVfx(key);
 const group=new T.Group();group.name='melee-sweep';group.position.set(0,.08,.25);
 const blade=new T.Mesh(ribbonGeometry(0),bladeMaterial(0));blade.name='whip-sweep';group.add(blade);group.userData.blades=[blade];
 group.scale.setScalar((key==='whip'?1.8:1.9)*HERO_MELEE_RANGE_MULTIPLIER);group.visible=false;return group;
}
export function alignMeleeTrail(trail,arm,key,aim=0){
 if(trail&&arm&&trail.userData.contactKind)alignContactVfx(trail,arm,key,aim);
}
export function disposeMeleeTrail(trail){trail?.traverse(o=>{if(!o.isMesh&&!o.isSprite)return;o.dispose?.();o.geometry?.dispose();for(const material of Array.isArray(o.material)?o.material:[o.material])material?.dispose();});}
export function updateMeleeTrail(trail,strike,key,reducedMotion=false){
 if(!trail)return false;
 if(trail.userData.whip)return updateWhipVfx(trail,strike,reducedMotion);
 if(trail.userData.contactKind)return updateContactVfx(trail,strike,reducedMotion);
 if(!strike){trail.visible=false;return false;}
 const start=key==='whip'?.12:.14,end=key==='whip'?.8:.7,t=Math.max(0,Math.min(1,(strike.phase-start)/(end-start))),strength=strike.trail?Math.sin(Math.PI*t)*(reducedMotion?.4:1):0;
 trail.visible=strength>.01;
 for(const blade of trail.userData.blades){blade.material.uniforms.strength.value=strength;blade.material.uniforms.phase.value=.08+t*.92;}
 return false;
}

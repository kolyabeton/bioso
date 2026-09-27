import * as T from 'three';
import {materials} from './kit.js';
import {compassTarget} from './systems/waypoint.js';

const PARTICLE_COUNT=28;

function arrowGeometry(){
 const shape=new T.Shape();
 shape.moveTo(0,2.15);shape.lineTo(.68,-.68);shape.lineTo(0,-1.55);shape.lineTo(-.68,-.68);shape.closePath();
 const cutout=new T.Path();cutout.moveTo(0,1.48);cutout.lineTo(-.38,-.58);cutout.lineTo(0,-1.08);cutout.lineTo(.38,-.58);cutout.closePath();shape.holes.push(cutout);
 const geometry=new T.ExtrudeGeometry(shape,{depth:.16,bevelEnabled:true,bevelSegments:2,bevelSize:.07,bevelThickness:.06,curveSegments:1});
 geometry.center();geometry.rotateX(Math.PI/2);geometry.computeVertexNormals();return geometry;
}

function groundAnchor(camera,canvas,s){
 const height=Math.max(1,canvas.clientHeight),screenY=Math.min(145,Math.max(130,height*.17));
 const near=new T.Vector3(0,1-screenY/height*2,-1).unproject(camera),far=new T.Vector3(0,1-screenY/height*2,1).unproject(camera),ray=far.sub(near).normalize();
 if(Math.abs(ray.y)<1e-5)return null;
 let ground=Number.isFinite(s.player.y)?s.player.y:0,point=new T.Vector3();
 for(let i=0;i<2;i++){
  const distance=(ground-near.y)/ray.y;if(distance<0)return null;point.copy(near).addScaledVector(ray,distance);
  const sampled=s.world.heightAt?.(point.x,point.z);if(Number.isFinite(sampled))ground=sampled;
 }
 point.y=ground;return point;
}

/** A world-space mission pointer anchored visually below the objective readout. */
export function createNavigationGuideView(scene){
 const root=new T.Group();root.name='mission-navigation-guide';root.visible=false;scene.add(root);
 const material=materials.amber.clone();material.name='Mission guide brass';material.transparent=true;material.opacity=.66;material.depthWrite=false;material.depthTest=false;material.emissive=new T.Color('#c89435');material.emissiveIntensity=.58;material.roughness=.38;
 const arrow=new T.Mesh(arrowGeometry(),material);arrow.name='mission-navigation-arrow';arrow.renderOrder=30;root.add(arrow);
 const uniforms={tint:{value:new T.Color(0xf1c66e)},strength:{value:1}};
 const geometry=new T.BufferGeometry(),positions=new Float32Array(PARTICLE_COUNT*3),alphas=new Float32Array(PARTICLE_COUNT),sizes=new Float32Array(PARTICLE_COUNT);
 geometry.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));geometry.setAttribute('sparkAlpha',new T.BufferAttribute(alphas,1).setUsage(T.DynamicDrawUsage));geometry.setAttribute('sparkSize',new T.BufferAttribute(sizes,1));for(let i=0;i<PARTICLE_COUNT;i++)sizes[i]=4+(i%4)*1.25;
 const particleMaterial=new T.ShaderMaterial({uniforms,transparent:true,depthTest:false,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,
  vertexShader:'attribute float sparkSize;attribute float sparkAlpha;varying float alpha;void main(){alpha=sparkAlpha;gl_PointSize=sparkSize;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'uniform vec3 tint;uniform float strength;varying float alpha;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(mix(tint,vec3(1.),.32),pow(1.-d,1.5)*alpha*strength);}'
 });
 const particles=new T.Points(geometry,particleMaterial);particles.name='mission-navigation-particles';particles.frustumCulled=false;particles.renderOrder=31;root.add(particles);
 const targetVector=new T.Vector3();let targetId=null;
 function update(s,camera,canvas,time=0,reducedMotion=false,showParticles=true){
  const target=compassTarget(s),anchor=target&&target.distance>3?groundAnchor(camera,canvas,s):null;
  root.visible=!!anchor;if(!anchor){targetId=null;geometry.setDrawRange(0,0);return false;}
  targetId=target.id??target.source;root.position.copy(anchor);targetVector.set(target.x-s.player.x,0,target.z-s.player.z);root.rotation.y=Math.atan2(targetVector.x,targetVector.z);
  const pulse=reducedMotion?1:1+Math.sin(time*2.4)*.045,bob=reducedMotion?0:Math.sin(time*2.1)*.09;arrow.position.y=.24+bob;arrow.scale.setScalar(pulse);uniforms.strength.value=reducedMotion?.78:.72+Math.sin(time*2.4)*.12;
  particles.visible=!reducedMotion&&showParticles;geometry.setDrawRange(0,particles.visible?PARTICLE_COUNT:0);
  if(particles.visible)for(let i=0;i<PARTICLE_COUNT;i++){
   const phase=(time*.22+i*.61803398875)%1,angle=i*2.39996-time*.18,r=.72+(i%5)*.13;
   positions[i*3]=Math.cos(angle)*r;positions[i*3+1]=.16+phase*1.5;positions[i*3+2]=Math.sin(angle)*r;alphas[i]=Math.sin(phase*Math.PI)*(.48+(i%3)*.16);
  }
  geometry.attributes.position.needsUpdate=true;geometry.attributes.sparkAlpha.needsUpdate=true;return true;
 }
 function reset(){root.visible=false;targetId=null;geometry.setDrawRange(0,0);}
 function dispose(){root.removeFromParent();arrow.geometry.dispose();material.dispose();geometry.dispose();particleMaterial.dispose();}
 return{update,reset,dispose,info:()=>({missionGuideVisible:root.visible,missionGuideTarget:targetId,missionGuideParticles:geometry.drawRange.count})};
}

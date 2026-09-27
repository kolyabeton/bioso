import * as T from 'three';
import {consumableCapsuleGeometry} from './consumable-capsule.js';
import {CHASSIS_BODY_MATERIALS} from './creature-materials.js';
import {SURVIVAL_BURST_AT,SURVIVAL_ENDING_DURATION} from './systems/survival-endgame.js';

const CAPACITY=192,clamp=v=>Math.max(0,Math.min(1,v)),hash=i=>{const n=Math.sin(i*127.1+31.7)*43758.5453;return n-Math.floor(n);};
export function endingHeroScale(ending){
 if(!ending||ending.exploded)return 1;
 const p=clamp(ending.elapsed/SURVIVAL_BURST_AT),growth=p*p*(3-2*p);
 return 1+growth*2.6;
}
export function endingCameraShake(ending,reduced=false){
 if(!ending||ending.previewHold||reduced)return {x:0,z:0,roll:0};
 const t=ending.elapsed,age=t-SURVIVAL_BURST_AT;
 const strength=age<0?.015+.13*Math.pow(clamp(t/SURVIVAL_BURST_AT),3):.8*Math.exp(-age*2.7)+.13*Math.exp(-age*.8);
 return {x:(Math.sin(t*73)+.4*Math.sin(t*113))*strength,z:Math.sin(t*89+.8)*strength*.7,roll:Math.sin(t*67)*strength*.025};
}
/** Repeated emission during growth, followed by the final luminous biomass shower. */
export function createSurvivalEndingView(scene){
 const {shellGeometry,rimGeometry,coreGeometry}=consumableCapsuleGeometry();
 const energyMaterial=new T.MeshBasicMaterial({color:0xbaf9bd,toneMapped:false});
 const make=(name,g,m)=>{const mesh=new T.InstancedMesh(g,m,CAPACITY);mesh.name=name;mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);scene.add(mesh);return mesh;};
 const shells=make('ending-biomass-shells',shellGeometry,CHASSIS_BODY_MATERIALS.ceramic),rims=make('ending-biomass-rims',rimGeometry,CHASSIS_BODY_MATERIALS.steel),cores=make('ending-biomass-cores',coreGeometry,energyMaterial);
 const glowGeometry=new T.PlaneGeometry(2,2),clock={value:0};
 const glowMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,uniforms:{clock},
  vertexShader:'varying vec2 coord;varying float seed;void main(){coord=uv;seed=dot(instanceMatrix[3].xyz,vec3(2.13,3.17,1.71));gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);}',
  fragmentShader:`uniform float clock;varying vec2 coord;varying float seed;void main(){
   vec2 p=(coord-.5)*2.;float r=length(p);float ring=exp(-pow((r-.48)/.055,2.));float halo=exp(-r*r*5.);float core=exp(-r*r*85.);
   float shimmer=.55+.45*sin(clock*12.+seed);float glint=pow(max(0.,sin(clock*9.+seed*1.7)),10.);
   float cross=(exp(-abs(p.x)*90.-abs(p.y)*3.5)+exp(-abs(p.y)*90.-abs(p.x)*3.5))*glint;
   float a=(ring*.7+halo*.28+core*.9+cross)*(1.-smoothstep(.8,1.,r));
   gl_FragColor=vec4(mix(vec3(.2,.85,.4),vec3(1.,1.,.8),clamp(core+cross,0.,1.)),a*(.7+shimmer*.5));}`
 });
 const glows=make('ending-biomass-radiance',glowGeometry,glowMaterial),dummy=new T.Object3D(),color=new T.Color();
 const chargeLight=new T.PointLight(0xa6ffd0,0,22,2);chargeLight.name='ending-energy-light';scene.add(chargeLight);
 let visible=0,scale=1;
 function reset(){visible=0;scale=1;chargeLight.intensity=0;for(const mesh of [shells,rims,cores,glows])mesh.count=0;}
 function update(s,camera,reduced=false){
  const ending=s.ending;reset();if(!ending)return;
  scale=endingHeroScale(ending);const t=ending.elapsed,p=s.player,burstAge=t-SURVIVAL_BURST_AT;
  clock.value=reduced?0:t;
  const progress=clamp(t/SURVIVAL_BURST_AT);
  chargeLight.position.set(p.x,(p.y||0)+2.5,p.z);
  chargeLight.intensity=burstAge<0?(2+progress*16)*(reduced?1:.85+.15*Math.sin(t*11)):28*Math.exp(-burstAge*1.2);
  function orb(i,age,duration,sourceScale,speed,final=false){
   if(age<0||age>duration||visible>=CAPACITY)return;
   const a=hash(i)*Math.PI*2,vertical=hash(i+701),travel=speed*(1-Math.exp(-age*.8))*(reduced?.55:1);
   const lift=(vertical-.25)*3.5;
   const x=p.x+Math.cos(a)*travel,z=p.z+Math.sin(a)*travel,y=(p.y||0)+sourceScale*1.15+lift*age-(final?.45:.23)*age*age;
   const fade=Math.min(clamp(age/.12),clamp((duration-age)/.9)),size=(.17+hash(i+97)*.20)*fade;if(size<.01)return;
   dummy.position.set(x,Math.max((s.world.heightAt?.(x,z)??p.y??0)+.22,y),z);
   dummy.quaternion.copy(camera.quaternion);dummy.rotateZ(reduced?0:a+age*.7);dummy.scale.setScalar(size);dummy.updateMatrix();
   for(const mesh of [shells,rims,cores])mesh.setMatrixAt(visible,dummy.matrix);
   color.setHex(i%4===0?0xf7ffd1:0x91f7bb).multiplyScalar(reduced?1:.8+.2*Math.sin(t*12+i));cores.setColorAt(visible,color);
   dummy.scale.setScalar(size*(2.7+(!reduced?.45*Math.sin(t*9+i):0)));dummy.updateMatrix();glows.setMatrixAt(visible,dummy.matrix);visible++;
  }
  // Every slot releases repeatedly, with independent directions and launch heights.
  for(let i=0;i<96;i++){
   const phase=i/96*3.2,cycle=Math.floor((Math.min(t,SURVIVAL_BURST_AT-.001)-phase)/3.2);
   if(cycle<0)continue;const born=phase+cycle*3.2,age=t-born;
   const launchScale=endingHeroScale({elapsed:born,exploded:false});
   orb(i+cycle*193,age,3.2,launchScale,2.8+hash(i+cycle*193+53)*6);
  }
  if(burstAge>=0)for(let i=0;i<96;i++)orb(i+3001,burstAge-(i%3)*.16,SURVIVAL_ENDING_DURATION-SURVIVAL_BURST_AT,3.6,5+hash(i+211)*6,true);
  for(const mesh of [shells,rims,cores,glows]){mesh.count=visible;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}
 }
 return {update,reset,info:()=>({endingBiomassOrbs:visible,endingHeroScale:scale})};
}

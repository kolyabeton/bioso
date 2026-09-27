import * as T from 'three';
import {SHIELD_AURA_RADIUS} from './systems/shield-arm.js';

const groundShader=`
 precision highp float;
 uniform float clock;
 uniform float pulseStrength;
 varying vec2 vUv;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
 float crack(vec2 p){
  vec2 cell=floor(p),f=fract(p);float closest=8.,second=8.;
  for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
   vec2 offset=vec2(float(x),float(y));
   vec2 point=offset+vec2(hash(cell+offset),hash(cell+offset+17.3))*.72+.14;
   float d=length(point-f);
   if(d<closest){second=closest;closest=d;}else if(d<second)second=d;
  }
  return second-closest;
 }
 void main(){
  vec2 p=vUv*2.-1.;float r=length(p),angle=atan(p.y,p.x);
  float warp=noise(p*8.)*.065+noise(p*19.)*.022-.043;
  float edge=1.-smoothstep(.90+warp,.995+warp,r);
  if(edge<.003)discard;
  vec2 q=p*7.5+vec2(noise(p*11.),noise(p*11.+14.7))*.31;
  float fine=1.-smoothstep(.025,.115,crack(q*1.8));
  float large=1.-smoothstep(.025,.14,crack(q));
  float branch=1.-smoothstep(.024,.105,abs(sin(angle*31.+r*28.+noise(p*19.)*2.)));
  float veins=max(fine*.57,large*.86)*(.4+.6*smoothstep(.26,.72,r));
  veins=max(veins,branch*.42*smoothstep(.35,.7,r));
  float grain=noise(p*24.),cloud=noise(p*5.+clock*.045);
  float frost=smoothstep(.32,.82,r)*(1.-smoothstep(.83,1.05,r));
  float haze=frost*(.10+.09*cloud)+.035*grain;
  float phase=fract(clock);
  float front=min(1.04,phase/.86*1.04);
  float offset=(noise(p*12.)-.5)*.065;
  float pulse=pulseStrength*exp(-pow((r-front+offset)/.13,2.));
  float alpha=edge*(.095+.13*frost+(.14+.64*pulse)*veins+.25*haze);
  alpha*=smoothstep(.04,.22,r);
  float reveal=1.-smoothstep(front-.035,front+.075,r+offset);
  float fade=1.-smoothstep(.86,1.,phase);
  alpha*=mix(1.,reveal*fade,pulseStrength);
  if(alpha<.01)discard;
  vec3 color=mix(vec3(.24,.43,.58),vec3(.86,.94,1.),clamp(veins*(.45+1.1*pulse)+haze,0.,1.));
  gl_FragColor=vec4(color,alpha*.2);
 }`;

const frostPulseShader=`
 precision highp float;
 uniform sampler2D frostMap;
 uniform float clock;
 uniform float pulseStrength;
 varying vec2 vUv;
 void main(){
  vec4 frost=texture2D(frostMap,vUv);
  if(frost.a<.01)discard;
  vec2 p=vUv*2.-1.;float r=length(p),angle=atan(p.y,p.x);
  float phase=fract(clock);
  float front=min(1.04,phase/.86*1.04);
  float offset=.023*sin(angle*19.+r*14.)+.014*sin(angle*37.-r*26.);
  float pulse=pulseStrength*exp(-pow((r-front+offset)/.13,2.));
  float reveal=1.-smoothstep(front-.035,front+.075,r+offset);
  float fade=1.-smoothstep(.86,1.,phase);
  vec3 color=mix(frost.rgb,vec3(.94,.98,1.),pulse*.8);
  gl_FragColor=vec4(color,.2*frost.a*(.78+2.1*pulse)*mix(1.,reveal*fade,pulseStrength));
 }`;

function frostTexture(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;
 const ctx=canvas.getContext('2d');
 let seed=94217;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 const point=(angle,r)=>[512+Math.cos(angle)*r*465,512+Math.sin(angle)*r*465];
 function stroke(points,width,alpha){
  ctx.beginPath();ctx.moveTo(...points[0]);for(const p of points.slice(1))ctx.lineTo(...p);
  ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=width;ctx.strokeStyle=`rgba(220,241,255,${alpha})`;
  ctx.shadowColor='rgba(170,220,255,.9)';ctx.shadowBlur=13;ctx.stroke();ctx.shadowBlur=0;
 }
 for(let i=0;i<22;i++){
  const angle=i*Math.PI*2/22+(random()-.5)*.22;
  const outer=.76+random()*.24,inner=.23+random()*.31;
  const trunk=[];
  for(let j=0;j<=7;j++){
   const r=outer+(inner-outer)*j/7;
   trunk.push(point(angle+Math.sin(j*1.9+i)*.014+(random()-.5)*.017,r));
  }
  stroke(trunk,6+random()*3,.47);
  for(let j=1;j<7;j++)for(const side of [-1,1]){
   if(random()<.19)continue;
   const r=outer+(inner-outer)*j/7,a=angle+side*(.12+random()*.09);
   const tip=point(a,r+.09+random()*.09);
   stroke([trunk[j],point(angle+side*.055,r+.04),tip],3.5+random()*2,.42);
   if(random()>.42)stroke([tip,point(a+side*.045,r+.13+random()*.07)],2.5,.29);
  }
 }
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
 return texture;
}

/** A cold patch of branching frost matching the passive shield's radius. */
export function createShieldAuraView(scene){
 const vertexShader='varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
 const uniforms={clock:{value:0},pulseStrength:{value:1}};
 const groundMaterial=new T.ShaderMaterial({vertexShader,fragmentShader:groundShader,uniforms,transparent:true,depthWrite:false,depthTest:true,side:T.DoubleSide,blending:T.NormalBlending,toneMapped:false});
 const terrainGeometry=new T.PlaneGeometry(SHIELD_AURA_RADIUS*2,SHIELD_AURA_RADIUS*2,SHIELD_AURA_RADIUS*8,SHIELD_AURA_RADIUS*8);
 const ground=new T.Mesh(terrainGeometry,groundMaterial);
 ground.name='shield-passive-aura';ground.rotation.x=-Math.PI/2;ground.renderOrder=3;ground.frustumCulled=false;ground.visible=false;scene.add(ground);
 const veinsTexture=frostTexture();
 const veins=new T.Mesh(terrainGeometry,new T.ShaderMaterial({vertexShader,fragmentShader:frostPulseShader,uniforms:{...uniforms,frostMap:{value:veinsTexture}},transparent:true,depthWrite:false,depthTest:true,side:T.DoubleSide,blending:T.AdditiveBlending,toneMapped:false}));
 veins.name='shield-aura-frost-branches';veins.rotation.x=-Math.PI/2;veins.renderOrder=4;veins.frustumCulled=false;veins.visible=false;scene.add(veins);
 const crystalGeometry=new T.IcosahedronGeometry(1,0);
 const crystalMaterial=new T.MeshStandardMaterial({color:0xcbe9fa,emissive:0x34596c,emissiveIntensity:.42,metalness:.18,roughness:.28,transparent:true,opacity:.156,depthWrite:false,flatShading:true});
 const crystals=new T.InstancedMesh(crystalGeometry,crystalMaterial,34);
 crystals.name='shield-aura-ice-crystals';crystals.frustumCulled=false;crystals.visible=false;scene.add(crystals);
 const dummy=new T.Object3D(),crystalOffsets=Array.from({length:crystals.count},(_,i)=>{
  const angle=i*2.3999632297,radius=(2.35+((i*19)%13)/13*1.3)*SHIELD_AURA_RADIUS/4,size=.09+((i*7)%9)/9*.12;
  return{x:Math.cos(angle)*radius,z:Math.sin(angle)*radius,angle,size};
 });
 let elapsed=0,terrainAt=null;
 function conformToGround(s,x,y,z){
  const heightAt=s.world?.heightAt?.bind(s.world);
  const height=(wx,wz)=>{const sampled=heightAt?.(wx,wz);return Number.isFinite(sampled)?sampled:y;};
  const positions=terrainGeometry.getAttribute('position');
  for(let i=0;i<positions.count;i++){
   const wx=x+positions.getX(i),wz=z-positions.getY(i);
   positions.setZ(i,height(wx,wz)-y);
  }
  positions.needsUpdate=true;
  crystalOffsets.forEach(crystal=>{crystal.y=height(x+crystal.x,z+crystal.z)-y;});
  terrainAt={x,y,z,world:s.world};
 }
 function updateCrystals(reducedMotion){
  const phase=elapsed%1,front=Math.min(1.04,phase/.86*1.04);
  const fade=phase<=.86?1:1-((phase-.86)/.14)**2*(3-2*(phase-.86)/.14);
  crystalOffsets.forEach(({x,z,y,angle,size},i)=>{
   const radius=Math.hypot(x,z)/SHIELD_AURA_RADIUS;
   const revealed=reducedMotion?1:Math.max(0,Math.min(1,(front-radius+.055)/.1))*fade;
   dummy.position.set(x,y+.06+size*.5,z);
   dummy.rotation.set(.13*i,angle,.27*i);
   dummy.scale.set(size*.75*revealed,size*(1.7+(i%4)*.35)*revealed,size*.7*revealed);
   dummy.updateMatrix();crystals.setMatrixAt(i,dummy.matrix);
  });
  crystals.instanceMatrix.needsUpdate=true;
 }
 function update(s,dt=0,reducedMotion=false){
  ground.visible=veins.visible=crystals.visible=!!s.arms?.some(p=>p?.key==='shieldArm'&&!p.disabled)&&!s.dead;
  if(!ground.visible){elapsed=0;return;}
  if(!reducedMotion)elapsed+=Math.max(0,dt);
  uniforms.clock.value=elapsed;
  uniforms.pulseStrength.value=reducedMotion?0:1;
  const y=s.player.groundY??s.player.y??0;
  if(!terrainAt||terrainAt.world!==s.world||Math.hypot(s.player.x-terrainAt.x,s.player.z-terrainAt.z)>.25||Math.abs(y-terrainAt.y)>.08)conformToGround(s,s.player.x,y,s.player.z);
  updateCrystals(reducedMotion);
  ground.position.set(s.player.x,y+.08,s.player.z);
  veins.position.set(s.player.x,y+.086,s.player.z);
  crystals.position.set(s.player.x,y,s.player.z);
 }
 return{update,reset(){ground.visible=veins.visible=crystals.visible=false;elapsed=0;terrainAt=null;},info:()=>({shieldAuraVisible:ground.visible}),dispose(){for(const part of [ground,veins,crystals]){part.removeFromParent();part.material.dispose();}terrainGeometry.dispose();crystalGeometry.dispose();veinsTexture.dispose();}};
}

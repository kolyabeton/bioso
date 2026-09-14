import * as T from 'three';

const CAPACITY=400;
const vertexShader=`
 attribute vec3 center;
 attribute vec2 data;
 varying vec2 vUv;
 varying vec2 vData;
 void main(){
  vUv=uv;vData=data;
  vec2 q=position.xy*data.x;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(center.x+q.x,center.y,center.z-q.y,1.);
 }`;
const fragmentShader=`
 precision highp float;
 uniform float clock;
 varying vec2 vUv;
 varying vec2 vData;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
 float bubble(vec2 p,vec2 center,float radius){float d=length(p-center);return smoothstep(radius*.38,radius*.58,d)*(1.-smoothstep(radius*.72,radius,d));}
 void main(){
  vec2 p=vUv*2.-1.;float seed=vData.y,a=atan(p.y,p.x),r=length(p);
  float wobble=.78+.075*sin(a*3.+seed)+.045*sin(a*5.-seed*1.7)+.025*sin(a*9.+seed*.4);
  float grain=noise(p*4.+seed);
  float body=1.-smoothstep(wobble-.075,wobble+.025,r+(grain-.5)*.035);
  if(body<.008)discard;
  float rim=smoothstep(wobble-.14,wobble-.055,r)*(1.-smoothstep(wobble-.055,wobble+.02,r));
  float cells=noise(p*7.+vec2(seed,clock*.14));
  vec2 b1=vec2(sin(seed*1.7),cos(seed*2.1))*.34;
  vec2 b2=vec2(cos(seed*2.7),sin(seed*1.3))*.48;
  vec2 b3=vec2(sin(seed*.8+2.),cos(seed*1.9+1.))*.25;
  float bubbles=bubble(p,b1,.105)+bubble(p,b2,.07)+bubble(p,b3,.055);
  float pulse=.5+.5*sin(clock*2.2+seed+r*9.);
  float sheen=exp(-pow(p.y+p.x*.22+.18,2.)*95.)*smoothstep(-.65,.25,p.x)*(1.-smoothstep(.28,.7,p.x));
  vec3 deep=vec3(.12,.20,.055),acid=vec3(.42,.68,.09),hot=vec3(.77,.91,.22);
  vec3 color=mix(deep,acid,.36+cells*.32);
  color=mix(color,hot,clamp(bubbles*(.55+.25*pulse)+rim*.18+sheen*.48,0.,.85));
  float alpha=body*(.5+cells*.11)+rim*.2+bubbles*.18+sheen*.09;
  gl_FragColor=vec4(color,alpha);
 }`;

/** Animated organic acid surface with an irregular rim and small gas bubbles. */
export function createAcidPuddleView(scene){
 const geometry=new T.InstancedBufferGeometry();
 geometry.setAttribute('position',new T.Float32BufferAttribute([-.5,-.5,0,.5,-.5,0,.5,.5,0,-.5,.5,0],3));
 geometry.setAttribute('uv',new T.Float32BufferAttribute([0,0,1,0,1,1,0,1],2));geometry.setIndex([0,1,2,0,2,3]);
 const center=new T.InstancedBufferAttribute(new Float32Array(CAPACITY*3),3).setUsage(T.DynamicDrawUsage);
 const data=new T.InstancedBufferAttribute(new Float32Array(CAPACITY*2),2).setUsage(T.DynamicDrawUsage);
 geometry.setAttribute('center',center);geometry.setAttribute('data',data);geometry.instanceCount=0;
 const material=new T.ShaderMaterial({vertexShader,fragmentShader,uniforms:{clock:{value:0}},transparent:true,depthWrite:false,depthTest:true,side:T.DoubleSide,toneMapped:false});
 const mesh=new T.Mesh(geometry,material);mesh.name='acid-puddles';mesh.renderOrder=3;mesh.frustumCulled=false;scene.add(mesh);
 let clock=0;
 function update(puddles,dt=0,reducedMotion=false,enlarged=false){
  if(!reducedMotion)clock+=Math.max(0,dt);material.uniforms.clock.value=clock;
  const visible=puddles.slice(0,CAPACITY);geometry.instanceCount=visible.length;
  visible.forEach((p,i)=>{center.setXYZ(i,p.x,(p.y??0)+.025,p.z);data.setXY(i,2.5*(enlarged?1.5:1),(p.id??i+1)*.731);});
  center.needsUpdate=data.needsUpdate=true;
 }
 return{update,reset(){geometry.instanceCount=0;clock=0;},dispose(){mesh.removeFromParent();geometry.dispose();material.dispose();}};
}

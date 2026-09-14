import * as T from 'three';
import {ATTACK_WARNING_OPACITY} from './attack-warning-style.js';

export function createSlimeSurfaceGeometry(capacity){
 const geometry=new T.PlaneGeometry(2.12,2.12);geometry.rotateX(-Math.PI/2);
 geometry.setAttribute('effectData',new T.InstancedBufferAttribute(new Float32Array(capacity*2),2).setUsage(T.DynamicDrawUsage));
 return geometry;
}

export function createSlimeSurfaceMaterial(impact=false){return new T.ShaderMaterial({uniforms:{clock:{value:0},warningOpacity:{value:ATTACK_WARNING_OPACITY}},transparent:true,depthWrite:false,depthTest:impact,side:T.DoubleSide,forceSinglePass:true,toneMapped:false,
 vertexShader:`
  attribute vec2 effectData;
  varying vec2 vUv;
  varying vec2 vEffectData;
  void main(){
   vUv=uv;vEffectData=effectData;
   vec4 p=vec4(position,1.);
   #ifdef USE_INSTANCING
    p=instanceMatrix*p;
   #endif
   gl_Position=projectionMatrix*modelViewMatrix*p;
  }`,
 fragmentShader:`
  precision highp float;
  uniform float clock;
  uniform float warningOpacity;
  varying vec2 vUv;
  varying vec2 vEffectData;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
  float bubble(vec2 p,vec2 center,float radius){float d=length(p-center);return smoothstep(radius*.38,radius*.58,d)*(1.-smoothstep(radius*.72,radius,d));}
  void main(){
   vec2 p=vUv*2.-1.;float a=atan(p.y,p.x),r=length(p);
   float progress=vEffectData.x,seed=vEffectData.y;
   float wobble=${impact?'.70+.14*sin(a*3.+seed)+.075*sin(a*5.-seed*1.7)+.045*sin(a*9.+seed*.4)':'.78+.075*sin(a*3.+seed)+.045*sin(a*5.-seed*1.7)+.025*sin(a*9.+seed*.4)'};
   float grain=noise(p*4.+seed);
   float body=1.-smoothstep(wobble-.075,wobble+.025,r+(grain-.5)*.04);
   if(body<.008)discard;
   float rim=smoothstep(wobble-.11,wobble-.055,r)*(1.-smoothstep(wobble-.055,wobble+.005,r));
   float cells=noise(p*7.+vec2(seed,clock*.16));
   float bubbles=bubble(p,vec2(-.28,.18),.11)+bubble(p,vec2(.36,-.22),.075)+bubble(p,vec2(.08,.39),.055);
   float pulse=.5+.5*sin(clock*2.4+r*10.);
   float sheen=exp(-pow(p.y+p.x*.22+.18,2.)*95.)*smoothstep(-.65,.25,p.x)*(1.-smoothstep(.28,.7,p.x));
   ${impact?`float reveal=smoothstep(0.,.10,progress),fade=1.-smoothstep(.72,1.,progress);
   vec3 deep=vec3(.12,.20,.055),slime=vec3(.42,.68,.09),foam=vec3(.77,.91,.22);
   vec3 color=mix(deep,slime,.36+cells*.32);
   color=mix(color,foam,clamp(bubbles*(.55+.25*pulse)+sheen*.48,0.,.85));
   float alpha=(body*(.5+cells*.11)+bubbles*.18+sheen*.09)*reveal*fade;`:`float readiness=smoothstep(0.,1.,progress);
   vec3 color=mix(vec3(.78,.82,.49),vec3(.86,.94,.42),readiness*.55+rim*.2);
   float alpha=(rim*(.46+.18*readiness)+bubbles*.02+body*.025)*(.86+.14*pulse);`}
   gl_FragColor=vec4(color,${impact?'alpha':'min(alpha,warningOpacity)'});
  }`});}

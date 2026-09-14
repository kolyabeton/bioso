import * as T from 'three';
import {createWeatherState,ENVIRONMENT_WEATHER} from './environment-weather.js';

/** One bounded procedural batch; the existing sun/sky are reused. No rain textures. */
export function createEnvironmentWeatherView(scene,sun,sky){
 const state=createWeatherState(),fog=new T.Fog('#a0b0ba',45,130),colors={},tint=new T.Color();
 for(const [id,p] of Object.entries(ENVIRONMENT_WEATHER))colors[id]=Object.fromEntries(['sun','sky','ground','fog','particle'].map(k=>[k,new T.Color(p[k])]));
 const u={weatherTime:{value:0},weatherDrift:{value:0},weatherFall:{value:0},weatherCount:{value:0},weatherRain:{value:0},weatherWind:{value:0},weatherHero:{value:new T.Vector3()},weatherColor:{value:new T.Color()}};
 const material=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:u,
  vertexShader:`uniform float weatherDrift,weatherFall,weatherCount,weatherRain;attribute float weatherIndex;uniform vec3 weatherHero;varying vec2 dropUV;varying float weatherAlpha;
   void main(){
    vec3 seed=instanceMatrix[3].xyz;
    vec3 p=vec3(mod(seed.x+weatherDrift*2.0-weatherHero.x+18.0,36.0)-18.0,
     fract(seed.y-weatherFall)*13.0,
     mod(seed.z+weatherDrift*.6-weatherHero.z+26.0,52.0)-26.0)+weatherHero;
    vec4 mv=viewMatrix*vec4(p,1.0);
    vec2 size=mix(vec2(.07+.05*fract(seed.x),.07),vec2(.065,1.1),weatherRain);
    mv.xy+=position.xy*size;mv.x-=position.y*size.y*weatherRain*.25;
    gl_Position=projectionMatrix*mv;dropUV=uv*2.0-1.0;
    weatherAlpha=mix(.35,.5,weatherRain)*smoothstep(0.0,1.2,p.y-weatherHero.y)*(1.0-smoothstep(10.5,13.0,p.y-weatherHero.y));
    weatherAlpha*=smoothstep(0.0,8.0,weatherCount-weatherIndex);
   }`,
  fragmentShader:`uniform vec3 weatherColor;uniform float weatherRain;varying vec2 dropUV;varying float weatherAlpha;
   void main(){float roundMask=pow(max(0.0,1.0-dot(dropUV,dropUV)),1.4);
    float streak=(1.0-smoothstep(.15,1.0,abs(dropUV.x)))*(1.0-abs(dropUV.y));
    gl_FragColor=vec4(weatherColor,mix(roundMask,streak,weatherRain)*weatherAlpha);}`});
 const mesh=new T.InstancedMesh(new T.PlaneGeometry(1,1),material,96),pose=new T.Object3D();
 mesh.geometry.setAttribute('weatherIndex',new T.InstancedBufferAttribute(Float32Array.from({length:96},(_,i)=>i),1));
 mesh.name='environment-weather';mesh.frustumCulled=false;mesh.visible=false;
 for(let i=0;i<96;i++){pose.position.set((i*13.73)%36-18,(i*.61803)%1,(i*19.31)%52-26);pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix);}
 scene.add(mesh);let frame=null;
 function update(s,dt,{quality='medium',reducedMotion=false,paused=false,windUniforms=null}={}){
  if(s.world.presentation!=='biomes'){mesh.visible=false;return;}
  const previousTime=frame?.time??0;
  frame=state.update(s,paused||globalThis.document?.hidden?0:dt);
  const delta=Math.max(0,frame.time-previousTime);
  const values={key:0,fill:0,near:0,far:0,rain:0,wind:0,density:0};
  sun.color.setRGB(0,0,0);sky.color.setRGB(0,0,0);sky.groundColor.setRGB(0,0,0);fog.color.setRGB(0,0,0);u.weatherColor.value.setRGB(0,0,0);
  for(const [id,w] of Object.entries(frame.weights)){
   const p=ENVIRONMENT_WEATHER[id],c=colors[id];for(const k of Object.keys(values))values[k]+=p[k]*w;
   sun.color.add(tint.copy(c.sun).multiplyScalar(w));sky.color.add(tint.copy(c.sky).multiplyScalar(w));sky.groundColor.add(tint.copy(c.ground).multiplyScalar(w));fog.color.add(tint.copy(c.fog).multiplyScalar(w));u.weatherColor.value.add(tint.copy(c.particle).multiplyScalar(w));
  }
  sun.intensity=values.key;sky.intensity=values.fill;fog.near=values.near;fog.far=values.far;scene.fog=fog;scene.background=fog.color;
  u.weatherTime.value=frame.time;u.weatherRain.value=values.rain;u.weatherWind.value=values.wind;u.weatherHero.value.set(s.player.x,s.player.y??0,s.player.z);
  // Integrate velocity: changing the weather must not reposition all old particles.
  u.weatherDrift.value+=delta*values.wind;u.weatherFall.value+=delta*(.045+.805*values.rain);
  if(windUniforms){windUniforms.forestTime.value=frame.time;windUniforms.forestWind.value=reducedMotion?0:values.wind*(.8+.2*Math.sin(frame.time*.9));}
  u.weatherCount.value=reducedMotion?0:({low:32,medium:72,high:96}[quality]||72)*values.density;
  mesh.count=Math.ceil(u.weatherCount.value);mesh.visible=mesh.count>0;
 }
 return{update,info:()=>({weather:frame?.name,weatherEnvironment:frame?.id,weatherBlend:frame?.weights,weatherParticles:mesh.visible?mesh.count:0}),reset(){state.reset();frame=null;mesh.visible=false;u.weatherDrift.value=u.weatherFall.value=0;},dispose(){scene.remove(mesh);mesh.dispose();mesh.geometry.dispose();material.dispose();}};
}

import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {assembleBiomeWorld} from '../src/biome-world.js';
import {environmentId} from '../src/environment-profiles.js';
import {createWeatherState,weatherWeights,ENVIRONMENT_WEATHER} from '../src/environment-weather.js';
import {createEnvironmentWeatherView} from '../src/environment-weather-view.js';
import {SEAMLESS_GROUND_GLSL} from '../src/ground-sampling.js';
import {createWorldRun} from '../src/world-run.js';

test('all five cells have different weather; weights are continuous on boundaries',()=>{
 const world=assembleBiomeWorld(20260908),names=new Set();
 for(const id of Object.keys(ENVIRONMENT_WEATHER)){
  const tile=world.tiles.find(t=>environmentId(t)===id),p={x:tile.x,z:tile.z};
  const weights=weatherWeights(world,p);assert.equal(weights[id],1);names.add(ENVIRONMENT_WEATHER[id].name);
 }
 assert.equal(names.size,5);
 const tile=world.tiles.find(t=>world.tileAt(t.x+64,t.z)&&environmentId(world.tileAt(t.x+64,t.z))!==environmentId(t));
 const a=weatherWeights(world,{x:tile.x+32-1e-5,z:tile.z}),b=weatherWeights(world,{x:tile.x+32+1e-5,z:tile.z});
 for(const id of Object.keys(ENVIRONMENT_WEATHER))assert.ok(Math.abs((a[id]||0)-(b[id]||0))<1e-4);
});
test('survival weather blends over time, holds on pause and resets for a new world',()=>{
 const world=assembleBiomeWorld(1),s={world,player:{x:0,z:0}},weather=createWeatherState();
 const first=weather.update(s,0),rain=world.tiles.find(t=>environmentId(t)==='overgrown-city');
 s.player={x:rain.x,z:rain.z};assert.deepEqual(weather.update(s,0),first);
 const next=weather.update(s,.1);assert.ok(next.weights['overgrown-city']>0&&next.weights['overgrown-city']<.1);
 for(let i=0;i<150;i++)weather.update(s,.1);
 assert.ok(weather.update(s,0).weights['overgrown-city']>.99);
 weather.reset();assert.equal(weather.update(s,0).weights['overgrown-city'],1);
});
test('weather anticipates a boundary and stays continuous when crossing back and forth',()=>{
 const world=assembleBiomeWorld(1),a=weatherWeights(world,{x:0,z:16});
 assert.ok(a['quiet-scrapyard']>0);assert.ok(a['upper-gardens']>.9);
 const state=createWeatherState(),s={world,player:{x:0,z:12}};let previous=state.update(s,0);
 for(let i=0;i<600;i++){
  s.player.z=12+40*(.5-.5*Math.cos(i/599*Math.PI*2));
  const next=state.update(s,1/30);
  for(const id of Object.keys(ENVIRONMENT_WEATHER))assert.ok(Math.abs(next.weights[id]-previous.weights[id])<.012);
  assert.ok(Math.abs(Object.values(next.weights).reduce((a,b)=>a+b,0)-1)<1e-10);previous=next;
 }
});
test('each mission retains its own weather at the entrance, gates and final room',()=>{
 const seen=new Set();
 for(const mode of ['garden','quarantine','core','nursery','mother']){
  const s=createWorldRun(undefined,mode,42),state=createWeatherState(),id=s.world.environmentId;
  for(const z of [22,-32,s.world.tiles.at(-1).z]){
   s.player.z=z;assert.deepEqual(weatherWeights(s.world,s.player),{[id]:1});
   seen.add(state.update(s,.1).name);
  }
 }
 assert.equal(seen.size,5);
});
test('weather reuses lights, bounds particles and honours pause/reduced motion',()=>{
 const scene=new T.Scene(),sun=new T.DirectionalLight(),sky=new T.HemisphereLight(),view=createEnvironmentWeatherView(scene,sun,sky);
 const world=assembleBiomeWorld(1),tile=world.tiles.find(t=>environmentId(t)==='overgrown-city'),s={world,player:{x:tile.x,z:tile.z,y:0}};
 view.update(s,.1);assert.equal(view.info().weather,'overcast-rain');assert.equal(view.info().weatherParticles,72);
 const mesh=scene.getObjectByName('environment-weather'),time=mesh.material.uniforms.weatherTime.value;
 view.update(s,1,{paused:true});assert.equal(mesh.material.uniforms.weatherTime.value,time);
 view.update(s,.1,{reducedMotion:true});assert.equal(mesh.visible,false);assert.equal(view.info().weatherParticles,0);
 assert.ok(scene.fog&&sun.intensity<2&&sky.intensity>1);
 view.dispose();assert.equal(scene.children.length,0);
});
test('late-session weather changes integrate particle velocity without trajectory jumps',()=>{
 const scene=new T.Scene(),view=createEnvironmentWeatherView(scene,new T.DirectionalLight(),new T.HemisphereLight());
 const world=assembleBiomeWorld(1),s={world,player:{x:0,z:0,y:0}};
 for(let i=0;i<18000;i++)view.update(s,.1);
 const u=scene.getObjectByName('environment-weather').material.uniforms;
 const before={drift:u.weatherDrift.value,fall:u.weatherFall.value};
 const rain=world.tiles.find(t=>environmentId(t)==='overgrown-city');s.player={x:rain.x,z:rain.z,y:0};
 view.update(s,1/30);
 assert.ok(u.weatherDrift.value-before.drift<.04);assert.ok(u.weatherFall.value-before.fall<.03);
 const held=u.weatherFall.value;view.update(s,.1,{paused:true});assert.equal(u.weatherFall.value,held);
 assert.match(scene.getObjectByName('environment-weather').material.vertexShader,/smoothstep\(0.0,8.0,weatherCount-weatherIndex\)/);
 view.dispose();
});
test('ground repeat sampling uses continuous windows and unwrapped mip gradients',()=>{
 assert.equal((SEAMLESS_GROUND_GLSL.match(/textureGrad\(/g)||[]).length,4);
 assert.match(SEAMLESS_GROUND_GLSL,/dFdx\(p\)/);
 // Independent numerical check with deliberately non-tileable source values.
 const fract=x=>x-Math.floor(x),w=x=>{const t=Math.min(1,Math.min(x,1-x)/.18);return t*t*(3-2*t);};
 const sample=(x,y)=>{const f=[fract(x),fract(y)],q=[fract(x+.5),fract(y+.5)],s=(x,y)=>x*x+y*.7;
  return(s(q[0],q[1])*(1-w(f[0]))+s(f[0],q[1])*w(f[0]))*(1-w(f[1]))+(s(q[0],f[1])*(1-w(f[0]))+s(f[0],f[1])*w(f[0]))*w(f[1]);};
 for(const edge of [-1,-.5,0,.5,1])for(const y of [-.5,0,.12,.5,.9])assert.ok(Math.abs(sample(edge-1e-7,y)-sample(edge+1e-7,y))<1e-5);
});

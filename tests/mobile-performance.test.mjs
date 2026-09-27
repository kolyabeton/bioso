import test from 'node:test';
import assert from 'node:assert/strict';
import {isMobileDevice,deviceDefaults,normalizeSettings,readSettings,DEFAULT_SETTINGS,MOBILE_SETTINGS,SETTINGS_KEY} from '../src/ui/settings.js';
import {createRenderScaleGovernor,RENDER_SCALE_MIN,RENDER_SCALE_STEP} from '../src/render-scale.js';

const PHONE={userAgent:'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36',maxTouchPoints:5,width:412,platform:'Linux armv8l'};
const IPHONE={userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1',maxTouchPoints:5,width:390,platform:'iPhone'};
const IPAD={userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15',maxTouchPoints:5,width:1024,platform:'MacIntel'};
const DESKTOP={userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36',maxTouchPoints:0,width:1920,platform:'MacIntel'};
const TOUCH_LAPTOP={userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120 Safari/537.36',maxTouchPoints:10,width:1920,platform:'Win32'};

test('phones and touch tablets are detected; desktops and touch laptops are not',()=>{
 for(const env of [PHONE,IPHONE,IPAD])assert.equal(isMobileDevice(env),true,JSON.stringify(env.platform));
 for(const env of [DESKTOP,TOUCH_LAPTOP])assert.equal(isMobileDevice(env),false,JSON.stringify(env.platform));
 assert.equal(isMobileDevice({}),false);
 assert.equal(isMobileDevice(),false);
});

test('an untouched profile starts low and 30 fps on mobile, high and 60 on desktop',()=>{
 assert.equal(deviceDefaults(PHONE).quality,MOBILE_SETTINGS.quality);
 assert.equal(deviceDefaults(PHONE).fps,MOBILE_SETTINGS.fps);
 assert.equal(deviceDefaults(DESKTOP).quality,DEFAULT_SETTINGS.quality);
 assert.equal(deviceDefaults(DESKTOP).fps,DEFAULT_SETTINGS.fps);
 // Everything outside the mobile overrides keeps its shared default.
 for(const key of Object.keys(DEFAULT_SETTINGS))if(!(key in MOBILE_SETTINGS))assert.equal(deviceDefaults(PHONE)[key],DEFAULT_SETTINGS[key]);
});

test('a stored choice always outranks the device default',()=>{
 const mobile=deviceDefaults(PHONE);
 assert.equal(normalizeSettings({quality:'high',fps:60},mobile).quality,'high');
 assert.equal(normalizeSettings({quality:'high',fps:60},mobile).fps,60);
 // An unrelated stored key must not resurrect the desktop performance defaults.
 assert.equal(normalizeSettings({music:10},mobile).quality,'low');
 const storage={getItem:()=>JSON.stringify({quality:'medium'}),setItem(){}};
 assert.equal(readSettings(storage,mobile).quality,'medium');
 assert.equal(readSettings({getItem:()=>null,setItem(){}},mobile).quality,'low');
 assert.equal(readSettings({getItem:()=>null,setItem(){}},mobile).renderMode,'sharp');
 assert.equal(normalizeSettings({renderMode:'fast'},mobile).renderMode,'fast');
 assert.equal(normalizeSettings({renderMode:'unknown'},mobile).renderMode,'sharp');
 assert.equal(SETTINGS_KEY,'biomecha.settings.v1');
});

const feed=(g,{cpuMs=5,intervalMs=1000/60,gpuMs=null,fps=60,active=true,gpuSampleId}={},seconds=6)=>{
 for(let i=0;i<Math.ceil(seconds*1000/intervalMs);i++)g.sampleFrame({cpuMs,intervalMs,gpuMs,fps,active,gpuSampleId});
};

test('missed frames without GPU queries thin decoration before reducing resolution',()=>{
 const g=createRenderScaleGovernor();
 feed(g,{intervalMs:1000/30},6);
 assert.equal(g.decorationScale(),.5);assert.equal(g.scale(),1);
 assert.equal(g.info().adaptationGpuMs,null);
 feed(g,{intervalMs:1000/30},9);assert.equal(g.scale(),1-RENDER_SCALE_STEP);
 feed(g,{intervalMs:1000/30},30);assert.equal(g.scale(),RENDER_SCALE_MIN);
});

test('full CPU frame and fresh GPU samples can each trigger adaptation',()=>{
 for(const pressure of [{cpuMs:25},{gpuMs:25}]){
  const g=createRenderScaleGovernor();feed(g,pressure,6);
  assert.equal(g.decorationScale(),.5);
 }
});

test('healthy 30 and 60 fps cadence never treats intentional frame pacing as overload',()=>{
 for(const fps of [30,60]){const g=createRenderScaleGovernor();feed(g,{fps,intervalMs:1000/fps},60);assert.equal(g.scale(),1);assert.equal(g.decorationScale(),1);}
});

test('stale GPU measurements and isolated frame stalls cannot drive sustained degradation',()=>{
 const g=createRenderScaleGovernor();feed(g,{gpuMs:80,gpuSampleId:1},15);
 assert.equal(g.scale(),1);assert.equal(g.decorationScale(),1);
 assert.equal(g.info().adaptationGpuMs,null);
 for(let i=0;i<10;i++){feed(g,{},2);g.sampleFrame({cpuMs:200,intervalMs:200,fps:60});}
 assert.equal(g.decorationScale(),1);
});

test('pause, hidden-tab gaps and a changed target discard the preceding load window',()=>{
 const g=createRenderScaleGovernor();feed(g,{cpuMs:50},2.5);
 feed(g,{active:false,cpuMs:999},10);
 g.sampleFrame({cpuMs:100,intervalMs:5000,fps:60});
 feed(g,{},2);assert.equal(g.decorationScale(),1);
 feed(g,{cpuMs:50},1);
 feed(g,{fps:30,intervalMs:1000/30},3);assert.equal(g.decorationScale(),1);
 g.suspend();g.sampleFrame({cpuMs:100,intervalMs:500,fps:30});
 feed(g,{fps:30,intervalMs:1000/30},3);assert.equal(g.decorationScale(),1);
});

test('sustained recovery restores resolution before decoration, with hysteresis',()=>{
 const g=createRenderScaleGovernor();feed(g,{cpuMs:50},35);
 assert.equal(g.scale(),RENDER_SCALE_MIN);assert.equal(g.decorationScale(),.5);
 feed(g,{},7);assert.equal(g.scale(),RENDER_SCALE_MIN);
 feed(g,{},13);assert.ok(g.scale()>RENDER_SCALE_MIN);assert.equal(g.decorationScale(),.5);
 feed(g,{},60);assert.equal(g.scale(),1);assert.equal(g.decorationScale(),1);
});

test('choosing a preset restores full resolution and decoration; suspend preserves quality',()=>{
 const g=createRenderScaleGovernor();feed(g,{cpuMs:50},35);
 g.suspend();assert.equal(g.scale(),RENDER_SCALE_MIN);assert.equal(g.decorationScale(),.5);
 g.restore();assert.equal(g.scale(),1);assert.equal(g.decorationScale(),1);
});

test('mobile low keeps at least 1.2 canvas pixels per CSS pixel',()=>{
 const g=createRenderScaleGovernor();
 g.setMinimum(1.2/1.4);
 feed(g,{cpuMs:50},35);
 assert.ok(g.scale()*1.4>=1.2-1e-9);
 assert.ok(g.scale()<1);
});

test('decoration density reduces emitted particles without changing their size or lifetime',async()=>{
 const {createBioParticles}=await import('../src/bio-fx.js');
 const full=createBioParticles(),reduced=createBioParticles();
 full.configure('low',false,1);reduced.configure('low',false,.5);
 const event=Object.freeze({type:'hit',key:'pistol',x:0,z:0});
 full.emit(event);reduced.emit(event);
 assert.ok(reduced.count()<full.count());
 assert.equal(reduced.particles[0].size,full.particles[0].size);
 assert.equal(reduced.particles[0].duration,full.particles[0].duration);
 reduced.configure('low',true,.5);assert.equal(reduced.count(),0);
});

test('weather and forest density affect decorative batches only',async()=>{
 const T=await import('three');
 const {createForestAmbientView}=await import('../src/forest-ambient-view.js');
 const {createEnvironmentWeatherView}=await import('../src/environment-weather-view.js');
 const tile={biome:'forest',decorations:[{feature:'thicket',x:0,z:0,size:3}]};
 const s={world:{presentation:'biomes',tiles:[tile],tileAt:()=>tile},player:{x:1,z:0},motion:{x:1,z:0},enemies:[]};
 const scene=new T.Scene(),forest=createForestAmbientView(scene);
 forest.update(s,.1,'low',false,1);const before=forest.info();
 forest.update(s,0,'low',false,.5);const after=forest.info();
 assert.equal(after.particles,before.particles/2);assert.equal(after.contactShadows,before.contactShadows);assert.equal(after.birds,before.birds);
 forest.update(s,0,'low',false,0);const quiet=forest.info();
 assert.equal(quiet.particles,0);assert.equal(quiet.birds,0);assert.equal(quiet.contactShadows,after.contactShadows);
 const weather=createEnvironmentWeatherView(scene,new T.DirectionalLight(),new T.HemisphereLight());
 weather.update(s,.1,{quality:'low'});const initial=weather.info().weatherParticles;
 weather.update(s,0,{quality:'low',particleScale:.5});assert.ok(weather.info().weatherParticles<=Math.ceil(initial/2));
 weather.update(s,0,{quality:'low',particleScale:0});assert.equal(weather.info().weatherParticles,0);
 forest.dispose();weather.dispose();assert.equal(scene.children.length,0);
});

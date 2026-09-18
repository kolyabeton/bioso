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
 // Everything outside the two performance keys keeps its shared default.
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
 assert.equal(SETTINGS_KEY,'biomecha.settings.v1');
});

const feed=(g,ms,seconds,fps=30)=>{for(let i=0;i<Math.round(seconds*fps);i++)g.sample(ms,1/fps,fps);};

test('render scale drops under a missed frame budget and recovers when the budget is met',()=>{
 const g=createRenderScaleGovernor();
 assert.equal(g.scale(),1);
 // 60 ms frames against a 33 ms budget: one step down per overload window.
 feed(g,60,4);assert.equal(g.scale(),1-RENDER_SCALE_STEP);
 feed(g,60,4);assert.equal(g.scale(),1-2*RENDER_SCALE_STEP);
 feed(g,60,20);assert.equal(g.scale(),RENDER_SCALE_MIN,'never below the floor');
 // Comfortable frames climb back, one step per raise window, and stop at full.
 feed(g,10,10);assert.ok(g.scale()>RENDER_SCALE_MIN);
 feed(g,10,40);assert.equal(g.scale(),1,'never above full resolution');
 assert.equal(g.info().renderScale,1);
});

test('render scale holds steady inside the budget and ignores idle frames',()=>{
 const g=createRenderScaleGovernor();
 // 30 ms against a 33 ms budget is neither overloaded nor relaxed.
 feed(g,30,30);assert.equal(g.scale(),1);
 // A paused or zero-length frame must not shift anything.
 for(let i=0;i<500;i++)g.sample(999,0,30);
 assert.equal(g.scale(),1);
 for(let i=0;i<500;i++)g.sample(999,1/30,0);
 assert.equal(g.scale(),1);
});

test('picking a quality preset restores full resolution so the governor re-measures',()=>{
 const g=createRenderScaleGovernor();
 feed(g,60,8);assert.ok(g.scale()<1);
 g.restore();assert.equal(g.scale(),1);
});

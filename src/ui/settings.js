import {DEFAULT_LANGUAGE, normalizeLanguage} from '../i18n/index.js';
export const SETTINGS_KEY='biomecha.settings.v1';
export const DEFAULT_SETTINGS=Object.freeze({difficulty:100,language:'ru',soundEnabled:true,effects:50,music:50,quality:'high',cameraMode:'standard',fps:60,renderMode:'sharp',vibration:true,reducedMotion:false,storyEnabled:true});
/** A phone GPU cannot afford the desktop defaults: 'high' renders at twice the
 * device pixels, so an untouched profile starts at 'low' and 30 fps instead. */
export const MOBILE_SETTINGS=Object.freeze({quality:'low',fps:30});
const MOBILE_UA=/android|iphone|ipod|ipad|iemobile|opera mini|blackberry|windows phone/i;
export function isMobileDevice(env={}){
 const {userAgent='',maxTouchPoints=0,width=Infinity,platform=''}=env;
 if(MOBILE_UA.test(userAgent))return true;
 // iPadOS reports a desktop UA, so fall back to a touch screen with a narrow viewport.
 return maxTouchPoints>1&&(width<=1024||/mac/i.test(platform)&&/safari/i.test(userAgent)&&maxTouchPoints>2);
}
export function browserEnvironment(){
 if(typeof navigator==='undefined')return {};
 return {userAgent:navigator.userAgent||'',maxTouchPoints:navigator.maxTouchPoints||0,platform:navigator.platform||'',language:navigator.languages?.[0]||navigator.language||'',
  width:typeof window==='undefined'?Infinity:Math.min(window.innerWidth||Infinity,window.screen?.width??Infinity)};
}
export function deviceDefaults(env=browserEnvironment()){
 const language=env.language?(/^ru(?:-|$)/i.test(env.language)?'ru':'en'):DEFAULT_SETTINGS.language;
 return {...DEFAULT_SETTINGS,...(isMobileDevice(env)?MOBILE_SETTINGS:{}),language};
}
export function normalizeSettings(raw={},defaults=DEFAULT_SETTINGS) {const value={...DEFAULT_SETTINGS,...defaults};if(!raw||typeof raw!=='object')raw={};value.language=raw.language==null?value.language:normalizeLanguage(raw.language);for(const key of ['effects','music','difficulty'])if(Number.isFinite(raw[key]))value[key]=Math.max(0,Math.min(100,raw[key]));if(['low','medium','high'].includes(raw.quality))value.quality=raw.quality;if(['standard','angled'].includes(raw.cameraMode))value.cameraMode=raw.cameraMode;if([30,60].includes(raw.fps))value.fps=raw.fps;if(['sharp','fast'].includes(raw.renderMode))value.renderMode=raw.renderMode;for(const key of ['soundEnabled','vibration','reducedMotion','storyEnabled'])if(typeof raw[key]==='boolean')value[key]=raw[key];return value;}
export function readSettings(storage,defaults=deviceDefaults()){let raw={};try{raw=JSON.parse(storage.getItem(SETTINGS_KEY))||{};}catch{}return normalizeSettings(raw,defaults);}
export function createSettings(storage,{apply=()=>{},notify=()=>{},feedback=()=>{},defaults=deviceDefaults()}={}){let value=readSettings(storage,defaults);
  function update(key,next){value=normalizeSettings({...value,[key]:next},defaults);try{storage.setItem(SETTINGS_KEY,JSON.stringify(value));}catch{notify('Настройки действуют в этой сессии; сохранить их не удалось.');}apply(value);}
  function tick(cue='click'){if(value.soundEnabled&&value.effects)feedback(cue);}
  return {get:()=>value,update,tick,apply:()=>apply(value),haptic:(duration=20)=>{if(value.vibration&&typeof navigator!=='undefined'&&typeof navigator.vibrate==='function')navigator.vibrate(Math.max(1,Math.min(50,duration)));}};
}

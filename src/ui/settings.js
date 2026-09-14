import {DEFAULT_LANGUAGE, normalizeLanguage} from '../i18n/index.js';
export const SETTINGS_KEY='biomecha.settings.v1';
export const DEFAULT_SETTINGS=Object.freeze({language:DEFAULT_LANGUAGE,soundEnabled:true,effects:30,music:30,quality:'high',fps:60,vibration:true,reducedMotion:false,storyEnabled:true});
export function normalizeSettings(raw={}) {const value={...DEFAULT_SETTINGS};if(!raw||typeof raw!=='object')raw={};value.language=normalizeLanguage(raw.language);for(const key of ['effects','music'])if(Number.isFinite(raw[key]))value[key]=Math.max(0,Math.min(100,raw[key]));if(['low','medium','high'].includes(raw.quality))value.quality=raw.quality;if([30,60].includes(raw.fps))value.fps=raw.fps;for(const key of ['soundEnabled','vibration','reducedMotion','storyEnabled'])if(typeof raw[key]==='boolean')value[key]=raw[key];return value;}
export function readSettings(storage){let raw={};try{raw=JSON.parse(storage.getItem(SETTINGS_KEY))||{};}catch{}return normalizeSettings(raw);}
export function createSettings(storage,{apply=()=>{},notify=()=>{},feedback=()=>{}}={}){let value=readSettings(storage);
  function update(key,next){value=normalizeSettings({...value,[key]:next});try{storage.setItem(SETTINGS_KEY,JSON.stringify(value));}catch{notify('Настройки действуют в этой сессии; сохранить их не удалось.');}apply(value);}
  function tick(cue='click'){if(value.soundEnabled&&value.effects)feedback(cue);}
  return {get:()=>value,update,tick,apply:()=>apply(value),haptic:(duration=20)=>{if(value.vibration&&typeof navigator!=='undefined'&&typeof navigator.vibrate==='function')navigator.vibrate(Math.max(1,Math.min(50,duration)));}};
}

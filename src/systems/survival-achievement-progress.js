import {SETS,setCounts} from './sets/definitions.js';
import {FAMILIES,mutationView} from './sets/mutations.js';

const count=n=>Number.isSafeInteger(n)&&n>=0?Math.min(n,1000000):0;
const map=(value,keys)=>Object.fromEntries(keys.map(key=>[key,count(value?.[key])]));
export function normalizeSurvivalProgress(value={}){
 return {kills:count(value?.kills),elites:count(value?.elites),bosses:count(value?.bosses),recycled:count(value?.recycled),level20Runs:count(value?.level20Runs),
  sets:[...new Set((Array.isArray(value?.sets)?value.sets:[]).filter(id=>Object.hasOwn(SETS,id)))],
  setKills:map(value?.setKills,Object.keys(SETS)),mutationKills:map(value?.mutationKills,Object.keys(FAMILIES)),mutationBosses:map(value?.mutationBosses,Object.keys(FAMILIES))};
}
export const survivalProgress=p=>(p.meta??={}).survivalAchievements??=normalizeSurvivalProgress();
export const survivalRun=s=>s.survivalAchievementRun??={level20Recorded:false,setBosses:{}};
export const fullSets=s=>Object.entries(setCounts(s)).filter(([,n])=>n>=3).map(([id])=>id);
const increment=(obj,key)=>obj[key]=Math.min(1000000,(obj[key]||0)+1);

// Called on actual simulation/equipment state, never reconstructed from old records.
export function trackSurvivalState(s){
 if(s.mode!=='survival'||!s.profile||!s.body)return false;
 const p=survivalProgress(s.profile),r=survivalRun(s);let changed=false;
 if(s.level>=20&&!r.level20Recorded){r.level20Recorded=true;increment(p,'level20Runs');changed=true;}
 for(const id of fullSets(s))if(!p.sets.includes(id)){p.sets.push(id);changed=true;}
 return changed;
}
// The caller owns the once-only death transition. Secondary player damage counts;
// scenery, boss components and rewardless summoned children do not.
export function recordSurvivalKill(s,e,source){
 if(s.mode!=='survival'||source==='environment'||e.bossOwner||e.noRewards||e.kind==='objective')return;
 const p=survivalProgress(s.profile),r=survivalRun(s),boss=['boss','final'].includes(e.kind);
 increment(p,'kills');if(e.kind==='elite')increment(p,'elites');if(boss)increment(p,'bosses');
 for(const id of fullSets(s)){increment(p.setKills,id);if(boss)increment(r.setBosses,id);}
 for(const m of mutationView(s))if(m.active){increment(p.mutationKills,m.id);if(boss)increment(p.mutationBosses,m.id);}
 s.events.push({type:'profile-progress'});
}
export function recordSurvivalRecycle(s){
 if(s.mode!=='survival')return;
 increment(survivalProgress(s.profile),'recycled');s.events.push({type:'profile-progress'});
}

import {normalizeJournal,visitedBiomes,completedEventTypes} from './achievements.js';
import {CATALOG,STARTERS,MISSIONS,WEAPON_UNLOCKS,bossRewardMission,bossPartAvailable} from '../catalog.js';
import {markInventoryUnseen} from '../inventory-notifications.js';
import {ABILITIES} from './abilities.js';
const count=x=>Number.isSafeInteger(x)&&x>=0?Math.min(x,1000000):0;
const stringList=value=>[...new Set((Array.isArray(value)?value:[]).filter(item=>typeof item==='string'))].slice(0,256);
export const BASE_ABILITY_BRANCHES=Object.freeze(['might','melee','ranged','tempo','projectiles']);
export function normalizeMeta(m={}){const loadout=m?.loadout&&typeof m.loadout==='object'?Object.fromEntries(['body','arm','organ'].filter(k=>typeof m.loadout[k]==='string'||m.loadout[k]===null).map(k=>[k,m.loadout[k]])):{};return{journal:normalizeJournal(m?.journal),storyEvidence:stringList(m?.storyEvidence),storyCues:stringList(m?.storyCues),abilityBranches:stringList(m?.abilityBranches),weaponKills:{pistol:Math.min(30,count(m?.weaponKills?.pistol)),total:Math.min(60,count(m?.weaponKills?.total))},runs:count(m?.runs),wins:count(m?.wins),overruns:count(m?.overruns),rerolls:count(m?.rerolls),loadout,best:Object.fromEntries(Object.entries(m?.best&&typeof m.best==='object'?m.best:{}).filter(([k])=>['meta:harpoon','meta:mirror','meta:reactor','meta:spring'].includes(k)).map(([k,v])=>[k,count(v)]))};}
export const meta=p=>p.meta??=normalizeMeta();
export function knownAbilityBranches(p,learned=[]){const current=learned.map(id=>ABILITIES[id]?.branch==='synergy'?id:ABILITIES[id]?.branch).filter(Boolean);return[...new Set([...BASE_ABILITY_BRANCHES,...meta(p).abilityBranches,...current])];}
export function recordAbilityDiscovery(s,id){const branch=ABILITIES[id]?.branch;if(!branch)return false;const key=branch==='synergy'?id:branch,list=meta(s.profile).abilityBranches;if(BASE_ABILITY_BRANCHES.includes(key)||list.includes(key))return false;list.push(key);s.events.push({type:'profile-progress'});return true;}
export const START_BODIES=['wanderer','hunter','bastion'];
export const START_WEAPONS=['pistol','claws','shotgun'];
export const START_ORGANS=['stabilizer','regen','shield'];
export const OVERRUN_PART_UNLOCKS=[{count:3,key:'regen'},{count:3,key:'shield'}];
export const missionBossVictories=p=>MISSIONS.filter(m=>p?.achievements?.includes('mission:'+m.id)).length;
export function missionAvailable(p,id){
 const index=MISSIONS.findIndex(m=>m.id===id);if(index<0)return false;
 const victories=p?.achievements||[];
 return index===0||victories.includes('mission:'+id)||victories.includes('mission:'+MISSIONS[index-1].id);
}
export function missionRequirement(id){const index=MISSIONS.findIndex(m=>m.id===id);return index>0?`Пройдите миссию: ${MISSIONS[index-1].name}`:'';}
export function starterSlotAllowed(p,slot){return slot==='body'||slot==='arm'||slot==='organ'&&missionBossVictories(p)>=3;}
export function starterSlotRequirement(slot){return slot==='organ'?'Победите трёх боссов в миссиях':'Недоступно';}
export function starterAllowed(p,key){if(STARTERS.includes(key))return true;if(bossRewardMission(key))return bossPartAvailable(p,key);const n=meta(p).overruns;return key==='harpoon'&&n>=1||['regen','shield'].includes(key)&&n>=3||!!p?.unlocked?.includes(key);}
export function starterRequirement(key){const weapon=WEAPON_UNLOCKS.find(a=>a.key===key);if(weapon)return weapon.description;const mission=bossRewardMission(key);if(mission)return 'Победите босса: '+mission.bossName;return ({harpoon:'1 усиленная победа',regen:'3 усиленные победы',shield:'3 усиленные победы'})[key]||'Доступно с начала';}
export function validLoadout(p,choice={}){
 const saved=meta(p).loadout||{},requested={...saved,...choice};
 const selected=(slot,keys,key,fallback)=>starterSlotAllowed(p,slot)&&keys.includes(key)&&starterAllowed(p,key)?key:fallback;
 return{body:selected('body',START_BODIES,requested.body,'wanderer'),arm:selected('arm',START_WEAPONS,requested.arm,'pistol'),organ:selected('organ',START_ORGANS,requested.organ,null)};
}
export const META_ACHIEVEMENTS=[
 {id:'meta:harpoon',key:'harpoon',name:'За пределом',description:'Пройдите усиленные 30 секунд после победы над Маткой.',goal:1,progress:s=>meta(s.profile).overruns},
 {id:'meta:mirror',key:'mirrorGland',name:'Ответный удар',description:'Победите Зеркального Сборщика в миссии «Зеркальный сбор».',goal:1,progress:s=>Number(s.profile.achievements.includes('mission:nursery'))},
 {id:'meta:reactor',key:'reactor',name:'Повторный прорыв',description:'Завершите 2 усиленных продолжения в разных забегах.',goal:2,progress:s=>meta(s.profile).overruns},
 {id:'meta:spring',key:'spring',name:'Первопроходец',description:'За один забег посетите 4 вида биомов и завершите 2 разных типа событий.',goal:6,progress:s=>Math.min(4,visitedBiomes(s).length)+Math.min(2,completedEventTypes(s).length)},
];
export function awardMeta(s,createPart){for(const a of META_ACHIEVEMENTS){const m=meta(s.profile);m.best??={};const progress=Math.min(a.goal,a.progress(s));if(progress>(m.best[a.id]||0)){m.best[a.id]=progress;s.events.push({type:'profile-progress'});}if(s.profile.achievements.includes(a.id)||a.progress(s)<a.goal)continue;s.profile.achievements.push(a.id);if(s.profile.unlocked.includes(a.key))continue;s.profile.unlocked.push(a.key);const part=createPart(s,a.key);s.inventory.push(part);markInventoryUnseen(s,part);s.events.push({type:'unlock',text:`${a.name}: открыто ${CATALOG[a.key].name}`});}}
export function recordVictory(s){if(s.mode!=='survival'||!s.finalDefeated||!s.won||s.dead||s.metaVictory)return;s.metaVictory=true;s.victoryRerolls=3;meta(s.profile).wins++;meta(s.profile).rerolls+=3;s.events.push({type:'unlock',text:'Победа! +3 кубика'});}
export function startOverrun(s,spawn){
 if(s.mode!=='survival'||!s.finalDefeated||!s.won||s.dead||s.overrun||s.victoryRerollsSettled)return false;
 const guards=[];for(let i=0;i<2;i++){const e=spawn('elite',null,'mass',Math.max(960,s.time));if(e){e.hp=e.maxHp=Math.round(e.maxHp*1.5);e.overrunGuard=true;e.territory=null;guards.push(e.id);}}
 if(guards.length!==2){s.enemies=s.enemies.filter(e=>!guards.includes(e.id));return false;}
 recordVictory(s);
 // Only this victory's reward is at risk; the previously earned balance stays intact.
 const stake=Math.min(s.victoryRerolls||0,meta(s.profile).rerolls);meta(s.profile).rerolls-=stake;s.victoryRerolls=0;
 s.overrun={state:'active',elapsed:0,guards,nextWave:0};s.continued=true;s.events.push({type:'profile-progress'});return true;
}
export function tickOverrun(s,dt,spawn,createPart){
 const o=s.overrun;if(o?.state!=='active')return;
 if(s.dead||s.hp<=0){o.state='failed';s.continued=false;s.events.push({type:'notice',text:'Испытание проиграно · награда за забег: 0 кубиков'});return;}
 o.elapsed+=dt;
 if(o.elapsed>=o.nextWave){o.nextWave=o.elapsed+4;for(let i=0;i<6&&s.enemies.filter(e=>e.hp>0).length<100;i++)spawn('normal',null,i%3===0?'ranged':i%3===1?'fast':'armored',Math.max(960,s.time));}
 if(o.elapsed<30)return;
 o.state='complete';meta(s.profile).overruns++;meta(s.profile).rerolls+=6;s.victoryRerolls=6;s.continued=false;
 for(const {count:n,key}of OVERRUN_PART_UNLOCKS)if(meta(s.profile).overruns>=n&&!s.profile.unlocked.includes(key))s.profile.unlocked.push(key);
 s.events.push({type:'unlock',text:'Усиленная победа! +6 кубиков'});awardMeta(s,createPart);
}
// Keep the offered victory stake intact while the final boss's item choice is open.
export function availableRerolls(s){return Math.max(0,meta(s.profile).rerolls-(!s.overrun&&!s.victoryRerollsSettled?(s.victoryRerolls||0):0));}
export function spendReroll(s,roll){if(availableRerolls(s)<1||s.dead)return false;roll();meta(s.profile).rerolls--;return true;}

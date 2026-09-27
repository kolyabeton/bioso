import {MISSIONS} from '../catalog.js';
import {abilityLevel} from './abilities.js';
const LIMITS={recycledBiomass:100000,frozenEnemies:5000,preventedShots:10000,electricKills:50000,capacity:300};
export function normalizeChassisProgress(raw={}){return Object.fromEntries(Object.entries(LIMITS).map(([key,limit])=>[key,Number.isFinite(raw?.[key])?Math.min(limit,Math.max(0,Math.floor(raw[key]))):0]));}
export const chassisProgress=p=>p?.meta?.chassisProgress||normalizeChassisProgress();
const eligible=s=>!!s?.profile&&!s.chassisReview&&!s.training&&!s.reviewMode&&(s.mode==='survival'||MISSIONS.some(m=>m.id===s.mode));
const creature=e=>e?.hp>=0&&!e.noRewards&&!e.bossOwner&&!e.dungeonDormant&&e.kind!=='objective';
function increment(s,key,amount=1){if(!eligible(s)||amount<=0)return false;const p=(s.profile.meta??={}).chassisProgress??=normalizeChassisProgress(),old=p[key];p[key]=Math.min(LIMITS[key],old+Math.floor(amount));if(p[key]===old)return false;const events=s.events??=[];if(!events.some(e=>e.type==='profile-progress'))events.push({type:'profile-progress'});return true;}
export function recordChassisRecycle(s,pureBiomass,multiplier){return multiplier>3+1e-9&&increment(s,'recycledBiomass',pureBiomass);}
export function recordChassisFreeze(s,e){if(!eligible(s)||!creature(e)||e.chassisFreezeCounted||abilityLevel(s,'cold.3')<3)return false;e.chassisFreezeCounted=true;return increment(s,'frozenEnemies');}
export function recordChassisDefense(s,q,result){if(!q||q.chassisDefenseCounted||!['dodged','shield','armor'].includes(result))return false;q.chassisDefenseCounted=true;return increment(s,'preventedShots');}
export function recordChassisKill(s,e,source,weaponKey){if(!creature(e)||source!=='electric'||weaponKey!=='arc')return false;return increment(s,'electricKills');}
export function trackChassisCapacity(s,capacity){if(!eligible(s))return false;const p=(s.profile.meta??={}).chassisProgress??=normalizeChassisProgress(),value=Math.min(300,Math.floor(capacity));return value>p.capacity&&increment(s,'capacity',value-p.capacity);}

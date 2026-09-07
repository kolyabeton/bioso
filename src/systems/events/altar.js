import {stats} from '../../assembly.js';
import {preserveHealth} from '../health.js';
import {slotCount,isaacState} from '../mutations.js';
import {DEALS,EVENTS} from './definitions.js';
import {nearEncounter as near,availableEncounter} from './proximity.js';
export function dealAllowed(s,n,key,partId){if(!n||EVENTS[n.type]?.kind!=='altar'||n.state!=='ready'||!availableEncounter(s,n)||!near(s,n,4)||!n.deals.includes(key))return false;
 if(EVENTS[n.type]?.deal!==key||!Object.hasOwn(DEALS,key))return false;
 const st=stats(s);if(s.dead||st.hp<=1||s.hp<=1)return false;
 if(key==='armor'&&st.armor>=st.hp-1)return false;
 if(key==='fuse')return s.arms.some(p=>p?.id===partId&&!p.fused);
 if(key==='organs'&&slotCount({...s,isaac:{...s.isaac,deals:{...s.isaac?.deals,organs:(s.isaac?.deals.organs||0)+1}}},s.body,'organs')<=s.organs.length)return false;
 return true;
}
export function takeDeal(s,id,key,partId){const n=s.encounters?.nodes.find(n=>n.id===id);if(!dealAllowed(s,n,key,partId))return false;const a=isaacState(s),old=stats(s).hp;
 if(key==='fuse'){const p=s.arms.find(p=>p?.id===partId);p.fused=true;p.bound=true;}else{a.deals[key]=(a.deals[key]||0)+1;if(key==='organs')s.organs=Array.from({length:slotCount(s,s.body,'organs')},(_,i)=>s.organs[i]||null);}
 a.deals.hpCost++;preserveHealth(s,old,stats(s).hp);
 n.state='complete';n.claimed=true;s.events.push({type:'notice',text:'Сделка заключена: '+DEALS[key].name});return true;
}

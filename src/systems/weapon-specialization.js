import {modifiers} from './abilities.js';
import {combatTime} from './mutations.js';
export const isMelee=w=>['sector','area','contact'].includes(w?.mode);
export function prepareSpecializationAttack(s,p,w,repeat=false){
 const b=modifiers(s),ready=!repeat&&!isMelee(w)&&p.fullSalvoReady&&b.fullSalvo;
 if(!repeat)p.fullSalvoReady=false;
 return {...w,repeat,damage:w.damage*(ready?1+(b.fullSalvoDamage||.3):1)};
}
export function specializationHit(s,e,w){
 if(!isMelee(w)||w.secondary||w.repeat||!modifiers(s).onslaught)return 1;
 const state=s.specialization??={};state.combos??={};
 const t=combatTime(s),previous=state.combos[w.partId];
 const count=previous?.target===e.id&&t-previous.at<3?previous.count+1:1;
 state.combos[w.partId]={target:e.id,at:t,count:count===4?0:count};
 return count===4?1+(modifiers(s).onslaughtDamage||.5):1;
}
export function specializationKill(s,w){
 if(isMelee(w)&&!w.secondary&&!w.repeat&&modifiers(s).meleeFrenzy)(s.specialization??={}).frenzyUntil=combatTime(s)+4;
}

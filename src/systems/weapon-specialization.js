import {modifiers} from './abilities.js';
import {combatTime} from './mutations.js';
export {isMelee} from './hand-compatibility.js';
import {isMelee,isRangedHand} from './hand-compatibility.js';

export function weaponFamilyBonus(s,p){
 const arms=s?.arms||[],installed=arms.some(q=>q===p||(p?.id!=null&&q?.id===p.id));
 const count=installed?Math.min(4,arms.filter(q=>q?.key===p.key).length):0;
 const additional=Math.max(0,count-1);
 return p?.key==='pistol'
  ?{additional,crit:.05*count,critPower:.2*count,reload:0,spread:0}
  :p?.key==='shotgun'
   ?{additional,crit:0,critPower:0,reload:.1*count,spread:.1*count}
   :{additional:0,crit:0,critPower:0,reload:0,spread:0};
}

export function prepareSpecializationAttack(s,p,w,repeat=false){
 const b=modifiers(s),ready=!repeat&&isRangedHand(w)&&p.fullSalvoReady&&b.fullSalvo;
 if(!repeat)p.fullSalvoReady=false;
 return {...w,repeat,damage:w.damage*(ready?1+(b.fullSalvoDamage||.3):1)};
}
export function specializationHit(s,e,w){
 if(!isMelee(w)||w.secondary||w.repeat||!modifiers(s).onslaught)return 1;
 const state=s.specialization??={};state.combos??={};
 const t=combatTime(s),previous=state.combos[w.partId];
 const count=previous?.target===e.id&&t-previous.at<3?previous.count+1:1;
 state.combos[w.partId]={target:e.id,at:t,count:count===2?0:count};
 return count===2?1+(modifiers(s).onslaughtDamage||.3):1;
}
export function specializationKill(s,w){
 if(isMelee(w)&&!w.secondary&&!w.repeat&&modifiers(s).meleeFrenzy)(s.specialization??={}).frenzyUntil=combatTime(s)+4;
}

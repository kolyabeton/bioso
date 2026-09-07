import {WEAPONS} from '../catalog.js';
import {isMelee} from './weapon-specialization.js';
import {ABILITIES,FALLBACKS,BRANCHES,abilityById,learn,modifiers} from './abilities.js';
import {xpRequired} from './balance.js';
export {xpRequired};
export function eligible(s,d){
 if(!d||s.abilities.learned.includes(d.id))return false;
 const learned=s.abilities.learned;
 if(d.requires.length&&!(d.requireMode==='all'?d.requires.every(id=>learned.includes(id)):d.requires.some(id=>learned.includes(id))))return false;
 if(['melee','ranged'].includes(d.branch)&&!s.arms.some(p=>p&&isMelee(WEAPONS[p.key])===(d.branch==='melee')))return false;
 if(d.branch==='projectiles'){
  const keys=s.arms.filter(Boolean).map(p=>p.key);
  if(!keys.some(k=>['seed','needle','rocket','acid','harpoon'].includes(k)))return false;
  if(d.id==='projectiles.1'&&!keys.some(k=>['seed','needle'].includes(k)))return false;
 }
 return true;
}
export function rollChoices(s,exclude=[]){
 const all=Object.values(ABILITIES).filter(d=>eligible(s,d)),fresh=all.filter(d=>!exclude.includes(d.id)),pool=fresh,previous=all.filter(d=>exclude.includes(d.id)),selected=[];
 const matching=pool.filter(d=>['melee','ranged'].includes(d.branch));if(matching.length){const chosen=matching[Math.floor(s.rng()*matching.length)];selected.push(chosen);pool.splice(pool.indexOf(chosen),1);}
 while(pool.length&&selected.length<5)selected.push(pool.splice(Math.floor(s.rng()*pool.length),1)[0]);
 while(previous.length&&selected.length<5)selected.push(previous.splice(Math.floor(s.rng()*previous.length),1)[0]);
 const minor=Object.values(FALLBACKS);while(selected.length<5)selected.push(minor.splice(Math.floor(s.rng()*minor.length),1)[0]);
 s.choices=selected.map(d=>({id:d.id}));return s.choices;
}
export function gainXP(s,amount){
 if(!Number.isFinite(amount)||amount<=0)return;
 // Keep fractional bonus XP across pickups; a one-XP drop must benefit too.
 const bonus=amount*(modifiers(s).xpGain||0)+(s.xpBonusRemainder||0),wholeBonus=Math.floor(bonus+1e-9);
 s.xpBonusRemainder=Math.max(0,bonus-wholeBonus);s.xp+=amount+wholeBonus;
 while(s.xp>=xpRequired(s.level)){s.xp-=xpRequired(s.level);s.level++;s.pending++;}if(s.pending&&!s.choices.length)rollChoices(s);}
export function selectAbility(s,index){
 if(!Number.isInteger(index)||!s.pending)return false;const d=abilityById(s.choices[index]?.id);if(!d||!d.repeatable&&!eligible(s,d))return false;
 if(!learn(s,d.id))return false;s.pending--;s.choices=[];if(s.pending)rollChoices(s);return true;
}
/** Stable presentation adapter shared by game UI and tests. */
export function abilityCards(s){return s.choices.map((c,index)=>{const d=abilityById(c.id);return{...d,index,branchName:BRANCHES[d.branch]||(d.branch==='synergy'?'Синергия':'Малое усиление'),nodes:Object.values(ABILITIES).filter(n=>d.branch==='synergy'?n.id===d.id||d.requires.includes(n.id):n.branch===d.branch).map(n=>({...n,offered:s.choices.some(c=>c.id===n.id),state:s.abilities.learned.includes(n.id)?'learned':eligible(s,n)?'available':'locked'}))};});}
export function learnedAbilities(s){return s.abilities.learned.map(abilityById);}

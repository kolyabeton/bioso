import {WEAPONS} from '../catalog.js';
import {isMelee} from './weapon-specialization.js';
import {abilityCompatibilitySummary,handMatches} from './hand-compatibility.js';
import {ABILITIES,FALLBACKS,BRANCHES,abilityById,abilityLevel,abilityDescriptionAtLevel,learn,modifiers} from './abilities.js';
import {xpRequired} from './balance.js';
import {combatTime} from './mutations.js';
import {moveCreature} from '../gameplay-modules/event-collision.js';
export {xpRequired};
export function eligible(s,d){
 if(!d||abilityLevel(s,d.id)>=d.maxLevel)return false;
 if(!d.repeatable&&abilityLevel(s,d.id)>0&&new Set(s.abilities.learned||[]).size<8)return false;
 const learned=s.abilities.learned;
 if(d.requires.length&&!(d.requireMode==='all'?d.requires.every(id=>learned.includes(id)):d.requires.some(id=>learned.includes(id))))return false;
 if(['melee','ranged'].includes(d.branch)&&!s.arms.some(p=>p&&!p.disabled&&handMatches(p,d.branch)))return false;
 if(d.branch==='projectiles'){
  const group=['projectiles.1','projectiles.2'].includes(d.id)?'directProjectile':'flyingProjectile';
  if(!s.arms.some(p=>p&&!p.disabled&&handMatches(p,group)))return false;
 }
 if(d.branch==='ricochet'&&!s.arms.some(p=>p&&!p.disabled&&handMatches(p,'ricochetProjectile')))return false;
 return true;
}
export function rollChoices(s,exclude=[]){
 const all=Object.values(ABILITIES).filter(d=>eligible(s,d)),history=s.abilityOfferHistory??={rounds:[],misses:{}},selected=[];
 const weaponBranches=[...new Set((s.arms||[]).filter(p=>p&&!p.disabled&&handMatches(p,'combat')).map(p=>isMelee(WEAPONS[p.key])?'melee':'ranged'))];
 const learnedCounts={};for(const id of s.abilities.learned||[]){const branch=abilityById(id)?.branch;if(branch&&!['synergy','minor','vitality','motion'].includes(branch))learnedCounts[branch]=(learnedCounts[branch]||0)+1;}
 const coreBuildBranches=[...new Set([...Object.entries(learnedCounts).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).map(([branch])=>branch),...weaponBranches])];
 const buildBranches=[...new Set([...coreBuildBranches,'might','tempo'])];
 const coreBuildPool=all.filter(d=>coreBuildBranches.includes(d.branch));
 const buildPool=all.filter(d=>buildBranches.includes(d.branch));
 const defensePool=all.filter(d=>['vitality','motion'].includes(d.branch));
 const synergies=all.filter(d=>d.branch==='synergy');
 const activeSynergies=Object.values(ABILITIES).filter(d=>d.branch==='synergy'&&d.requires.some(id=>(s.abilities.learned||[]).includes(id)));
 const progressIds=new Set(activeSynergies.flatMap(d=>d.requires)),progressBranches=new Set([...progressIds].map(id=>abilityById(id)?.branch));
 const synergyPool=synergies.length?synergies:[...all.filter(d=>progressIds.has(d.id)),...all.filter(d=>progressBranches.has(d.branch))];
 const pick=pool=>{
  const available=pool.filter(d=>!selected.includes(d));if(!available.length)return null;
  const overdue=available.filter(d=>(history.misses[d.id]||0)>=4),fresh=available.filter(d=>!exclude.includes(d.id)),candidates=overdue.length?overdue:(fresh.length?fresh:available);
  const max=overdue.length?Math.max(...overdue.map(d=>history.misses[d.id]||0)):null,final=max==null?candidates:candidates.filter(d=>(history.misses[d.id]||0)===max);
  const chosen=final[Math.floor(s.rng()*final.length)];selected.push(chosen);return chosen;
 };
 pick(coreBuildPool);pick(buildPool);pick(defensePool);pick(synergyPool);pick(all);
 while(selected.length<5)if(!pick(all))break;
 const fallbacks=Object.values(FALLBACKS).filter(d=>eligible(s,d));while(selected.length<5)if(!pick(fallbacks))break;
 s.choices=selected.map(d=>({id:d.id}));
 const offered=new Set(s.choices.map(c=>c.id));for(const d of all)history.misses[d.id]=offered.has(d.id)?0:(history.misses[d.id]||0)+1;
 history.rounds.push([...offered]);if(history.rounds.length>8)history.rounds.shift();s.abilityOfferHistory=history;return s.choices;
}
export function gainXP(s,amount){
 if(!Number.isFinite(amount)||amount<=0)return 0;
 // Acceptance fixtures can exercise normal pickups without opening upgrade UI.
 if(s.progressionLocked){s.metrics.suppressedXP=(s.metrics.suppressedXP||0)+amount;return 0;}
 // Keep fractional bonus XP across pickups; a one-XP drop must benefit too.
 const bonus=amount*(modifiers(s).xpGain||0)+(s.xpBonusRemainder||0),wholeBonus=Math.floor(bonus+1e-9);
 s.xpBonusRemainder=Math.max(0,bonus-wholeBonus);s.xp+=amount+wholeBonus;const fromLevel=s.level;
 while(s.xp>=xpRequired(s.level)){s.xp-=xpRequired(s.level);s.level++;s.pending++;}const gained=s.level-fromLevel;if(gained)(s.events??=[]).push({type:'level-up',fromLevel,toLevel:s.level,count:gained});if(s.pending&&!s.choices.length)rollChoices(s);return gained;}
export function selectAbility(s,index){
 if(!Number.isInteger(index)||!s.pending)return false;const d=abilityById(s.choices[index]?.id);if(!d||!d.repeatable&&!eligible(s,d))return false;
 if(!learn(s,d.id))return false;s.pending--;s.choices=[];if(s.pending)rollChoices(s);else if(s.mode==='survival'){
  const now=combatTime(s);s.health.invulnerableUntil=Math.max(s.health.invulnerableUntil||0,now+1.5);
  for(const e of s.enemies||[]){if(e.hp<=0||e.kind!=='normal')continue;const dx=e.x-s.player.x,dz=e.z-s.player.z,distance=Math.hypot(dx,dz);if(distance>6)continue;const scale=3/(distance||1);moveCreature(s,e,(distance?dx:1)*scale,(distance?dz:0)*scale,e.radius);}
 }return true;
}
/** Stable presentation adapter shared by game UI and tests. */
const ABILITY_VALUE=/[+−-]?\d+(?:[,.]\d+)?(?:\s?(?:п\.п\.|%|с(?![А-Яа-яЁё])|м(?![А-Яа-яЁё]))|-(?:й|я|е|го|му|м))?/g;
export function abilityUpgradeDescription(d,level,nextLevel){
 const next=abilityDescriptionAtLevel(d,nextLevel);if(!level)return next;
 const current=abilityDescriptionAtLevel(d,level).match(ABILITY_VALUE)||[];let index=0;
 return next.replace(ABILITY_VALUE,value=>{const before=current[index++];return before&&before!==value?`${before} → ${value}`:value;});
}
export function abilityCards(s){return s.choices.map((c,index)=>{const d=abilityById(c.id),level=abilityLevel(s,d.id),nextLevel=Math.min(d.maxLevel,level+1);return{...d,description:abilityUpgradeDescription(d,level,nextLevel),compatibilityCategory:abilityCompatibilitySummary(d.id),index,level,nextLevel,branchName:BRANCHES[d.branch]||(d.branch==='synergy'?'Синергия':'Малое усиление'),nodes:Object.values(ABILITIES).filter(n=>d.branch==='synergy'?n.id===d.id||d.requires.includes(n.id):n.branch===d.branch).map(n=>{const nodeLevel=abilityLevel(s,n.id);return{...n,level:nodeLevel,nextLevel:Math.min(n.maxLevel,nodeLevel+1),maxed:nodeLevel>=n.maxLevel,offered:s.choices.some(c=>c.id===n.id),state:nodeLevel?'learned':eligible(s,n)?'available':'locked'};})};});}
export function learnedAbilities(s){return[...new Set(s.abilities.learned)].map(id=>{const d=abilityById(id),level=abilityLevel(s,id);return{...d,description:abilityDescriptionAtLevel(d,level),compatibilityCategory:abilityCompatibilitySummary(id),level};});}

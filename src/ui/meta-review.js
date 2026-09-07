import {meta,awardMeta} from '../systems/meta-progression.js';
import {createPart,stats} from '../assembly.js';
import {rollChoices} from '../systems/progression.js';
/** Explicit in-memory fixture: never writes to the player's persisted profile. */
export function prepareMetaReview(s,stage='profile'){
 Object.assign(meta(s.profile),{runs:12,wins:3,overruns:3,rerolls:6});s.elites=5;awardMeta(s,createPart);s.events=[];
 s.profile.unlocked=[...new Set([...s.profile.unlocked,'hunter','bastion','stabilizer','spring'])];
 const label=document.createElement('p');label.id='meta-review-label';label.textContent='Тестовый профиль · подготовленное состояние';label.style.cssText='position:fixed;bottom:0;left:0;z-index:80;background:#17231f;color:#e6ebde;font:11px sans-serif;margin:0;padding:3px;pointer-events:none';document.body.append(label);
 if(stage==='audit-reward'){s.bosses=1;s.bossRewards=[{rarity:'rare',options:['claws','seed','returnNerve'].map(key=>Object.assign(createPart(s,key),{rarity:'rare'}))}];return 'boss-reward';}
 if(stage==='audit-quality'){s.inventory=['bastion','plated','root','shield','regen','armor'].map(key=>createPart(s,key));return 'assembly';}
 if(stage==='audit-organ'){s.bosses=1;s.organs[0]=createPart(s,'returnNerve');s.organs[0].rarity='rare';s.inventory=['digestion','claws','universal'].map(key=>createPart(s,key));return 'assembly';}
 if(stage==='soul'){s.arms=[createPart(s,'claws'),createPart(s,'seed')];s.abilities.learned=['might.0','melee.0','ranged.0'];return 'soul';}
 if(stage==='end'){s.won=s.finalDefeated=true;s.time=600;return 'end';}
 if(stage==='level'){s.level=8;s.pending=1;rollChoices(s);return 'level';}
 if(stage==='assembly'||stage==='combat'){
  s.body=createPart(s,'reactor');s.arms=[createPart(s,'harpoon'),createPart(s,'claws')];s.legs=[createPart(s,'spring'),createPart(s,'spring')];s.organs=[createPart(s,'mirrorGland'),createPart(s,'shield')];s.hp=stats(s).hp;s.inventory=[];
  return stage==='combat'?null:'assembly';
 }
 return stage==='loadout'?'loadout':'profile';
}

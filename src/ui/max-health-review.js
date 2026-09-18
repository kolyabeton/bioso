import {createPart,stats} from '../assembly.js';
import {learn} from '../systems/abilities.js';

/** Development-only real HUD state for the maximum-health mobile check. */
export function prepareMaxHealthReview(run){
  run.body=createPart(run,'rootwalker',5);run.body.rarity='relic';run.body.setId='rootwalker';
  run.arms=[createPart(run,'fangs',5),createPart(run,'fangs',5)];
  run.legs=Array.from({length:6},()=>{const leg=createPart(run,'root',5);leg.rarity='relic';leg.setId='rootwalker';return leg;});
  run.organs=[createPart(run,'regen',5),null,null];
  for(let rank=0;rank<5;rank++){learn(run,'vitality.0');learn(run,'minor.hp');}
  run.hp=stats(run).hp;run.health.missing=0;run.health.invulnerableUntil=Infinity;
  return{paused:true};
}

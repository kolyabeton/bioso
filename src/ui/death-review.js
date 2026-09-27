import {stats} from '../assembly.js';
import {receiveHit} from '../systems/health.js';
import {HERO_HP_PER_SEGMENT} from '../systems/health-scale.js';

/** Opt-in review: an actual lethal hit, followed by the normal simulation/render loop. */
export function prepareDeathReview(run) {
 const review={paused:true};
 const button=document.createElement('button');button.className='ui-frame ui-button';
 button.textContent='Смертельный удар';button.style.cssText='position:fixed;top:8px;left:8px;z-index:100';
 document.body.append(button);
 button.onclick=()=>{
  run.hp=HERO_HP_PER_SEGMENT;run.health.missing=stats(run).hp-run.hp;run.health.invulnerableUntil=0;
  receiveHit(run,stats(run),{cause:'contact'});review.paused=false;button.remove();
  document.getElementById('world').focus();
 };
 return review;
}

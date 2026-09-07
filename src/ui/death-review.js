import {stats} from '../assembly.js';
import {receiveHit} from '../systems/health.js';

/** Opt-in review: an actual lethal hit, followed by the normal simulation/render loop. */
export function prepareDeathReview(run) {
 const review={paused:true};
 const button=document.createElement('button');button.className='ui-frame ui-button';
 button.textContent='Смертельный удар';button.style.cssText='position:fixed;top:8px;left:8px;z-index:100';
 document.body.append(button);
 button.onclick=()=>{
  run.hp=1;run.health.missing=stats(run).hp-1;run.health.invulnerableUntil=0;
  receiveHit(run,stats(run),{cause:'contact'});review.paused=false;button.remove();
  document.getElementById('world').focus();
 };
 return review;
}

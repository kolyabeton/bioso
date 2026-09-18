import {createPart,stats} from '../assembly.js';
import {spawnEnemy,hurtEnemy,step} from '../game.js';
import {armorRemaining} from '../systems/health.js';
// DEV-only deterministic fixture: real enemy death, drops, renderer and simulation pickup.
export function prepareRecoveryReview(run){
 run.organs[0]=createPart(run,'armor');run.hp=1;run.health.missing=stats(run).hp-1;run.health.armorSpent=stats(run).armor;
 const random=run.rng;
 for(const [x,roll] of [[-2.5,.01],[2.5,.04]]){
  const e=spawnEnemy(run,'normal',{x:run.player.x+x,z:run.player.z-2});
  if(e){run.rng=()=>roll;hurtEnemy(run,e,1e6);}
 }
 run.rng=random;run.enemies=[];run.xpDrops=[];run.ground=[];run.events=[];
 const controls=document.createElement('aside');controls.className='defense-review-controls';controls.style.cssText='background:#192820;color:#e6eee8';
 controls.innerHTML='<small>Расходники · тестовое выпадение</small><button data-kind="health">Лечение</button><button data-kind="armor">Броня</button><small data-status></small>';
 for(const button of controls.querySelectorAll('button'))button.style.color='#e6eee8';
 function status(){controls.querySelector('[data-status]').textContent=`HP ${run.hp} из ${stats(run).hp} · Броня ${armorRemaining(run,stats(run).armor)} · На земле ${run.recoveryDrops.length} · Окно ${innerWidth}×${innerHeight}`;}
 controls.addEventListener('click',e=>{const q=run.recoveryDrops.find(q=>q.kind===e.target.dataset.kind);if(q){Object.assign(run.player,{x:q.x,y:q.y,z:q.z});step(run,.01);status();}});
 document.querySelector('#game').append(controls);status();return{paused:true,tick:status};
}

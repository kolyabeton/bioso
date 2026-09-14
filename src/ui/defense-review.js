import {SHIELD_RECHARGE_SECONDS} from '../systems/health-tuning.js';
// DEV review route: real game renderer and HUD with explicit reproducible defense states.
import {createPart,stats} from '../assembly.js';
import {receiveHit,tickHealth} from '../systems/health.js';
export function prepareDefenseReview(run){
 run.body=createPart(run,'bastion');run.organs=[createPart(run,'armor'),createPart(run,'shield'),createPart(run,'shield')];run.hp=stats(run).hp;
 let charging=false,last=performance.now();const shields=run.organs.slice(1);for(const shield of shields)shield.shieldCharge=1;
 const controls=document.createElement('aside');controls.className='defense-review-controls';
 controls.innerHTML=`<small>Проверка защиты · тестовая сборка</small><button data-defense="hit">Удар</button><button data-defense="charge">Зарядить щит</button><button data-defense="charging">Зарядка ${SHIELD_RECHARGE_SECONDS} с</button><button data-defense="none">Без щита</button><button data-defense="reset">Сброс</button>`;
 controls.addEventListener('click',event=>{const action=event.target.dataset.defense;if(action==='hit'){run.time+=1;receiveHit(run,stats(run));}if(action==='charge'){run.organs.splice(1,2,...shields);run.time=Math.max(...shields.map(shield=>shield.shieldReadyAt??run.time+SHIELD_RECHARGE_SECONDS));tickHealth(run,stats(run));}if(action==='charging'){run.organs.splice(1,2,...shields);for(const shield of shields){shield.shieldCharge=0;shield.shieldDuration=SHIELD_RECHARGE_SECONDS;shield.shieldReadyAt=run.time+SHIELD_RECHARGE_SECONDS;}charging=true;last=performance.now();}if(action==='none')run.organs.splice(1,2,null,null);if(action==='reset'){run.hp=stats(run).hp;run.health.armorSpent=0;run.health.missing=0;run.health.invulnerableUntil=0;run.organs.splice(1,2,...shields);for(const shield of shields)shield.shieldCharge=1;}});
 document.querySelector('#game').append(controls);return{paused:true,tick(){const now=performance.now();if(charging){run.time+=(now-last)/1000;tickHealth(run,stats(run));if(shields.every(shield=>shield.shieldCharge>=1))charging=false;}last=now;}};
}

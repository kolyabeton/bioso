import {SHIELD_RECHARGE_SECONDS} from '../systems/health-tuning.js';
// DEV review route: real game renderer and HUD with explicit reproducible defense states.
import {createPart,stats} from '../assembly.js';
import {receiveHit,tickHealth} from '../systems/health.js';
export function prepareDefenseReview(run){
 run.body=createPart(run,'bastion');run.organs=[createPart(run,'armor'),createPart(run,'shield'),null];run.hp=stats(run).hp;
 let charging=false,last=performance.now();const shield=run.organs[1];shield.shieldCharge=1;
 const controls=document.createElement('aside');controls.className='defense-review-controls';
 controls.innerHTML=`<small>Проверка защиты · тестовая сборка</small><button>Удар</button><button>Зарядить щит</button><button>Зарядка ${SHIELD_RECHARGE_SECONDS} с</button><button>Без щита</button><button>Сброс</button>`;
 controls.addEventListener('click',event=>{const text=event.target.textContent;if(text==='Удар'){run.time+=1;receiveHit(run,stats(run));}if(text==='Зарядить щит'){run.organs[1]=shield;run.time=shield.shieldReadyAt??run.time+SHIELD_RECHARGE_SECONDS;tickHealth(run,stats(run));}if(text===`Зарядка ${SHIELD_RECHARGE_SECONDS} с`){run.organs[1]=shield;shield.shieldCharge=0;shield.shieldDuration=SHIELD_RECHARGE_SECONDS;shield.shieldReadyAt=run.time+SHIELD_RECHARGE_SECONDS;charging=true;last=performance.now();}if(text==='Без щита')run.organs[1]=null;if(text==='Сброс'){run.hp=stats(run).hp;run.health.armorSpent=0;run.health.missing=0;run.health.invulnerableUntil=0;run.organs[1]=shield;shield.shieldCharge=1;}});
 document.querySelector('#game').append(controls);return{paused:true,tick(){const now=performance.now();if(charging){run.time+=(now-last)/1000;tickHealth(run,stats(run));if(shield.shieldCharge>=1)charging=false;}last=now;}};
}

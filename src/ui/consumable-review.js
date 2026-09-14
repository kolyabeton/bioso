import {CONSUMABLES,placeConsumable} from '../systems/consumable-drops.js';
import {stats} from '../assembly.js';
import {step,spawnEnemy,hurtEnemy,receiveDamage} from '../game.js';

// Explicit DEV/acceptance fixture in the real world/render loop, ephemeral profile.
export function prepareConsumableReview(run,emit){
 const origin={...run.player};run.enemies=[];run.ground=[];run.xpDrops=[];run.consumableDrops=[];
 for(let i=0;i<CONSUMABLES.length;i++){
  const angle=Math.PI*2*i/CONSUMABLES.length;
  placeConsumable(run,CONSUMABLES[i].kind,{x:origin.x+Math.cos(angle)*5.5,z:origin.z+Math.sin(angle)*5.5});
 }
 const controls=document.createElement('aside');controls.className='defense-review-controls';
 controls.innerHTML=`<small>Дропы · тестовая расстановка</small><select aria-label="Тип дропа">${CONSUMABLES.map(q=>`<option value="${q.kind}">${q.name}</option>`).join('')}</select><button data-action="collect">Подобрать</button><button data-action="enemy">С врага</button><button data-action="hit">Удар</button><button data-action="play">Бой</button><button data-action="hide">Скрыть</button><small data-status role="status"></small>`;
 for(const button of controls.querySelectorAll('button'))button.style.cssText='color:#e6eee8;padding:0 8px';
 controls.querySelector('select').style.cssText='min-height:44px;max-width:116px;font:12px sans-serif';
 function status(){controls.querySelector('[data-status]').textContent=`Биомасса ${run.biomass} · HP ${run.hp}/${stats(run).hp} · Дропы ${run.consumableDrops.length}`;}
 function flush(){for(const e of run.events)emit(e);run.events.length=0;status();}
 const api={paused:true,tick:status};
 controls.addEventListener('click',event=>{
  switch(event.target.dataset.action){
   case'collect':{const kind=controls.querySelector('select').value,q=run.consumableDrops.find(q=>q.kind===kind)??placeConsumable(run,kind,run.player);if(q){Object.assign(q,{x:run.player.x,y:run.player.y,z:run.player.z});step(run,.016);}break;}
   case'enemy':{const point={x:origin.x+3,z:origin.z},random=run.consumableRng;run.normalSpawnCount=0;const enemy=spawnEnemy(run,'normal',point);if(enemy){run.consumableRng=()=>0;hurtEnemy(run,enemy,1e6);run.consumableRng=random;}break;}
   case'hit':run.time+=1;receiveDamage(run,1);break;
   case'play':api.paused=!api.paused;event.target.textContent=api.paused?'Бой':'Стоп';break;
   case'hide':controls.style.display='none';break;
  }
  flush();
 });
 document.querySelector('#game').append(controls);status();return api;
}

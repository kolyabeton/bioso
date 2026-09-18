import {CONSUMABLES,placeConsumable,applyConsumable} from '../systems/consumable-drops.js';
import {stats,createPart} from '../assembly.js';
import {startReload} from '../combat-feel.js';
import {receiveHit} from '../systems/health.js';
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
 function status(){controls.querySelector('[data-status]').textContent=`Биомасса ${run.biomass} · HP ${run.hp} из ${stats(run).hp} · Дропы ${run.consumableDrops.length}`;}
 function flush(){for(const e of run.events)emit(e);run.events.length=0;status();}
 const api={paused:true,tick:status};
 // Optional repeatable VFX sequence, using real bonus application and damage.
 const vfx=new URLSearchParams(location.search).get('vfx');
 if(['1','defense','utility','recharge'].includes(vfx)){
  run.consumableDrops=[];run.nextElite=run.nextBoss=Infinity;run.progressionLocked=true;
  if(vfx==='defense'||vfx==='recharge')run.arms=[createPart(run,'seed'),createPart(run,'pistol')];
  for(const arm of run.arms)if(arm)arm.disabled=true;
  const targets=[[-3,3,120],[2,4,180],[4,-1,650]].map(([x,z,hp],i)=>{
   const e=spawnEnemy(run,i===2?'elite':'normal',{x:origin.x+x,z:origin.z+z});
   if(e){e.hp=e.maxHp=hp;e.speed=e.damage=e.armor=0;delete e.specialty;e.reviewOrigin={x:e.x,z:e.z};}return e;
  }).filter(Boolean);
  const damage=(e,d,i,source)=>hurtEnemy(run,e,d,i,source);
  const cues=vfx==='recharge'?[[.4,'recharge'],[1,'reload'],[3,'reload'],[5,'reload'],[7,'reload'],[9,'reload']]:vfx==='defense'?[[.4,'shield'],[1.5,'block'],[2.5,'phase'],[5,'attraction'],[7,'recharge']]:vfx==='utility'?[[.4,'beacon'],[1,'hunter'],[2,'parasite'],[4,'impulse']]:[[.25,'sleep'],[2,'wake'],[3,'hunter'],[4,'impulse'],[5.5,'parasite']];
  let start=run.time,cue=0;api.paused=false;controls.querySelector('[data-action="play"]').textContent='Стоп';
  function scatter(){for(let i=0;i<12;i++){const a=i*Math.PI/6;run.xpDrops.push({id:++run.entityId,x:origin.x+Math.cos(a)*9,y:origin.y??0,z:origin.z+Math.sin(a)*9,value:1});}}
  if(vfx==='defense')scatter();
  api.tick=()=>{
   run.waves.credit=-Infinity;run.enemies=run.enemies.filter(e=>targets.includes(e));
   if(run.time-start>=(vfx==='defense'?10:vfx==='utility'?11.5:14)){start=run.time;cue=0;for(const e of targets){e.hp=e.maxHp;e.pickupSleepUntil=e.pickupMarkUntil=0;Object.assign(e,e.reviewOrigin);}run.consumables.parasitesUntil=0;run.consumables.shieldCharges=0;run.consumables.phaseUntil=0;run.consumables.beacon=null;run.health.invulnerableUntil=0;if(vfx==='defense')scatter();}
   while(cue<cues.length&&run.time-start>=cues[cue][0]){const kind=cues[cue++][1];if(kind==='wake')hurtEnemy(run,targets[0],8);else if(kind==='reload'){for(const p of run.arms.filter(Boolean)){p.ammo=0;startReload(run,p);}}else if(kind==='block')receiveHit(run,stats(run),{damage:1,source:{x:run.player.x+2,z:run.player.z}});else{if(kind==='attraction')scatter();applyConsumable(run,kind,stats(run),damage);}flush();}
   status();
  };
 }

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

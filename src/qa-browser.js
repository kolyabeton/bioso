import {createPilot} from './qa-pilot.js';
/** Opt-in acceptance build only. Drives the rendered game in real time. */
export function installBrowserQA({getRun,start,ui,setInput,snapshot}){
 const panel=document.createElement('aside');panel.id='qa-controls';panel.style.cssText='position:fixed;left:4px;bottom:4px;z-index:90;max-width:210px;background:#10271ef0;color:#bfe4ca;padding:6px;font:10px/1.4 monospace';
 panel.innerHTML='<details open><summary>QA · реальные часы</summary><button data-qa="gate">Доставка: ворота → дальний</button><button data-qa="relays">Доставка: узлы → ближний</button><button data-qa="survival">Выживание 40 минут</button><button data-qa="stop">Остановить управление</button></details><output id="qa-status">Готов</output><script id="qa-report" type="application/json">{}</script>';
 document.body.append(panel);let active=false,bot,started=0,lastAssembly=0,nextLog=0,report={};
 const status=panel.querySelector('#qa-status'),record=panel.querySelector('#qa-report');
 function publish(){record.textContent=JSON.stringify(report);}
 panel.addEventListener('click',e=>{const action=e.target.dataset.qa;if(!action)return;if(action==='stop'){active=false;setInput({x:0,z:0});ui.open('pause');report.stopped=true;publish();return;}
  start(action==='survival'?'survival':'core',20260907);ui.close();bot=createPilot({approach:action==='relays'?'relays':'gate',exit:action==='relays'?'near':'far'});active=true;started=performance.now();lastAssembly=nextLog=0;report={method:'Rendered browser game, wall-clock requestAnimationFrame. Scripted normal movement, earned assembly and confirmed ability choices. No granted HP, items, XP, time skips, coefficient changes or simulation stepping.',scenario:action,seed:20260907,startedAt:new Date().toISOString(),checkpoints:[],selections:[],assemblyCommands:0};publish();
 });
 function tick(){if(!active)return;const s=getRun();if(s.dead||s.won&&!s.continued){active=false;setInput({x:0,z:0});report.end={...snapshot(),wallSeconds:(performance.now()-started)/1000,cleared:[...s.exploration.cleared],stage:s.mission?.stage,extraction:s.mission?.extraction};publish();status.textContent=(s.dead?'Поражение':'Завершено')+' · '+Math.floor(s.time)+'с';return;}
  if(ui.screen==='level'||ui.screen==='ability-detail'){
   const index=bot.choice(s),choose=document.querySelector(`[data-action="choose"][data-index="${index}"]`);if(choose&&!choose.disabled){report.selections.push({at:s.time,id:s.choices[index].id});choose.click();}return;
  }
  if(ui.screen==='boss-reward'){
   const reward=document.querySelector('[data-action="boss-choose"][data-index="0"]');
   if(reward&&!reward.disabled){report.selections.push({at:s.time,reward:s.bossRewards?.[0]?.options?.[0]});reward.click();document.querySelector('[data-action="item-tip-action"]')?.click();publish();}return;
  }
  if(ui.screen)return;
  if(s.time>=lastAssembly){ui.open('assembly');bot.assemble(s);report.assemblyCommands++;ui.close();lastAssembly=s.time+2;}
  setInput(bot.direction(s));
  if(s.time>=nextLog){report.checkpoints.push({...snapshot(),wallSeconds:(performance.now()-started)/1000,cleared:[...s.exploration.cleared],stage:s.mission?.stage});nextLog=s.time+30;publish();}
  status.textContent=`${s.mode} · ${Math.floor(s.time/60)}:${String(Math.floor(s.time%60)).padStart(2,'0')} · HP ${s.hp} · ${s.kills} убито`;
  if(s.mode==='survival'&&s.time>=2401){active=false;setInput({x:0,z:0});ui.open('pause');report.end={...snapshot(),wallSeconds:(performance.now()-started)/1000};publish();status.textContent='40 минут завершены · финальный босс появился';}
 }
 return{tick};
}

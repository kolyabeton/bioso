import './ui/dungeon-review.css';
import {button} from './ui/atoms.js';
import {beginEncounter} from './game.js';
import {DUNGEON_SCENARIOS,stageDungeonReview,dungeonReviewProof,clearDungeonReview,leaveDungeonReview} from './dungeon-review-state.js';

export function prepareDungeonReview(params,{getRun,start,stopInput,ui}){
 let key=Object.hasOwn(DUNGEON_SCENARIOS,params.get('dungeon'))?params.get('dungeon'):'roots';
 let node,paused=true,point=0,controlsSignature='';
 document.body.dataset.dungeonReview='true';
 const panel=document.createElement('aside');panel.id='dungeon-review';panel.setAttribute('aria-label','Стенд логов');
 panel.innerHTML=`<header><span>BIOSO / ТЕСТОВЫЙ СТЕНД</span><span data-mode>Пауза</span></header>
  <div class="dungeon-review-themes" aria-label="Логово"></div>
  <output class="dungeon-review-report" aria-live="polite"></output>
  <div class="dungeon-review-actions"><button class="ui-button ui-button-primary" data-command="play">Начать бой</button><button class="ui-button" data-command="tools" aria-expanded="false" aria-controls="dungeon-review-tools">Инструменты</button></div>
  <div id="dungeon-review-tools" hidden>
   <p>Небесный лабиринт с техническими дорожками. Элиты ждут группами по 3–5; «Дальше» переносит между зонами агро.</p>
   <div class="dungeon-review-actions">
    <button class="ui-button" data-command="next">Дальше</button><button class="ui-button" data-command="entrance">К выходу</button>
    <button class="ui-button" data-command="clear">Зачистить</button><button class="ui-button" data-command="leave">Выйти</button>
    <button class="ui-button" data-command="god" aria-pressed="true">Бессмертие: да</button><button class="ui-button" data-command="reset">Сбросить</button>
   </div>
  </div>`;
 for(const old of panel.querySelectorAll('button')){
  const template=document.createElement('template');template.innerHTML=button(old.textContent,{'data-command':old.dataset.command,variant:old.dataset.command==='play'?'primary':'secondary'});
  const replacement=template.content.firstElementChild;for(const attr of old.attributes)if(attr.name.startsWith('aria-'))replacement.setAttribute(attr.name,attr.value);old.replaceWith(replacement);
 }
 const themes=panel.querySelector('.dungeon-review-themes'),report=panel.querySelector('output'),mode=panel.querySelector('[data-mode]');
 const control=name=>panel.querySelector(`[data-command="${name}"]`);
 for(const [id,scenario] of Object.entries(DUNGEON_SCENARIOS)){
  const template=document.createElement('template');template.innerHTML=button(scenario.label,{'data-theme':id});const b=template.content.firstElementChild;
  b.onclick=()=>reset(id);themes.append(b);
 }
 function reset(next=key){
  key=next;paused=true;point=0;controlsSignature='';start('survival',20317);node=stageDungeonReview(getRun(),key);
  const url=new URL(location.href);url.searchParams.set('dungeon',key);history.replaceState(null,'',url);
  render();
 }
 function render(){
  const s=getRun(),inside=s.encounters.active===node,proof={...dungeonReviewProof(s,node),paused,scenario:key,inside};panel.dataset.proof=JSON.stringify(proof);
  panel.dataset.playing=String(!paused);panel.dataset.tools=String(!panel.querySelector('#dungeon-review-tools').hidden);
  const text=`${proof.remaining} из ${proof.total} элит · зоны ${proof.zones.engaged} из ${proof.zones.total} · группы ${proof.zones.groups.join(' · ')}`;
  if(report.textContent!==text)report.textContent=text;
  const signature=JSON.stringify([paused,key,proof.state,s.dead,proof.invulnerable,inside]);
  if(signature===controlsSignature)return;controlsSignature=signature;
  mode.textContent=paused?'Пауза':inside?'Логово':'Снаружи';
  control('play').querySelector('span').textContent=paused?(inside?'Начать бой':'Продолжить'):'Пауза';
  control('play').disabled=s.dead;
  for(const button of themes.children){const selected=button.dataset.theme===key;button.setAttribute('aria-pressed',String(selected));button.classList.toggle('ui-button--selected',selected);button.querySelector('span').textContent=(selected?'✓ ':'')+DUNGEON_SCENARIOS[button.dataset.theme].label;}
  control('leave').querySelector('span').textContent=proof.state==='paused'?'Вернуться':'Выйти';
  control('leave').disabled=proof.state==='complete';
  for(const command of ['next','entrance','clear'])control(command).disabled=proof.state!=='active';
  control('god').querySelector('span').textContent=`Бессмертие: ${proof.invulnerable?'да':'нет'}`;
  control('god').setAttribute('aria-pressed',String(proof.invulnerable));
 }
 panel.addEventListener('click',event=>{
  const command=event.target.closest('[data-command]')?.dataset.command;if(!command)return;
  const s=getRun();stopInput();
  if(command==='play'){paused=!paused;if(!paused){panel.querySelector('#dungeon-review-tools').hidden=true;control('tools').setAttribute('aria-expanded','false');document.getElementById('world').focus();}}
  if(command==='tools'){const tools=panel.querySelector('#dungeon-review-tools');tools.hidden=!tools.hidden;control('tools').setAttribute('aria-expanded',String(!tools.hidden));}
  if(command==='next'){point=(point+1)%node.aggroZones.length;Object.assign(s.player,node.aggroZones[point]);}
  if(command==='entrance')Object.assign(s.player,node.exit);
  if(command==='clear'){paused=true;clearDungeonReview(s,node);}
  if(command==='leave'){const changed=node.state==='paused'?beginEncounter(s,node.id):leaveDungeonReview(s,node);if(changed){paused=false;panel.querySelector('#dungeon-review-tools').hidden=true;control('tools').setAttribute('aria-expanded','false');document.getElementById('world').focus();}}
  if(command==='god')s.health.invulnerableUntil=s.health.invulnerableUntil===Infinity?0:Infinity;
  if(command==='reset')reset();
  render();
 });
 document.getElementById('game').append(panel);reset();
 return {get paused(){return paused;},tick(){
  // Main-menu starts replace the run; keep the fixture attached to a fresh test run.
  if(!getRun().encounters.nodes.includes(node)){reset();}
  panel.hidden=!!ui.screen;render();
 }};
}

import {description,caption} from './typography.js';
import {statTable} from './stat-table.js';
import {EVENT_PRESENTATION,eventState,eventImage,eventGlyph} from '../gameplay-modules/event-presentation.js';
import {nearEncounter,availableEncounter,encounterLevel} from '../systems/events/proximity.js';
import {e,frame,button,badge,sectionLabel} from './atoms.js';
import {partGrid} from './molecules.js';
import {mutationView,removalWarning} from '../systems/mutations.js';
import {ENCOUNTERS,DEALS,nearbyEncounters,dealAllowed,challengeAllowed} from '../systems/encounters.js';
import {CATALOG,ROMAN} from '../catalog.js';
import {encounterRewardTier} from '../systems/events/rewards.js';
import {stats} from '../assembly.js';
export function activeMutationSection(s){
 const active=mutationView(s).filter(f=>f.active);if(!active.length)return '';
 return `${sectionLabel('Активные мутации')}<div class="ui-learned-list">${active.map(f=>frame(`<h2 class="ui-heading-h2">${e(f.name)} · ${e('Активна')}</h2>${description(f.description)}`,{className:'ui-set-bonus-card','data-mutation':f.id})).join('')}</div>`;
}
export function mutationPanel(s){return `<details class="ui-mutations"><summary>Мутации тела · активных: ${mutationView(s).filter(f=>f.active).length}</summary>${mutationView(s).map(f=>frame(`<h2 class="ui-heading-h2">${e(f.name)} ${badge(`${Math.min(3,f.count)} из 3`)} ${f.active?'· Активна':''}</h2>${description(f.description)}<small class="ui-text ui-text--caption">${f.keys.map(k=>e(CATALOG[k].name)).join(' · ')}</small>`,{className:'ui-mutation '+(f.active?'is-active':'')})).join('')}<p class="ui-note ui-text ui-text--caption">Нужны 3 разных установленных типа. Снятие части комплекта отключает мутацию.</p></details>`;}
export function compatibility(){return'';}
export function mutationWarning(before,after){const names=removalWarning(before,after);return names.length?`<p class="ui-warning">Отключится мутация: ${names.map(e).join(', ')}.</p>`:'';}
export function encounterList(s){const nearby=nearbyEncounters(s);return `<section class="ui-screen-body ui-encounters">${nearby.length?nearby.map(n=>frame(`${caption(`${eventGlyph(n)} ${eventState(n)}`)}<h3>${e(ENCOUNTERS[n.type].name)}</h3>${description(ENCOUNTERS[n.type].hint)}${button(n.state==='reward'?'Награда':'Осмотреть',{action:'encounter-detail','data-id':n.id})}`,{className:'ui-encounter'})).join(''):'<p>Подойдите к отмеченному объекту. События отмечены на карте знаком ✚, секреты нужно искать самостоятельно.</p>'}${s.encounters?.active?.dungeon?'':button('Карта',{action:'map'})}</section>`;}
const challengeRules={
 infection:['Уклоняйтесь от живучих преследователей. Убивать их не обязательно.','Оставайтесь внутри круга 30 секунд.','Регенерация и вампиризм отключены.','Выход приостанавливает прогресс.'],
 sealed:['Продержитесь 45 секунд и победите всех врагов.','После входа выйти из арены нельзя.'],
 hunt:['Победите отмеченную элиту за 60 секунд.','Время вышло — награда потеряна.'],
 race:['Доберитесь до финиша на дальней стороне карты.','На пути три группы врагов. Убивать всех не обязательно.','Лимит одинаковый для всех сборок. Медленная сборка рискует не успеть.','Стрелка и карта показывают финиш. Обычные волны на паузе.','Детали не подбираются автоматически до конца испытания. Разгрузите инвентарь перед стартом.'],
 dungeon_roots:['Единый этаж корневых тоннелей: коридоры расходятся в разные стороны, петляют и заканчиваются тупиками. Комнат и ворот нет.','При входе survival-таймер и мировой директор останавливаются.','Сразу расставлены 12 элит с ×3 HP и скоростью атаки. Каждый оставляет один предмет; редкость бросается трижды, сохраняется лучший результат.','Можно выйти через вход и вернуться: живые враги и прогресс сохраняются.'],
 dungeon_catacombs:['Единый этаж техногенных тоннелей: коридоры расходятся в разные стороны, петляют и заканчиваются тупиками. Комнат и ворот нет.','При входе survival-таймер и мировой директор останавливаются.','Сразу расставлены 18 элит с ×3 HP и скоростью атаки. Каждый оставляет один предмет; редкость бросается трижды, сохраняется лучший результат.','Можно выйти через вход и вернуться: живые враги и прогресс сохраняются.'],
};
function rewards(s,n,claim){return partGrid(n.rewards.map((key,id)=>({key,name:CATALOG[key].name,action:claim?'encounter-claim':'item-preview',id,tier:ROMAN[encounterRewardTier(s,n)]})),{className:'event-rewards'});}
export function encounterHeaderData(s,id){
 const n=s.encounters?.nodes.find(n=>n.id===id);if(!n)return{name:'Событие',meta:'Недоступно',art:null};
 const d=ENCOUNTERS[n.type],p=EVENT_PRESENTATION[n.type],available=!p||availableEncounter(s,n);
 const kind=d.kind==='secret'?'Секрет':`Событие · ${p?.category||'Встреча'}`;
 return{name:d.name,meta:`${eventGlyph(n)} ${kind} · ${available?eventState(n):'Закрыто'}`,art:p?eventImage(n.type):null,type:n.type};
}
export function encounterDetail(s,id){
 const n=s.encounters?.nodes.find(n=>n.id===id);if(!n)return '<section class="ui-screen-body ui-event-detail">Событие недоступно.</section>';
 const d=ENCOUNTERS[n.type],p=EVENT_PRESENTATION[n.type],near=nearEncounter(s,n,4);let body='',primary='';
 if(n.state==='reward'){body=`${sectionLabel('Награда — одна на выбор')}${rewards(s,n,true)}<p class="ui-note ui-text ui-text--caption">Нажмите на деталь, чтобы посмотреть свойства и забрать. Остальные награды исчезнут.</p>${n.type==='slab'?'<p>Дополнительно: 30 биомассы.</p>':''}`;}
 else if(n.state==='ready'&&d.kind==='altar'){
  const deals=n.deals.filter(key=>Object.hasOwn(DEALS,key)),directDeal=deals.length===1&&deals[0]!=='fuse'?deals[0]:null;
  body=deals.map(key=>frame(`<h3>${e(DEALS[key].name)}</h3>${description(DEALS[key].description)}${key==='fuse'?button('Выбрать оружие',{action:'fuse-open',disabled:!s.arms.some(hand=>hand&&dealAllowed(s,n,'fuse',hand.id))}):directDeal?'':button('Принять',{action:'deal-accept','data-key':key,variant:'primary',disabled:!dealAllowed(s,n,key)})}`,{className:'event-deal'})).join('')+'<p class="ui-note ui-text ui-text--caption">Одна операция на этом алтаре. Недоступные сделки нельзя выбрать.</p>';
  if(directDeal)primary=button('Принять',{action:'deal-accept','data-key':directDeal,variant:'primary',disabled:!dealAllowed(s,n,directDeal)});
 }else if(['ready','paused'].includes(n.state)&&d.kind==='challenge'){
  body=`<ul class="event-rules">${challengeRules[n.type].map(t=>`<li>${e(t)}</li>`).join('')}</ul>${sectionLabel(n.missionEvent?'Награда за испытание':'Награда — одна на выбор')}${n.rewardTier?`<p class="ui-note ui-text ui-text--caption">Уровень детали: ${ROMAN[encounterRewardTier(s,n)]}</p>`:''}${rewards(s,n,false)}${n.missionEvent?'<p class="ui-note ui-text ui-text--caption">Одна показанная деталь выпадет только после победы.</p>':''}`;
  if(n.type==='race')body=`${n.race?`<p><strong>${Math.ceil(n.race.length)} м по маршруту · ${n.race.limit} с</strong></p><p>Скорость сборки: ${stats(s).speed.toFixed(1)} м/с</p>${stats(s).speed<n.race.length/n.race.limit?'<p class="ui-warning">Текущая сборка слишком медленная для этого лимита.</p>':''}`:n.raceUnavailable?'<p class="ui-warning">Проходимый маршрут не найден. Испытание недоступно.</p>':'<p class="ui-note ui-text ui-text--caption">Маршрут рассчитывается у старта.</p>'}${body}`;
  primary=button(n.state==='paused'?'Вернуться':'Начать',{action:'encounter-start',variant:'primary',disabled:!challengeAllowed(s,n)||n.type==='race'&&!n.race});
  if(near&&n.unlockLevel&&s.level<n.unlockLevel)body+=`<p class="ui-warning">Доступно с уровня ${n.unlockLevel}.</p>`;
 }else {body=`<p>${e(({ready:d.hint,paused:'Прогресс сохранён. Можно вернуться через вход.',active:n.dungeon?(n.cleared?'Зачистка завершена. Выход открыт.':'Зачистка продолжается. Выйдите через вход, чтобы сохранить прогресс.'):'Испытание идёт. Вернитесь в игру, чтобы продолжить.',complete:d.kind==='altar'?'Сделка заключена. Алтарь больше недоступен в этом забеге.':'Событие завершено.',failed:n.skipped?'Вы отказались · проход открыт без награды':'Время вышло. Награда потеряна. Повторить испытание в этом забеге нельзя.'})[n.state])}</p>`;if(n.dungeon&&n.state==='active')primary=button('Выйти',{action:'dungeon-exit',variant:'primary'});}
 if(!near&&!['complete','failed'].includes(n.state)){body='<p class="ui-warning">Подойдите к объекту, чтобы взаимодействовать.</p>'+body;primary=button('Маршрут',{action:'event-route',variant:'primary'});}
 const exit=n.missionEvent&&n.state==='ready'?button('Отказаться',{action:'mission-event-skip',variant:'outline'}):button(n.state==='active'?'Продолжить':'Позже',{action:'resume',variant:'outline'});
 const available=!p||availableEncounter(s,n);
 const level=n.recommended||d.recommended||encounterLevel(n);
 const readout=p&&!n.missionEvent?statTable([{label:'Рекомендуемый уровень',value:level}],{className:`event-readout${available?'':' is-locked'}`}):'';
 return `<section class="ui-screen-body ui-event-shell" data-event-type="${e(n.type)}" data-event-kind="${e(d.kind)}"><div class="event-popup-panel"><div class="ui-event-detail event-popup-scroll" tabindex="0" role="region" aria-label="Условия события">${readout}<div class="event-content">${body}</div></div><footer class="ui-screen-footer event-footer">${primary}${exit}</footer></div></section>`;
}

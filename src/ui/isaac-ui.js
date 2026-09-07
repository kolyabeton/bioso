import {EVENT_PRESENTATION,eventState,eventImage,eventGlyph} from '../gameplay-modules/event-presentation.js';
import {nearEncounter,availableEncounter,encounterLevel} from '../systems/events/proximity.js';
import {e,frame,button,badge,sectionLabel} from './atoms.js';
import {partArt,partCard} from './molecules.js';
import {mutationView,affectedHands,removalWarning} from '../systems/mutations.js';
import {ENCOUNTERS,DEALS,nearbyEncounters,dealAllowed,challengeAllowed} from '../systems/encounters.js';
import {CATALOG} from '../catalog.js';
export function mutationPanel(s){return `<details class="ui-mutations"><summary>Мутации тела · активных: ${mutationView(s).filter(f=>f.active).length}</summary>${mutationView(s).map(f=>frame(`<strong>${e(f.name)} ${badge(`${Math.min(3,f.count)}/3`)} ${f.active?'· Активна':''}</strong><p>${e(f.description)}</p><small>${f.keys.map(k=>e(CATALOG[k].name)).join(' · ')}</small>`,{className:'ui-mutation '+(f.active?'is-active':'')})).join('')}<p class="ui-note">Нужны 3 разных установленных типа. Снятие части комплекта отключает мутацию.</p></details>`;}
export function compatibility(s,p){if(!['returnNerve','slime','parasite','commonNerve'].includes(p.key))return '';const names=affectedHands(s,p.key);return `<p class="ui-note ui-compatibility">${e(CATALOG[p.key].description)}</p><p class="ui-note">Изменит руки: ${names.length?names.map(e).join(', '):'нет совместимых установленных рук'}.</p>`;}
export function mutationWarning(before,after){const names=removalWarning(before,after);return names.length?`<p class="ui-warning">Отключится мутация: ${names.map(e).join(', ')}.</p>`:'';}
export function encounterList(s){const nearby=nearbyEncounters(s);return `<section class="ui-screen-body ui-encounters">${nearby.length?nearby.map(n=>frame(`<small>${eventGlyph(n)} ${e(eventState(n))}</small><h3>${e(ENCOUNTERS[n.type].name)}</h3><p>${e(ENCOUNTERS[n.type].hint)}</p>${button(n.state==='reward'?'Награда':'Осмотреть',{action:'encounter-detail','data-id':n.id})}`,{className:'ui-encounter'})).join(''):'<p>Подойдите к отмеченному объекту. События отмечены на карте знаком ✚, секреты нужно искать самостоятельно.</p>'}${button('Карта',{action:'map'})}</section>`;}
const challengeRules={
 infection:['Уклоняйтесь от живучих преследователей. Убивать их не обязательно.','Оставайтесь внутри круга 30 секунд.','Регенерация и вампиризм отключены.','Выход приостанавливает прогресс.'],
 sealed:['Продержитесь 45 секунд и победите всех врагов.','После входа выйти из арены нельзя.'],
 hunt:['Победите отмеченную элиту за 60 секунд.','Время вышло — награда потеряна.'],
};
function rewards(n,claim){return `<div class="event-rewards">${n.rewards.map((k,i)=>`<div>${claim?partCard({key:k,name:CATALOG[k].name,action:'encounter-claim',id:i,tier:['','I','II','III'][n.rewardTier||1]}):partArt(k)}<span>${e(CATALOG[k].name)}</span></div>`).join('')}</div>`;}
export function encounterDetail(s,id){
 const n=s.encounters?.nodes.find(n=>n.id===id);if(!n)return '<section class="ui-screen-body ui-event-detail">Событие недоступно.</section>';
 const d=ENCOUNTERS[n.type],p=EVENT_PRESENTATION[n.type],near=nearEncounter(s,n,4);let body='',primary='';
 if(n.state==='reward'){body=`${sectionLabel('Награда — одна на выбор')}${rewards(n,true)}<p class="ui-note">Нажмите на деталь, чтобы посмотреть свойства и забрать. Остальные награды исчезнут.</p>${n.type==='slab'?'<p>Дополнительно: 30 биомассы.</p>':''}`;}
 else if(n.state==='ready'&&d.kind==='altar'){
  body=n.deals.filter(key=>Object.hasOwn(DEALS,key)).map(key=>frame(`<h3>${e(DEALS[key].name)}</h3>${key==='fuse'?`<p>${e(DEALS[key].description)}</p>${button('Выбрать руку',{action:'fuse-open',disabled:!s.arms.some(hand=>hand&&dealAllowed(s,n,'fuse',hand.id))})}`:`<p>${e(DEALS[key].description)}</p>${button('Рассмотреть',{action:'deal-review','data-key':key,disabled:!dealAllowed(s,n,key)})}`}`,{className:'event-deal'})).join('')+'<p class="ui-note">Одна операция на этом алтаре. Сначала просмотр, затем подтверждение. Недоступные сделки нельзя выбрать.</p>';
 }else if(n.state==='ready'&&d.kind==='challenge'){
  body=`<ul class="event-rules">${challengeRules[n.type].map(t=>`<li>${e(t)}</li>`).join('')}</ul>${sectionLabel('Награда — одна на выбор')}${n.rewardTier?`<p class="ui-note">Уровень детали: ${['','I','II','III'][n.rewardTier]||n.rewardTier}</p>`:''}${rewards(n,false)}`;
  primary=button('Начать',{action:'encounter-start',variant:'primary',disabled:!challengeAllowed(s,n)});
  if(near&&!challengeAllowed(s,n))body+=`<p class="ui-warning">${n.unlockLevel&&s.level<n.unlockLevel?'Доступно с уровня '+n.unlockLevel+'.':'Завершите бой с боссом, текущее испытание или выбор уровня.'}</p>`;
 }else body=`<p>${e(({ready:d.hint,active:'Испытание идёт. Вернитесь в игру, чтобы продолжить.',complete:d.kind==='altar'?'Сделка заключена. Алтарь больше недоступен в этом забеге.':'Награда получена. Событие завершено.',failed:'Время вышло. Награда потеряна. Повторить испытание в этом забеге нельзя.'})[n.state])}</p>`;
 if(!near&&!['complete','failed'].includes(n.state)){body='<p class="ui-warning">Подойдите к объекту, чтобы взаимодействовать.</p>'+body;primary=button('Маршрут',{action:'event-route',variant:'primary'});}
 return `<section class="ui-screen-body ui-event-detail"><div class="event-heading">${p?`<p class="ui-warning">Вход с ${encounterLevel(n)}-го уровня · ваш уровень ${s.level}</p>`:''}<span class="ui-eyebrow">${eventGlyph(n)} ${p?'Событие · '+e(p.category):'Секрет'} · ${e(p&&!availableEncounter(s,n)?'Закрыто':eventState(n))}</span><h3>${e(d.name)}</h3></div>${p?`<img class="event-model-image" src="${eventImage(n.type)}" alt="${e(d.name)} — объект в мире">`:''}${p?`<p class="ui-note">Рекомендуемый уровень ${n.recommended||d.recommended}</p>`:''}${body}</section><footer class="ui-screen-footer event-footer">${primary}${button(n.state==='active'?'Продолжить':'Позже',{action:'resume'})}</footer>`;
}

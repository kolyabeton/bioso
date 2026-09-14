import {e,icon} from './atoms.js';

/** Shared non-interactive world caption. Positioning belongs to its world adapter. */
export const WORLD_LABEL_STATES={
 ready:{label:'Доступно',icon:'plus'},
 active:{label:'Идёт испытание',icon:'clock'},
 reward:{label:'Заберите награду',icon:'bag'},
 complete:{label:'Завершено',icon:'check'},
 failed:{label:'Испытание провалено',icon:'close'},
 skipped:{label:'Вы отказались',icon:'close'},
};
export function worldLabel({title,category='Событие',state='ready',level}={}){
 const key=Object.hasOwn(WORLD_LABEL_STATES,state)?state:'ready',status=WORLD_LABEL_STATES[key];
 return `<div class="ui-world-label" data-state="${key}"><div class="ui-world-label__heading"><span>${e(category)}</span>${level?`<span class="ui-world-label__level" aria-label="Рекомендуемый уровень ${e(level)}">Ур. ${e(level)}</span>`:''}</div><strong class="ui-world-label__title">${e(title||'')}</strong><div class="ui-world-label__status">${icon(status.icon)}<span>${status.label}</span></div></div>`;
}

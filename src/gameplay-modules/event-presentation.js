import {EVENTS} from '../systems/events/definitions.js';
/** One identity for the world object, its map marker and its detail screen. */
export const EVENT_PRESENTATION=Object.freeze({
 ...Object.fromEntries(Object.entries(EVENTS).filter(([,d])=>d.kind==='altar').map(([type,d])=>[type,{model:'arch-stairs',size:3.2,height:2.4,category:'Сделка',summary:d.hint}])),
 sealed:{model:'arch-gate',size:3.8,height:4,category:'Испытание',summary:'45 секунд · закрытая арена'},
 infection:{model:'arch-planter',size:3.2,height:2.4,category:'Испытание',summary:'30 секунд внутри круга'},
 hunt:{model:'arch-arch',size:3.8,height:4,category:'Испытание',summary:'60 секунд · отмеченная элита'},
});
export const eventState=n=>({ready:'Доступно',active:'Идёт испытание',reward:'Заберите награду',complete:'Завершено',failed:'Испытание провалено'})[n.state]||'';
export const eventGlyph=n=>n.state==='complete'?'✓':n.state==='failed'?'×':n.state==='reward'?'★':'✚';
export const eventImage=type=>EVENT_PRESENTATION[type]?`/assets/encounters/${EVENT_PRESENTATION[type].model}.png`:null;

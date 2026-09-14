import {EVENTS} from '../systems/events/definitions.js';
/** One identity for the world object, its map marker and its detail screen. */
export const EVENT_PRESENTATION=Object.freeze({
 membrane:{model:'secret-membrane-v2',art:'feat-secrets',size:3.4,height:2.2,category:'Секрет',summary:'Растворяется кислотой'},
 slab:{model:'secret-slab-v2',art:'feat-secrets',size:3.5,height:1.1,category:'Секрет',summary:'Вскрывается щитом или буром'},
 nursery:{model:'secret-nursery-v2',art:'feat-secrets',size:3.7,height:2.6,category:'Секрет',summary:'Пробуждается электричеством'},
 ...Object.fromEntries(Object.entries(EVENTS).filter(([,d])=>d.kind==='altar').map(([type,d])=>[type,{model:'arch-stairs',art:'feat-contract',size:3.2,height:2.4,category:'Сделка',summary:d.hint}])),
 sealed:{model:'arch-pillar',art:'feat-sealed',size:5.2,height:5.2,category:'Испытание',summary:'45 секунд · закрытая арена'},
 infection:{model:'arch-planter',art:'feat-infection',size:3.2,height:2.4,category:'Испытание',summary:'30 секунд внутри круга'},
 hunt:{model:'arch-arch',art:'feat-hunt',size:3.8,height:4,category:'Испытание',summary:'60 секунд · отмеченная элита'},
 race:{model:'arch-arch',art:'meta-spring',size:3,height:4,category:'Испытание',summary:'Дальний финиш · гонка на время'},
 dungeon_roots:{model:'arch-gate',art:'feat-infection',size:10,height:8,category:'Логово',summary:'Корневые тоннели · 12 элит'},
 dungeon_catacombs:{model:'arch-gate',art:'feat-sealed',size:10,height:8,category:'Логово',summary:'Техногенные тоннели · 18 элит'},
});
export const eventState=n=>n.skipped?'Вы отказались':({ready:'Доступно',paused:'Прогресс сохранён',active:'Идёт испытание',reward:'Заберите награду',complete:'Завершено',failed:'Испытание провалено'})[n.state]||'';
export const eventGlyph=n=>n.state==='complete'?'✓':n.state==='failed'?'×':n.state==='reward'?'★':'✚';
export const eventImage=type=>EVENT_PRESENTATION[type]?.art?`/assets/ui/achievements/${EVENT_PRESENTATION[type].art}-v1.jpg`:null;

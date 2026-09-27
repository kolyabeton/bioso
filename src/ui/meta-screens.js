import {e,button,icon,iconButton,frame,badge,meter,sectionLabel} from './atoms.js';
import {partGrid,resource} from './molecules.js';
import {CATALOG} from '../catalog.js';
import {chassisItemAvailable} from '../systems/chassis-unlocks.js';
import {META_ACHIEVEMENTS,meta,START_BODIES,START_WEAPONS,START_ORGANS,missionBossVictories,starterAllowed,starterSlotAllowed,starterSlotRequirement,validLoadout} from '../systems/meta-progression.js';
import './meta-screens.css';
const footer=html=>`<footer class="ui-screen-footer">${html}</footer>`;
export {profileScreen,achievementScreen,achievementRunSummary} from './achievement-screens.js';
export function loadoutScreen(p,params){
 const selected=validLoadout(p,params.choice);
 const grid=(keys,group,slotLocked=false)=>partGrid(keys.map(key=>({key,name:CATALOG[key].name,action:'starter-choice',id:group,selected:selected[group]===key,locked:slotLocked||!starterAllowed(p,key)})),{className:'meta-loadout-options'});
 const organLocked=!starterSlotAllowed(p,'organ'),organ=`${organLocked?`<p class="meta-loadout-progress">🔒 ${e(starterSlotRequirement('organ'))} · ${missionBossVictories(p)} из 3</p>`:''}${grid(START_ORGANS,'organ',organLocked)}`;
 const visibleBodies=import.meta.env?.MODE==='playtest'?START_BODIES.slice(0,3):START_BODIES;
 return `<section class="ui-screen-body meta-screen meta-loadout">${sectionLabel('1 · Корпус')}${grid(visibleBodies.filter(key=>chassisItemAvailable(p,key)),'body')}${sectionLabel('2 · Оружие')}${grid(START_WEAPONS,'arm')}${sectionLabel('3 · Стартовый орган')}${organ}</section>${footer(button('Начать',{action:'loadout-start',variant:'primary'}))}`;
}
export function overrunScreen(s){return `<section class="ui-screen-body meta-screen ui-overrun-body"><img class="ui-overrun-art" src="/assets/ui/overrun-last-stand-v1.png" alt="Новая волна приближается к останкам Матки" width="1536" height="1024"><h3>Ещё 30 секунд?</h3><p>Усиленные элиты и подкрепления каждые 4 секунды. Продержитесь до конца — убивать всех не обязательно.</p><div class="ui-overrun-outcomes"><div><span>Уйти сейчас</span><strong>${icon('reroll')}3</strong></div><div><span>Выжить</span><strong>${icon('reroll')}6</strong></div><div><span>Погибнуть</span><strong>${icon('reroll')}0</strong></div></div><p class="ui-overrun-caption">Кубики за этот забег</p><p class="ui-warning">Рискуете только наградой за эту победу. Накопленные кубики сохранятся.</p><details class="ui-overrun-unlocks"><summary>Открытия за испытание</summary><p>Первый успех открывает Лебёдку, второй — Электрика, третий — Ремонтника и Кожух.</p></details></section>${footer(button('Забрать 3',{action:'home',icon:'reroll'})+button('Рискнуть',{action:'overrun-start',variant:'primary'}))}`;}

import {CATALOG} from '../catalog.js';
import {BOSS_RECIPES,ENEMY_RECIPES} from '../systems/enemy-assembly.js';
import {enemyBalance} from '../systems/balance.js';
import {ENEMY_WEAPONS} from '../systems/enemy-combat.js';
import {ENEMY_WEAPON_COUNTERS,enemyInteractionTags} from '../systems/enemy-interactions.js';
import {e,segmented} from './atoms.js';
import {partArt} from './molecules.js';
import {enemyPreviewArt,enemyPreviewThumb,mountEnemyPreview} from './enemy-3d-preview.js';

const ROLE_LABELS=Object.freeze({mass:'обычный',fast:'быстрый',ranged:'дальний бой',armored:'бронированный',flying:'летающий'});
export const ENEMY_CLASS_FILTERS=Object.freeze([
 {value:'all',label:'Все'},
 {value:'mass',label:'Обычные'},
 {value:'fast',label:'Быстрые'},
 {value:'ranged',label:'Дальние'},
 {value:'armored',label:'Бронированные'},
 {value:'flying',label:'Летающие'},
 {value:'boss',label:'Боссы'},
]);
const LOCOMOTION=Object.freeze({
 burrow:'Нырок: уходит под землю во время перебежки и неуязвим в пути.',
 hop:'Прыжки: перепрыгивает короткие участки и резко меняет дистанцию.',
 spiral:'Спиральный заход: обходит цель по дуге, сохраняя линию атаки.',
 charge:'Рывок: разгоняется и атакует после короткой подготовки.',
 sprint:'Спринт: быстро сокращает дистанцию.',
 pack:'Стая: держится рядом с другими быстрыми особями.',
});
const SPECIALTY=Object.freeze({
 'shield-bearer':'Щит: получает на 80% меньше урона от фронтальных атак и раз в 5 с проводит таран.',
 divider:'Деление: при смерти создаёт двух уменьшенных копий без награды.',
 mirrorling:'Отражение: раз в 5 с возвращает попавший в него снаряд обратно в сторону героя.',
 puppeteer:'Кукольник: каждые 4 с выпускает до двух рабочих и поддерживает до шести призванных существ.',
 evader:'Уклонение: с вероятностью 80% избегает прямых попаданий; кислота и зоны не уклоняются.',
});
const MODE_LABELS=Object.freeze({sector:'ближняя дуга',area:'удар по области',shot:'снаряд',acid:'кислотная лужа'});
const WEAPON_KEYS=Object.freeze(Object.keys(ENEMY_WEAPON_COUNTERS));
const formatNumber=value=>String(Math.round(value*100)/100).replace('.',',');

export const enemyCatalogEntries=Object.freeze([
 ...ENEMY_RECIPES.map(recipe=>({...recipe,key:`enemy:${recipe.id}`,kind:'normal'})),
 ...BOSS_RECIPES.map(recipe=>({...recipe,key:`boss:${recipe.id}`,kind:'boss',role:'boss'})),
]);

export function enemyCatalogEntry(key){return enemyCatalogEntries.find(entry=>entry.key===key)||null;}

function pseudoEnemy(entry){return{recipeId:entry.id,role:entry.role,specialty:entry.specialty,flying:entry.role==='flying'};}

function baseStats(entry){
 if(entry.kind==='boss')return{hp:'×1,6 волны',speed:'×0,65',armor:'20'};
 const stats=enemyBalance(0,'normal',entry.role);
 return{hp:`×${formatNumber(stats.hp/12)}`,speed:`×${formatNumber(stats.speed/2.15)}`,armor:String(stats.armor)};
}

function abilityText(entry){
 const special=SPECIALTY[entry.specialty];
 const movement=LOCOMOTION[entry.locomotion];
 if(entry.kind==='boss')return 'Босс: несколько фаз атаки и усиленный запас здоровья.';
 return [special,movement,entry.role==='flying'?'Полёт: игнорирует рельеф и наземные лужи.':null].filter(Boolean).join(' ')
   ||`Роль: ${ROLE_LABELS[entry.role]||entry.role}.`;
}

function weaponInfo(key){
 const data=ENEMY_WEAPONS[key],catalog=CATALOG[key];
 if(!data)return{key,name:catalog?.name||key,summary:''};
 const summary=[MODE_LABELS[data.mode],`дальность ${formatNumber(data.range)} м`,`откат ${formatNumber(data.recovery)} с`].join(' · ');
 return{key,name:catalog?.name||key,summary};
}

function counterRows(entry){
 const tags=enemyInteractionTags(pseudoEnemy(entry));
 return WEAPON_KEYS.flatMap(key=>{
   const counters=ENEMY_WEAPON_COUNTERS[key]||{};
   const tag=[...tags].find(candidate=>counters[candidate]!=null);
   return tag?[{key,multiplier:counters[tag]}]:[];
 }).sort((a,b)=>a.multiplier-b.multiplier);
}

export function enemyIcon(entry,{large=false}={}){
 const body=entry.body||'bastion',weapon=entry.weapons?.[0]||'claws';
 return `<span class="ui-enemy-icon ${large?'ui-enemy-icon--large':''} ui-enemy-icon--${e(entry.role||'boss')}" aria-hidden="true"><span class="ui-enemy-icon-body">${partArt(body)}</span><span class="ui-enemy-icon-weapon">${partArt(weapon)}</span></span>`;
}

export function enemyCard(entry,{selected=false}={}){
 const role=entry.kind==='boss'?'босс':ROLE_LABELS[entry.role]||entry.role;
 return `<button type="button" class="ui-frame ui-part-card ui-enemy-card ${selected?'is-selected':''}" data-action="enemy-select" data-key="${e(entry.key)}" data-item-icon="true" aria-label="${e(entry.name)} · ${e(role)}"><span class="ui-enemy-card-art">${enemyIcon(entry)}${enemyPreviewThumb(entry)}</span></button>`;
}

export function enemyInspectorData(entry){
 const stats=baseStats(entry),body=CATALOG[entry.body],leg=CATALOG[entry.leg],organs=(entry.organs||[]).map(key=>CATALOG[key]?.name||key);
 const weapons=entry.weapons.map(weaponInfo),counters=counterRows(entry);
 const lines=[`Корпус: ${body?.name||entry.body}`,`Опоры: ${leg?.name||entry.leg}`,`Оружие: ${weapons.map(w=>w.name).join(' · ')}`,...weapons.map(w=>`${w.name}: ${w.summary}`),counters.length?`Контр-оружие на сложном: ${counters.map(({key,multiplier})=>`${weaponInfo(key).name} ×${formatNumber(multiplier)}`).join(' · ')}`:'Особого контр-оружия нет: обычный урон ×1.','На лёгком уровне штрафы отключены; между уровнями они плавно приближаются к значениям сложного.'];
 if(organs.length)lines.splice(2,0,`Органы: ${organs.join(' · ')}`);
 return {key:entry.body,name:entry.name,subtitle:entry.kind==='boss'?'Босс':ROLE_LABELS[entry.role]||entry.role,art:enemyPreviewArt(entry),primaryEffect:abilityText(entry),rows:[{label:'Здоровье',value:stats.hp},{label:'Скорость',value:stats.speed},{label:'Броня',value:stats.armor}],lines,afterMount:tip=>mountEnemyPreview(tip.querySelector('[data-enemy-3d]'),entry)};
}

export function enemyDetail(entry){
 const stats=baseStats(entry),body=CATALOG[entry.body],leg=CATALOG[entry.leg],organs=(entry.organs||[]).map(key=>CATALOG[key]?.name||key);
 const weapons=entry.weapons.map(weaponInfo),counters=counterRows(entry);
 const equipment=[['Корпус',body?.name||entry.body],['Оружие',weapons.map(w=>w.name).join(' · ')],['Опоры',leg?.name||entry.leg],organs.length?['Органы',organs.join(' · ')]:null].filter(Boolean);
 return `<article class="ui-enemy-detail"><header class="ui-enemy-hero">${enemyIcon(entry,{large:true})}<div><span class="ui-eyebrow">${e(entry.kind==='boss'?'Босс':ROLE_LABELS[entry.role]||entry.role)}</span><h3>${e(entry.name)}</h3><p>${e(entry.kind==='boss'?'Отдельная боссовая шкала':`Появление: ${entry.from>=60?`${Math.floor(entry.from/60)} мин`:'с начала забега'}`)}</p></div></header><section class="ui-enemy-stat-grid" aria-label="Базовые характеристики"><div><small>Здоровье</small><strong>${e(stats.hp)}</strong></div><div><small>Скорость</small><strong>${e(stats.speed)}</strong></div><div><small>Броня</small><strong>${e(stats.armor)}</strong></div></section><section class="ui-enemy-info"><h4>Способность</h4><p>${e(abilityText(entry))}</p></section><section class="ui-enemy-info"><h4>Состав</h4><dl>${equipment.map(([label,value])=>`<div><dt>${e(label)}</dt><dd>${e(value)}</dd></div>`).join('')}</dl></section><section class="ui-enemy-info"><h4>Оружие</h4><ul>${weapons.map(w=>`<li><strong>${e(w.name)}</strong><span>${e(w.summary)}</span></li>`).join('')}</ul></section><section class="ui-enemy-info"><h4>Контр-оружие на сложном</h4>${counters.length?`<ul class="ui-enemy-counters">${counters.map(({key,multiplier})=>`<li><strong>${e(weaponInfo(key).name)}</strong><span>урон ×${e(formatNumber(multiplier))}</span></li>`).join('')}</ul>`:'<p>Особого контр-оружия нет: обычный урон ×1.</p>'}<small class="ui-enemy-note">На лёгком уровне штрафы отключены; между уровнями они плавно приближаются к значениям сложного.</small></section></article>`;
}

export function enemyCatalogScreen({selected=null,role='all'}={}){
 const entry=selected?enemyCatalogEntry(selected):null;
 const filtered=enemyCatalogEntries.filter(candidate=>role==='all'||(role==='boss'?candidate.kind==='boss':candidate.role===role));
 return `<p class="ui-catalog-progress">${filtered.length} из ${enemyCatalogEntries.length} существ · характеристики и ответы оружием</p>${segmented(ENEMY_CLASS_FILTERS,role,{action:'enemy-filter',label:'Класс врага',className:'ui-enemy-filter'})}${entry?`<div class="ui-selected-detail ui-enemy-selected">${enemyDetail(entry)}</div>`:`<div class="ui-item-grid ui-catalog-grid ui-enemy-grid">${filtered.map(enemyCard).join('')}</div>`}`;
}

import {SETS,partMeta,setCounts,equipped} from '../systems/sets-loot.js';
import {setClock,setBarrierView,SET_TIMING} from '../systems/sets/bonuses.js';
import {CATALOG} from '../catalog.js';
import {e,frame} from './atoms.js';
import {partArt} from './molecules.js';

export function activeSetDescription(s,id,count){return count>=3?`${SETS[id].two} ${SETS[id].three}`:count>=2?SETS[id].two:'';}
export function setProgress(count){return count>=3?`Комплект собран · ${count} типа`:`${count} / 3`;}
export function setStatus(s,id){
 if(!(setCounts(s)[id]>=3))return '';
 const a=s.setsV2||{},now=setClock(s),seconds=(at,fallback)=>Math.ceil(Number.isFinite(at)?Math.max(0,at-now):fallback);
 switch(id){
  case'wanderer':return `Сборщик · ${seconds(a.collectorAt,SET_TIMING.collector)} с`;
  case'hunter':return `До точного залпа: ${3-(a.hunterShots||0)}`;
  case'bastion':{const v=setBarrierView(s);return v.ready?'Панцирь · Готов':`Панцирь · ${Math.ceil(v.remaining)} с`;}
  case'chimera':return [(a.meleeUntil||0)>now?`Ближние атаки +30% · ${seconds(a.meleeUntil,0)} с`:'',(a.rangedUntil||0)>now?`Дальние атаки +30% · ${seconds(a.rangedUntil,0)} с`:''].filter(Boolean).join(' · ')||'Попадите ближней или дальней атакой';
  case'rootwalker':return `Живые ткани · ${seconds(a.tissueAt,SET_TIMING.tissue)} с`;
  case'hecaton':return (a.hecatonAt||0)>now?`Общий затвор · ${seconds(a.hecatonAt,0)} с`:`Общий затвор · ${Object.entries(a.hands||{}).filter(([id,at])=>now-at<=SET_TIMING.handWindow&&s.arms.some(p=>p&&!p.disabled&&String(p.id)===id)).length} / 3 рук`;
  case'reactor':return seconds(a.reactorAt,SET_TIMING.reactor)?`Разряд · ${seconds(a.reactorAt,SET_TIMING.reactor)} с`:'Разряд · Готов';
  case'broodmother':return (a.broodUntil||0)>now?`Рой ускорен · ${seconds(a.broodUntil,0)} с`:'Ожидает перехвата снаряда';
  default:return '';
 }
}
export function setBonusRows(id,count,{preview=false}={}){
 const set=SETS[id];
 return [2,3].map(required=>{
  const active=count>=required,status=active?'Активно':count===2&&required===3?'Нужно ещё 1 тип':`Нужно ${required} типа`;
  return `<div class="ui-set-bonus-row" data-required="${required}" data-active="${active}"><small>${required} типа · ${preview?'Бонус комплекта':e(status)}</small><p>${e(required===2?set.two:set.three)}</p></div>`;
 }).join('');
}
export function activeSetCard(s,id,count){
 const status=setStatus(s,id);
 return frame(`<div class="ui-set-bonus-heading">${partArt(id,{label:`Комплект ${SETS[id].name}`})}<div><strong>${e(SETS[id].name)}</strong><small>${e(setProgress(count))}</small></div></div>${setBonusRows(id,count)}${status?`<p class="ui-set-status">${e(status)}</p>`:''}`,{className:'ui-set-bonus-card'});
}
export function catalogSets(s=null){
 const parts=s?equipped(s):[],counts=s?setCounts(s):{};
 return `<div class="ui-set-scroll"><p class="ui-note">Комплект — части с одной подписью, например «Садовник». Установите 2 или 3 разных типа: корпус, руку, ногу, орган. Две руки считаются одним типом.</p>${Object.entries(SETS).map(([id,set])=>{
  const own=parts.filter(p=>partMeta(p).setId===id),count=counts[id]||0;
  const types=Object.entries({body:'Корпус',arm:'Рука',leg:'Нога',organ:'Орган'}).map(([kind,label])=>`${own.some(p=>CATALOG[p.key].kind===kind)?'✓':'—'} ${label}`).join(' · ');
  return `<details class="ui-frame ui-set-card"><summary>${partArt(id)}<span><strong>${e(set.name)}</strong>${s?`<small>${e(setProgress(count))}</small>`:''}</span><span aria-hidden="true">＋</span></summary><div class="ui-set-copy">${s?`<p>${e(types)}</p>`:''}${setBonusRows(id,count,{preview:!s})}<p>${e(set.details)}</p><p class="ui-note">Корпус комплекта: ${e(CATALOG[id].name)}. Руки, ноги и органы этого комплекта выпадают случайно. Сверяйте подпись в свойствах детали; редкость может быть любой.</p></div></details>`;
 }).join('')}</div>`;
}

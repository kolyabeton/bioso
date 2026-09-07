import {SETS,partMeta,setCounts,equipped} from '../systems/sets-loot.js';
import {CATALOG} from '../catalog.js';
import {SHIELD_RECHARGE_SECONDS} from '../systems/health-tuning.js';
import {e,badge} from './atoms.js';
import {partArt} from './molecules.js';
export function catalogSets(s=null){
 const parts=s?equipped(s):[],counts=s?setCounts(s):{};
 return `<div class="ui-set-scroll"><p class="ui-note">Комплект — части с одной подписью, например «Разведчик». Установите 2 или 3 разных типа: корпус, руку, ногу, орган. Две руки считаются одним типом.</p>${Object.entries(SETS).map(([id,set])=>{
  const own=parts.filter(p=>partMeta(p).setId===id),count=counts[id]||0;
  const types=Object.entries({body:'Корпус',arm:'Рука',leg:'Нога',organ:'Орган'}).map(([kind,label])=>`${own.some(p=>CATALOG[p.key].kind===kind)?'✓':'—'} ${label}`).join(' · ');
  const third=id==='bastion'?`${set.three} Без других усилений: ${(SHIELD_RECHARGE_SECONDS*.9).toFixed(1)} с вместо ${SHIELD_RECHARGE_SECONDS} с.`:set.three;
  const bonuses=id==='reactor'?`<p>Это особенность корпуса, а не бонус за сочетание частей. Установите корпус «Реактор»: после 15 убийств скорость атак увеличивается на 30% на 6 секунд. После перегрузки нужно подождать 15 секунд, прежде чем убийства снова начнут накапливать заряд. Дополнительных бонусов за 2 или 3 типа частей сейчас нет.</p>`:[2,3].map(required=>`<p>${badge(s&&count>=required?'Бонус активен':`Нужно ${required} типа`,s&&count>=required?'mint':'neutral')}<br>${required} типа: ${e(required===2?set.two:third)}</p>`).join('');
  return `<details class="ui-frame ui-set-card"><summary>${partArt(id)}<span><strong>${e(set.name)}</strong>${s?`<small>Установлено типов: ${count} / 4${id!=='reactor'&&count>=2?' · есть бонус':''}</small>`:''}</span><span aria-hidden="true">＋</span></summary><div class="ui-set-copy">${s?`<p>${e(types)}</p>`:''}${bonuses}<p class="ui-note">Корпус комплекта: ${e(CATALOG[id].name)}. Руки, ноги и органы этого комплекта выпадают случайно. Сверяйте подпись в свойствах детали; редкость может быть любой. Условные бонусы срабатывают при выполнении указанного условия.</p></div></details>`;
 }).join('')}</div>`;
}

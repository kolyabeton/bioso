import {weaponStats} from '../assembly.js';
import {modifiers} from '../systems/abilities.js';
import {setBonuses} from '../systems/sets-loot.js';
import {healthView} from '../systems/health.js';
import {loadoutDps} from './adapters.js';
import {soulRecoveryRows} from './soul-copy.js';
import {soulSummonStats} from './soul-summon-stats.js';

const percent=(value,digits=0)=>`${(value*100).toFixed(digits)}%`;
const signed=(value,digits=0)=>`${value<0?'−':'+'}${(Math.abs(value)*100).toFixed(digits)}%`;
/** Weapons carry their own crit, so the panel shows the spread across equipped hands. */
const range=(values,format)=>{const low=Math.min(...values),high=Math.max(...values);return low===high?format(low):`${format(low)} – ${format(high)}`;};

function critRows(s,st){
 const active=(s.arms||[]).filter(p=>p&&!p.disabled).map(p=>weaponStats(s,p,st)).filter(w=>w.crit>0);
 if(!active.length)return [['Шанс крита','Нет']];
 return [['Шанс крита',range(active.map(w=>w.crit),v=>percent(v,0))],['Урон крита',range(active.map(w=>w.critPower),v=>`×${v.toFixed(2)}`)]];
}

/** Four compact columns: survivability, offence, resources and the swarm. */
export function soulStatGroups(s,st){
 const health=healthView(s,st.hp,st.armor,st),buff=modifiers(s),sets=setBonuses(s);
 const revivesUsed=s.health?.abilityRevivesUsed||0,swarm=soulSummonStats(s,buff);
 return [
  {title:'Живучесть',rows:[
   ['Здоровье',`${s.hp} из ${st.hp}`],
   ['Броня',st.armor?`${health.armor} из ${st.armor}`:'Нет'],
   ['Щит',st.shieldMax?`${health.shieldCharges} из ${health.shieldMax}`:'Нет'],
   ...soulRecoveryRows(st),
   ['Уклонение',percent(st.dodge,1)],
   ['Скорость',`${st.speed.toFixed(1)} м/с`],
  ]},
  {title:'Атака',rows:[
   ['DPS',loadoutDps(s,st).toFixed(1)],
   ['Общий урон',percent(buff.damage||0)],
   ['Ближний урон',percent((buff.damage||0)+(buff.meleeDamage||0)+sets.meleeDamage)],
   ['Дальний урон',percent((buff.damage||0)+(buff.rangedDamage||0)+sets.rangedDamage)],
   ['Скорость атаки',percent(st.rate+(buff.rate||0))],
   ...critRows(s,st),
   ['Скор. снарядов',`×${(st.projectile*(1+(buff.velocity||0))).toFixed(2)}`],
  ]},
  {title:'Ресурсы',rows:[
   ['Уровень',String(s.level)],
   ['Побеждено',String(s.kills)],
   ['Биомасса от деталей',signed(buff.biomassYield||0)],
   ['Получаемый опыт',signed(buff.xpGain||0)],
   ['Подбор',`${st.pickup.toFixed(1)} м`],
   ['Вес и лимит',`${st.weight.toFixed(0)} из ${st.capacity.toFixed(0)}`],
   ['Заряды возрождения',String(s.consumables?.revivalCharges||0)],
   ['Вторая жизнь',st.revive?`${Math.max(0,st.revive-revivesUsed)} из ${st.revive}`:'Нет'],
  ]},
  ...(swarm.length?[{title:'Рой',rows:swarm}]:[]),
 ];
}

export const SOUL_DPS_HINT='Базовый урон в секунду всего оружия: без критов, перезарядки и дополнительных эффектов.';

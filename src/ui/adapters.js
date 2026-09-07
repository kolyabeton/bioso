import {META_ACHIEVEMENTS} from '../systems/meta-progression.js';
import {bodyTraitDescription,organEffect} from '../systems/body-traits.js';
import {organCapacity,slotCount} from '../systems/body-slots.js';
import {partTraits,setBonuses,reloadDuration} from '../systems/sets-loot.js';
import {NEW_ORGANS,RARE_ORGANS} from '../systems/mutations.js';
import {CATALOG,ROMAN,MODIFIERS,MISSIONS,SURVIVAL_UNLOCKS} from '../catalog.js';
import {stats,weaponStats,def,weight,capacity,bodyHealth,ranks,tierFactor,addBonus,regenerationDelay,legArmor} from '../assembly.js';
import {upgradeCost,HEALTH} from '../systems/balance.js';

export const timeText = t => `${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`;
export const kindName = {body:'Корпус',arm:'Рука',leg:'Нога',organ:'Орган'};
export const groupNames = {arms:'Руки',legs:'Ноги',organs:'Внутренние органы'};
export function cardData(p){return {key:p.key,id:p.id,name:def(p).name,tier:ROMAN[p.tier],note:`${partTraits(p)} · ${def(p).kind==='body'?'В запасе':'Вес'} ${weight(p).toFixed(0)}`};}
export function cloneForComparison(s){return {...structuredClone(Object.fromEntries(['body','arms','legs','organs','inventory','hp','soul','abilities','health','time','biomass','serial','player','ground','isaac','puddles'].map(key=>[key,s[key]]))),world:s.world};}
export function comparisonRows(before,after,{group,slot}={}){const a=stats(before),b=stats(after);const rows=[
  {label:'Здоровье',before:`${before.hp} / ${a.hp}`,after:`${after.hp} / ${b.hp}`},
  {label:'Броня',before:a.armor?`${a.armor} пластин`:'Нет',after:b.armor?`${b.armor} пластин`:'Нет'},
  {label:'Движение',before:`${a.speed.toFixed(1)} м/с`,after:`${b.speed.toFixed(1)} м/с`},
  {label:'Вес',before:`${a.weight.toFixed(0)} / ${a.capacity.toFixed(0)}`,after:`${b.weight.toFixed(0)} / ${b.capacity.toFixed(0)}`},
 ];
  if(a.shieldMax!==b.shieldMax)rows.push({label:'Щит',before:a.shieldMax?'1 удар':'Нет',after:b.shieldMax?'1 удар':'Нет'});
  if(a.regen||b.regen)rows.push({label:'Регенерация',before:a.regen?`1 дел. / ${Number(a.regenDelay.toFixed(2))} с`:'Нет',after:b.regen?`1 дел. / ${Number(b.regenDelay.toFixed(2))} с`:'Нет'});
  if(group==='arms'){
    const old=before.arms[slot],next=after.arms[slot],x=old?weaponStats(before,old):null,y=next?weaponStats(after,next):null;
    for(const [key,label,unit] of [['damage','Урон руки',''],['interval','Скорость атаки',' с'],['range','Дальность',' м']])rows.push({label,before:x?(key==='damage'?String(Number(x[key].toFixed(1))):x[key].toFixed(1))+unit:'—',after:y?(key==='damage'?String(Number(y[key].toFixed(1))):y[key].toFixed(1))+unit:'—'});
  }
  return rows.map(r=>{const changed=r.before!==r.after;let delta=parseFloat(r.after)-parseFloat(r.before);if(r.label==='Скорость атаки')delta=-delta;if(r.label==='Регенерация'&&a.regen&&b.regen)delta=a.regenDelay-b.regenDelay;if(r.label==='Вес')delta=(b.capacity-b.weight)-(a.capacity-a.weight);let tone=Number.isFinite(delta)?delta>0?'positive':delta<0?'negative':'neutral':r.after==='Нет'?'negative':'positive';return {...r,changed,tone:changed?tone:'neutral'};});}

export function describePart(run,p){const d=def(p),power=tierFactor(p)*(1+addBonus(p,'power'))*organEffect(run);let lines=[];
  if(d.kind==='arm'){const w=weaponStats(run,p);lines=[`${w.damage.toFixed(1).replace(/\.0$/,'')} урона · скорость атаки: ${w.interval.toFixed(2)} с`, `Дальность ${w.range.toFixed(1)} м · крит ${(w.crit*100).toFixed(0)}%`,d.description];if(w.magazine)lines.push(`Магазин ${p.ammo??w.magazine} / ${w.magazine} · перезарядка ${reloadDuration(run,p,w.reload).toFixed(2)} с`);}
  else if(d.kind==='body')lines=[`Руки: ${d.arms} · ноги: ${d.legs} · органы: ${p===run.body?slotCount(run,p,'organs'):organCapacity(p)}`,`Вместимость ${(p===run.body?stats(run).capacity:capacity(p)).toFixed(0)} · здоровье корпуса ${bodyHealth(p)} дел.`,bodyTraitDescription(p)];
  else if(d.kind==='leg')lines=[`Базовая скорость ${d.speed} м/с`,d.regen?`Регенерация: 1 дел. / ${Number(regenerationDelay(run,p).toFixed(2))} с`:d.armor?`Броня +${(legArmor(p)*100).toFixed(0)}% пластины · бонусы складываются`:'Без брони',d.description];
  else lines=[({regen:`Восстанавливает 1 деление после ${regenerationDelay(run,p).toFixed(1)} с без потери здоровья`,shield:`Блокирует 1 удар · восстанавливается за ${(setBonuses(run).shieldDelay/organEffect(run)).toFixed(1)} с`,armor:`Стальные пластины поверх здоровья · принимают урон раньше здоровья`,stabilizer:`Скорость снарядов +${(30*power).toFixed(0)}%`,accelerator:`Скорость атак рук +${(15*power).toFixed(0)}%`,digestion:`Переработка деталей в биомассу · выход ×${power.toFixed(2)}`})[p.key]||d.description];
  if(d.kind==='organ'&&organEffect(run)>1&&['returnNerve','slime','parasite','commonNerve','outerStomach','reverseHeart','regen','shield','armor','stabilizer','digestion','accelerator'].includes(p.key))lines.push('Бонус корпуса: эффективность +30% (сила эффекта или скорость восстановления).');
  return {name:d.name,kind:kindName[d.kind],tier:ROMAN[p.tier],modifier:MODIFIERS[p.modifier]||'',weight:weight(p),lines:lines.filter(Boolean),rank:ranks(p),cost:upgradeCost(ranks(p))};
}
export function unlockCondition(key){const extra=META_ACHIEVEMENTS.find(a=>a.key===key);if(extra)return extra.description;if(NEW_ORGANS.includes(key))return 'Добыча, секреты и испытания';if(RARE_ORGANS.includes(key))return 'Редкая добыча или награда испытания';return MISSIONS.find(m=>m.rewards.includes(key))?.name||SURVIVAL_UNLOCKS.find(m=>m.rewards.includes(key))?.name||'Стартовая деталь';}
export function catalogDescription(d){if(d.kind==='body')return `${d.arms} руки · ${d.legs} ноги · ${d.organs}–${d.arms>=3?3:8} органов по рангу и редкости · вес до ${d.capacity}. ${bodyTraitDescription(d)}`;if(d.kind==='leg')return `Скорость ${d.speed} м/с · вес ${d.weight}${d.description?" · "+d.description:""}`;return d.description;}
export function findPart(run,{id,group,slot,ground}){if(ground!=null)return run.ground.find(g=>g.id===Number(ground))?.part;if(group==='body')return run.body;if(group)return run[group]?.[Number(slot)];return run.inventory.find(p=>p.id===Number(id));}

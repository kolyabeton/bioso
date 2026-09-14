import {summonTuning} from '../systems/symbionts.js';
import {modifiers} from '../systems/abilities.js';
import {summonPartBonus} from '../systems/summon-equipment.js';
import {META_ACHIEVEMENTS} from '../systems/meta-progression.js';
import {bodyTraitDescription,organEffect} from '../systems/body-traits.js';
import {organCapacity,slotCount} from '../systems/body-slots.js';
import {partTraits,reloadDuration} from '../systems/sets-loot.js';
import {NEW_ORGANS,RARE_ORGANS} from '../systems/mutations.js';
import {CATALOG,ROMAN,MODIFIERS,MISSIONS,SURVIVAL_UNLOCKS,WEAPON_UNLOCKS} from '../catalog.js';
import {stats,weaponStats,def,weight,capacity,bodyHealth,ranks,tierFactor,addBonus,regenerationDelay,legArmor,legHealth,legSpeed,armorPlateCapacity,returnNerveDamage,parasiteLarvaDamage,slimeSlowdown,commonNerveVolleyMultiplier,reverseHeartDamageMultiplier} from '../assembly.js';
import {upgradeCost,HEALTH} from '../systems/balance.js';
import {ARMOR_REPAIR_SECONDS} from '../systems/health-tuning.js';
import {shieldRechargeDelay} from '../systems/health.js';
import {springCooldown} from '../systems/extra-parts.js';

// Sustained rank-I DPS for one target; excludes crits, body/skill bonuses and secondary targets.
export function weaponSustainedDps(s,p,st=stats(s)){
 const w=weaponStats(s,p,st),magazine=w.magazine||1,reload=w.reload?reloadDuration(s,p,w.reload):w.interval,cycle=(magazine-1)*w.interval+Math.max(w.interval,reload),projectiles=w.pellets??w.projectileCount??1,direct=w.damage*projectiles*magazine/cycle;
 return direct+(w.mode==='acid'?9:0);
}
export function loadoutDps(s,st=stats(s)){
  return s.arms.filter(p=>p&&!p.disabled).reduce((total,p)=>total+weaponSustainedDps(s,p,st),0);
}

export const timeText = t => `${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`;
export const kindName = {body:'Корпус',arm:'Рука',leg:'Нога',organ:'Орган'};
export const groupNames = {arms:'Руки',legs:'Ноги',organs:'Внутренние органы'};
export const weaponChargeLabel=d=>['sector','area','contact'].includes(d?.mode)?'Заряды':'Магазин';
export function cardData(p){return {key:p.key,id:p.id,name:def(p).name,tier:ROMAN[p.tier],note:`${partTraits(p)} · ${def(p).kind==='body'?'В запасе':'Вес'} ${weight(p).toFixed(0)}`};}

// Only properties that are not already represented by the common stat rows.
// Keeping this list structured prevents old prose from repeating ammo, reload,
// damage, range, armor, regeneration, or movement values in item details.
export function partPropertyRows(p){
 const d=def(p);
 if(d.kind==='arm')return ({
  drone:[['Призыв','1 дрон-перехватчик']],
  harpoon:[['Пробитие',`${d.pierce} цели`],['Особенность','Притягивает обычных врагов · урон по элите и боссам +25%']],
  claws:[['Тип атаки','Сектор']],
  hammer:[['Тип атаки','По площади'],['Особенность','Отбрасывает обычных врагов']],
  drill:[['Особенность','Игнорирует половину брони · приоритет элиты']],
  whip:[['Тип атаки','Широкая дуга · несколько целей']],
  fangs:[['Лечение','1 деление за 10 / 9 / 8 / 7 / 6 первичных атак']],
  seed:[],
  shotgun:[['Залп',`${d.pellets} дробин`],['Разброс','Плотный веер · −30%']],
  needle:[['Пробитие',`${d.pierce} цели`]],
  rocket:[['Усиления','Бонусы урона оружия и роя'],['Залп',`${d.projectileCount} дрона-камикадзе`],['Радиус взрыва',`${String(d.blastRadius).replace('.',',')} м`],['Особенность','Сильная ударная волна']],
  arc:[['Цели','До 3']],
  acid:[['Лужа','3 с']],
 })[p.key]||[];
 if(d.kind==='leg')return ({
  swarmLeg:[['Темп роя',`+${Number((summonPartBonus(p,'summonRate')*100).toFixed(1))}%`]],
  spring:[['Заряд','3 с непрерывного движения'],['Столкновение','Прыжок 2,5 м · уклонение 0,5 с'],['Перезарядка',`${String(springCooldown(p)).replace('.',',')} с`]],
  root:[['Сброс регенерации','При потере здоровья']],
 })[p.key]||[];
 return [];
}
export function cloneForComparison(s){return {...structuredClone(Object.fromEntries(['body','arms','legs','organs','inventory','hp','soul','abilities','health','time','biomass','serial','player','ground','isaac','puddles','setsV2'].map(key=>[key,s[key]]))),world:s.world};}
export function comparisonRows(before,after,{group,slot}={}){const a=stats(before),b=stats(after);const rows=[
  {label:'Здоровье',before:`${before.hp} / ${a.hp}`,after:`${after.hp} / ${b.hp}`},
  {label:'Броня',before:a.armor?`${a.armor} пластин`:'Нет',after:b.armor?`${b.armor} пластин`:'Нет'},
  {label:'Движение',before:`${a.speed.toFixed(1)} м/с`,after:`${b.speed.toFixed(1)} м/с`},
  {label:'Вес',before:`${a.weight.toFixed(0)} / ${a.capacity.toFixed(0)}`,after:`${b.weight.toFixed(0)} / ${b.capacity.toFixed(0)}`},
 ];
  if(a.dodge||b.dodge)rows.push({label:'Уклонение',before:`${Number((a.dodge*100).toFixed(1))}%`,after:`${Number((b.dodge*100).toFixed(1))}%`});
  if(a.shieldMax!==b.shieldMax)rows.push({label:'Щит',before:a.shieldMax?`×${a.shieldMax}`:'Нет',after:b.shieldMax?`×${b.shieldMax}`:'Нет'});
  if(a.regen||b.regen)rows.push({label:'Регенерация',before:a.regen?`1 дел. / ${Number(a.regenDelay.toFixed(2))} с`:'Нет',after:b.regen?`1 дел. / ${Number(b.regenDelay.toFixed(2))} с`:'Нет'});
  if(a.armorRepairAmount||b.armorRepairAmount)rows.push({label:'Ремонт брони',before:a.armorRepairAmount?`${a.armorRepairAmount} / ${Number(a.armorRepairDelay.toFixed(2))} с`:'Нет',after:b.armorRepairAmount?`${b.armorRepairAmount} / ${Number(b.armorRepairDelay.toFixed(2))} с`:'Нет'});
  if(group==='arms'){
    const old=before.arms[slot],next=after.arms[slot],x=old?weaponStats(before,old):null,y=next?weaponStats(after,next):null;
    for(const [key,label,unit] of [['damage','Урон руки',''],['interval','Скорость атаки',' с'],['range','Дальность',' м']])rows.push({label,before:x?(key==='damage'?String(Number(x[key].toFixed(1))):x[key].toFixed(1))+unit:'—',after:y?(key==='damage'?String(Number(y[key].toFixed(1))):y[key].toFixed(1))+unit:'—'});
  }
  return rows.map(r=>{const changed=r.before!==r.after;let delta=parseFloat(r.after)-parseFloat(r.before);if(r.label==='Скорость атаки')delta=-delta;if(r.label==='Регенерация'&&a.regen&&b.regen)delta=a.regenDelay-b.regenDelay;if(r.label==='Вес')delta=(b.capacity-b.weight)-(a.capacity-a.weight);let tone=Number.isFinite(delta)?delta>0?'positive':delta<0?'negative':'neutral':r.after==='Нет'?'negative':'positive';return {...r,changed,tone:changed?tone:'neutral'};});}

export function describePart(run,p){const d=def(p),power=tierFactor(p)*(1+addBonus(p,'power'))*organEffect(run),heartDamage=Number((reverseHeartDamageMultiplier(run,p)*100).toFixed(1));let lines=[];
  if(d.kind==='arm'){const w=weaponStats(run,p);lines=[`${w.damage.toFixed(1).replace(/\.0$/,'')} урона · скорость атаки: ${w.interval.toFixed(2)} с`, p.key==='drone'?`Поиск роя: ${w.range.toFixed(1)} м`:`Дальность ${w.range.toFixed(1)} м · крит ${(w.crit*100).toFixed(0)}%`];if(w.magazine)lines.push(`${weaponChargeLabel(w)} ${p.ammo??w.magazine} / ${w.magazine} · перезарядка ${reloadDuration(run,p,w.reload).toFixed(2)} с`);lines.push(...partPropertyRows(p).map(([label,value])=>`${label}: ${value}`));}
  else if(d.kind==='body')lines=[`Руки: ${d.arms} · ноги: ${d.legs} · органы: ${p===run.body?slotCount(run,p,'organs'):organCapacity(p)}`,`Вместимость ${(p===run.body?stats(run).capacity:capacity(p)).toFixed(0)} · здоровье корпуса ${bodyHealth(p)} дел.`,bodyTraitDescription(p)];
  else if(d.kind==='leg')lines=[`Скорость ноги ${legSpeed(p).toFixed(2)} м/с`,d.rankStat==='hp'?`Здоровье детали: +${String(legHealth(p)).replace('.',',')} HP`:null,d.regen?`Регенерация: 1 дел. / ${Number(regenerationDelay(run,p).toFixed(2))} с`:d.armor?`Броня +${legArmor(p)} дел.`:'Без брони',...partPropertyRows(p).map(([label,value])=>`${label}: ${value}`)];
  else lines=[({broodNode:`Урон роя +${Number((summonPartBonus(p,'summonDamage')*100).toFixed(1))}%. Складываются два сильнейших узла.`,mirrorGland:`Полученный или заблокированный удар вызывает ответный шип по ближайшему видимому врагу на 16 м. Урон ${Number((100*tierFactor(p)*organEffect(run)).toFixed(1))}% от сильнейшей руки. Раз в 2 с; не блокирует урон.`,reflexNerve:`Шанс уклониться от удара +${Number((10*power).toFixed(1))}%`,returnNerve:`Семена и иглы возвращаются: ${Number((returnNerveDamage(run,p)*100).toFixed(1))}% урона на обратном пути. Патроны не возвращаются.`,slime:`Попадания рук замедляют всех врагов на ${Number((slimeSlowdown(p)*100).toFixed(1))}% · ${Number((3*organEffect(run)).toFixed(1))} с. Смерть оставляет слизь на 3 с.`,parasite:`Призыв: 2 личинки каждые ${(2/summonTuning(run,modifiers(run)).rate).toFixed(2)} с. Урон личинки: ${Number((parasiteLarvaDamage(run,p)*summonTuning(run,modifiers(run)).damage).toFixed(2))}. Темп роя ускоряет призыв.`,commonNerve:`Семена, иглы и ракеты ждут готовности всех совместимых рук и стреляют общим залпом с уроном ${Number((commonNerveVolleyMultiplier(run,p)*100).toFixed(1))}%.`,reverseHeart:`Лечение при полном здоровье: импульс 5 м, урон ${Number((reverseHeartDamageMultiplier(run,p)*100).toFixed(1))}% от сильнейшей руки. Не чаще раза в 5 с.`,regen:`Восстанавливает 1 деление после ${regenerationDelay(run,p).toFixed(1)} с без потери здоровья`,shield:`Блокирует 1 удар · восстанавливается за ${Number(shieldRechargeDelay(run,p).toFixed(2))} с`,armor:`Даёт ${armorPlateCapacity(p,organEffect(run))} брони и постоянно ремонтирует 0,5 пластины за ${(ARMOR_REPAIR_SECONDS/organEffect(run)).toFixed(1)} с · попадания не сбрасывают цикл`,repairGland:`Постоянно ремонтирует 1 пластину за ${(ARMOR_REPAIR_SECONDS/tierFactor(p)/organEffect(run)).toFixed(1)} с · ранг ускоряет цикл, но не даёт броню · попадания не сбрасывают цикл`,stabilizer:`Скорость снарядов +${(30*power).toFixed(0)}%`,accelerator:`Скорость атак рук +${(15*power).toFixed(0)}%`,digestion:`Переработка деталей в биомассу · выход ×${power.toFixed(2)}`})[p.key]||d.description];
  if(p.key==='broodNode')lines.push('Усиливает боевых помощников и временных личинок.');
  if(p.key==='digestion')lines.push('Несколько желудков не усиливают эффект.');
  if(d.kind==='organ'&&organEffect(run)>1&&['reflexNerve','returnNerve','slime','parasite','commonNerve','reverseHeart','regen','shield','armor','repairGland','stabilizer','digestion','accelerator'].includes(p.key))lines.push('Бонус корпуса: эффективность +30% (сила эффекта или скорость восстановления).');
  if(d.lore)lines.push(`След памяти: ${d.lore}`);
  return {name:d.name,kind:kindName[d.kind],tier:ROMAN[p.tier],modifier:MODIFIERS[p.modifier]||'',weight:weight(p),lines:lines.filter(Boolean),rank:ranks(p),cost:upgradeCost(ranks(p))};
}
export function unlockCondition(key){const weapon=WEAPON_UNLOCKS.find(a=>a.key===key);if(weapon)return weapon.description;const mission=MISSIONS.find(m=>m.rewards.includes(key));if(mission)return `Победите босса: ${mission.bossName} · ${mission.name}`;const extra=META_ACHIEVEMENTS.find(a=>a.key===key);if(extra)return extra.description;if(NEW_ORGANS.includes(key))return 'Добыча, секреты и испытания';if(RARE_ORGANS.includes(key))return 'Эпическая добыча или награда испытания';const survival=SURVIVAL_UNLOCKS.find(m=>m.rewards.includes(key));return survival?.condition||survival?.name||'Добыча, секреты и испытания';}
export function catalogDescription(d){const lore=d.lore?` След памяти: ${d.lore}`:'';if(d.kind==='body')return `${d.arms} руки · ${d.legs} ноги · ${d.organs}–${d.arms>=3?3:8} органов по рангу и редкости · вес до ${d.capacity}. ${bodyTraitDescription(d)}${lore}`;if(d.kind==='leg')return `Скорость ${d.speed} м/с · вес ${d.weight}${d.description?" · "+d.description:""}${lore}`;return `${d.description||''}${lore}`.trim();}
export function findPart(run,{id,group,slot,ground}){if(ground!=null)return run.ground.find(g=>g.id===Number(ground))?.part;if(group==='body')return run.body;if(group)return run[group]?.[Number(slot)];return run.inventory.find(p=>p.id===Number(id));}

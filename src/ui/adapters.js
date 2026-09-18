import {upgradeLimit,recoveryMultiplier,sensorMultiplier,partResonanceBonus} from '../systems/organ-upgrades.js';
import {summonTuning} from '../systems/symbionts.js';
import {modifiers} from '../systems/abilities.js';
import {summonPartBonus} from '../systems/summon-equipment.js';
import {META_ACHIEVEMENTS} from '../systems/meta-progression.js';
import {bodyTraitDescription,defensiveOrganHitCapacity,organEffect} from '../systems/body-traits.js';
import {organCapacity,slotCount} from '../systems/body-slots.js';
import {partTraits,reloadDuration} from '../systems/sets-loot.js';
import {NEW_ORGANS,RARE_ORGANS} from '../systems/mutations.js';
import {SURVIVAL_ACHIEVEMENTS} from '../systems/survival-achievements.js';
import {CATALOG,ROMAN,MODIFIERS,MISSIONS,SURVIVAL_UNLOCKS,WEAPON_UNLOCKS} from '../catalog.js';
import {stats,weaponStats,def,weight,capacity,bodyHealth,ranks,tierFactor,addBonus,regenerationDelay,legArmor,legHealth,legSpeed,armorPlateCapacity,returnNerveDamage,parasiteLarvaDamage,slimeSlowdown,commonNerveVolleyMultiplier,reverseHeartDamageMultiplier,continuousRecoveryRate} from '../assembly.js';
import {upgradeCost,HEALTH,ACID_PUDDLE_SECONDS} from '../systems/balance.js';
import {ARMOR_REPAIR_SECONDS} from '../systems/health-tuning.js';
import {shieldRechargeDelay} from '../systems/health.js';
import {springCooldown} from '../systems/extra-parts.js';

// Sustained rank-I DPS for one target; excludes crits, body/skill bonuses and secondary targets.
export function weaponSustainedDps(s,p,st=stats(s)){
 const w=weaponStats(s,p,st),magazine=w.magazine||1,reload=w.reload?reloadDuration(s,p,w.reload):w.interval,cycle=(magazine-1)*w.interval+Math.max(w.interval,reload),projectiles=w.pellets??w.projectileCount??1;
 // The washer deals nothing on impact: its damage stat is puddle damage per second, and overlapping puddles stack.
 if(w.mode==='acid')return w.damage*ACID_PUDDLE_SECONDS*magazine/cycle;
 return w.damage*projectiles*magazine/cycle;
}
export function loadoutDps(s,st=stats(s)){
  return s.arms.filter(p=>p&&!p.disabled).reduce((total,p)=>total+weaponSustainedDps(s,p,st),0);
}

export const timeText = t => `${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`;
export const kindName = {body:'Корпус',arm:'Рука',leg:'Нога',organ:'Орган'};
export const groupNames = {arms:'Руки',legs:'Ноги',organs:'Внутренние органы'};
export const weaponChargeLabel=d=>['sector','area','contact'].includes(d?.mode)?'Заряды':'Магазин';
export const fangsHealingAttackCount=p=>11-Math.max(1,Math.min(5,p?.tier||1));
export const formatUiNumber=(value,digits=2)=>Number(Number(value).toFixed(digits)).toString().replace('.',',');
const sentence=value=>{const text=String(value||'').trim();return text?text.replace(/[.!?]+$/u,'')+'.':'';};
export function cardData(p){return {key:p.key,id:p.id,name:def(p).name,tier:ROMAN[p.tier],note:`${partTraits(p)} · ${def(p).kind==='body'?'В запасе':'Вес'} ${weight(p).toFixed(0)}`};}

// Only properties that are not already represented by the common stat rows.
// Keeping this list structured prevents old prose from repeating ammo, reload,
// damage, range, armor, regeneration, or movement values in item details.
export function partPropertyRows(p){
 const d=def(p);
 if(d.kind==='arm')return ({
  drone:[['Призыв','1 дрон-перехватчик'],['Радиус удара',`${formatUiNumber(d.attackRadius)} м`]],
  harpoon:[['Пробитие',`${d.pierce} цели`],['Особенность','Притягивает обычных врагов · урон по элите и боссам +25%']],
  claws:[['Тип атаки','Сектор']],
  hammer:[['Тип атаки','По площади'],['Особенность','Отбрасывает обычных врагов']],
  drill:[['Особенность','Игнорирует половину брони · приоритет элиты']],
  whip:[['Тип атаки','Широкая дуга · несколько целей']],
  fangs:[['Эффект',`Восстанавливает 1 деление после ${fangsHealingAttackCount(p)} атак.`]],
  seed:[],
  pistol:[['Синергия','Каждый дополнительный установленный «Маркер» даёт всем «Маркерам» +5% к шансу крита и +0,2 к множителю крита']],
  shotgun:[['Залп',`${d.pellets} дробин`],['Разброс','Плотный веер · −30%'],['Синергия','Каждый дополнительный установленный «Рассеиватель» даёт общему затвору +10% скорости и −10% к разбросу']],
  needle:[['Пробитие',`${d.pierce} цели`]],
  rocket:[['Усиления','Бонусы урона оружия и роя'],['Залп',`${d.projectileCount} дрона-камикадзе`],['Радиус взрыва',`${formatUiNumber(d.blastRadius)} м`],['Особенность','Сильная ударная волна']],
  arc:[['Цели','До 3 целей']],
  acid:[['Длительность лужи','3 с']],
 })[p.key]||[];
 if(d.kind==='leg')return ({
  swarmLeg:[['Темп роя',`+${formatUiNumber(summonPartBonus(p,'summonRate')*100,1)}%`]],
  spring:[['Заряд','3 с непрерывного движения'],['Столкновение','Прыжок 2,5 м · уклонение 0,5 с'],['Перезарядка',`${String(springCooldown(p)).replace('.',',')} с`]],
  root:[['Урон','Не сбрасывает таймер']],
 })[p.key]||[];
 return [];
}
export function cloneForComparison(s){return {...structuredClone(Object.fromEntries(['body','arms','legs','organs','inventory','hp','soul','abilities','health','time','biomass','serial','player','ground','isaac','puddles','setsV2'].map(key=>[key,s[key]]))),world:s.world};}
export function comparisonRows(before,after,{group,slot}={}){const a=stats(before),b=stats(after);const rows=[
  {label:'Здоровье',before:`${before.hp} из ${a.hp}`,after:`${after.hp} из ${b.hp}`},
  {label:'Броня',before:a.armor?`${a.armor} пластин`:'Нет',after:b.armor?`${b.armor} пластин`:'Нет'},
  {label:'Движение',before:`${a.speed.toFixed(1)} м/с`,after:`${b.speed.toFixed(1)} м/с`},
  {label:'Вес',before:`${a.weight.toFixed(0)} из ${a.capacity.toFixed(0)}`,after:`${b.weight.toFixed(0)} из ${b.capacity.toFixed(0)}`},
 ];
  if(a.dodge||b.dodge)rows.push({label:'Уклонение',before:`${Number((a.dodge*100).toFixed(1))}%`,after:`${Number((b.dodge*100).toFixed(1))}%`});
  if(a.shieldMax!==b.shieldMax)rows.push({label:'Щит',before:a.shieldMax?`×${a.shieldMax}`:'Нет',after:b.shieldMax?`×${b.shieldMax}`:'Нет'});
  if(a.regen||b.regen)rows.push({label:'Регенерация',before:a.regen?`+1 HP / ${Number(a.regenDelay.toFixed(2))} с`:'Нет',after:b.regen?`+1 HP / ${Number(b.regenDelay.toFixed(2))} с`:'Нет'});
  if(a.regenPerSecond||b.regenPerSecond)rows.push({label:'Восстановление корней',before:a.regenPerSecond?`${formatUiNumber(a.regenPerSecond*100,1)}% здоровья/с`:'Нет',after:b.regenPerSecond?`${formatUiNumber(b.regenPerSecond*100,1)}% здоровья/с`:'Нет'});
  if(a.armorRepairAmount||b.armorRepairAmount)rows.push({label:'Ремонт брони',before:a.armorRepairAmount?`${a.armorRepairAmount} пласт. каждые ${Number(a.armorRepairDelay.toFixed(2))} с`:'Нет',after:b.armorRepairAmount?`${b.armorRepairAmount} пласт. каждые ${Number(b.armorRepairDelay.toFixed(2))} с`:'Нет'});
  if(group==='arms'){
    const old=before.arms[slot],next=after.arms[slot],x=old?weaponStats(before,old):null,y=next?weaponStats(after,next):null;
    for(const [key,label,unit] of [['damage','Урон оружия',''],['interval','Скорость атаки',' с'],['range','Дальность',' м']])rows.push({label,before:x?(key==='damage'?String(Number(x[key].toFixed(1))):x[key].toFixed(1))+unit:'—',after:y?(key==='damage'?String(Number(y[key].toFixed(1))):y[key].toFixed(1))+unit:'—'});
  }
  return rows.map(r=>{const changed=r.before!==r.after;let delta=parseFloat(r.after)-parseFloat(r.before);if(r.label==='Скорость атаки')delta=-delta;if(r.label==='Регенерация'&&a.regen&&b.regen)delta=a.regenDelay-b.regenDelay;if(r.label==='Вес')delta=(b.capacity-b.weight)-(a.capacity-a.weight);let tone=Number.isFinite(delta)?delta>0?'positive':delta<0?'negative':'neutral':r.after==='Нет'?'negative':'positive';return {...r,changed,tone:changed?tone:'neutral'};});}

export function describePart(run,p){const d=def(p),power=tierFactor(p)*(1+addBonus(p,'power'))*organEffect(run,p.key),defenseHits=defensiveOrganHitCapacity(run,p);let lines=[];
  if(d.kind==='arm'){const w=weaponStats(run,p);lines=[`${formatUiNumber(w.damage,1)} урона · скорость атаки: ${formatUiNumber(w.interval)} с`,p.key==='drone'?`Поиск роя: ${formatUiNumber(w.range,1)} м`:`Дальность ${formatUiNumber(w.range,1)} м · крит ${formatUiNumber(w.crit*100,0)}%`];if(w.magazine)lines.push(`${weaponChargeLabel(w)} ${p.ammo??w.magazine} из ${w.magazine} · перезарядка ${formatUiNumber(reloadDuration(run,p,w.reload))} с`);lines.push(...partPropertyRows(p).map(([label,value])=>`${label}: ${value}`));}
  else if(d.kind==='body')lines=[`Руки: ${d.arms} · ноги: ${d.legs} · органы: ${p===run.body?slotCount(run,p,'organs'):organCapacity(p)}`,`Вместимость ${(p===run.body?stats(run).capacity:capacity(p)).toFixed(0)} · здоровье корпуса ${formatUiNumber(bodyHealth(p))} дел.`,bodyTraitDescription(p)];
  else if(d.kind==='leg')lines=[`Скорость движения ${formatUiNumber(legSpeed(p))} м/с`,legHealth(p)>0?`Здоровье детали: +${formatUiNumber(legHealth(p))} HP`:null,d.regen?`Регенерация: ${formatUiNumber(continuousRecoveryRate(p,'regen')*100,1)}% здоровья/с`:d.armor?`Броня +${formatUiNumber(legArmor(p))} дел.`:'Без брони',...partPropertyRows(p).map(([label,value])=>`${label}: ${value}`)];
  else lines=[({broodNode:`Урон постоянных и временных дронов +${formatUiNumber(summonPartBonus(p,'summonDamage')*100,1)}%. Складываются два сильнейших узла.`,mirrorGland:`Каждая уже прокачанная способность души получает +${formatUiNumber(partResonanceBonus(run,p)*100,1)}%. Счётчики, деления здоровья и длительности не усиливаются. Несколько Отражателей складываются.`,reflexNerve:`Шанс уклониться от удара +${formatUiNumber(10*power*sensorMultiplier(p),1)}%.`,returnNerve:`Достигнув предельной дальности, снаряды оружия разворачиваются и повторно поражают врагов на пути к герою, нанося ${formatUiNumber(returnNerveDamage(run,p)*100,1)}% урона. Боезапас не восстанавливается.`,slime:`Попадания оружием замедляют всех врагов на ${formatUiNumber(slimeSlowdown(p)*100,1)}% на ${formatUiNumber(3*organEffect(run),1)} с. Смерть оставляет слизь на 3 с.`,parasite:`Призывает 2 личинки каждые ${formatUiNumber(2/summonTuning(run,modifiers(run)).rate)} с, если видимый враг находится не дальше ${formatUiNumber(summonTuning(run,modifiers(run)).search,0)} м. Урон одной личинки — ${formatUiNumber(parasiteLarvaDamage(run,p)*summonTuning(run,modifiers(run)).damage)}. Темп роя ускоряет призыв.`,commonNerve:`Сеялка, Инъектор и Доставщик ждут готовности всего совместимого оружия и стреляют общим залпом с уроном ${formatUiNumber(commonNerveVolleyMultiplier(run,p)*100,1)}%.`,reverseHeart:`Лечение при полном здоровье создаёт импульс радиусом 5 м. Урон — ${formatUiNumber(reverseHeartDamageMultiplier(run,p)*100,1)}% от сильнейшего установленного оружия. Перезарядка — 5 с.`,regen:`Восстанавливает 1 деление после ${formatUiNumber(regenerationDelay(run,p),1)} с без потери здоровья.`,shield:`Блокирует ${defenseHits} ${defenseHits===1?'удар':'удара'} до восстановления. Восстанавливается за ${formatUiNumber(shieldRechargeDelay(run,p))} с.`,armor:`Даёт ${formatUiNumber(armorPlateCapacity(p,organEffect(run)))} брони. Ремонтирует 0,5 пластины каждые ${formatUiNumber(ARMOR_REPAIR_SECONDS/organEffect(run),1)} с; попадания не сбрасывают цикл.`,repairGland:`Ремонтирует 1 пластину каждые ${formatUiNumber(Math.max(.5,ARMOR_REPAIR_SECONDS/tierFactor(p)/organEffect(run)/recoveryMultiplier(p,'repairRate')),1)} с.`,stabilizer:`Скорость снарядов +${formatUiNumber(30*power,0)}%.`,accelerator:`Скорость атак всего оружия +${formatUiNumber(15*power,0)}%.`,digestion:`Перерабатывает детали в биомассу с множителем ×${formatUiNumber(power)}.`})[p.key]||sentence(d.description)];
  if(p.key==='digestion')lines.push('Несколько желудков не усиливают эффект.');
  if(d.kind==='organ'&&organEffect(run,p.key)>1&&['reflexNerve','returnNerve','slime','parasite','commonNerve','reverseHeart','regen','shield','armor','repairGland','stabilizer','accelerator'].includes(p.key))lines.push('Бонус корпуса: эффективность +30% (сила эффекта или скорость восстановления).');
  return {name:d.name,kind:kindName[d.kind],tier:ROMAN[p.tier],modifier:MODIFIERS[p.modifier]||'',weight:weight(p),lines:lines.filter(Boolean),rank:ranks(p),maxRank:upgradeLimit(p),cost:upgradeCost(ranks(p))};
}
export function unlockCondition(key){const achievement=SURVIVAL_ACHIEVEMENTS.find(a=>a.reward.keys?.includes(key));if(achievement)return achievement.description;const weapon=WEAPON_UNLOCKS.find(a=>a.key===key);if(weapon)return weapon.description;const mission=MISSIONS.find(m=>m.rewards.includes(key));if(mission)return `Победите босса: ${mission.bossName} · ${mission.name}`;const extra=META_ACHIEVEMENTS.find(a=>a.key===key);if(extra)return extra.description;if(NEW_ORGANS.includes(key))return 'Добыча, секреты и испытания';if(RARE_ORGANS.includes(key))return 'Эпическая добыча или награда испытания';const survival=SURVIVAL_UNLOCKS.find(m=>m.rewards.includes(key));return survival?.condition||survival?.name||'Добыча, секреты и испытания';}
export function catalogDescription(d){if(d.kind==='body')return [`Крепления: рук — ${d.arms}, ног — ${d.legs}, органов — ${d.organs}–${d.arms>=3?3:8}.`,`Вместимость: ${d.capacity}.`,sentence(bodyTraitDescription(d))].filter(Boolean).join(' ');if(d.kind==='leg')return [`Скорость: ${formatUiNumber(d.speed)} м/с.`,`Вес: ${formatUiNumber(d.weight)}.`,d.description?sentence(`Эффект: ${d.description}`):''].filter(Boolean).join(' ');return [sentence(d.description)].filter(Boolean).join(' ');}
export function findPart(run,{id,group,slot,ground}){if(ground!=null)return run.ground.find(g=>g.id===Number(ground))?.part;if(group==='body')return run.body;if(group)return run[group]?.[Number(slot)];return run.inventory.find(p=>p.id===Number(id));}

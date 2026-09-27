import {chassisDescription} from '../systems/support-chassis.js';
import {CHASSIS_UNLOCKS} from '../systems/chassis-unlocks.js';
import {upgradeLimit,recoveryMultiplier,sensorMultiplier,partResonanceBonus,stabilizerPartReduction} from '../systems/organ-upgrades.js';
import {summonTuning} from '../systems/symbionts.js';
import {modifiers} from '../systems/abilities.js';
import {summonPartBonus} from '../systems/summon-equipment.js';
import {META_ACHIEVEMENTS} from '../systems/meta-progression.js';
import {bodyTraitDescription,defensiveOrganHitCapacity,organEffect,traitBoostShare} from '../systems/body-traits.js';
import {organCapacity,slotCount} from '../systems/body-slots.js';
import {partTraits,reloadDuration} from '../systems/sets-loot.js';
import {NEW_ORGANS,RARE_ORGANS} from '../systems/mutations.js';
import {SURVIVAL_ACHIEVEMENTS} from '../systems/survival-achievements.js';
import {CATALOG,BODY_BASE_BONUSES,ROMAN,MODIFIERS,MISSIONS,SURVIVAL_UNLOCKS,WEAPON_UNLOCKS} from '../catalog.js';
import {reverseStomachHealth} from '../systems/reverse-stomach.js';
import {heroHealthPoints} from '../systems/health-scale.js';
import {digestionTierFactor,stats,weaponStats,def,weight,capacity,bodyHealth,ranks,tierFactor,addBonus,legArmor,legHealth,legSpeed,armorPlateCapacity,returnNerveDamage,parasiteLarvaDamage,slimeSlowdown,coolerDamageFraction,runnerFireFraction,commonNerveVolleyMultiplier,reverseHeartDamageMultiplier,continuousRecoveryRate} from '../assembly.js';
import {upgradeCost,HEALTH,ACID_PUDDLE_SECONDS} from '../systems/balance.js';
import {ARMOR_REPAIR_SECONDS} from '../systems/health-tuning.js';
import {shieldRechargeDelay,fangsHealingPercent} from '../systems/health.js';
import {springCooldown} from '../systems/extra-parts.js';
import {shieldArmReduction,SHIELD_AURA_RADIUS,SHIELD_AURA_SLOW} from '../systems/shield-arm.js';

// Sustained rank-I DPS for one target; excludes crits, body/skill bonuses and secondary targets.
export function weaponSustainedDps(s,p,st=stats(s)){
 const w=weaponStats(s,p,st),magazine=w.magazine||1,reload=w.reload?reloadDuration(s,p,w.reload):w.interval,cycle=(magazine-1)*w.interval+Math.max(w.interval,reload),projectiles=w.pellets??w.projectileCount??1;
 if(p.key==='shieldArm')return w.auraDps||0;
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
const fangsHealingDescription=p=>`Восстанавливает ${fangsHealingPercent(p)}% максимального HP при атаке.`;
export const formatUiNumber=(value,digits=2)=>Number(Number(value).toFixed(digits)).toString().replace('.',',');
const sentence=value=>{const text=String(value||'').trim();return text?text.replace(/[.!?]+$/u,'')+'.':'';};
export function cardData(p){return {key:p.key,id:p.id,name:def(p).name,tier:ROMAN[p.tier],note:`${partTraits(p)} · ${def(p).kind==='body'?'В запасе':'Вес'} ${weight(p).toFixed(0)}`};}

// Only properties that are not already represented by the common stat rows.
// Keeping this list structured prevents old prose from repeating ammo, reload,
// damage, range, armor, regeneration, or movement values in item details.
export function partPropertyRows(p,s=null){
 const d=def(p);
 if(d.kind==='arm')return ({
  drone:[['Призыв','1 дрон-перехватчик'],['Радиус удара',`${formatUiNumber(d.attackRadius)} м`]],
  harpoon:[['Особенность','урон по элите и боссам +25%']],
  claws:[['Тип атаки','Сектор']],
  hammer:[['Тип атаки','По площади'],['Особенность','Отбрасывает обычных врагов']],
  shieldArm:[['Защита от снарядов','50% спереди · сектор 120°'],['Радиус ауры',`${SHIELD_AURA_RADIUS} м`],['Замедление',`${formatUiNumber(SHIELD_AURA_SLOW*100,0)}% за каждый щит`]],
  drill:[['Особенность','Игнорирует половину брони · приоритет элиты']],
  whip:[['Тип атаки','Широкая дуга · каждый удар слегка отталкивает; каждый третий затем стягивает врагов к концу удара; элит — слабее, боссов не перемещает']],
  fangs:[['Эффект',fangsHealingDescription(p)]],
  seed:[],
  pistol:[['Синергия','Каждый установленный «Маркер» даёт всем «Маркерам» +5% к шансу крита и +0,2 к множителю крита']],
  shotgun:[['Залп',`${d.pellets} дробин`],['Разброс','Плотный веер · −30%'],['Синергия','Каждый установленный «Рассеиватель» снижает время перезарядки на 10% и разброс на 10%']],
  needle:[['Пробитие',`${d.pierce} цели`]],
  rocket:[['Усиления','Опылители, оружие и рой'],['Залп',`${d.projectileCount} дрона-камикадзе`],['Радиус взрыва',`${formatUiNumber(d.blastRadius)} м`],['Особенность','Сильная ударная волна']],
  arc:[['Цели','До 3 целей']],
  acid:[['Длительность лужи',`${formatUiNumber(ACID_PUDDLE_SECONDS*(1+(BODY_BASE_BONUSES[s?.body?.key]?.acidDuration||0))+(s?.abilities?modifiers(s).burnDuration||0:0))} с`]],
 })[p.key]||[];
 if(d.kind==='leg')return ({
  runner:[['Горящий след',`${formatUiNumber(runnerFireFraction(p)*100,0)}% урона сильнейшего оружия/с · ${formatUiNumber(3+(s?.abilities?modifiers(s).burnDuration||0:0))} с · улучшение +1%`]],
  swarmLeg:[['Урон роя',`+${formatUiNumber(summonPartBonus(p,'summonDamage')*100,1)}%`]],
  spring:[['Заряд','3 с непрерывного движения'],['Столкновение','Прыжок 2,5 м · уклонение 0,5 с'],['Время перезарядки',`${String(springCooldown(p)).replace('.',',')} с`]],
  root:[['Урон','Не прерывает регенерацию']],
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
  if(shieldArmReduction(before)||shieldArmReduction(after))rows.push({label:'Защита спереди',before:`${formatUiNumber(shieldArmReduction(before)*100,0)}%`,after:`${formatUiNumber(shieldArmReduction(after)*100,0)}%`});
  if(a.dodge||b.dodge)rows.push({label:'Уклонение',before:`${Number((a.dodge*100).toFixed(1))}%`,after:`${Number((b.dodge*100).toFixed(1))}%`});
  if(a.shieldMax!==b.shieldMax)rows.push({label:'Щит',before:a.shieldMax?`×${a.shieldMax}`:'Нет',after:b.shieldMax?`×${b.shieldMax}`:'Нет'});
  if(a.regenPerSecond||b.regenPerSecond)rows.push({label:'Регенерация',before:a.regenPerSecond?`${formatUiNumber(a.regenPerSecond*100,1)}%/с`:'Нет',after:b.regenPerSecond?`${formatUiNumber(b.regenPerSecond*100,1)}%/с`:'Нет'});
  if(a.armorRepairPerSecond||b.armorRepairPerSecond)rows.push({label:'Ремонт брони',before:a.armorRepairPerSecond?`${formatUiNumber(a.armorRepairPerSecond*100,1)}%/с`:'Нет',after:b.armorRepairPerSecond?`${formatUiNumber(b.armorRepairPerSecond*100,1)}%/с`:'Нет'});
  if(group==='arms'){
    const old=before.arms[slot],next=after.arms[slot],x=old?weaponStats(before,old):null,y=next?weaponStats(after,next):null;
    const shield=old?.key==='shieldArm'||next?.key==='shieldArm';
    const value=(w,p,key,unit='')=>w&&p?.key!=='shieldArm'?`${Number(w[key].toFixed(1))}${unit}`:'—';
    if(shield)rows.push({label:'Урон ауры',before:old?.key==='shieldArm'?`${formatUiNumber(x.auraDps,1)}/с`:'—',after:next?.key==='shieldArm'?`${formatUiNumber(y.auraDps,1)}/с`:'—'});
    for(const [key,label,unit] of [['damage','Урон оружия',''],['interval','Интервал атак',' с'],['range','Дальность',' м']])if(!shield||old?.key!=='shieldArm'||next?.key!=='shieldArm')rows.push({label,before:value(x,old,key,unit),after:value(y,next,key,unit)});
  }
  return rows.map(r=>{const changed=r.before!==r.after;let delta=parseFloat(r.after)-parseFloat(r.before);if(r.label==='Интервал атак')delta=-delta;if(r.label==='Регенерация'&&a.regenPerSecond&&b.regenPerSecond)delta=b.regenPerSecond-a.regenPerSecond;if(r.label==='Вес')delta=(b.capacity-b.weight)-(a.capacity-a.weight);let tone=Number.isFinite(delta)?delta>0?'positive':delta<0?'negative':'neutral':r.after==='Нет'?'negative':'positive';return {...r,changed,tone:changed?tone:'neutral'};});}

export function describePart(run,p){const d=def(p),power=(p.key==='digestion'?digestionTierFactor(p):tierFactor(p))*(1+addBonus(p,'power'))*organEffect(run,p.key),defenseHits=defensiveOrganHitCapacity(run,p);let lines=[];
  if(d.kind==='arm'){const w=weaponStats(run,p);lines=p.key==='shieldArm'?[`Урон ауры: ${formatUiNumber(w.auraDps||0,1)}/с · радиус ${SHIELD_AURA_RADIUS} м · замедление 10%. Щит не атакует.`]:[`${formatUiNumber(w.damage,1)} урона · интервал атак: ${formatUiNumber(w.interval)} с`,p.key==='drone'?`Поиск роя: ${formatUiNumber(w.range,1)} м`:`Дальность ${formatUiNumber(w.range,1)} м · крит ${formatUiNumber(w.crit*100,0)}%`];if(w.magazine)lines.push(`${weaponChargeLabel(w)} ${p.ammo??w.magazine} из ${w.magazine} · время перезарядки ${formatUiNumber(reloadDuration(run,p,w.reload))} с`);lines.push(...partPropertyRows(p,run).map(([label,value])=>`${label}: ${value}`));}
  else if(d.kind==='body')lines=[`Руки: ${d.arms} · ноги: ${d.legs} · органы: ${p===run.body?slotCount(run,p,'organs'):organCapacity(p)}`,`Вместимость ${(p===run.body?stats(run).capacity:capacity(p)).toFixed(0)} · здоровье корпуса ${heroHealthPoints(bodyHealth(p))} HP`,chassisDescription(run,p)];
  else if(d.kind==='leg')lines=[`Скорость движения ${formatUiNumber(legSpeed(p))} м/с`,legHealth(p)>0?`Здоровье детали: +${heroHealthPoints(legHealth(p))} HP`:null,d.regen?`Регенерация: ${formatUiNumber(continuousRecoveryRate(p,'regen')*100,1)}%/с`:d.armor?`Броня +${formatUiNumber(legArmor(p))} дел.`:'Без брони',...partPropertyRows(p).map(([label,value])=>`${label}: ${value}`)];
  else lines=[({reverseStomach:`С Компостером автоматически перерабатывает выбранные детали на земле в радиусе 3 м. Без Компостера работает обычный подбор. Переработка не лечит.`,broodNode:`Урон постоянных и временных дронов +${formatUiNumber(summonPartBonus(p,'summonDamage')*100,1)}%. Складываются два сильнейших узла.`,mirrorGland:`Каждая уже прокачанная способность души получает +${formatUiNumber(partResonanceBonus(run,p)*100,1)}%. Счётчики, плоские бонусы HP и длительности не усиливаются. Несколько Отражателей складываются.`,reflexNerve:`Шанс уклониться от удара +${formatUiNumber(10*power*sensorMultiplier(p),1)}%.`,returnNerve:`Достигнув предельной дальности, снаряды оружия разворачиваются и повторно поражают врагов на пути к герою, нанося ${formatUiNumber(returnNerveDamage(run,p)*100,1)}% урона. Боезапас не восстанавливается.`,parasite:`Призывает 2 личинки каждые ${formatUiNumber(2/summonTuning(run,modifiers(run)).rate)} с, если видимый враг находится не дальше ${formatUiNumber(summonTuning(run,modifiers(run)).search,0)} м. Урон одной личинки — ${formatUiNumber(parasiteLarvaDamage(run,p)*summonTuning(run,modifiers(run)).damage)}. Темп роя ускоряет призыв.`,commonNerve:`Рассеиватель, Лебёдка, Инъектор и Доставщик ждут готовности всего совместимого оружия и стреляют общим залпом: +${formatUiNumber((commonNerveVolleyMultiplier(run,p)-1)*100,1)}% урона. Работает только один Синхронизатор — самый сильный.`,reverseHeart:`Лечение при полном здоровье создаёт импульс радиусом 5 м. Урон — ${formatUiNumber(reverseHeartDamageMultiplier(run,p)*100,1)}% от сильнейшего установленного оружия. Перезарядка — 5 с.`,regen:`Непрерывно восстанавливает ${formatUiNumber(continuousRecoveryRate(p,'regenRate')*organEffect(run)*100,1)}% максимального здоровья в секунду. Попадания не прерывают восстановление.`,shield:`Блокирует ${defenseHits} ${defenseHits===1?'удар':'удара'} до восстановления. Восстанавливается за ${formatUiNumber(shieldRechargeDelay(run,p))} с.`,armor:`Даёт ${formatUiNumber(armorPlateCapacity(p,organEffect(run)))} брони. Восстанавливает ${formatUiNumber(continuousRecoveryRate(p,'plateCapacity')*100,1)}% запаса брони в секунду; попадания не прерывают восстановление.`,repairGland:`Усиливает бонус способности корпуса на ${formatUiNumber(traitBoostShare(p)*100,0)}%. Складываются два сильнейших Ремкомплекта.`,stabilizer:`Время перезарядки оружия −${formatUiNumber(stabilizerPartReduction(run,p)*100,1)}%.`,accelerator:`Скорость атак всего оружия +${formatUiNumber(15*power,0)}%.`,digestion:`Перерабатывает детали: ${formatUiNumber(power*100,1)}% базовой биомассы (×${formatUiNumber(power)}).`})[p.key]||sentence(d.description)];
  if(p.key==='slime')lines=[`Каждое попадание оружием замедляет врага на ${formatUiNumber(slimeSlowdown()*organEffect(run)*100,1)}% на ${formatUiNumber(5+(modifiers(run).chillDuration||0))} с и наносит ${formatUiNumber(coolerDamageFraction(p)*organEffect(run)*100,1)}% урона попадания за ${formatUiNumber(5+(modifiers(run).burnDuration||0))} с. При смерти враг взрывается с уроном сильнейшего действующего попадания в радиусе 2,5 м. Улучшение добавляет 1%.`];
  if(p.key==='parasite'){const tuning=summonTuning(run,modifiers(run));lines=[`Призывает 2 личинки каждые ${formatUiNumber(2/tuning.rate)} с по врагу в радиусе ${formatUiNumber(tuning.search,0)} м. Урон личинки — ${formatUiNumber(parasiteLarvaDamage(run,p)*tuning.damage)}; его повышают Опылители, а темп роя ускоряет призыв.`];}
  if(p.key==='reverseStomach')lines.unshift(`Здоровье детали: +${heroHealthPoints(reverseStomachHealth(p))} HP`);
  if(p.key==='digestion')lines.push('Несколько желудков не усиливают эффект.');
  if(d.kind==='organ'&&organEffect(run,p.key)>1&&['reflexNerve','returnNerve','slime','parasite','commonNerve','reverseHeart','regen','shield','armor','stabilizer','accelerator'].includes(p.key))lines.push('Бонус корпуса: эффективность +30% (сила эффекта или скорость восстановления).');
  return {name:d.name,kind:kindName[d.kind],tier:ROMAN[p.tier],modifier:MODIFIERS[p.modifier]||'',weight:weight(p),lines:lines.filter(Boolean),rank:ranks(p),maxRank:upgradeLimit(p),cost:upgradeCost(ranks(p))};
}
export function unlockCondition(key){const chassis=CHASSIS_UNLOCKS.find(a=>a.key===key);if(chassis)return chassis.description;const achievement=SURVIVAL_ACHIEVEMENTS.find(a=>a.reward.keys?.includes(key));if(achievement)return achievement.description;const weapon=WEAPON_UNLOCKS.find(a=>a.key===key);if(weapon)return weapon.description;const mission=MISSIONS.find(m=>m.rewards.includes(key));if(mission)return `Победите босса: ${mission.bossName} · ${mission.name}`;const extra=META_ACHIEVEMENTS.find(a=>a.key===key);if(extra)return extra.description;if(NEW_ORGANS.includes(key))return 'Добыча, секреты и испытания';if(RARE_ORGANS.includes(key))return 'Эпическая добыча или награда испытания';const survival=SURVIVAL_UNLOCKS.find(m=>m.rewards.includes(key));return survival?.condition||survival?.name||'Добыча, секреты и испытания';}
export function catalogDescription(d){if(d.kind==='body'){const maxOrgans=organCapacity({...d,tier:5,rarity:'relic'}),organs=maxOrgans===d.organs?d.organs:`${d.organs}–${maxOrgans}`;return [`Крепления: рук — ${d.arms}, ног — ${d.legs}, органов — ${organs}.`,`Вместимость: ${d.capacity}.`,sentence(bodyTraitDescription(d))].filter(Boolean).join(' ');}if(d.kind==='leg')return [`Скорость: ${formatUiNumber(d.speed)} м/с.`,`Вес: ${formatUiNumber(d.weight)}.`,d.description?sentence(`Эффект: ${d.description}`):''].filter(Boolean).join(' ');return [sentence(d.description)].filter(Boolean).join(' ');}
export function findPart(run,{id,group,slot,ground}){if(ground!=null)return run.ground.find(g=>g.id===Number(ground))?.part;if(group==='body')return run.body;if(group)return run[group]?.[Number(slot)];return run.inventory.find(p=>p.id===Number(id));}

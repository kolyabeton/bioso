import {soulProc} from './soul-procs.js';
import {resonanceBonus} from './organ-upgrades.js';
/** Ability definitions are also the UI contract; no DOM or equipment imports. */
export const BRANCHES={might:'Мощь',melee:'Ближний бой',ranged:'Дальний бой',tempo:'Скорость атаки',projectiles:'Снаряды',ricochet:'Рикошет',fire:'Огонь',cold:'Холод',electric:'Биоэлектричество',vitality:'Живучесть',motion:'Подвижность',summons:'Дроны',metabolism:'Метаболизм'};
const rows={
 metabolism:[['Ферменты','Биомасса от переработки деталей +20%. Нужен желудок. Возврат затрат не усиливается.',{biomassYield:.2}],['Усвоение','Биомасса от деталей +20%. Получаемый опыт +10%.',{biomassYield:.2,xpGain:.1}],['Биокатализ','Ещё +20% биомассы от переработки деталей. Бонусы ветки складываются.',{biomassYield:.2}],['Полный цикл','Биомасса от деталей +40%. Получаемый опыт +15%. Вся ветка: +100% биомассы и +25% опыта.',{biomassYield:.4,xpGain:.15}]],
 melee:[['Хищные мышцы','Урон в ближнем бою +20% на первом уровне',{meleeDamage:.2}],['Уязвимые места','Шанс крита в ближнем бою +10% на первом уровне',{meleeCrit:.1}],['Натиск','Четвёртое попадание тем же оружием ближнего боя по одной цели: +50% урона на первом уровне. Смена цели или пауза 3 с сбрасывает серию.',{onslaught:true,onslaughtDamage:.5}],['Мясорубка','Убийство в ближнем бою: скорость атак в ближнем бою +25% на первом уровне на 4 с. Повторное убийство обновляет время.',{meleeFrenzy:true,meleeFrenzyRate:.25}]],
 ranged:[['Прицельные нервы','Урон снарядов +15% на первом уровне',{rangedDamage:.15}],['Быстрая перезарядка','Ускоряет перезарядку всего оружия с магазином на 20% на первом уровне, включая оружие ближнего боя; остаётся не меньше 20% базового времени',{weaponReload:.2}],['Баллистический рост','Урон снаряда растёт с дальностью до +30% на первом уровне. Бонус фиксируется при атаке для всего залпа.',{ballisticGrowth:true,ballisticMax:.3}],['Полный залп','Первый залп после полной перезарядки: +30% урона на первом уровне. Начальный боезапас не усилен.',{fullSalvo:true,fullSalvoDamage:.3}]],

 might:[['Мощные волокна','Урон всего оружия +10% на первом уровне',{damage:.1}],['Острые чувства','Шанс крита всего оружия +10% на первом уровне',{crit:.1}],['Разрыв тканей','Критический удар оружием метит цель на 3 с. Последующие основные попадания наносят +20% урона на первом уровне. Метка не складывается.',{rupture:true,ruptureDamage:.2}],['Гипертрофия','На первом уровне: урон всего оружия +20%, скорость атак всего оружия −10%',{damage:.2,rate:-.1}]],
 tempo:[['Быстрые связки','Скорость атак всего оружия +15% на первом уровне',{rate:.15}],['Нервный разгон','Каждая ступень серии даёт оружию +5% скорости на первом уровне, максимум пять ступеней. Смена цели или пауза 2 с сбрасывает разгон.',{focusRate:true,focusRatePerStack:.05}],['Импульс','Скорость снарядов +20%. Первый крит любого оружия сокращает ожидание следующей атаки этого оружия на 15%.',{velocity:.2,criticalTempo:true,criticalTempoReduction:.15}],['Эхо атаки','Каждая пятая атака оружием повторяется ещё один раз на первом уровне с интервалом 0,15 с',{echo:true,echoes:1}]],
 projectiles:[['Двойной зародыш','Атака выпускает на 1 снаряд больше; урон каждого снаряда −15%. Штрафы суммируются, но урон не ниже 20% базового.',{extra:1,projectileDamage:-.15}],['Сквозная игла','Снаряды пробивают ещё 1 цель.',{pierce:true}],['Разгон осколков','Убийство снарядом выпускает 3 осколка; осколки не делятся повторно.',{splinter:true}],['Размножение','Атака выпускает на 2 снаряда больше; урон каждого снаряда −20%. Следующие ранги добавляют по одному снаряду. Штрафы суммируются, но урон не ниже 20% базового.',{extra:2,projectileDamage:-.2}]],
 ricochet:[['Живой рикошет','После попадания снаряд рикошетит ещё в 1 видимую цель в радиусе 4 м. Встроенные и полученные переходы складываются в одной цепочке; вторичное попадание наносит 50% урона.',{ricochet:true}],['Сохранение импульса','Усиливает всю общую цепочку рикошета с 60% до 100%. Если встроенный множитель оружия выше, используется он.',{ricochetDamage:.1}],['Цепная траектория','Каждый уровень добавляет 1 переход к общей цепочке рикошета.',{ricochetTargets:1}],['Хищная наводка','Общая цепочка рикошета выбирает наиболее раненую цель; шанс крита вторичного попадания растёт с 5% до 25%.',{ricochetHunter:true,ricochetCrit:.05}]],
 fire:[['Жар','Попадание любым оружием: 15% шанса поджечь на первом уровне. Каждый успешный поджог добавляет отдельный стак на 3 с; стак наносит 20% урона попадания в секунду.',{burn:true,burnChance:.15}],['Раскалённая кровь','Урон каждого стака горения +50% на первом уровне.',{burnDamage:.5}],['Долгое тление','Каждый новый стак горения длится на 2 с дольше на первом уровне.',{burnDuration:2}],['Пожар','Все активные стаки горения погибшего копируются врагам в радиусе 3 м; радиус растёт на 0,5 м на первом уровне.',{spread:true,spreadRadius:.5}]],
 cold:[['Холодная кровь','Попадание любым оружием: +20% шанса замедлить на 30% на первом уровне. Холод длится 2 с',{chill:true,chillChance:.2}],['Вечная мерзлота','Холод длится на 2 с дольше на первом уровне',{chillDuration:2}],['Хрупкость','Попадание оружием наносит замедленным холодом врагам +20% урона на первом уровне',{brittle:.2}],['Кристаллизация','Третье наложение холода замораживает на 1–2 с по рангам. Перезарядка 3 с; боссов только замедляет',{freeze:true,freezeDuration:.25}]],
 electric:[['Разряд','Каждая пятая атака оружием: разряд на 50% урона атаки на первом уровне',{electric:true,electricPower:.1}],['Проводимость','Разряд переходит ещё на две цели на первом уровне в пределах 4 м',{chains:2}],['Напряжение','Урон разряда +50% на первом уровне',{electricDamage:.5}],['Грозовой орган','Разряд срабатывает каждой третьей атакой оружием.',{storm:true}]],
 vitality:[['Жизненная сила','Максимальное здоровье +1 деление на первом уровне; сохраняет число ран',{hp:1}],['Панцирь','+1 стальная пластина на первом уровне поверх здоровья; общий запас брони не больше максимального здоровья',{armor:1}],['Восстановление','После 15 с без потери здоровья восстанавливает 1 деление на первом уровне',{regen:1}],['Вторая жизнь','Один дополнительный смертельный удар на первом уровне: возврат с 1 делением здоровья и защитой на 2 с',{revive:1}]],
 motion:[['Лёгкий шаг','Скорость движения +10% на первом уровне',{speed:.1}],['Притяжение','Радиус притяжения опыта +50% на первом уровне',{pickup:.5}],['Рефлексы','Шанс уклониться от удара +5% на первом уровне',{dodge:.05}],['Разбег','После 2 с движения: скорость атак +20% на первом уровне; остановка снимает бонус',{running:true,runningRate:.2}]],
 summons:[['Колония','Создаёт временного дрона; ранги III и V добавляют ещё по одному. Уничтоженного заменяет новым с интервалом атаки.',{summons:1}],['Хищный выводок','Урон постоянных и временных дронов +25% на первом уровне.',{summonDamage:.25}],['Общий импульс','Скорость атак и призыва постоянных и временных дронов +20% на первом уровне.',{summonRate:.2}],['Материнский зов','Постоянные и временные дроны фокусируют боссов и элиту, наносят им +30% урона.',{summonFocus:true,summonBossDamage:.3}]],
};
export const MAX_ABILITY_LEVEL=5;
/** Biomass spent per Overfeeding threshold. */
export const OVERGROWTH_STEP=1000;
/** Single-level abilities: Biocatalysis, Cold Blood, Light Step, Nerve Rush, Attraction, Enzymes. */
const MAX_LEVELS={'projectiles.1':1,'projectiles.2':1,'electric.1':3,'electric.3':1,'tempo.3':3,'vitality.3':1,'ricochet.0':1,'cold.3':3,
 'metabolism.0':1,'metabolism.2':1,'cold.0':1,'motion.0':1,'motion.1':1,'tempo.1':1};
export const ABILITIES=Object.fromEntries(Object.entries(rows).flatMap(([branch,nodes])=>nodes.map(([name,description,bonus],i)=>{const id=`${branch}.${i}`,fanout=branch==='ricochet';return[id,{id,branch,name,description,bonus,requires:i===0?[]:fanout?[`${branch}.0`]:i===3?[`${branch}.1`,`${branch}.2`]:[`${branch}.0`],requireMode:'any',tier:i===0?1:fanout?2:i===3?3:2,maxLevel:MAX_LEVELS[id]??MAX_ABILITY_LEVEL}];})));
for(const [id,name,description,requires,bonus] of [
 ['thermal','Термошок','Попадание оружием по горящей замороженной цели: взрыв 3 м раз в 2 с. Урон взрыва равен урону попадания на первом уровне',['fire.3','cold.3'],{thermal:true,thermalDamage:1}],
 ['plasma','Плазма','Разряд от атаки оружием гарантированно поджигает.',['fire.3','electric.3'],{plasma:true}],
 ['swarm','Резонанс роя','Каждая третья атака дрона наносит ещё один удар на первом уровне',['summons.3','tempo.3'],{swarm:true,swarmHits:1}],
 ['neuralweb','Нервная сеть','Первое попадание залпа снарядов создаёт дугу к другой видимой цели в пределах 12 м на 40% урона на первом уровне',['projectiles.3','electric.3'],{neuralWeb:true,neuralWebDamage:.4}],
 ['countershell','Ответный панцирь','Полученный или поглощённый удар на 5 с заряжает следующую основную ближнюю атаку: +100% урона на первом уровне',['melee.3','vitality.3'],{counterShell:true,counterShellDamage:1}],
 ['sporebrood','Споровый выводок','Дроны сажают спору всё чаще: от каждого пятого до каждого попадания. Через 2 с или после смерти носителя она взрывается, наносит урон укуса и поджигает',['fire.3','summons.3'],{sporeBrood:true,sporeBroodRank:1}],
 ['overgrowth','Сверхпитание','Каждые 1000 потраченных единиц биомассы дают +5% урона всего оружия на первом уровне способности; пять порогов, учитываются прежние траты',['might.3','metabolism.3'],{overgrowth:true,overgrowthPower:1}],
 ['cryotrail','Криослед','После 2 с движения оставляет холодный след раз в секунду. Радиус растёт от 1,5 до 2,5 м, длительность — от 3 до 5 с; след не набирает заряды заморозки',['cold.3','motion.3'],{cryoTrail:true,cryoTrailRank:1}],
])ABILITIES[id]={id,name,description,requires,bonus,branch:'synergy',requireMode:'all',tier:4,maxLevel:id==='plasma'?1:id==='swarm'?3:MAX_ABILITY_LEVEL};
export const FALLBACKS=Object.fromEntries([
 ['damage','Сила','Урон всего оружия +3%',{damage:.03}],['rate','Ритм','Скорость атак всего оружия +3%',{rate:.03}],['pickup','Сбор','Радиус притяжения опыта +5%',{pickup:.05}],['speed','Шаг','Скорость движения +2% (общий предел +60%)',{speed:.02}],['critPower','Точность','Множитель крита всего оружия +0,05',{critPower:.05}],['hp','Запас жизни','Максимальное здоровье +1 деление',{hp:1}],
].map(([id,name,description,bonus])=>[`minor.${id}`,{id:`minor.${id}`,name,description,bonus,branch:'minor',tier:0,repeatable:true,requires:[],maxLevel:MAX_ABILITY_LEVEL}])) ;
export const abilityById=id=>ABILITIES[id]||FALLBACKS[id];
export function createAbilities(){return{learned:[],levels:{},minor:{},attacks:{},moving:0,echoes:[],companions:[],summonShots:[],focus:{},guardian:{readyAt:0,x:0,y:0,z:0},retaliationUntil:0,sporeHits:0,spores:[],cryoTrails:[],cryoAt:0,biomassSpent:0};}
export function abilityLevel(s,id){
 const a=s?.abilities,d=abilityById(id);if(!a||!d)return 0;
 const stored=FALLBACKS[id]?a.minor?.[id]:a.levels?.[id];
 if(Number.isFinite(stored))return Math.max(0,Math.min(d.maxLevel,Math.floor(stored)));
 return Math.min(d.maxLevel,(a.learned||[]).filter(key=>key===id).length);
}
const LINEAR_RANK_BONUSES=new Set(['extra','projectileDamage','burnChance','chillChance','chains','hp','armor','regen','revive','dodge','summons','echoes','swarmHits','guardianRank','sporeBroodRank','cryoTrailRank','overgrowthPower','ricochetDamage','ricochetTargets','ricochetCrit']);
const MELEE_RANK_BONUSES=new Set(['meleeDamage','meleeCrit','onslaughtDamage','meleeFrenzyRate']);
const rankFactor=(key,level)=>LINEAR_RANK_BONUSES.has(key)?level:1+(level-1)*.5;
const RANK_CURVES={
 'fire.0':{burnChance:[.15,.2,.25,.3,.35]},
 'metabolism.0':{biomassYield:[.2,.23,.26,.29,.32]},
 'metabolism.1':{biomassYield:[.2,.23,.26,.29,.32],xpGain:[.1,.115,.13,.145,.16]},
 'metabolism.2':{biomassYield:[.2,.23,.26,.29,.32]},
 'metabolism.3':{biomassYield:[.4,.46,.52,.58,.64],xpGain:[.15,.1725,.195,.2175,.24]},
 'might.3':{damage:[.2,.28,.36,.44,.52],rate:[-.1,-.12,-.14,-.16,-.18]},
 'tempo.2':{velocity:[.2,.28,.36,.44,.52],criticalTempoReduction:[.15,.2,.25,.3,.35]},
 'projectiles.0':{extra:[1,2,3,4,5],projectileDamage:[-.15,-.23,-.29,-.33,-.35]},
 'projectiles.3':{extra:[2,3,4,5,6],projectileDamage:[-.2,-.25,-.29,-.32,-.35]},
 'cold.3':{freezeDuration:[.25,.75,1.25]},
 'electric.0':{electricPower:[.1,.2,.3,.4,.5]},
 'summons.0':{summons:[1,1,2,2,3]},
 overgrowth:{overgrowthPower:[1,1.2,1.4,1.6,2]},
};
const number=value=>Number(value.toFixed(2)).toString().replace('.',',');
const sentence=value=>{const text=String(value||'').trim();if(!text)return'';return/[.!?]$/u.test(text)?text:text+'.';};
const scaled=(d,key,rank)=>{const level=Math.max(1,rank),base=d.bonus?.[key]||0,curve=RANK_CURVES[d?.id]?.[key],value=curve?.[level-1]??base*rankFactor(key,level),floor=base*(1+(level-1)*.5);return base<0?Math.min(value,floor):Math.max(value,floor);};
const percent=(d,key,rank)=>number(scaled(d,key,rank)*100);
const plural=(value,[one,few,many])=>{const n=Math.abs(Math.trunc(value))%100,last=n%10;return`${number(value)} ${n>10&&n<20?many:last===1?one:last>1&&last<5?few:many}`;};
const descriptions={
 'metabolism.0':(d,r)=>`Переработка деталей: +${percent(d,'biomassYield',r)}% биомассы. Нужен желудок. Возврат затрат не усиливается.`,
 'metabolism.1':(d,r)=>`Биомасса от деталей +${percent(d,'biomassYield',r)}%. Получаемый опыт +${percent(d,'xpGain',r)}%.`,
 'metabolism.2':(d,r)=>`Ещё +${percent(d,'biomassYield',r)}% биомассы от переработки деталей. Бонусы ветки складываются.`,
 'metabolism.3':(d,r)=>`Биомасса от деталей +${percent(d,'biomassYield',r)}%. Получаемый опыт +${percent(d,'xpGain',r)}%. Бонусы ветки складываются.`,
 'melee.0':(d,r)=>`Урон в ближнем бою +${percent(d,'meleeDamage',r)}%.`,
 'melee.1':(d,r)=>`Шанс крита в ближнем бою +${percent(d,'meleeCrit',r)}%`,
 'melee.2':(d,r)=>`Четвёртое попадание тем же оружием ближнего боя по одной цели: +${percent(d,'onslaughtDamage',r)}% урона. Смена цели или пауза 3 с сбрасывает серию.`,
 'melee.3':(d,r)=>`Убийство в ближнем бою: скорость атак в ближнем бою +${percent(d,'meleeFrenzyRate',r)}% на 4 с. Повторное убийство обновляет время.`,
 'ranged.0':(d,r)=>`Урон снарядов +${percent(d,'rangedDamage',r)}%.`,
 'ranged.1':(d,r)=>`Ускоряет перезарядку всего оружия с магазином на ${percent(d,'weaponReload',r)}%, включая оружие ближнего боя; остаётся не меньше 20% базового времени.`,
 'ranged.2':(d,r)=>`Урон снаряда растёт с дальностью до +${percent(d,'ballisticMax',r)}%. Бонус фиксируется при атаке для всего залпа.`,
 'ranged.3':(d,r)=>`Первый залп после полной перезарядки: +${percent(d,'fullSalvoDamage',r)}% урона. Начальный боезапас не усилен.`,
 'might.0':(d,r)=>`Урон всего оружия +${percent(d,'damage',r)}%.`,
 'might.1':(d,r)=>`Шанс крита всего оружия +${percent(d,'crit',r)}%`,
 'might.2':(d,r)=>`Критический удар оружием метит цель на 3 с. Последующие основные попадания наносят +${percent(d,'ruptureDamage',r)}% урона. Метка не складывается.`,
 'might.3':(d,r)=>`Урон всего оружия +${percent(d,'damage',r)}%, скорость атак всего оружия −${number(Math.abs(scaled(d,'rate',r))*100)}%.`,
 'tempo.0':(d,r)=>`Скорость атак всего оружия +${percent(d,'rate',r)}%.`,
 'tempo.1':(d,r)=>`Каждая ступень серии даёт оружию +${percent(d,'focusRatePerStack',r)}% скорости, максимум пять ступеней. Смена цели или пауза 2 с сбрасывает разгон.`,
 'tempo.2':(d,r)=>`Скорость снарядов +${percent(d,'velocity',r)}%. Первый крит любого оружия сокращает ожидание следующей атаки этого оружия на ${percent(d,'criticalTempoReduction',r)}%.`,
 'tempo.3':(d,r)=>`Каждая пятая атака оружием повторяется ещё ${plural(scaled(d,'echoes',r),['раз','раза','раз'])} с интервалом 0,15 с.`,
 'projectiles.0':(d,r)=>`Атака выпускает на ${plural(scaled(d,'extra',r),['снаряд','снаряда','снарядов'])} больше; урон каждого снаряда −${number(Math.abs(scaled(d,'projectileDamage',r))*100)}%. Штрафы суммируются, итоговый урон не ниже 20% базового.`,
 'projectiles.1':d=>d.description,
 'projectiles.2':d=>d.description,
 'projectiles.3':(d,r)=>`Атака выпускает на ${plural(scaled(d,'extra',r),['снаряд','снаряда','снарядов'])} больше; урон каждого снаряда −${number(Math.abs(scaled(d,'projectileDamage',r))*100)}%. Штрафы суммируются, итоговый урон не ниже 20% базового.`,
 'ricochet.0':d=>d.description,
 'ricochet.1':(d,r)=>`Урон всей общей цепочки рикошета — ${number(50+scaled(d,'ricochetDamage',r)*100)}%. Если встроенный множитель оружия выше, используется он.`,
 'ricochet.2':(d,r)=>`Добавляет ${plural(scaled(d,'ricochetTargets',r),['переход','перехода','переходов'])} к общей цепочке рикошета.`,
 'ricochet.3':(d,r)=>`Общая цепочка рикошета выбирает наиболее раненую цель; шанс крита вторичного попадания +${percent(d,'ricochetCrit',r)}%.`,
 'fire.0':(d,r)=>`Попадание любым оружием: ${number(Math.min(1,scaled(d,'burnChance',r))*100)}% шанса поджечь. Каждый успешный поджог добавляет отдельный стак на 3 с; стак наносит 20% урона попадания в секунду.`,
 'fire.1':(d,r)=>`Урон каждого стака горения +${percent(d,'burnDamage',r)}%.`,
 'fire.2':(d,r)=>`Каждый новый стак горения длится на ${number(3+scaled(d,'burnDuration',r))} с.`,
 'fire.3':(d,r)=>`Все активные стаки горения погибшего копируются врагам в радиусе ${number(2.5+scaled(d,'spreadRadius',r))} м.`,
 'cold.0':(d,r)=>`Попадание любым оружием: +${number(Math.min(1,scaled(d,'chillChance',r))*100)}% шанса замедлить на 30%. Холод длится 2 с.`,
 'cold.1':(d,r)=>`Холод длится на ${number(scaled(d,'chillDuration',r))} с дольше.`,
 'cold.2':(d,r)=>`Попадание оружием наносит замедленным холодом врагам +${percent(d,'brittle',r)}% урона.`,
 'cold.3':(d,r)=>`Третье наложение холода замораживает на ${number(.75+scaled(d,'freezeDuration',r))} с. Перезарядка 3 с; боссов только замедляет.`,
 'electric.0':(d,r)=>`Каждая пятая атака оружием: разряд на ${number((.4+scaled(d,'electricPower',r))*100)}% урона атаки.`,
 'electric.1':(d,r)=>`Разряд переходит ещё на ${plural(scaled(d,'chains',r),['цель','цели','целей'])} в пределах 4 м.`,
 'electric.2':(d,r)=>`Урон разряда +${percent(d,'electricDamage',r)}%.`,
 'electric.3':d=>d.description,
 'vitality.0':(d,r)=>`Максимальное здоровье +${plural(scaled(d,'hp',r),['деление','деления','делений'])}; сохраняет число ран.`,
 'vitality.1':(d,r)=>`+${plural(scaled(d,'armor',r),['стальная пластина','стальные пластины','стальных пластин'])} поверх здоровья; расходуются до здоровья. Общий запас брони не больше максимального здоровья.`,
 'vitality.2':(d,r)=>`После 15 с без потери здоровья восстанавливает ${plural(scaled(d,'regen',r),['деление','деления','делений'])}.`,
 'vitality.3':(d,r)=>`Позволяет пережить ещё ${plural(scaled(d,'revive',r),['смертельный удар','смертельных удара','смертельных ударов'])}: возврат с 1 делением здоровья и защитой на 2 с.`,
 'motion.0':(d,r)=>`Скорость движения +${percent(d,'speed',r)}%.`,
 'motion.1':(d,r)=>`Радиус притяжения опыта +${percent(d,'pickup',r)}%.`,
 'motion.2':(d,r)=>`Шанс уклониться от удара +${percent(d,'dodge',r)}%`,
 'motion.3':(d,r)=>`После 2 с движения: скорость атак всего оружия +${percent(d,'runningRate',r)}%; остановка снимает бонус.`,
 'summons.0':(d,r)=>`Создаёт временных дронов: ${number(scaled(d,'summons',r))}. Перехват уничтожает дрона, новый призывается с интервалом атаки, урон укуса 6.`,
 'summons.1':(d,r)=>`Урон постоянных и временных дронов +${percent(d,'summonDamage',r)}%.`,
 'summons.2':(d,r)=>`Скорость атак постоянных и временных дронов +${percent(d,'summonRate',r)}%.`,
 'summons.3':(d,r)=>`Постоянные и временные дроны фокусируют боссов и элиту: +${percent(d,'summonBossDamage',r)}% урона.`,
 thermal:(d,r)=>`Попадание оружием по горящей замороженной цели: взрыв 3 м раз в 2 с. Урон взрыва — ${percent(d,'thermalDamage',r)}% урона попадания.`,
 plasma:d=>d.description,
 swarm:(d,r)=>`Каждая третья атака дрона наносит ещё ${plural(scaled(d,'swarmHits',r),['удар','удара','ударов'])}.`,
 neuralweb:(d,r)=>`Первое попадание залпа снарядов создаёт дугу к другой видимой цели в пределах 12 м на ${percent(d,'neuralWebDamage',r)}% урона.`,
 countershell:(d,r)=>`Полученный или поглощённый удар на 5 с заряжает следующую основную ближнюю атаку: +${percent(d,'counterShellDamage',r)}% урона.`,
 sporebrood:(d,r)=>{const cadence=Math.max(1,6-scaled(d,'sporeBroodRank',r));return`Дроны сажают спору ${cadence===1?'при каждом попадании':`при каждом ${cadence}-м попадании`}. Через 2 с или после смерти носителя она взрывается, наносит урон укуса и поджигает.`;},
 overgrowth:(d,r)=>`Каждые 30 потраченных единиц биомассы дают +${number(5*scaled(d,'overgrowthPower',r))}% урона всего оружия; максимум +${number(25*scaled(d,'overgrowthPower',r))}%. Учитываются прежние траты.`,
 cryotrail:(d,r)=>`После 2 с движения оставляет холодный след раз в секунду. Радиус ${number(1.25+.25*scaled(d,'cryoTrailRank',r))} м, длительность ${number(2.5+.5*scaled(d,'cryoTrailRank',r))} с; след не набирает заряды заморозки.`,
 'minor.damage':(d,r)=>`Урон всего оружия +${number((d.bonus.damage||0)*r*100)}%.`,
 'minor.rate':(d,r)=>`Скорость атак всего оружия +${number((d.bonus.rate||0)*r*100)}%.`,
 'minor.pickup':(d,r)=>`Радиус притяжения опыта +${number((d.bonus.pickup||0)*r*100)}%.`,
 'minor.speed':(d,r)=>`Скорость движения +${number((d.bonus.speed||0)*r*100)}% (общий предел +60%).`,
 'minor.critPower':(d,r)=>`Множитель крита всего оружия +${number((d.bonus.critPower||0)*r)}.`,
 'minor.hp':(d,r)=>`Максимальное здоровье +${plural((d.bonus.hp||0)*r,['деление','деления','делений'])}.`,
};
export function abilityDescriptionAtLevel(d,level=1){
 const rank=Math.max(1,Math.min(d?.maxLevel??MAX_ABILITY_LEVEL,Math.floor(level)||1));
 return sentence(descriptions[d?.id]?.(d,rank)||d?.description||'');
}
export function abilityRankGrowth(d){
 if(d?.maxLevel===1)return 0;
 if(RANK_CURVES[d?.id])return'custom';
 const keys=Object.entries(d?.bonus||{}).filter(([,value])=>typeof value==='number').map(([key])=>key);
 if(keys.length&&keys.every(key=>LINEAR_RANK_BONUSES.has(key)))return 1;
 if(keys.some(key=>MELEE_RANK_BONUSES.has(key)))return .5;
 return .4;
}
export function modifiers(s){const a=s.abilities;if(!a)return{};const minorEntries=Object.entries(a.minor||{}),growth=Math.min(5,Math.floor((a.biomassSpent||0)/OVERGROWTH_STEP)),levels=Object.keys(a.levels||{}).sort().map(id=>`${id}:${a.levels[id]}`).join(','),revision=`${(a.learned||[]).join(',')}|${levels}|${minorEntries.map(([id,n])=>`${id}:${n}`).join(',')}|${growth}`;let base=a._modifierCache;if(!base||base.revision!==revision){const out={};for(const id of new Set(a.learned||[])){const d=ABILITIES[id],level=abilityLevel(s,id);for(const [k,v]of Object.entries(d?.bonus||{}))out[k]=typeof v==='boolean'?v:(out[k]||0)+scaled(d,k,level);}for(const [id,n]of minorEntries)for(const [k,v]of Object.entries(FALLBACKS[id]?.bonus||{}))out[k]=(out[k]||0)+v*Math.min(MAX_ABILITY_LEVEL,n);if(out.overgrowth)out.damage=(out.damage||0)+growth*.05*(out.overgrowthPower||1);base=a._modifierCache={revision,value:out};}const value=base.value.running&&a.moving>=2?base.runningValue??={...base.value,rate:(base.value.rate||0)+(base.value.runningRate||.2)}:base.value;return resonate(a,value,resonanceBonus(s));}
/** Counts, durations and flat health cells are not percentages, so the Reflector leaves them alone. */
export const RESONANCE_EXEMPT=new Set(['extra','chains','pierce','hp','armor','regen','revive','summons','echoes','swarmHits','guardianRank','sporeBroodRank','cryoTrailRank','overgrowthPower','ricochetTargets','burnDuration','chillDuration','freezeDuration']);
function resonate(a,value,bonus){
 if(bonus<=0)return value;
 const cache=a._resonanceCache;if(cache&&cache.source===value&&cache.bonus===bonus)return cache.value;
 const out={...value};
 for(const [key,amount] of Object.entries(out))if(typeof amount==='number'&&amount>0&&!RESONANCE_EXEMPT.has(key))out[key]=amount+bonus;
 a._resonanceCache={source:value,bonus,value:out};return out;
}
export function learn(s,id){const d=abilityById(id);if(!d)return false;const level=abilityLevel(s,id);if(level>=d.maxLevel)return false;if(d.repeatable)s.abilities.minor[id]=level+1;else{s.abilities.levels??={};if(!s.abilities.learned.includes(id))s.abilities.learned.push(id);s.abilities.levels[id]=level+1;}delete s.abilities._modifierCache;if(id==='overgrowth'&&(s.abilities.biomassSpent||0)>=OVERGROWTH_STEP)soulProc(s,'overgrowth',s.player,{level:Math.min(5,Math.floor(s.abilities.biomassSpent/OVERGROWTH_STEP))});return true;}
export function recordBiomassSpend(s,amount){if(!s.abilities||!Number.isFinite(amount)||amount<=0)return;const before=Math.min(5,Math.floor((s.abilities.biomassSpent||0)/OVERGROWTH_STEP));s.abilities.biomassSpent=(s.abilities.biomassSpent||0)+amount;delete s.abilities._modifierCache;const after=Math.min(5,Math.floor(s.abilities.biomassSpent/OVERGROWTH_STEP));if(modifiers(s).overgrowth&&after>before)soulProc(s,'overgrowth',s.player,{level:after});}
/** Primary attacks only. Echoes and secondary damage never increment counters. */
export function attackTriggers(s,part,w){const a=s.abilities,b=modifiers(s),count=a.attacks[part.id]=(a.attacks[part.id]||0)+1;return{electric:!!b.electric&&count%(b.storm?3:5)===0,echo:b.echo&&count%5===0?(b.echoes||1):0};}
export function updateMotion(s,dt,moved){if(s.abilities){const before=s.abilities.moving;s.abilities.moving=moved?before+dt:0;if(before<2&&s.abilities.moving>=2&&modifiers(s).running)soulProc(s,'running',s.player);}}

import {SHIELD_RECHARGE_SECONDS} from './systems/health-tuning.js';
// Gameplay values are deliberately independent of rendering and persistence.
export const MAX_ARMS = 4;
export const BODIES = {
 reactor:{name:'Электрик',arms:2,legs:2,organs:2,capacity:100,hp:2,armor:0,trait:'15 убийств: скорость атак +30% на 6 с; затем 15 с охлаждения'},
 wanderer:{name:'Садовник',arms:2,legs:2,organs:2,capacity:90,hp:2,armor:0,trait:'Установлены 2 ноги: скорость движения +20%. Все доступные слоты органов заполнены: уклонение +20%.'},
 hunter:{name:'Высотник',arms:3,legs:2,organs:2,capacity:105,hp:2,armor:0,trait:'Установлены 3 руки: дальний урон рук +20%',lore:'В памяти корпуса сохранился приказ разорвать цепь второго пуска — без списка тех, кого оставили за шлюзом.'},
 bastion:{name:'Каменщик',arms:2,legs:4,organs:3,capacity:210,hp:3,armor:20,trait:'Установлены 4 органа: эффективность всех органов +30%',lore:'На внутренней броне выбиты номера контейнеров: фильтры и боеголовки шли одним охраняемым грузом.'},
 chimera:{name:'Мойщик',arms:4,legs:2,organs:2,capacity:145,hp:2,armor:10,trait:'Установлены 4 руки, включая ближнюю и дальнюю: урон всех рук +25%'},
 rootwalker:{name:'Лесник',arms:2,legs:4,organs:3,capacity:220,hp:3,armor:20,trait:'Установлены 4 ноги: максимальное здоровье +2',lore:'Корни помнят чистую реку и огонь, которым Собор исправлял виды, не внесённые в его модель.'},
 hecaton:{name:'Механик',arms:4,legs:4,organs:1,capacity:155,hp:2,armor:10,trait:'Установлены 4 руки: скорость атак всех рук +20%'},
 broodmother:{name:'Пасечник',arms:2,legs:3,organs:3,capacity:150,hp:2,armor:0,trait:'Создаёт постоянных неуязвимых дронов. Они атакуют самостоятельно и получают усиления роя'},
};
export const WEAPONS = {
 drone:{name:'Опылитель',weight:18,damage:18,interval:1.2,range:10,mode:'summon',description:'Призывает дрона-перехватчика. Он атакует самостоятельно и уничтожается, блокируя один вражеский снаряд. Затем рука призывает нового с интервалом своей атаки; темп роя ускоряет призыв. Снятие руки убирает её дрона.'},
 harpoon:{name:'Лебёдка',weight:18,damage:42,interval:1.7,range:11,speed:26,magazine:1,reload:1.6,pierce:2,mode:'projectile',description:'Пробивает две цели. Притягивает обычных врагов; элите и боссам урон +25%'},
 pistol:{name:'Маркер',weight:8,damage:8,interval:.65,range:8,speed:26,magazine:5,reload:1.4,spread:.012,knockback:4,mode:'projectile',crit:.25,critPower:2,description:'Медленный встроенный выстрел с высоким шансом крита.'},
 claws:{name:'Скребки',weight:8,damage:12,interval:.45,range:2.8,knockback:2,magazine:2,reload:.7,mode:'sector',angle:1.1,crit:.05,description:'2 удара · Восстановление 0,7 с · Быстрый удар по сектору · шанс крита +5%.'},
 // Keep the legacy key so existing rewards and saved parts become the same shield.
 hammer:{name:'Трамбовка',weight:24,damage:50,interval:1.8,range:3,areaRadius:2.4,knockback:18,knockbackCap:48,hitStagger:.45,magazine:1,reload:2,mode:'area',description:'1 удар · Восстановление 2 с · Удар щитом по площади 2,4 м · отбрасывает обычных врагов'},
 drill:{name:'Бур',weight:22,damage:8,interval:.2,range:2.5,knockback:.5,magazine:6,reload:1,mode:'contact',description:'6 ударов · Восстановление 1 с · Игнорирует половину брони · предпочитает элиту'},
 whip:{name:'Сучкорез',weight:14,damage:20,interval:.9,range:4,magazine:3,reload:1.1,mode:'sector',angle:2.8,description:'3 удара · Восстановление 1,1 с · Широкая дуга по нескольким целям'},
 fangs:{name:'Захват',weight:14,damage:18,interval:.8,range:2.8,knockback:1,magazine:2,reload:.9,mode:'contact',description:'2 удара · Восстановление 0,9 с · Лечат 1 деление после 10/9/8/7/6 атак на рангах I–V'},
 seed:{name:'Сеялка',weight:10,damage:6,interval:.2,range:9,speed:22,magazine:8,reload:1.2,spread:.14,knockback:3,mode:'projectile',description:'Сильный разброс при непрерывной очереди'},
 shotgun:{name:'Рассеиватель',weight:16,damage:5.25,interval:.9,range:12,speed:24,magazine:2,reload:2,pellets:5,pelletSpread:.098,knockback:2,mode:'projectile',description:'Пять дробин одним плотным залпом на 12 м'},
 needle:{name:'Инъектор',weight:16,damage:35,interval:1.2,range:14,speed:40,magazine:1,reload:2.3,spread:0,knockback:7,mode:'projectile',pierce:3,description:'Один точный выстрел · пробивает трёх · перезарядка 2,3 с'},
 rocket:{name:'Доставщик',weight:50,damage:12,projectileCount:4,interval:2.4,range:13,speed:7,magazine:2,reload:4,knockback:14,knockbackCap:36,blastRadius:1.5,mode:'rocket',description:'Два залпа по четыре дрона-камикадзе. Перехватывают вражеские снаряды по пути и взрываются штатно. Урон усиливается бонусами оружия и роя. Область 1,5 м, перезарядка 4 с',lore:'Последний расчёт Пастыря знает точный день смерти убежища и помечает ремонт как недопустимое вмешательство.'},
 arc:{name:'Сварочник',weight:18,damage:18,interval:1.1,range:10,magazine:4,reload:1.5,mode:'arc',description:'4 разряда · три цели · дальность 10 м · восстановление 1,5 с'},
 acid:{name:'Мойка',weight:18,damage:12,interval:2,range:9,speed:14,magazine:3,reload:1.8,mode:'acid',description:'3 плевка · лужа на 3 с · восстановление 1,8 с'},
};
export const LEGS = {
 spring:{rankStat:'speed',name:'Рессора',weight:8,speed:6,hp:0,armor:0,description:'3 с движения заряжают прыжок: следующее столкновение с врагом переносит на 2,5 м вперёд и даёт уклонение на 0,5 с'},
 swarmLeg:{rankStat:'summonRate',upgradeStat:'summonRate',summonRate:.15,name:'Роевик',weight:10,speed:5,hp:0,armor:0,description:'Темп атак роя +15%. Каждый ранг и улучшение: +4 п.п. к темпу. Складываются три сильнейшие опоры'},
 runner:{rankStat:'speed',name:'Скороход',weight:6,speed:7,hp:0,armor:0},
 universal:{rankStat:'speed',name:'Универсал',weight:8,speed:6,hp:0,armor:0},
 plated:{rankStat:'armor',name:'Тяжеловоз',weight:12,speed:5,hp:0,armor:10,upgradeStat:'armor'},
 root:{rankStat:'hp',name:'Корнеход',weight:12,speed:2,hp:0,armor:0,upgradeStat:'regen',regen:true,description:'Потеря здоровья запускает отсчёт регенерации заново.'},
};
export const ORGANS = {
 mirrorGland:{name:'Отражатель',weight:14,description:'Полученный или заблокированный удар вызывает ответный шип по ближайшему видимому врагу на 16 м. Урон 100% от сильнейшей руки. Раз в 2 с; не блокирует урон',lore:'В отражённой памяти Ива-7 добровольно открывает детский сектор; следующая запись уже принадлежит пустой машине.'},
 reflexNerve:{name:'Сенсор',weight:12,description:'Шанс уклониться от удара +10%.'},
 returnNerve:{name:'Реверсор',weight:12,description:'Снаряды Сеялки и Инъектора после исходящего полёта возвращаются к герою и наносят обратным полётом 10% урона. Патроны не возвращаются.'},
 slime:{name:'Охладитель',weight:14,description:'Попадания рук замедляют всех врагов на 3 с. Ранг I: −10%; каждый следующий ранг добавляет 5 процентных пунктов. Каждое улучшение добавляет ещё 2 процентных пункта. Смерть оставляет слизь на 3 с.'},
 parasite:{name:'Инкубатор',weight:18,description:'Выпускает 2 личинки каждые 2 с. Темп роя ускоряет призыв. Урон личинки по рангам: 6 / 9 / 12 / 15 / 18. Улучшение: +2,4 урона.'},
 commonNerve:{name:'Синхронизатор',weight:20,rare:true,description:'Семена, иглы и ракеты ждут готовности всех совместимых рук и стреляют общим залпом. Ранг I: 150%; каждый следующий ранг и каждое улучшение добавляют 10 процентных пунктов.'},
 reverseHeart:{name:'Насос',weight:18,rare:true,description:'Лечение при полном здоровье: импульс 5 м. Ранг I: 200% урона сильнейшей руки; каждый следующий ранг и каждое улучшение добавляют 20 процентных пунктов. Не чаще раза в 5 с.'},
 regen:{name:'Ремонтник',weight:14,description:'После 15 с без потери здоровья восстанавливает 1 деление; ранг ускоряет восстановление'},
 shield:{name:'Кожух',weight:18,shield:40,description:`Поглощает 1 попадание. Ранг I восстанавливается за ${SHIELD_RECHARGE_SECONDS} с; каждый следующий ранг и каждое улучшение сокращают время на 1 с.`},
 armor:{name:'Пластины',weight:24,armor:20,description:'Ранг I даёт 1 пластину, каждый следующий ранг добавляет 0,5 · ремонтирует 0,5 пластины каждые 15 с'},
 repairGland:{name:'Ремкомплект',weight:16,description:'Восстанавливает 1 потерянную пластину каждые 15 с. Нужен источник максимальной брони; сама железа броню не добавляет. Ранг ускоряет цикл, попадания его не сбрасывают'},
 broodNode:{name:'Контроллер',weight:18,summonDamage:.2,description:'Урон боевых и временных симбионтов +20%. Каждый ранг и улучшение: +4 п.п. к урону. Складываются два сильнейших узла'},
 stabilizer:{name:'Стабилизатор',weight:10,description:'Скорость снарядов +30%'},
 digestion:{name:'Компостер',weight:12,description:'Переработка ненужных деталей в биомассу'},
 accelerator:{name:'Ускоритель',weight:16,description:'Скорость атак всех рук +15%'},
};
export const CATALOG = Object.fromEntries([['body',BODIES],['arm',WEAPONS],['leg',LEGS],['organ',ORGANS]].flatMap(([kind,defs])=>Object.entries(defs).map(([key,d])=>[key,{...d,key,kind}])));
// Basic atlas parts stay independent from the single reward owned by each boss.
export const STARTERS=['drone','wanderer','universal','runner','pistol','claws','stabilizer','broodmother','swarmLeg','broodNode'];
export const WEAPON_UNLOCKS=[
 {id:'weapon:shotgun',key:'shotgun',name:'Первый калибр',counter:'pistol',goal:30,label:'Убийства Маркером',description:'Убейте 30 существ Маркером. Прогресс складывается между забегами.',lore:'Каждый точный выстрел открывает новые возможности.'},
 {id:'weapon:seed',key:'seed',name:'Зачистка',counter:'total',goal:60,label:'Убитые существа',description:'Убейте 60 существ любым оружием. Прогресс складывается между забегами.',lore:'Одного выстрела уже недостаточно.'},
];
export const MODIFIERS={light:'Облегчённая',rapid:'Скорострельная',armored:'Бронированная'};
export const STAT_LABELS={summonRate:'Темп роя',summonDamage:'Урон роя',capacity:'Вместимость',damage:'Урон',rate:'Скорость атаки',crit:'Шанс крита',critPower:'Множитель крита',hp:'Здоровье',armor:'Броня',regen:'Регенерация',speed:'Движение',dodge:'Уклонение',power:'Эффективность органа',returnDamage:'Обратный урон',larvaDamage:'Урон личинок',slimeSlow:'Замедление слизью',commonVolley:'Урон общего залпа',heartDamage:'Урон импульса',shieldRecharge:'Восстановление щита'};
export const INCREMENTS={summonRate:.04,summonDamage:.04,capacity:.1,damage:.12,rate:.09,crit:.03,critPower:.15,hp:1,armor:.12,regen:1,speed:.06,power:.12,returnDamage:.03,larvaDamage:.08,slimeSlow:.02,commonVolley:.1,heartDamage:.2,shieldRecharge:1};
export const MISSIONS=[
 {id:'garden',name:'След Ловчего',bossId:'boss-mercury-hunter',bossName:'Ртутный Ловчий',biome:'gardens',floors:25,difficulty:1,description:'Пройдите 24 садовые террасы и загоните Ртутного Ловчего в финальном зале.',rewards:['hunter'],rewardTier:3},
 {id:'quarantine',name:'Сердце свалки',bossId:'boss-scrap-leviathan',bossName:'Свалочный Левиафан',biome:'scrapyard',floors:25,difficulty:2,description:'Пробейтесь через 24 прессовочные камеры к Свалочному Левиафану.',rewards:['bastion'],rewardTier:4},
 {id:'core',name:'Корневой Собор',bossId:'boss-root-cathedral',bossName:'Корневой Собор',biome:'forest',floors:25,difficulty:3,description:'Пройдите через 24 корневых нефа и уничтожьте живой собор в финальном зале.',rewards:['rootwalker'],rewardTier:5},
 {id:'nursery',name:'Зеркальный сбор',bossId:'boss-mirror-collector',bossName:'Зеркальный Сборщик',biome:'city',floors:25,difficulty:4,description:'Зачистите 24 отражающих квартала и настигните Зеркального Сборщика.',rewards:['mirrorGland'],rewardTier:5},
 {id:'mother',name:'Пастырь Роя',bossId:'boss-swarm-shepherd',bossName:'Пастырь Роя',biome:'gardens',floors:25,difficulty:5,description:'Пройдите 24 роевых питомника и разорвите связь Пастыря с дронами.',rewards:['rocket'],rewardTier:5},
];
export const bossRewardMission=key=>MISSIONS.find(m=>m.rewards.includes(key));
// Previously discovered parts remain available, including legacy save files.
export const bossPartAvailable=(profile,key)=>!bossRewardMission(key)||!!profile?.unlocked?.includes(key);
export const SURVIVAL_UNLOCKS=[
 {id:'elite1',name:'Первая элита',condition:'Победите 1 элитного врага за один забег в выживании',rewards:['needle'],test:s=>s.elites>=1},
 {id:'elite3',name:'Три элиты',condition:'Победите 3 элитных врагов за один забег в выживании',rewards:['drill'],test:s=>s.elites>=3},
 {id:'time5',name:'Пять минут',condition:'Продержитесь 5 минут в выживании',rewards:['plated'],test:s=>s.time>=300},
 {id:'rootLeg5',name:'Корневая опора',condition:'Продержитесь 5 минут в выживании',rewards:['root'],test:s=>s.time>=300},
 {id:'level5',name:'Уровень 5',condition:'Достигните уровня 5 в выживании',rewards:['digestion'],test:s=>s.level>=5},
 {id:'boss1',name:'Первый босс',condition:'Победите 1 босса за один забег в выживании',rewards:['hammer'],test:s=>s.bosses>=1},
 {id:'boss2',name:'Два босса',condition:'Победите 2 боссов за один забег в выживании',rewards:['fangs'],test:s=>s.bosses>=2},
 {id:'elite5',name:'Пять элит',condition:'Победите 5 элитных врагов за один забег в выживании',rewards:['whip'],test:s=>s.elites>=5},
 {id:'elite10',name:'Десять элит',condition:'Победите 10 элитных врагов за один забег в выживании',rewards:['chimera'],test:s=>s.elites>=10},
 {id:'level10',name:'Уровень 10',condition:'Достигните уровня 10 в выживании',rewards:['armor'],test:s=>s.level>=10},
 {id:'time10',name:'Десять минут',condition:'Продержитесь 10 минут в выживании',rewards:['acid'],test:s=>s.time>=600},
 {id:'level15',name:'Уровень 15',condition:'Достигните уровня 15 в выживании',rewards:['arc'],test:s=>s.level>=15},
 {id:'level20',name:'Уровень 20',condition:'Достигните уровня 20 в выживании',rewards:['accelerator'],test:s=>s.level>=20},
 {id:'final',name:'Матка повержена',condition:'Победите Матку в выживании',rewards:['hecaton'],test:s=>s.finalDefeated},
];
export const ROMAN=['','I','II','III','IV','V'];

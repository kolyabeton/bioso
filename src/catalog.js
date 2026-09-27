import {SHIELD_RECHARGE_SECONDS} from './systems/health-tuning.js';
import {survivalItemAvailable} from './systems/survival-unlock-rules.js';
import {SUPPORT_BODIES,chassisItemAvailable} from './systems/chassis-unlocks.js';
// Gameplay values are deliberately independent of rendering and persistence.
export const MAX_ARMS = 4;
export const BODIES = {
 ...SUPPORT_BODIES,
 reactor:{name:'Электрик',arms:3,legs:2,organs:2,baseSpeedBonus:2,capacity:100,hp:2,armor:0,trait:'Каждое убийство повышает урон всего оружия на 1%. Через 3 с без убийств бонус сбрасывается. Установлен Кожух: он выдерживает 2 попадания до восстановления'},
 wanderer:{name:'Садовник',arms:2,legs:2,organs:3,baseSpeedBonus:3,capacity:90,hp:2,armor:0,trait:'Установлен Скороход: скорость движения +20%, а урон и скорость атаки +5% за каждый 1 м/с скорости свыше 8 м/с.'},
 hunter:{name:'Высотник',arms:3,legs:3,organs:2,baseSpeedBonus:1,capacity:105,hp:1,armor:0,trait:'Установлены 2 Маркера: каждая атака повышает шанс и урон крита на 3%; пауза в 2 с сбрасывает разгон'},
 bastion:{name:'Каменщик',arms:3,legs:4,organs:3,capacity:210,hp:3,armor:20,trait:'Установлены 4 органа: эффективность всех органов +30%, кроме Компостера'},
 chimera:{name:'Мойщик',arms:4,legs:2,organs:2,baseSpeedBonus:2,capacity:145,hp:1,armor:0,trait:'Мойка: весь периодический урон +10% за каждые 50 биомассы в запасе, максимум +50%. Действует на горение, кислоту, урон Охладителя и горящий след.'},
 rootwalker:{name:'Лесник',arms:2,legs:6,organs:2,capacity:220,hp:3,armor:20,trait:'Установлены 4 ноги: урон всего оружия +5% за каждые 25 максимального HP'},
 hecaton:{name:'Механик',arms:4,legs:4,organs:2,baseSpeedBonus:1,capacity:155,hp:1,armor:0,trait:'Установлены 2 Тяжеловоза: время перезарядки Сеялки, Рассеивателя, Маркера и Скребков сокращается на 26%'},
 broodmother:{name:'Пасечник',arms:3,legs:4,organs:3,baseSpeedBonus:1,capacity:150,hp:2,armor:0,trait:'Включённый Опылитель создаёт постоянных неуязвимых дронов. Они получают все усиления роя.'},
};
export const BODY_BASE_BONUSES=Object.freeze({
 wanderer:{dodge:.2},reactor:{shieldRechargeRate:.4},hunter:{critDamage:.25},
 bastion:{xpGain:.1},chimera:{acidDuration:.5},rootwalker:{regenPerSecond:.01},
 regulator:{frozenDamage:.3},hecaton:{attackSpeedReloadStep:.1},
});
export const WEAPONS = {
 drone:{name:'Опылитель',weight:18,damage:18,interval:1.2,range:10,attackRadius:.5,mode:'summon',description:'Призывает дрона-перехватчика. Суммарный урон включённых Опылителей получают все существа роя и башни Сборщика.'},
 harpoon:{name:'Лебёдка',weight:18,damage:42,interval:1.7,range:11,speed:26,magazine:1,reload:1.6,mode:'projectile',description:'Наносит элите и боссам на 25% больше урона.'},
 pistol:{name:'Маркер',weight:8,damage:8,interval:.65,range:10,speed:26,magazine:5,reload:1.4,spread:.012,knockback:4,mode:'projectile',crit:.25,critPower:2,description:'Медленный встроенный выстрел с высоким шансом крита. Каждый установленный «Маркер» даёт всем «Маркерам» +5% к шансу крита и +0,2 к множителю крита.'},
 claws:{name:'Скребки',weight:8,damage:12,interval:.45,range:2.8,knockback:2,magazine:2,reload:.7,mode:'sector',angle:1.1,crit:.05,description:'Быстро атакует по сектору и получает повышенный шанс крита.'},
 // Keep the legacy key so existing rewards and saved parts become the same shield.
 hammer:{name:'Трамбовка',weight:24,damage:50,interval:1.8,range:3,areaRadius:2.4,knockback:18,knockbackCap:48,hitStagger:.45,magazine:1,reload:2,mode:'area',description:'Атакует по площади и отбрасывает обычных врагов.'},
 shieldArm:{name:'Щит',weight:50,damage:0,interval:5,range:5,mode:'aura',description:'Защищает от снарядов спереди на 50% в секторе 120°. В радиусе 5 м постоянно замедляет врагов на 10% и наносит периодический урон; сила ауры растёт с рангом и улучшениями. Урон и замедление нескольких включённых щитов складываются. Щит не атакует.'},
 drill:{name:'Бур',weight:22,damage:8,interval:.2,range:2.5,knockback:.5,magazine:6,reload:1,mode:'contact',description:'Игнорирует половину брони и в первую очередь атакует элиту.'},
 whip:{name:'Сучкорез',weight:14,damage:20,interval:.9,range:4,magazine:3,reload:1.1,knockback:1,mode:'sector',angle:2.8,description:'Бьёт широкой дугой и слегка отталкивает врагов. Каждый третий удар стягивает врагов к концу удара; элит — слабее. Боссов не перемещает.'},
 fangs:{name:'Захват',weight:14,damage:18,interval:.8,range:2.8,knockback:1,magazine:2,reload:.9,mode:'contact',description:'Восстанавливает часть максимального HP при атаке.'},
 seed:{name:'Сеялка',weight:10,damage:6,interval:.2,range:9,speed:33,magazine:12,reload:1.2,spread:.112,knockback:3,mode:'projectile',description:'При непрерывной стрельбе точность снижается.'},
 shotgun:{name:'Рассеиватель',weight:16,damage:5.25,interval:.5,range:12,speed:24,magazine:2,reload:2,pellets:5,pelletSpread:.098,knockback:2,mode:'projectile',description:'Выпускает пять дробин одним плотным залпом. Каждый установленный «Рассеиватель» снижает время перезарядки всех Рассеивателей на 10% и разброс на 10%.'},
 needle:{name:'Инъектор',weight:16,damage:35,interval:1.2,range:14,speed:40/1.5,magazine:1,reload:2.3,spread:0,knockback:7,mode:'projectile',pierce:3,description:'Выпускает точный снаряд, пробивающий до трёх целей.'},
 rocket:{name:'Доставщик',weight:50,damage:12,projectileCount:4,lifetime:5,interval:2.4,range:13,speed:7,magazine:2,reload:4,knockback:14,knockbackCap:36,blastRadius:1.5,mode:'rocket',description:'Выпускает залп дронов-камикадзе: они перехватывают снаряды и взрываются при попадании. Урон усиливают Опылители, оружие и рой.'},
 arc:{name:'Сварочник',weight:18,damage:18,interval:1.1,range:10,magazine:4,reload:1.5,mode:'arc',description:'Цепной разряд поражает до трёх целей.'},
 acid:{name:'Мойка',weight:18,damage:10,interval:2,range:9,speed:14,magazine:3,reload:1.8,mode:'acid',description:'Стреляет под ноги цели и не наносит урона при попадании. Кислотная лужа держится 3 с, замедляет врагов на 30% и наносит указанный урон каждую секунду. Перекрывающиеся лужи складывают урон.'},
};
export const LEGS = {
 spring:{rankStat:'speed',name:'Рессора',weight:8,speed:6,hp:0,armor:0,description:'После 3 с непрерывного движения следующее столкновение с врагом переносит вперёд на 2,5 м и даёт уклонение на 0,5 с.'},
 swarmLeg:{rankStat:'summonDamage',upgradeStat:'summonDamage',summonDamage:.15,name:'Роевик',weight:10,speed:5,hp:0,armor:0,description:'Повышает урон роя. Складываются три сильнейших Роевика.'},
 runner:{rankStat:'speed',name:'Скороход',weight:6,speed:7,hp:0,armor:0,description:'Дополнительно повышает урон Рассеивателя, Маркера и Скребков на 10%. Оставляет горящий след на 3 с. Несколько опор не усиливают эффект.'},
 universal:{rankStat:'speed',healthByTier:[.5,.5,1,1,2],name:'Универсал',weight:8,speed:6,hp:0,armor:0,description:'Добавляет здоровье. Ранг и улучшения повышают скорость движения.'},
 plated:{rankStat:'armor',name:'Тяжеловоз',weight:12,speed:5,hp:0,armor:10,upgradeStat:'armor'},
 root:{rankStat:'hp',name:'Корнеход',weight:12,speed:2,hp:0,armor:0,upgradeStat:'regen',regen:true,description:'Непрерывно восстанавливает 1% максимального здоровья в секунду. Ранг и каждое улучшение добавляют 0,3%/с. Несколько Корнеходов складываются.'},
};
export const ORGANS = {
 mirrorGland:{name:'Отражатель',weight:14,description:'Отражает вложенные усиления обратно в сборку: каждая уже прокачанная способность души усиливается на +1% с каждым рангом. Счётчики, плоские бонусы HP и длительности не усиливаются. Несколько Отражателей складываются.'},
 reflexNerve:{name:'Сенсор',weight:12,description:'Повышает шанс уклониться от удара.'},
 returnNerve:{name:'Реверсор',weight:12,description:'На предельной дальности снаряды оружия разворачиваются и повторно поражают врагов на пути к герою. Боезапас не восстанавливается.'},
 slime:{name:'Охладитель',weight:14,description:'Каждое попадание оружием замедляет врага и наносит периодический урон в течение 5 с. При смерти враг взрывается и ранит соседей. Улучшения усиливают урон.'},
 parasite:{name:'Инкубатор',weight:18,description:'Каждые 2 с выпускает двух личинок по видимому врагу в радиусе 12 м. Урон усиливают Опылители, ранг и улучшения; темп роя ускоряет призыв.'},
 commonNerve:{name:'Синхронизатор',weight:20,rare:true,description:'Рассеиватель, Лебёдка, Инъектор и Доставщик ждут готовности всего совместимого оружия и стреляют общим залпом: +50% урона. Бонус растёт с рангом и улучшениями. Работает только один Синхронизатор — самый сильный.'},
 reverseHeart:{name:'Насос',weight:18,rare:true,description:'Лечение при полном здоровье создаёт поражающий импульс. Урон рассчитывается от сильнейшего установленного оружия и растёт с рангом и улучшениями.'},
 regen:{name:'Ремонтник',weight:14,description:'Непрерывно восстанавливает 1% максимального здоровья в секунду. Ранг и улучшения повышают темп; попадания не прерывают восстановление.'},
 shield:{name:'Кожух',weight:18,shield:40,description:`Поглощает 1 попадание и восстанавливается за ${SHIELD_RECHARGE_SECONDS} с. Ранг и улучшения сокращают время восстановления.`},
 armor:{name:'Пластины',weight:24,armor:20,description:'Добавляет броню и непрерывно восстанавливает 1% запаса брони в секунду. Ранг и каждое улучшение добавляют 0,3% и увеличивают запас. Несколько Пластин складываются.'},
 repairGland:{name:'Ремкомплект',weight:16,description:'Усиливает бонус способности корпуса на 20%. Ранг добавляет 10%, каждое улучшение — 2%. Складываются два сильнейших Ремкомплекта.'},
 broodNode:{name:'Контроллер',weight:18,summonDamage:.2,description:'Повышает урон всех дронов. Складываются два сильнейших Контроллера.'},
 stabilizer:{name:'Стабилизатор',weight:10,description:'Снижает время перезарядки оружия на 15%.'},
 digestion:{name:'Компостер',weight:12,description:'Ранг I даёт 80% базовой биомассы от детали; каждый следующий ранг добавляет 20%. Возвращает 50% биомассы, потраченной на улучшения.'},
 reverseStomach:{name:'Обратный желудок',weight:12,description:'С установленным Компостером автоматически перерабатывает выбранные детали на земле в радиусе 3 м в биомассу. Не лечит.'},
 accelerator:{name:'Ускоритель',weight:16,description:'Повышает скорость атаки всего оружия.'},
 revivalCore:{name:'Реаниматор',weight:14,description:'Срабатывает из инвентаря. Бонусы также действуют из инвентаря. Установка не обязательна. При смертельном ударе воскрешает героя с 25 HP и защитой на 2 с, затем разрушается. Одноразовый, не улучшается.'},
};
export const CATALOG = Object.fromEntries([['body',BODIES],['arm',WEAPONS],['leg',LEGS],['organ',ORGANS]].flatMap(([kind,defs])=>Object.entries(defs).map(([key,d])=>[key,{...d,key,kind}])));
// Basic atlas parts stay independent from the single reward owned by each boss.
export const STARTERS=['drone','wanderer','universal','runner','pistol','claws','stabilizer','broodmother','swarmLeg','broodNode'];
export const WEAPON_UNLOCKS=[
 {id:'weapon:shieldArm',key:'shieldArm',name:'Против щита',counter:'shieldBearers',goal:30,label:'Убитые щитоносцы',description:'Убейте 30 щитоносцев в миссиях или выживании. Прогресс складывается между забегами.',lore:'Чужая защита становится вашей.'},
 {id:'weapon:shotgun',key:'shotgun',name:'Первый калибр',counter:'pistol',goal:30,label:'Убийства Маркером',description:'Убейте 30 существ Маркером. Прогресс складывается между забегами.',lore:'Каждый точный выстрел открывает новые возможности.'},
 {id:'weapon:seed',key:'seed',name:'Зачистка',counter:'total',goal:60,label:'Убитые существа',description:'Убейте 60 существ любым оружием. Прогресс складывается между забегами.',lore:'Одного выстрела уже недостаточно.'},
];
export const MODIFIERS={light:'Облегчённая',rapid:'Скорострельная',armored:'Бронированная'};
export const weaponUnlockProgress=(profile,unlock)=>unlock.counter==='shieldBearers'?profile.meta?.shieldBearerKills||0:profile.meta?.weaponKills?.[unlock.counter]||0;
export const STAT_LABELS={stomachHealth:'Здоровье органа',resonance:'Резонанс души',sensorDodge:'Уклонение сборки',regenRate:'Восстановление здоровья',repairRate:'Ремонт брони',traitBoost:'Усиление корпуса',plateCapacity:'Ремонт брони',summonRate:'Темп роя',summonDamage:'Урон роя',capacity:'Вместимость',damage:'Урон',rate:'Скорость атаки',crit:'Шанс крита',critPower:'Множитель крита',hp:'Здоровье',armor:'Броня',regen:'Регенерация',speed:'Движение',dodge:'Уклонение',power:'Эффективность органа',returnDamage:'Возвратный урон',larvaDamage:'Урон личинок',slimeSlow:'Урон Охладителя',commonVolley:'Урон общего залпа',heartDamage:'Урон импульса',shieldRecharge:'Восстановление щита'};
export const INCREMENTS={summonRate:.04,summonDamage:.04,capacity:.1,damage:.12,rate:.09,crit:.03,critPower:.15,hp:1,armor:.12,regen:1,speed:.06,power:.12,returnDamage:.03,larvaDamage:.08,slimeSlow:.01,commonVolley:.1,heartDamage:.2,shieldRecharge:1,traitBoost:.02};
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
export const partAvailable=(profile,key)=>bossPartAvailable(profile,key)&&survivalItemAvailable(profile,key)&&chassisItemAvailable(profile,key);
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

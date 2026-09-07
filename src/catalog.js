import {SHIELD_RECHARGE_SECONDS} from './systems/health-tuning.js';
// Gameplay values are deliberately independent of rendering and persistence.
export const MAX_ARMS = 4;
export const BODIES = {
 reactor:{name:'Реактор',arms:2,legs:2,organs:2,capacity:110,hp:2,armor:0,trait:'15 убийств: скорость атак +30% на 6 с; затем 15 с охлаждения'},
 wanderer:{name:'Странник',arms:2,legs:2,organs:2,capacity:100,hp:2,armor:0,trait:'Скорость движения +10%'},
 hunter:{name:'Ловчий',arms:3,legs:2,organs:2,capacity:115,hp:2,armor:0,trait:'Скорость атак лёгких рук +15%'},
 bastion:{name:'Бастион',arms:2,legs:4,organs:3,capacity:180,hp:3,armor:20,trait:'Дополнительное деление здоровья и встроенная броня'},
 chimera:{name:'Химера',arms:4,legs:2,organs:2,capacity:150,hp:2,armor:10,trait:'Ближний урон +10%, скорость снарядов +15%'},
 rootwalker:{name:'Корнеход',arms:4,legs:4,organs:3,capacity:190,hp:3,armor:15,trait:'Дополнительное деление здоровья'},
 hecaton:{name:'Гекатон',arms:4,legs:4,organs:2,capacity:165,hp:2,armor:5,trait:'Вес установленных лёгких рук −20%'},
};
export const WEAPONS = {
 harpoon:{name:'Гарпун-сухожилие',weight:18,damage:42,interval:1.7,range:11,speed:26,magazine:1,reload:1.6,pierce:2,mode:'projectile',description:'Пробивает две цели. Притягивает обычных врагов; элите и боссам урон +25%'},
 claws:{name:'Когти-жнецы',weight:8,damage:12,interval:.45,range:2.8,knockback:2,mode:'sector',angle:1.1,crit:.05,description:'Быстрый удар по сектору · шанс крита +5 п.п.'},
 // Keep the legacy key so existing rewards and saved parts become the same shield.
 hammer:{name:'Таранный щит',weight:24,damage:50,interval:1.8,range:3,mode:'area',description:'Удар щитом по площади · отбрасывает обычных врагов'},
 drill:{name:'Бур-пробойник',weight:22,damage:8,interval:.2,range:2.5,knockback:.5,mode:'contact',description:'Игнорирует половину брони · предпочитает элиту'},
 whip:{name:'Живая плеть',weight:14,damage:20,interval:.9,range:4,mode:'sector',angle:2.8,description:'Широкая дуга по нескольким целям'},
 fangs:{name:'Клыки-паразиты',weight:14,damage:18,interval:.8,range:2.8,knockback:1,mode:'contact',description:'Лечат 1 деление за 30 попаданий, не чаще раза в 30 с'},
 seed:{name:'Семенной пулемёт',weight:10,damage:6,interval:.2,range:9,speed:22,magazine:8,reload:1.2,spread:.045,knockback:3,mode:'projectile',description:'8 семян · перезарядка 1,2 с'},
 needle:{name:'Игломёт',weight:16,damage:35,interval:1.2,range:14,speed:40,magazine:1,reload:1.4,spread:0,knockback:7,mode:'projectile',pierce:3,description:'Один точный выстрел · пробивает трёх · перезарядка 1,4 с'},
 rocket:{name:'Ракетный улей',weight:28,damage:16,interval:2.4,range:13,speed:12,magazine:2,reload:2,knockback:6,mode:'rocket',description:'Два залпа по три ракеты · перезарядка 2 с'},
 arc:{name:'Дуговой орган',weight:18,damage:18,interval:1.1,range:7,magazine:4,reload:1.5,mode:'arc',description:'4 разряда · три цели · восстановление 1,5 с'},
 acid:{name:'Кислотная железа',weight:18,damage:12,interval:2,range:9,speed:14,magazine:3,reload:1.8,mode:'acid',description:'3 плевка · лужа на 3 с · восстановление 1,8 с'},
};
export const LEGS = {
 spring:{name:'Пружинная опора',weight:8,speed:6,hp:0,armor:0,description:'3 с движения заряжают ускорение: при резком повороте +35% скорости на 1 с. Эффект нескольких опор не складывается'},
 runner:{name:'Беговая нога',weight:6,speed:7,hp:0,armor:0},
 universal:{name:'Универсальная нога',weight:8,speed:6,hp:0,armor:0},
 plated:{name:'Панцирная нога',weight:12,speed:5,hp:0,armor:5,upgradeStat:'armor',description:'Добавляет броню поверх здоровья · бонусы ног складываются'},
 root:{name:'Корневая нога',weight:12,speed:2,hp:0,armor:0,upgradeStat:'regen',regen:true,description:'Восстанавливает 1 деление. Улучшение: −1 с; максимум 10. Потеря здоровья запускает отсчёт заново.'},
};
export const ORGANS = {
 mirrorGland:{name:'Зеркальная железа',weight:14,description:'Полученный или заблокированный удар вызывает ответный шип по ближайшему видимому врагу на 16 м. Урон сильнейшей руки. Раз в 2 с; не блокирует урон'},
 returnNerve:{name:'Возвратный нерв',weight:12,description:'Семена и иглы возвращаются: 60% урона на обратном пути. Патроны не возвращаются.'},
 slime:{name:'Слизевой мешок',weight:14,description:'Попадания рук замедляют на 3 с: враги −25%, боссы −10%. Смерть оставляет слизь на 3 с.'},
 parasite:{name:'Паразитарная матка',weight:18,description:'Каждая третья атака руки заражает на 6 с. Смерть носителя выпускает 2 личинки. Каждая наносит 40% урона от оружия.'},
 commonNerve:{name:'Общий нерв',weight:20,rare:true,description:'Семена, иглы и ракеты ждут готовности всех совместимых рук и стреляют общим залпом с уроном ×2.'},
 outerStomach:{name:'Внешний желудок',weight:16,rare:true,description:'Открывает переработку деталей в сборке и показывает добычу в радиусе 10 м.'},
 reverseHeart:{name:'Обратное сердце',weight:18,rare:true,description:'Лечение при полном здоровье: импульс 5 м, урон ×3 от сильнейшей руки. Не чаще раза в 5 с.'},
 regen:{name:'Регенератор',weight:14,description:'После 15 с без потери здоровья восстанавливает 1 деление'},
 shield:{name:'Щитовой орган',weight:18,shield:40,description:`Поглощает 1 попадание, восстанавливается за ${SHIELD_RECHARGE_SECONDS} с`},
 armor:{name:'Бронепластины',weight:24,armor:20,description:'Добавляет стальные пластины поверх здоровья · расходуются первыми'},
 stabilizer:{name:'Стабилизатор',weight:10,description:'Скорость снарядов +30%'},
 digestion:{name:'Пищеварительный орган',weight:12,description:'Переработка ненужных деталей в биомассу'},
 accelerator:{name:'Ускоритель восстановления',weight:16,description:'Скорость атак всех рук +15%'},
};
export const CATALOG = Object.fromEntries([['body',BODIES],['arm',WEAPONS],['leg',LEGS],['organ',ORGANS]].flatMap(([kind,defs])=>Object.entries(defs).map(([key,d])=>[key,{...d,key,kind}])));
export const STARTERS=['wanderer','universal','claws','seed'];
export const MODIFIERS={light:'Облегчённая',rapid:'Скорострельная',armored:'Бронированная'};
export const STAT_LABELS={capacity:'Вместимость',damage:'Урон',rate:'Скорость атаки',crit:'Шанс крита',critPower:'Множитель крита',hp:'Здоровье',armor:'Броня',regen:'Регенерация',speed:'Движение',power:'Эффективность органа'};
export const INCREMENTS={capacity:.1,damage:.12,rate:.09,crit:.03,critPower:.15,hp:1,armor:.12,regen:1,speed:.06,power:.12};
export const MISSIONS=[
 {id:'garden',name:'Оживить сад',description:'Активируйте три узла приближением. Защитите последний 90 секунд.',rewards:['arc','regen'],duration:600},
 {id:'quarantine',name:'Пробить карантин',description:'Найдите и разрушьте четыре генератора за 12 минут.',rewards:['drill','armor','bastion','plated'],duration:720},
 {id:'core',name:'Вынести ядро',description:'Заберите живое ядро и доставьте к выходу за 10 минут.',rewards:['rocket','shield'],duration:600},
 {id:'nursery',name:'Удержать питомник',description:'Сохраните центральный инкубатор в течение 8 минут.',rewards:['acid','digestion','rootwalker'],duration:480},
 {id:'mother',name:'Разбудить матку сада',description:'Разрушьте три защитных органа и победите матку за 12 минут.',rewards:['fangs','chimera'],duration:720},
];
export const SURVIVAL_UNLOCKS=[
 {id:'elite1',name:'Первая элита',rewards:['needle'],test:s=>s.elites>=1},
 {id:'time5',name:'Пять минут',rewards:['runner'],test:s=>s.time>=300},
 {id:'rootLeg5',name:'Корневая опора',rewards:['root'],test:s=>s.time>=300},
 {id:'boss1',name:'Первый босс',rewards:['hammer','hunter'],test:s=>s.bosses>=1},
 {id:'elite5',name:'Пять элит',rewards:['whip'],test:s=>s.elites>=5},
 {id:'level10',name:'Уровень 10',rewards:['stabilizer'],test:s=>s.level>=10},
 {id:'level20',name:'Уровень 20',rewards:['accelerator'],test:s=>s.level>=20},
 {id:'final',name:'Матка повержена',rewards:['hecaton'],test:s=>s.finalDefeated},
];
export const ROMAN=['','I','II','III','IV','V'];

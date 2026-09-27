import {SETS,setCounts} from './sets/definitions.js';
import {FAMILIES,mutationView} from './sets/mutations.js';
import {survivalProgress,fullSets} from './survival-achievement-progress.js';
import {SURVIVAL_ITEM_ACHIEVEMENTS} from './survival-unlock-rules.js';
import {normalizeDifficulty} from './difficulty.js';

// Keep translated copy next to these generated families of goals.
export const SURVIVAL_ACHIEVEMENT_TRANSLATIONS={};
const t=(ru,en)=>(SURVIVAL_ACHIEVEMENT_TRANSLATIONS[ru]=en,ru);
const lore=t('Опыт выживания остаётся с вами.','Your survival experience stays with you.');
const condition=(label,goal,read)=>({label,goal,read});
const stat=(label,goal,key)=>condition(label,goal,s=>survivalProgress(s.profile)[key]);
const c={level:t('Уровень','Level'),runs:t('Забеги с уровнем 20','Runs reaching level 20'),set:t('Полный сет','Full set'),kills:t('Убитые существа','Creatures killed'),bosses:t('Боссы','Bosses'),sets:t('Разные полные сеты','Different full sets'),types:t('Категории деталей','Part categories'),mutation:t('Активная мутация','Active mutation'),elites:t('Элиты','Elites'),recycled:t('Переработано деталей','Parts recycled'),achievements:t('Новые достижения выживания','New survival achievements')};
const rewardById=Object.fromEntries(Object.entries(SURVIVAL_ITEM_ACHIEVEMENTS).map(([key,id])=>[id,key]));
const goal=(suffix,name,description,conditions,scope='lifetime',art='feat-set',category='assembly')=>{
 const id='survival:'+suffix,key=rewardById[id];
 return{id,name,description,conditions,scope,mode:'survival',category,lore,isSurvivalExpansion:true,art:`/assets/ui/achievements/${art}-v1.jpg`,reward:key?{keys:[key],delivery:'ground'}:{tokens:1}};
};
const setEnglish={wanderer:'Gardener',hunter:'Rigger',bastion:'Mason',chimera:'Cleaner',rootwalker:'Forester',hecaton:'Mechanic',reactor:'Electrician',broodmother:'Beekeeper'};
const setArt={wanderer:'feat-set',hunter:'mission-garden',bastion:'mission-quarantine',chimera:'elite10',rootwalker:'mission-core',hecaton:'final',reactor:'meta-reactor',broodmother:'feat-mutation'};
const mutationEnglish={hive:'Hive',conductor:'Conductor',mire:'Mire'};
export const SURVIVAL_ACHIEVEMENTS=[
 ...[25,30].map(n=>goal(`level-${n}`,t(`Уровень ${n}`,`Level ${n}`),t(`Достигните уровня ${n} за один забег в выживании.`,`Reach level ${n} in one survival run.`),[condition(c.level,n,s=>s.level)],'run','level20','mastery')),
 ...[3,5,10,15,20].map(n=>goal(`level20-runs-${n}`,t(`Опыт выживания: ${n}`,`Survival experience: ${n}`),t(`Достигните уровня 20 в ${n} разных забегах выживания.`,`Reach level 20 in ${n} different survival runs.`),[stat(c.runs,n,'level20Runs')],'lifetime','level20','mastery')),
 ...Object.entries(SETS).flatMap(([id,set])=>{
  const en=setEnglish[id];return[
   goal(`set-${id}`,t(`Комплект: ${set.name}`,`Set: ${en}`),t(`В выживании активируйте полный сет «${set.name}»: установите три разные категории деталей.`,`In survival, activate the full ${en} set by equipping three different part categories.`),[condition(c.set,1,s=>Number(survivalProgress(s.profile).sets.includes(id)))],'lifetime',setArt[id]),
   goal(`set-kills-${id}`,t(`Зачистка: ${set.name}`,`Clearance: ${en}`),t(`Убейте 500 существ с активным полным сетом «${set.name}». Учитываются все забеги выживания.`,`Kill 500 creatures with the full ${en} set active across survival runs.`),[condition(c.kills,500,s=>survivalProgress(s.profile).setKills[id])],'lifetime',setArt[id]),
   goal(`set-bosses-${id}`,t(`Охота: ${set.name}`,`Hunt: ${en}`),t(`Победите 3 боссов с активным полным сетом «${set.name}» за один забег выживания.`,`Defeat 3 bosses with the full ${en} set active in one survival run.`),[condition(c.bosses,3,s=>s.survivalAchievementRun?.setBosses?.[id]||0)],'run',setArt[id]),
  ];
 }),
 ...[2,3,5,8].map(n=>goal(`sets-${n}`,t(`Коллекция сетов: ${n}`,`Set collection: ${n}`),t(`Активируйте ${n} разных полных сетов в выживании. Можно в разных забегах.`,`Activate ${n} different full sets in survival, across any number of runs.`),[condition(c.sets,n,s=>survivalProgress(s.profile).sets.length)])),
 ...Object.entries(FAMILIES).flatMap(([id,m])=>[
  goal(`mutation-kills-${id}`,t(`Сила мутации: ${m.name}`,`Mutation power: ${mutationEnglish[id]}`),t(`Убейте 500 существ с активной мутацией «${m.name}». Учитываются все забеги выживания.`,`Kill 500 creatures with ${mutationEnglish[id]} active across survival runs.`),[condition(c.kills,500,s=>survivalProgress(s.profile).mutationKills[id])],'lifetime','feat-mutation'),
  goal(`mutation-bosses-${id}`,t(`Охота мутации: ${m.name}`,`Mutation hunt: ${mutationEnglish[id]}`),t(`Победите 3 боссов с активной мутацией «${m.name}». Учитываются все забеги выживания.`,`Defeat 3 bosses with ${mutationEnglish[id]} active across survival runs.`),[condition(c.bosses,3,s=>survivalProgress(s.profile).mutationBosses[id])],'lifetime','feat-natures'),
 ]),
 goal('mature-build',t('Зрелая сборка','Mature build'),t('В выживании одновременно имейте уровень 20 или выше и активный полный сет.','In survival, have level 20 or higher and a full set active at the same time.'),[condition(c.level,20,s=>s.level),condition(c.set,1,s=>Number(fullSets(s).length>0))],'run','feat-set'),
 goal('four-categories',t('Полная принадлежность','Complete allegiance'),t('В выживании одновременно установите корпус, руку, ногу и орган одного сета.','In survival, equip a body, arm, leg and organ of one set at the same time.'),[condition(c.types,4,s=>Math.max(0,...Object.values(setCounts(s))))],'run','feat-set'),
 goal('set-mutation',t('Двойная адаптация','Double adaptation'),t('В выживании одновременно активируйте полный сет и любую мутацию.','In survival, activate a full set and any mutation at the same time.'),[condition(c.set,1,s=>Number(fullSets(s).length>0)),condition(c.mutation,1,s=>Number(mutationView(s).some(m=>m.active)))],'run','feat-mutation'),
 ...[10000,20000].map(n=>goal(`kills-${n}`,t(`Массовая зачистка: ${n}`,`Mass clearance: ${n}`),t(`Убейте ${n} существ за всё время в выживании.`,`Kill ${n} creatures across survival runs.`),[stat(c.kills,n,'kills')],'lifetime','elite10','survival')),
 goal('elites-500',t('Охотник на элит','Elite hunter'),t('Победите 500 элит за всё время в выживании.','Defeat 500 elites across survival runs.'),[stat(c.elites,500,'elites')],'lifetime','elite10','survival'),
 goal('bosses-100',t('Охотник на боссов','Boss hunter'),t('Победите 100 боссов за всё время в выживании.','Defeat 100 bosses across survival runs.'),[stat(c.bosses,100,'bosses')],'lifetime','boss2','survival'),
 goal('recycle-250',t('Безотходное производство','Waste-free production'),t('Переработайте 250 деталей за всё время в выживании. Нужен Компостер.','Recycle 250 parts across survival runs. Requires a Composter.'),[stat(c.recycled,250,'recycled')],'lifetime','feat-recycle'),
];
const prerequisiteIds=SURVIVAL_ACHIEVEMENTS.map(a=>a.id);
SURVIVAL_ACHIEVEMENTS.push(goal('master',t('Мастер выживания','Survival master'),t('Получите остальные 49 новых достижений выживания.','Earn the other 49 new survival achievements.'),[condition(c.achievements,49,s=>prerequisiteIds.filter(id=>s.profile.achievements.includes(id)).length)],'lifetime','final','survival'));

// Separate from the original 49-goal mastery requirement. Each tier needs its own victory.
export const SURVIVAL_COMPLETION_ACHIEVEMENTS=[
 ['easy','Лёгкий','Easy',0],['medium','Средний','Medium',1],['hard','Сложный','Hard',2],
].map(([id,ru,en,tier])=>goal(`escape-${id}`,t(`Свободные души: ${ru}`,`Free souls: ${en}`),
 t(`Завершите финальный сбор биомассы и освободите души. Сложность: ${tier===0?'0–49':tier===1?'50–99':'100'}.`,`Complete the final biomass quest and free the souls. Difficulty: ${tier===0?'0–49':tier===1?'50–99':'100'}.`),
 [condition(t('Души освобождены','Souls freed'),1,s=>Number(!!s.won&&!!s.finalDefeated&&!!s.escapeQuest&&Math.floor(normalizeDifficulty(s.difficulty)/50)===tier))],'run','final','survival'));

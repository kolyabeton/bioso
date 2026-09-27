import {CATALOG, MISSIONS, SURVIVAL_UNLOCKS, WEAPON_UNLOCKS, weaponUnlockProgress} from '../catalog.js';
import {EVENTS} from './events/definitions.js';
import {SECRETS} from './secrets/definitions.js';
import {mutationView} from './sets/mutations.js';
import {setCounts, equipped, rollAffixes} from './sets/loot.js';
import {ABILITIES} from './abilities.js';
import {createPart,lootTier} from '../assembly.js';
import {SURVIVAL_ACHIEVEMENTS,SURVIVAL_COMPLETION_ACHIEVEMENTS} from './survival-achievements.js';
import {trackSurvivalState} from './survival-achievement-progress.js';
import {CHASSIS_UNLOCKS} from './chassis-unlocks.js';
import {chassisProgress,trackChassisCapacity} from './chassis-progress.js';
import {stats} from '../assembly.js';
import {seededRandom} from '../simulation.js';
export {SURVIVAL_ACHIEVEMENTS} from './survival-achievements.js';

export const ACHIEVEMENT_CATEGORIES={all:'Все',survival:'Выживание',missions:'Миссии',exploration:'Мир',assembly:'Сборка',mastery:'Развитие'};
export const BIOME_NAMES={forest:'Корневой лес',gardens:'Верхние сады',city:'Заросший город',scrapyard:'Тихая свалка'};
const completed=n=>['reward','complete','completed'].includes(n.state);
const nodes=s=>s.encounters?.nodes||[];
const missionEvents=s=>(s.mission?.eventHistory||[]).filter(n=>n.outcome==='victory'||n.outcome==='sacrifice');
export const visitedBiomes=s=>[...new Set((s.world?.tiles||[]).filter(t=>s.exploration?.visited?.has(t.id)||s.exploration?.visited?.has(t.index)).map(t=>t.biome))];
export const completedEventTypes=s=>[...new Set(nodes(s).filter(n=>EVENTS[n.type]&&completed(n)).map(n=>n.type))];
const condition=(label,goal,read)=>({label,goal,read});
const feat=(id,name,category,description,conditions,scope='run',lore='Каждый опыт оставляет след.')=>({id:'feat:'+id,name,category,description,conditions,scope,lore,reward:{tokens:1},isNew:true});
const countCondition={elite1:['Элиты',1,'elites'],elite3:['Элиты',3,'elites'],elite5:['Элиты',5,'elites'],elite10:['Элиты',10,'elites'],boss1:['Боссы',1,'bosses'],boss2:['Боссы',2,'bosses'],time5:['Секунды',300,'time'],rootLeg5:['Секунды',300,'time'],time10:['Секунды',600,'time'],level5:['Уровень',5,'level'],level10:['Уровень',10,'level'],level15:['Уровень',15,'level'],level20:['Уровень',20,'level'],final:['Матка повержена',1,'finalDefeated']};
const survivalLore={elite1:'Первый трофей тяжелее остальных.',elite3:'Вы уже узнаёте их слабые места.',elite5:'Опасность становится знакомой.',elite10:'Охотник меняется местами с добычей.',boss1:'Даже самые большие механизмы останавливаются.',boss2:'Вторая победа — уже закономерность.',time5:'Мир присматривается к вам.',rootLeg5:'Пустить корни — тоже способ выжить.',time10:'Вы научились слышать этот мир.',level5:'Чужие обломки становятся частью вас.',level10:'Опыт превращается в броню.',level15:'Внутри пробуждается новый ток.',level20:'Предел оказался началом.',final:'Рой впервые замолчал.'};
export const NEW_ACHIEVEMENTS=[
 feat('contract','Первый контракт','exploration','Заключите первую сделку у любого алтаря.',[condition('Сделки',1,s=>nodes(s).filter(n=>EVENTS[n.type]?.kind==='altar'&&completed(n)).length+missionEvents(s).filter(n=>(n.kind==='altar'||EVENTS[n.type]?.kind==='altar')).length)]),
 ...[['infection','Замкнутый круг','Завершите Заражённый круг: накопите 30 секунд внутри.'],['sealed','Без выхода','Продержитесь 45 секунд в Запечатанном питомнике и уничтожьте всех врагов испытания.'],['hunt','По следу носителя','Уничтожьте отмеченную элиту за 60 секунд.']].map(([id,name,description])=>feat(id,name,'exploration',description,[condition('Испытание',1,s=>Number(nodes(s).some(n=>n.type===id&&completed(n))||missionEvents(s).some(n=>n.type===id)))])),
 feat('secrets','Универсальный инструмент','exploration','Откройте мембрану Мойкой, плиту Трамбовкой или Буром, а питомник — Сварочником. Можно в разных забегах.',[condition('Виды секретов',3,(s,j)=>j.secrets.length)],'lifetime','У каждой тайны есть свой ключ.'),
 feat('recycle','Ничего лишнего','assembly','Переработайте 10 деталей за один забег. Нужен Компостер.',[condition('Переработано деталей',10,s=>s.achievementCounters?.recycled||0)],'run','В этом мире нет бесполезных обломков.'),
 feat('upgrade','Точная настройка','assembly','Доведите одну деталь до 10 усилений.',[condition('Усиления одной детали',10,s=>Math.max(0,...[...equipped(s),...(s.inventory||[])].map(p=>Object.values(p.upgrades||{}).reduce((n,v)=>n+v,0))))]),
 feat('set','Единый организм','assembly','Установите три разных типа частей одного комплекта с бонусом.',[condition('Типы частей комплекта',3,s=>Math.max(0,...Object.entries(setCounts(s)).map(([,n])=>n)))],'run','Разные части. Одно движение.'),
 feat('mutation','Новая форма','assembly','Активируйте Улей, Проводник или Топь: установите три разных подходящих вида деталей.',[condition('Активная мутация',1,s=>Number(mutationView(s).some(m=>m.active)))]),
 feat('natures','Три природы','assembly','Активируйте Улей, Проводник и Топь. Можно в разных забегах.',[condition('Виды мутаций',3,(s,j)=>j.mutations.length)],'lifetime'),
 feat('evolution','Завершённая эволюция','mastery','Изучите финальную способность любой ветки.',[condition('Финальная способность',1,s=>Number((s.abilities?.learned||[]).some(id=>id.endsWith('.3'))))],'run','Рост обретает форму.'),
 feat('synergy','На стыке стихий','mastery','Изучите любую синергию после завершения двух нужных веток.',[condition('Изученная синергия',1,s=>Number((s.abilities?.learned||[]).some(id=>ABILITIES[id]?.branch==='synergy')))],'run','Вместе они становятся чем-то большим.'),
];
export const ACHIEVEMENTS=[
 ...CHASSIS_UNLOCKS.map(a=>({...a,category:'assembly',scope:'lifetime',isNew:true,art:`/assets/ui/achievements/chassis-${a.key}-v1.png`,conditions:a.goals.map(([label,goal,key])=>condition(label,goal,s=>chassisProgress(s.profile)[key])),reward:{keys:[a.key],delivery:'ground'}})),
 ...WEAPON_UNLOCKS.map(a=>({...a,...(a.key==='shieldArm'?{art:'/assets/ui/achievements/elite1-v1.jpg'}:{}),category:'mastery',scope:'lifetime',conditions:[condition(a.label,a.goal,s=>weaponUnlockProgress(s.profile,a))],reward:{keys:[a.key],delivery:'ground'}})),
 ...SURVIVAL_UNLOCKS.map(a=>{const [label,goal,key]=countCondition[a.id];return{id:a.id,name:a.name,category:'survival',scope:'run',mode:'survival',description:key==='time'?`Продержитесь ${goal/60} минут в выживании.`:key==='level'?`Достигните уровня ${goal} в выживании.`:key==='finalDefeated'?'Победите Матку в выживании.':`Победите ${goal} ${key==='elites'?(goal===1?'элитного врага':'элитных врагов'):(goal===1?'босса':'боссов')} за один забег в выживании.`,conditions:[condition(label,goal,s=>Number(s[key])||0)],lore:survivalLore[a.id],reward:{keys:a.rewards,delivery:'ground'}};}),
 ...MISSIONS.map(m=>({id:'mission:'+m.id,aliases:m.id==='nursery'?['meta:mirror']:[],name:m.name,category:'missions',scope:'lifetime',description:m.description,lore:'Из руин возвращаются с новым знанием.',conditions:[condition(m.bossName,1,s=>Number(s.profile.achievements.includes('mission:'+m.id)))],reward:{keys:m.rewards,delivery:'mission'},mission:m.id})),
 {id:'meta:harpoon',name:'За пределом',category:'survival',scope:'lifetime',description:'После победы над Маткой продержитесь ещё 30 секунд против усиленных элит.',conditions:[condition('Усиленные победы',1,s=>s.profile.meta?.overruns||0)],reward:{keys:['harpoon'],delivery:'inventory'},lore:'Когда всё закончилось, вы остались.'},
 {id:'meta:reactor',name:'Повторный прорыв',category:'survival',scope:'lifetime',description:'Завершите два усиленных продолжения в разных забегах.',conditions:[condition('Усиленные победы',2,s=>s.profile.meta?.overruns||0)],reward:{keys:['reactor'],delivery:'inventory'},lore:'Сердце выдержит ещё один цикл.'},
 {id:'meta:spring',name:'Первопроходец',category:'exploration',scope:'run',mode:'survival',description:'За один забег посетите четыре разных биома и завершите два разных типа событий. Секреты не считаются событиями.',conditions:[condition('Биомы',4,s=>visitedBiomes(s).length),condition('Типы событий',2,s=>completedEventTypes(s).length)],reward:{keys:['spring'],delivery:'inventory'},lore:'У каждого биома — свой способ выжить.'},
 ...NEW_ACHIEVEMENTS,
 ...SURVIVAL_ACHIEVEMENTS,
 ...SURVIVAL_COMPLETION_ACHIEVEMENTS,
];
const ids=new Set(ACHIEVEMENTS.map(a=>a.id));
const safe=n=>Number.isSafeInteger(n)&&n>=0?Math.min(n,1000000):0;
export function normalizeJournal(j={}){return{best:Object.fromEntries(Object.entries(j?.best||{}).filter(([id,v])=>ids.has(id)&&Array.isArray(v)).map(([id,v])=>{const a=ACHIEVEMENTS.find(a=>a.id===id);return[id,a.conditions.map((c,i)=>Math.min(c.goal,safe(v[i])))];})),dates:Object.fromEntries(Object.entries(j?.dates||{}).filter(([id,v])=>ids.has(id)&&typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v))),secrets:[...new Set((Array.isArray(j?.secrets)?j.secrets:[]).filter(id=>Object.hasOwn(SECRETS,id)))],mutations:[...new Set((Array.isArray(j?.mutations)?j.mutations:[]).filter(id=>['hive','conductor','mire'].includes(id)))]};}
export const journal=p=>(p.meta??={}).journal??=normalizeJournal();
export const achievementById=id=>ACHIEVEMENTS.find(a=>a.id===id||a.aliases?.includes(id));
export const achievementDone=(p,a)=>p.achievements.includes(a.id)||a.aliases?.some(id=>p.achievements.includes(id))||false;
export const achievementArt=a=>a.art||'/assets/ui/achievements/'+a.id.replace(':','-')+'-v1.jpg';
export function achievementProgress(s,p,a){const j=journal(p),active=!a.mode||s.mode===a.mode||a.isSurvivalExpansion&&a.scope==='lifetime',state=s.profile===p?s:{...s,profile:p};return a.conditions.map(c=>Math.min(c.goal,Math.max(0,Math.floor(active?c.read(state,j):0))));}
export function trackAchievements(s){
 if(!s?.profile||!s.body)return false;
 const p=s.profile,j=journal(p);let changed=trackSurvivalState(s);changed=trackChassisCapacity(s,stats(s).capacity)||changed;
 s.achievementBaseline??=[...p.achievements];
 for(const n of nodes(s))if(SECRETS[n.type]&&completed(n)&&!j.secrets.includes(n.type)){j.secrets.push(n.type);changed=true;}
 for(const m of mutationView(s))if(m.active&&!j.mutations.includes(m.id)){j.mutations.push(m.id);changed=true;}
 for(const a of ACHIEVEMENTS){
  const values=achievementProgress(s,p,a),previous=j.best[a.id]||[],score=v=>v.reduce((sum,n,i)=>sum+n/a.conditions[i].goal,0);
  if(score(values)>score(previous)){j.best[a.id]=values;changed=true;}
  if((a.isNew||a.isSurvivalExpansion&&s.mode==='survival')&&!achievementDone(p,a)&&values.every((n,i)=>n>=a.conditions[i].goal)){
   p.achievements.push(a.id);
   if(a.reward.tokens)p.meta.rerolls=(p.meta.rerolls||0)+a.reward.tokens;
   for(const key of a.reward.keys||[])if(!p.unlocked.includes(key)){
    // First discoveries use the level's base loot rank, without consuming combat RNG.
    p.unlocked.push(key);const part=createPart(s,key,lootTier(s.level,()=>.5));
    part.rarity=CATALOG[key].rare?'relic':'common';delete part.affix;
    part.affixes=rollAffixes(part,seededRandom((s.seed??0)^Math.imul(part.id,2654435761)));
    s.ground.push({id:++s.entityId,part,x:s.player.x+1,y:s.player.y??0,z:s.player.z});
   }
   const reward=a.reward.tokens?'+1 жетон':a.reward.keys.map(key=>CATALOG[key].name).join(', ');
   s.events.push({type:'unlock',text:`Достижение: ${a.name} · ${reward}`});changed=true;
  }
  if(achievementDone(p,a)&&!s.achievementBaseline.some(id=>id===a.id||a.aliases?.includes(id))&&!j.dates[a.id]){j.dates[a.id]=new Date().toISOString().slice(0,10);changed=true;}
 }
 if(changed)s.events.push({type:'profile-progress'});
 return changed;
}
export const earnedThisRun=s=>ACHIEVEMENTS.filter(a=>achievementDone(s.profile,a)&&s.achievementBaseline&&!s.achievementBaseline.some(id=>id===a.id||a.aliases?.includes(id)));

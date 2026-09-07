import {SHIELD_RECHARGE_SECONDS,REGEN_INTERVAL_SECONDS} from '../health-tuning.js';
import {partAffixes,affixBonus,rollAffixes,affixDescriptions} from './affixes.js';
export {partAffixes,affixBonus,rollAffixes,affixDescriptions} from './affixes.js';
import {CATALOG} from '../../catalog.js';

export const RARITIES={common:'Обычная',uncommon:'Необычная',rare:'Редкая',relic:'Легендарная'};
export const SETS={
 wanderer:{name:'Разведчик',body:'body-worker',head:'head-worker',two:'Кружочки опыта начинают притягиваться к вам с расстояния на 15% дальше. Это не увеличивает количество опыта и не влияет на подбор деталей.',three:'Двигайтесь непрерывно 3 секунды. После этого оружие с магазином перезаряжается на 10% быстрее, пока вы продолжаете двигаться, и ещё 1 секунду после остановки.'},
 hunter:{name:'Ловчий',body:'body-scout',head:'head-optic',two:'Дальние атаки достают на 10% дальше.',three:'Попадите дальней атакой по врагу, который находится дальше 8 метров от вас. Это попадание нанесёт на 10% больше урона. Расстояние проверяется в момент попадания; бонус не усиливает вторичные эффекты.'},
 bastion:{name:'Бастион',body:'body-heavy',head:'head-sentinel',two:'Установленные ноги весят на 15% меньше. Ноги в инвентаре сохраняют обычный вес.',three:'Установленный щитовой орган восстанавливается на 10% быстрее. Сам комплект не создаёт щит — для этого нужен щитовой орган.'},
 chimera:{name:'Химера',body:'body-jade',head:'head-mandible',two:'Атаки ближнего боя достают на 10% дальше.',three:'Чередуйте попадания: сначала ближняя атака, затем дальняя — или наоборот. Между ними должно пройти не больше 2 секунд. Второе попадание наносит на 12% больше урона. Бонус срабатывает не чаще одного раза в секунду. Например: удар когтями → попадание пулемётом. Попадать можно по разным врагам; вторичные эффекты не учитываются.'},
 rootwalker:{name:'Корнеход',body:'body-seed',head:'head-crown',two:'Установленные органы весят на 10% меньше. Органы в инвентаре сохраняют обычный вес.',three:'Если у вас есть регенерация, её базовый интервал сокращается с 15 до 10 секунд. Потеря здоровья запускает отсчёт заново. Сам комплект не даёт регенерацию; бонусы ног и органов могут дополнительно сократить интервал.'},
 hecaton:{name:'Гекатон',body:'body-pod',head:'head-knight',two:'Оружие с магазином перезаряжается на 8% быстрее.',three:'Попадите атаками трёх разных рук в течение 2 секунд. Попадание, завершающее эту тройку, наносит на 12% больше урона. Затем тройку нужно собрать заново. Бонус срабатывает не чаще одного раза в 2 секунды. Враги могут быть разными; вторичные эффекты не учитываются.'},
 reactor:{name:'Реактор',body:'body-heavy',head:'head-sentinel',two:'Дополнительного бонуса за 2 типа частей нет.',three:'Дополнительного бонуса за 3 типа частей нет.'},
};
export const SET_LEGS={wanderer:'leg-worker',hunter:'leg-jumper',bastion:'leg-guard',chimera:'leg-climber',rootwalker:'leg-root',hecaton:'leg-walker'};
export const LOOT_RULES={normalChance:.015,normalPity:80,qualityPity:8,bossPity:5,relicAt:480,weights:{normal:[75,20,4.8,.2],elite:[35,45,19,1],boss:[0,0,90,10]}};
const clock=s=>s.time+(s.isaac?.extraTime||0);
const setKeys=Object.keys(SETS),rareKeys=Object.keys(CATALOG).filter(k=>CATALOG[k].rare);
const native={harpoon:'hunter',mirrorGland:'bastion',spring:'wanderer',seed:'wanderer',universal:'wanderer',claws:'chimera',acid:'chimera',digestion:'chimera',needle:'hunter',runner:'hunter',stabilizer:'hunter',hammer:'bastion',plated:'bastion',root:'rootwalker',shield:'bastion',regen:'rootwalker',fangs:'rootwalker',whip:'rootwalker',arc:'hecaton',rocket:'hecaton',accelerator:'hecaton'};
export function partMeta(p){const setId=SETS[p.setId]?p.setId:SETS[p.key]?p.key:native[p.key]||'hecaton';return{setId,rarity:RARITIES[p.rarity]?p.rarity:CATALOG[p.key]?.rare?'relic':'common'};}
export function initializePart(p,rng){Object.assign(p,partMeta(p));if(rng&&!p.affixes&&!p.affix)p.affixes=rollAffixes(p,rng);if(CATALOG[p.key]?.kind==='body')p.visualId??=SETS[p.setId].body;return p;}
export const equipped=s=>[s.body,...(s.arms||[]),...(s.legs||[]),...(s.organs||[])].filter(Boolean);
export function setCounts(s){const groups={};for(const p of equipped(s)){const id=partMeta(p).setId;(groups[id]??=new Set()).add(CATALOG[p.key].kind);}return Object.fromEntries(Object.entries(groups).map(([id,g])=>[id,g.size]));}
export function setBonuses(s){const c=setCounts(s),on=(id,n)=>c[id]>=n;return{pickup:on('wanderer',2)?.15:0,range:on('hunter',2)?.1:0,reach:on('chimera',2)?.1:0,legWeight:on('bastion',2)?.85:1,organWeight:on('rootwalker',2)?.9:1,shieldDelay:SHIELD_RECHARGE_SECONDS*(on('bastion',3)?.9:1),regenDelay:REGEN_INTERVAL_SECONDS-(on('rootwalker',3)?5:0),reload:Math.min(.15,(on('hecaton',2)?.08:0)+(on('wanderer',3)&&((s.abilities?.moving||0)>=3||(s.setMovingUntil||0)>clock(s))?.1:0))};}
export function reloadDuration(s,p,base){return base/(1+setBonuses(s).reload+affixBonus(p,'reload'));}
export function hitSetMultiplier(s,e,w){
 if(w.secondary)return 1;const counts=setCounts(s),now=clock(s),a=s.setCombat??={lastMode:null,lastAt:-Infinity,chimeraAt:0,hands:{},hecatonAt:0};let bonus=0;
 const melee=['sector','area','contact'].includes(w.mode),mode=melee?'melee':'ranged';
 if(counts.hunter>=3&&!melee&&Math.hypot(e.x-s.player.x,e.z-s.player.z)>8)bonus+=.1;
 if(counts.chimera>=3&&a.lastMode&&a.lastMode!==mode&&now-a.lastAt<=2&&now>=a.chimeraAt){bonus+=.12;a.chimeraAt=now+1;}
 a.lastMode=mode;a.lastAt=now;
 if(w.partId&&counts.hecaton>=3){a.hands=Object.fromEntries(Object.entries(a.hands).filter(([,t])=>now-t<=2));a.hands[w.partId]=now;if(Object.keys(a.hands).length>=3&&now>=a.hecatonAt){bonus+=.12;a.hecatonAt=now+2;a.hands={};}}
 return 1+bonus;
}
const state=s=>s.lootState??={normalMisses:0,qualityMisses:0,bossMisses:0,duplicates:0};
export function normalDrop(s){const l=state(s);if(++l.normalMisses>=LOOT_RULES.normalPity||s.rng()<LOOT_RULES.normalChance){l.normalMisses=0;return true;}return false;}
function weighted(values,weights,rng){let n=rng()*weights.reduce((a,b)=>a+b,0);for(let i=0;i<values.length;i++){n-=weights[i];if(n<0)return values[i];}return values.at(-1);}
export function rollRarity(s,source='normal'){
 const l=state(s),weights=[...(LOOT_RULES.weights[source]||LOOT_RULES.weights.normal)];if(s.time<480){weights[2]+=weights[3];weights[3]=0;}
 if(source==='boss'&&l.bossMisses>=4&&s.time>=480)return'relic';
 let r=weighted(Object.keys(RARITIES),weights,s.rng);if(l.qualityMisses>=7&&['common','uncommon'].includes(r))r='rare';return r;
}
const fingerprint=p=>JSON.stringify([p.key,partMeta(p).setId,p.tier,partMeta(p).rarity,partAffixes(p)]);
export function recordReward(s,p,source='normal'){
 const l=state(s);l.qualityMisses=['common','uncommon'].includes(partMeta(p).rarity)?l.qualityMisses+1:0;
 if(p.rarity==='relic')l.bossMisses=0;else if(source==='boss')l.bossMisses++;
 l.duplicates=[...equipped(s),...s.inventory].some(q=>q!==p&&fingerprint(q)===fingerprint(p))?l.duplicates+1:0;
}
export function generateLoot(s,createPart,tier,source='normal',quality=null,commit=true,exclude=[]){
 const rarity=quality||rollRarity(s,source),all=[...new Set([...s.profile.unlocked.filter(k=>CATALOG[k]&&!CATALOG[k].rare),'returnNerve','slime','parasite'])];
 let pool=rarity==='relic'?[...new Set([...all,...rareKeys])]:all;
 const ownedKeys=[...equipped(s),...s.inventory].map(p=>p.key),avoidKeys=[...exclude,...(state(s).duplicates>=4?ownedKeys:[])],novel=pool.filter(k=>!avoidKeys.includes(k));if(novel.length)pool=novel;
 const counts=setCounts(s),active=Object.keys(counts),preferred=active.length&&s.rng()<.3?active[Math.floor(s.rng()*active.length)]:null;
 const available=['arm','leg','organ','body'].filter(kind=>pool.some(k=>CATALOG[k].kind===kind)),weights={arm:40,leg:25,organ:20,body:15};
 const kind=weighted(available,available.map(k=>weights[k]),s.rng);pool=pool.filter(k=>CATALOG[k].kind===kind);
 const owned=[...equipped(s),...s.inventory].map(p=>p.key),avoid=[...exclude,...(state(s).duplicates>=4?owned:[])],different=pool.filter(k=>!avoid.includes(k));if(different.length)pool=different;
 const key=pool[Math.floor(s.rng()*pool.length)],p=createPart(s,key,tier);p.rarity=rarity;
 p.setId=kind==='body'?key:preferred||setKeys[Math.floor(s.rng()*setKeys.length)];if(kind==='body')p.visualId=SETS[p.setId].body;
 p.affixes=rollAffixes(p,s.rng);delete p.affix;
 if(commit)recordReward(s,p,source);return p;
}
export function queueBossReward(s,createPart,tier){const rarity=rollRarity(s,'boss'),options=[];for(let i=0;i<3;i++)options.push(generateLoot(s,createPart,tier,'boss',rarity,false,options.map(p=>p.key)));(s.bossRewards??=[]).push({id:++s.entityId,rarity,options});}
export function chooseBossReward(s,index){const r=s.bossRewards?.[0];if(!r||!Number.isInteger(index)||!r.options[index])return false;const p=r.options[index];recordReward(s,p,'boss');s.inventory.push(p);s.bossRewards.shift();if(!s.profile.unlocked.includes(p.key))s.profile.unlocked.push(p.key);return true;}
export function partTraitLines(p){const m=partMeta(p);return [`${RARITIES[m.rarity]} · ${SETS[m.setId].name}`,...affixDescriptions(p)];}
export const partTraits=p=>partTraitLines(p).join(' · ');

import {combatTime} from './mutations.js';
import {SUPPORT_BODIES} from './chassis-unlocks.js';
import {HERO_HP_PER_SEGMENT} from './health-scale.js';

const EMPTY_BONUSES=Object.freeze({speed:0,rate:0,organ:0,damage:0,rangedDamage:0,periodicDamage:0,hp:0,familyReload:0,healthDamage:0,speedDamage:0});
export const BODY_DAMAGE_BONUS_CAP=1;
export const capBodyDamageBonus=value=>Math.min(BODY_DAMAGE_BONUS_CAP,Math.max(0,value||0));
/** The Gardener converts every metre per second above a walking pace, capped at +100%. */
export const SPEED_RUSH_FLOOR=8,SPEED_RUSH_STEP=.05;
export const speedRushBonus=(s,speed)=>capBodyDamageBonus(bodyBonuses(s).speedDamage*Math.max(0,speed-SPEED_RUSH_FLOOR));
/** Each kill refreshes the Reactor's three-second damage streak. */
export const KILL_RAMP_STEP=.01,KILL_RAMP_RESET=3;
export const killRampStacks=s=>s?.body?.key==='reactor'&&s.killRamp&&combatTime(s)<s.killRamp.until?Math.min(1/KILL_RAMP_STEP,s.killRamp.stacks):0;
export function recordKillRamp(s){
 if(s?.body?.key!=='reactor')return;
 s.killRamp={stacks:killRampStacks(s)+1,until:combatTime(s)+KILL_RAMP_RESET};
}
export const killRampBonus=s=>KILL_RAMP_STEP*killRampStacks(s);
/** The Highrigger ramps crit with every shot and drops the whole stack after a short silence. */
export const CRIT_RAMP_STEP=.03,CRIT_RAMP_RESET=2;
export function recordCritRamp(s,now){
 if(s?.body?.key!=='hunter'||!bodyTraitState(s).active)return;
 const ramp=s.critRamp??={stacks:0,until:0};
 ramp.stacks=now>ramp.until?1:ramp.stacks+1;
 ramp.until=now+CRIT_RAMP_RESET;
}
export const critRampStacks=(s,now)=>s?.body?.key==='hunter'&&s.critRamp&&now<=s.critRamp.until?s.critRamp.stacks:0;

export const BODY_TRAITS=Object.freeze({
 ...Object.fromEntries(Object.entries(SUPPORT_BODIES).map(([key,d])=>[key,{condition:({demolition:'Включены Бур и Инъектор',regulator:'Включён Сучкорез и изучена Кристаллизация',sentinel:'Установлен Щит',assembler:'Включены два Сварочника'})[key],effect:d.trait,description:d.trait,required:key==='sentinel'?1:2}])),
 reactor:{condition:'Установлен Кожух',effect:'Кожух выдерживает 2 попадания до восстановления',description:'Каждое убийство повышает урон всего оружия на 1%, максимум до +100%. Через 3 с без убийств бонус сбрасывается. Установлен Кожух: он выдерживает 2 попадания до восстановления.',required:1,group:'organs'},
 wanderer:{condition:'Установлен Скороход',effect:'скорость движения +20%, а урон и скорость атаки +5% за каждый 1 м/с свыше 8 м/с, максимум +100%',description:'Установлен Скороход: скорость движения +20%, а урон и скорость атаки +5% за каждый 1 м/с свыше 8 м/с, максимум +100%.',required:1,group:'legs'},
 hunter:{condition:'Установлены 2 Маркера',effect:'каждая атака повышает шанс и урон крита на 3%, максимум до +100%; пауза в 2 с сбрасывает разгон',required:2,group:'arms'},
 bastion:{condition:'Установлены 4 органа',effect:'эффективность всех органов +30%, кроме Компостера',required:4,group:'organs'},
 chimera:{condition:'В запасе не меньше 50 биомассы',effect:'весь периодический урон +10% за каждые 50 биомассы, максимум +50%',description:'Мойка: весь периодический урон +10% за каждые 50 биомассы в запасе, максимум +50%. Действует на горение, кислоту, урон Охладителя и горящий след.',required:50},
 rootwalker:{condition:'Установлены 4 ноги',effect:'урон всего оружия +5% за каждые 25 максимального HP, максимум +100%',required:4,group:'legs'},
 hecaton:{condition:'Установлены 2 Тяжеловоза',effect:'время перезарядки Сеялки, Рассеивателя, Маркера и Скребков сокращается на 26%',required:2,group:'legs'},
 broodmother:{condition:'Включён Опылитель',effect:'создаёт постоянных неуязвимых дронов со всеми усилениями роя',required:1},
});

/** Item 12: the Repair Kit no longer patches plates. It amplifies whatever the
 * chassis trait already grants: +20% at rank I, +10 points per further rank, and
 * +2 points per installed upgrade. The two strongest installed kits stack.
 * Deliberately independent of organEffect, so the Mason's own organ bonus cannot
 * feed back into itself. */
export const TRAIT_BOOST_BASE=.2,TRAIT_BOOST_RANK=.1,TRAIT_BOOST_UPGRADE=.02;
export const traitBoostShare=p=>p?.key!=='repairGland'?0:
 TRAIT_BOOST_BASE+TRAIT_BOOST_RANK*(Math.max(1,Math.min(5,Math.floor(p.tier??1)))-1)+TRAIT_BOOST_UPGRADE*Math.max(0,p.upgrades?.traitBoost||0);
export const chassisTraitBoost=s=>(s?.organs||[])
 .filter(p=>p?.key==='repairGland')
 .sort((a,b)=>traitBoostShare(b)-traitBoostShare(a))
 .slice(0,2)
 .reduce((sum,p)=>sum+traitBoostShare(p),0);
const boosted=(bonuses,boost)=>{
 if(!boost)return bonuses;
 const out={...bonuses};
 for(const [key,value] of Object.entries(out))if(typeof value==='number'&&value!==0)out[key]=value*(1+boost);
 return out;
};
const countInstalled=(s,group)=>(s?.[group]||[]).filter(Boolean).length;
const DEFENSIVE_ORGANS=new Set(['shield']);
/** Chassis traits that read one specific part key rather than a filled slot count. */
const TRAIT_LEG_KEYS={wanderer:'runner',hecaton:'plated'};
const countLegKey=(s,key)=>(s?.legs||[]).filter(p=>p?.key===key).length;
const countArmKey=(s,key)=>(s?.arms||[]).filter(p=>p?.key===key).length;
export const defensiveOrganHitCapacity=(s,p)=>s?.body?.key==='reactor'&&DEFENSIVE_ORGANS.has(p?.key)?2:1;
const broodDroneCount=p=>Math.max(1,Math.min(5,Math.floor(p?.tier??1)));
export const broodCompanionCount=(s,p=s?.body)=>Math.floor(broodDroneCount(p)*(1+chassisTraitBoost(s))+1e-9);
const broodDroneAmount=count=>count===1?'одного постоянного неуязвимого дрона':count<5?`${count} постоянных неуязвимых дрона`:`${count} постоянных неуязвимых дронов`;

export function bodyTraitState(s,p=s?.body){
 const key=p?.key,trait=BODY_TRAITS[key];
 if(!trait)return{key,active:false,current:0,required:0,condition:'',effect:'',description:'',status:''};
 const installed=p===s?.body;
 let current=trait.group?countInstalled(s,trait.group):0,active=false,status='';
 if(installed&&Object.hasOwn(SUPPORT_BODIES,key)){
  const installedArms=(s.arms||[]).filter(Boolean),arms=installedArms.filter(p=>!p.disabled),has=key=>arms.some(p=>p.key===key);
  if(key==='demolition')current=Number(has('drill'))+Number(has('needle'));
  if(key==='regulator')current=Number(has('whip'))+Number((s.abilities?.levels?.['cold.3']||0)>0);
  if(key==='assembler')current=arms.filter(p=>p.key==='arc').length;
  if(key==='sentinel'){current=installedArms.filter(p=>p.key==='shieldArm').length;active=current>=trait.required;}
  else active=current>=trait.required;
  status=`${active?'Активно':'Неактивно'} · ${trait.condition}`;
 }else if(installed&&key==='wanderer'){
  current=countLegKey(s,TRAIT_LEG_KEYS.wanderer);
  const speedActive=current>=trait.required;
  active=speedActive;
  status=`${speedActive?'Активно':'Неактивно'} · ${current} из ${trait.required} Скорохода`;
  return{key,active,current,required:trait.required,condition:trait.condition,effect:trait.effect,description:trait.description,status,speedActive};
 }else if(installed&&key==='hecaton'){
  current=countLegKey(s,TRAIT_LEG_KEYS.hecaton);active=current>=trait.required;
  status=`${active?'Активно':'Неактивно'} · ${current} из ${trait.required} Тяжеловоза`;
 }else if(installed&&key==='reactor'){
  current=(s.organs||[]).filter(p=>DEFENSIVE_ORGANS.has(p?.key)).length;active=current>=trait.required;
  status=`Урон: +${Math.round(killRampBonus(s)*100)}% за ${killRampStacks(s)} убийств · Кожух: ${active?'Активно':'Неактивно'} · ${current} из ${trait.required}`;
 }else if(installed&&key==='hunter'){
  current=countArmKey(s,'pistol');active=current>=trait.required;
  status=`${active?'Активно':'Неактивно'} · ${current} из ${trait.required} Маркеров`;
 }else if(installed&&key==='chimera'){
  current=Math.max(0,s.biomass||0);active=current>=trait.required;
  status=`${active?'Активно':'Неактивно'} · биомасса ${Math.floor(current)} · периодический урон +${Math.min(50,Math.floor(current/50)*10)}%`;
 }else if(installed&&key==='broodmother'){
  current=(s.arms||[]).filter(part=>part?.key==='drone'&&!part.disabled).length;active=current>=trait.required;
  status=`${active?'Активно':'Неактивно'} · ${trait.condition}`;
 }else if(installed){
  active=current>=trait.required;status=`${active?'Активно':'Неактивно'} · ${current} из ${trait.required}`;
 }
 return{key,active,current,required:trait.required,condition:trait.condition,effect:trait.effect,description:trait.description??`${trait.condition}: ${trait.effect}.`,status};
}

export function bodyBonuses(s){
 const state=bodyTraitState(s),boost=chassisTraitBoost(s);
 if(state.key==='reactor')return boosted({...EMPTY_BONUSES,damage:killRampBonus(s)},boost);
 if(state.key==='wanderer')return boosted({...EMPTY_BONUSES,speed:state.speedActive?.2:0,speedDamage:state.speedActive?SPEED_RUSH_STEP:0},boost);
 if(!state.active)return{...EMPTY_BONUSES};
 switch(state.key){
  case'bastion':return boosted({...EMPTY_BONUSES,organ:.3},boost);
  case'chimera':return {...EMPTY_BONUSES,periodicDamage:Math.min(.5,Math.floor(Math.max(0,s.biomass||0)/50)*.1*(1+boost))};
  case'rootwalker':return boosted({...EMPTY_BONUSES,healthDamage:.05},boost);
  case'hecaton':return boosted({...EMPTY_BONUSES,familyReload:.35},boost);
  default:return Object.hasOwn(SUPPORT_BODIES,state.key)?boosted({...EMPTY_BONUSES,abilityPower:1},boost):{...EMPTY_BONUSES};
 }
}

/** The Mason's organ boost skips the Composter so recycling stays on its own curve. */
export const ORGAN_EFFECT_EXEMPT=new Set(['digestion']);
export const organEffect=(s,key)=>ORGAN_EFFECT_EXEMPT.has(key)?1:1+bodyBonuses(s).organ;
const HECATON_RELOAD_KEYS=new Set(['seed','shotgun','pistol','claws']);
/** Reload speed granted by the body: only the Mechanic hurries its own weapon family. */
export const bodyReloadBonus=(s,p)=>HECATON_RELOAD_KEYS.has(p?.key)?bodyBonuses(s).familyReload:0;
export const bodyDamageBonus=(s,st={})=>{
 const bonus=bodyBonuses(s);
 return capBodyDamageBonus((bonus.damage||0)+(bonus.rangedDamage||0)+(bonus.healthDamage||0)*Math.max(0,st.healthDamageBasis??(st.hp||0)/HERO_HP_PER_SEGMENT)+speedRushBonus(s,st.speed||0));
};
export const periodicDamageBonus=s=>bodyBonuses(s).periodicDamage||0;
export const bodyTraitDescription=(p,s=null)=>{
 return p?.key==='broodmother'?Number.isFinite(p.tier)?`Включённый Опылитель создаёт ${broodDroneAmount(broodCompanionCount(s,p))}. ${broodCompanionCount(s,p)===1?'Дрон получает':'Дроны получают'} все усиления роя.`:'Включённый Опылитель создаёт постоянных неуязвимых дронов. Они получают все усиления роя.':bodyTraitState(null,p).description;
};
export const bodyTraitStatus=(s,p=s?.body)=>bodyTraitState(s,p).status;

/** Soul shows the amplified trait, not the unmodified catalog rule. */
export function effectiveBodyTraitDescription(s,p=s.body,tuning=null){
 const multiplier=1+chassisTraitBoost(s);
 const percent=value=>Number((value*100).toFixed(2)).toString().replace('.',',');
 if(p.key==='wanderer'){
  const bonuses={speed:.2*multiplier,speedDamage:SPEED_RUSH_STEP*multiplier};
  return `${BODY_TRAITS.wanderer.condition}: скорость движения +${percent(bonuses.speed)}%, а урон и скорость атаки +${percent(bonuses.speedDamage)}% за каждый 1 м/с свыше ${SPEED_RUSH_FLOOR} м/с.`;
 }
 if(p.key==='chimera')return `Мойка: периодический урон +${percent(periodicDamageBonus(s))}% при ${Math.floor(Math.max(0,s.biomass||0))} биомассы в запасе. За каждые 50 биомассы +${percent(.1*multiplier)}%, максимум +50%. Действует на горение, кислоту, урон Охладителя и горящий след.`;
 if(tuning){
  if(p.key==='demolition')return `Бур и Инъектор включают ауру снижения брони на ${percent(tuning.armorReduction)}%. Итоговая броня врага не опускается ниже −20% от исходной. Радиус притяжения опыта увеличивает радиус и силу ауры; выход переработки биомассы усиливает снижение брони. Складывается с игнорированием брони Бура.`;
  if(p.key==='regulator')return `Сучкорез и изученная Кристаллизация включают замораживающий импульс раз в 6 секунд. Замораживает врагов, включая боссов, и останавливает вражеские снаряды на ${Number(tuning.freezeDuration.toFixed(2)).toString().replace('.',',')} с. Ранг Кристаллизации увеличивает длительность, радиус притяжения опыта — область действия.`;
  if(p.key==='sentinel')return `Установленный Щит создаёт вокруг корпуса три круга, отражающих вражеские снаряды. Урон отражённого выстрела — ${percent(tuning.reflectionScale)}% урона сильнейшей руки. Броня усиливает отражение.`;
  if(p.key==='assembler')return `Каждый из двух Сварочников создаёт электрическую башню после каждой десятой основной атаки. При текущей грузоподъёмности — ${tuning.towerLimit} башни с ${tuning.towerHp} HP. Урон башни — ${percent(.3*tuning.damageBoost)}% урона сильнейшего Сварочника плюс урон Опылителей. Урон и скорость роя усиливают атаки башен.`;
 }
 const description=bodyTraitDescription(p,s);
 if(['reactor','hunter','bastion','chimera','rootwalker','hecaton'].includes(p.key))
  return description.replace(/(\d+(?:[.,]\d+)?)%/g,(_,value)=>`${percent(Number(value.replace(',','.'))/100*multiplier)}%`).replace(/максимум( до)? \+[\d,]+%/g,(_,to='')=>`максимум${to} +100%`);
 return description;
}

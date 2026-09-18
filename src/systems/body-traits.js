import {isMelee,isRangedHand} from './hand-compatibility.js';

const EMPTY_BONUSES=Object.freeze({speed:0,rate:0,organ:0,damage:0,rangedDamage:0,hp:0,familyReload:0,healthDamage:0,speedDamage:0});
/** The Gardener only converts movement above a walking pace, and the conversion tops out at double output. */
export const SPEED_RUSH_FLOOR=8,SPEED_RUSH_STEP=.08,SPEED_RUSH_CAP=1;
export const speedRushBonus=(s,speed)=>Math.min(SPEED_RUSH_CAP,bodyBonuses(s).speedDamage*Math.max(0,speed-SPEED_RUSH_FLOOR));
/** The Reactor converts kills into weapon damage, one point each, and stops at double output. */
export const KILL_RAMP_STEP=.01,KILL_RAMP_CAP=1;
export const killRampBonus=s=>s?.body?.key==='reactor'?Math.min(KILL_RAMP_CAP,KILL_RAMP_STEP*Math.max(0,Math.floor(s.kills||0))):0;
/** The Highrigger ramps crit with every shot and drops the whole stack after a short silence. */
export const CRIT_RAMP_STEP=.03,CRIT_RAMP_MAX=10,CRIT_RAMP_RESET=2;
export function recordCritRamp(s,now){
 if(s?.body?.key!=='hunter'||!bodyTraitState(s).active)return;
 const ramp=s.critRamp??={stacks:0,until:0};
 ramp.stacks=now>ramp.until?1:Math.min(CRIT_RAMP_MAX,ramp.stacks+1);
 ramp.until=now+CRIT_RAMP_RESET;
}
export const critRampStacks=(s,now)=>s?.body?.key==='hunter'&&s.critRamp&&now<=s.critRamp.until?s.critRamp.stacks:0;

export const BODY_TRAITS=Object.freeze({
 reactor:{condition:'Установлен Кожух',effect:'Кожух выдерживает 2 попадания до восстановления',description:'Каждое убийство повышает урон всего оружия на 1%, до +100%. Установлен Кожух: он выдерживает 2 попадания до восстановления.',required:1,group:'organs'},
 wanderer:{condition:'Установлен Скороход',effect:'скорость движения +20%, а урон и скорость атаки +8% за каждый 1 м/с свыше 8 м/с',required:1,group:'legs'},
 hunter:{condition:'Установлены 3 единицы оружия',effect:'каждая атака повышает шанс и урон крита на 3%, до +30%; пауза в 2 с сбрасывает разгон',required:3,group:'arms'},
 bastion:{condition:'Установлены 4 органа',effect:'эффективность всех органов +30%, кроме Компостера',required:4,group:'organs'},
 chimera:{condition:'Установлены 4 единицы оружия, включая ближний бой и снаряды',effect:'урон всего оружия +25%',required:4,group:'arms'},
 rootwalker:{condition:'Установлены 4 ноги',effect:'урон всего оружия +5% за каждую ячейку максимального здоровья',required:4,group:'legs'},
 hecaton:{condition:'Установлены 2 Тяжеловоза',effect:'скорость перезарядки Сеялки, Рассеивателя, Маркера и Скребков +35%',required:2,group:'legs'},
 broodmother:{condition:'Установлено и включено оружие «Опылитель»',effect:'создаёт постоянных неуязвимых дронов; они атакуют самостоятельно и получают усиления роя',required:1},
});

/** Item 12: the Repair Kit no longer patches plates. It amplifies whatever the
 * chassis trait already grants: +30% at rank I, +10 points per further rank, and
 * +2 points per installed upgrade. Several kits stack. Deliberately independent of
 * organEffect, so the Mason's own organ bonus cannot feed back into itself. */
export const TRAIT_BOOST_BASE=.3,TRAIT_BOOST_RANK=.1,TRAIT_BOOST_UPGRADE=.02;
export const traitBoostShare=p=>p?.key!=='repairGland'?0:
 TRAIT_BOOST_BASE+TRAIT_BOOST_RANK*(Math.max(1,Math.min(5,Math.floor(p.tier??1)))-1)+TRAIT_BOOST_UPGRADE*Math.max(0,Math.min(20,p.upgrades?.traitBoost||0));
export const chassisTraitBoost=s=>(s?.organs||[]).reduce((sum,p)=>sum+traitBoostShare(p),0);
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
export const defensiveOrganHitCapacity=(s,p)=>s?.body?.key==='reactor'&&DEFENSIVE_ORGANS.has(p?.key)?2:1;
const broodDroneCount=p=>Math.max(1,Math.min(5,Math.floor(p?.tier??1)));
const broodDroneAmount=count=>count===1?'одного постоянного неуязвимого дрона':count<5?`${count} постоянных неуязвимых дрона`:`${count} постоянных неуязвимых дронов`;

export function bodyTraitState(s,p=s?.body){
 const key=p?.key,trait=BODY_TRAITS[key];
 if(!trait)return{key,active:false,current:0,required:0,condition:'',effect:'',description:'',status:''};
 const installed=p===s?.body;
 let current=trait.group?countInstalled(s,trait.group):0,active=false,status='';
 if(installed&&key==='wanderer'){
  current=countLegKey(s,TRAIT_LEG_KEYS.wanderer);
  const speedActive=current>=trait.required;
  active=speedActive;
  status=`Скорость: ${speedActive?'Активно':'Неактивно'} · ${current} из ${trait.required} Скорохода · Уклонение: всегда активно`;
  return{key,active,current,required:trait.required,condition:trait.condition,effect:trait.effect,description:`Уклонение +20% без условий. ${trait.condition}: скорость движения +20%, а урон и скорость атаки +8% за каждый 1 м/с скорости свыше 8 м/с, но не больше +100%.`,status,speedActive,dodgeActive:true};
 }else if(installed&&key==='hecaton'){
  current=countLegKey(s,TRAIT_LEG_KEYS.hecaton);active=current>=trait.required;
  status=`${active?'Активно':'Неактивно'} · ${current} из ${trait.required} Тяжеловоза`;
 }else if(installed&&key==='reactor'){
  current=(s.organs||[]).filter(p=>DEFENSIVE_ORGANS.has(p?.key)).length;active=current>=trait.required;
  status=`Урон: +${Math.round(killRampBonus(s)*100)}% за ${Math.max(0,Math.floor(s.kills||0))} убийств · Кожух: ${active?'Активно':'Неактивно'} · ${current} из ${trait.required}`;
 }else if(installed&&key==='chimera'){
  const arms=(s.arms||[]).filter(Boolean),melee=arms.some(isMelee),ranged=arms.some(isRangedHand);
  active=current>=trait.required&&melee&&ranged;
  status=active?`Активно · ${current} из ${trait.required}`:current>=trait.required?`Неактивно · ${current} из ${trait.required} · нужны ближний бой и снаряды`:`Неактивно · ${current} из ${trait.required}`;
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
 if(state.key==='wanderer')return boosted({...EMPTY_BONUSES,speed:state.speedActive?.2:0,speedDamage:state.speedActive?SPEED_RUSH_STEP:0,dodge:.2},boost);
 if(!state.active)return{...EMPTY_BONUSES};
 switch(state.key){
  case'bastion':return boosted({...EMPTY_BONUSES,organ:.3},boost);
  case'chimera':return boosted({...EMPTY_BONUSES,damage:.25},boost);
  case'rootwalker':return boosted({...EMPTY_BONUSES,healthDamage:.05},boost);
  case'hecaton':return boosted({...EMPTY_BONUSES,familyReload:.35},boost);
  default:return{...EMPTY_BONUSES};
 }
}

/** The Mason's organ boost skips the Composter so recycling stays on its own curve. */
export const ORGAN_EFFECT_EXEMPT=new Set(['digestion']);
export const organEffect=(s,key)=>ORGAN_EFFECT_EXEMPT.has(key)?1:1+bodyBonuses(s).organ;
const HECATON_RELOAD_KEYS=new Set(['seed','shotgun','pistol','claws']);
/** Reload speed granted by the body: only the Mechanic hurries its own weapon family. */
export const bodyReloadBonus=(s,p)=>HECATON_RELOAD_KEYS.has(p?.key)?bodyBonuses(s).familyReload:0;
export const bodyTraitDescription=p=>p?.key==='broodmother'?`Требуется установленное и включённое оружие «Опылитель». ${Number.isFinite(p.tier)?`Создаёт ${broodDroneAmount(broodDroneCount(p))}. ${broodDroneCount(p)===1?'Дрон атакует самостоятельно и получает':'Дроны атакуют самостоятельно и получают'} усиления роя.`:'Создаёт постоянных неуязвимых дронов. Они атакуют самостоятельно и получают усиления роя.'}`:bodyTraitState(null,p).description;
export const bodyTraitStatus=(s,p=s?.body)=>bodyTraitState(s,p).status;

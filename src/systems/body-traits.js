import {CATALOG} from '../catalog.js';

const MELEE_MODES=new Set(['sector','area','contact']);
const EMPTY_BONUSES=Object.freeze({speed:0,rate:0,organ:0,damage:0,rangedDamage:0,hp:0});

export const BODY_TRAITS=Object.freeze({
 reactor:{condition:'15 убийств',effect:'скорость атак всех рук +30% на 6 с; затем 15 с охлаждения',required:15},
 wanderer:{condition:'Установлены 2 ноги',effect:'скорость движения +20%; все доступные слоты органов заполнены: уклонение +20%.',required:2,group:'legs'},
 hunter:{condition:'Установлены 3 руки',effect:'дальний урон рук +20%',required:3,group:'arms'},
 bastion:{condition:'Установлены 4 органа',effect:'эффективность всех органов +30%',required:4,group:'organs'},
 chimera:{condition:'Установлены 4 руки, включая ближнюю и дальнюю',effect:'урон всех рук +25%',required:4,group:'arms'},
 rootwalker:{condition:'Установлены 4 ноги',effect:'максимальное здоровье +2',required:4,group:'legs'},
 hecaton:{condition:'Установлены 4 руки',effect:'скорость атак всех рук +20%',required:4,group:'arms'},
 broodmother:{condition:'Корпус установлен',effect:'создаёт постоянных неуязвимых дронов; они атакуют самостоятельно и получают усиления роя',required:0},
});

const countInstalled=(s,group)=>(s?.[group]||[]).filter(Boolean).length;
const now=s=>(s?.time||0)+(s?.isaac?.extraTime||0);
const broodDroneCount=p=>Math.max(1,Math.min(5,Math.floor(p?.tier??1)));
const broodDroneAmount=count=>count===1?'одного постоянного неуязвимого дрона':count<5?`${count} постоянных неуязвимых дрона`:`${count} постоянных неуязвимых дронов`;

export function bodyTraitState(s,p=s?.body){
 const key=p?.key,trait=BODY_TRAITS[key];
 if(!trait)return{key,active:false,current:0,required:0,condition:'',effect:'',description:'',status:''};
 const installed=p===s?.body;
 let current=trait.group?countInstalled(s,trait.group):0,active=false,status='';
 if(installed&&key==='wanderer'){
  const organsRequired=(s.organs||[]).length,organsCurrent=countInstalled(s,'organs'),speedActive=current>=trait.required,dodgeActive=organsRequired>0&&organsCurrent===organsRequired;
  active=speedActive||dodgeActive;
  status=`Скорость: ${speedActive?'Активно':'Неактивно'} · ${current}/${trait.required} ног · Уклонение: ${dodgeActive?'Активно':'Неактивно'} · ${organsCurrent}/${organsRequired} органов`;
  return{key,active,current,required:trait.required,condition:trait.condition,effect:trait.effect,description:`${trait.condition}: скорость движения +20%. Все доступные слоты органов заполнены: уклонение +20%.`,status,speedActive,dodgeActive,organsCurrent,organsRequired};
 }else if(installed&&key==='reactor'){
  const extra=s.extraParts||{},time=now(s),remaining=Math.max(0,(extra.reactorUntil||0)-time),cooldown=Math.max(0,(extra.reactorReadyAt||0)-time);
  current=Math.min(trait.required,extra.reactorCharge||0);active=remaining>0;
  status=active?`Активно · перегрузка ${Number(remaining.toFixed(1))} с`:cooldown>0?`Неактивно · охлаждение ${Number(cooldown.toFixed(1))} с`:`Неактивно · ${current}/${trait.required} убийств`;
 }else if(installed&&key==='chimera'){
  const arms=(s.arms||[]).filter(Boolean),melee=arms.some(part=>MELEE_MODES.has(CATALOG[part.key]?.mode)),ranged=arms.some(part=>!MELEE_MODES.has(CATALOG[part.key]?.mode));
  active=current>=trait.required&&melee&&ranged;
  status=active?`Активно · ${current}/${trait.required}`:current>=trait.required?`Неактивно · ${current}/${trait.required} · нужны ближняя и дальняя руки`:`Неактивно · ${current}/${trait.required}`;
 }else if(installed&&key==='broodmother'){
  current=broodDroneCount(p);active=true;
 }else if(installed){
  active=current>=trait.required;status=`${active?'Активно':'Неактивно'} · ${current}/${trait.required}`;
 }
 return{key,active,current,required:trait.required,condition:trait.condition,effect:trait.effect,description:`${trait.condition}: ${trait.effect}.`,status};
}

export function bodyBonuses(s){
 const state=bodyTraitState(s);
 if(state.key==='wanderer')return{...EMPTY_BONUSES,speed:state.speedActive?.2:0,dodge:state.dodgeActive?.2:0};
 if(!state.active)return{...EMPTY_BONUSES};
 switch(state.key){
  case'reactor':return{...EMPTY_BONUSES,rate:.3};
  case'hunter':return{...EMPTY_BONUSES,rangedDamage:.2};
  case'bastion':return{...EMPTY_BONUSES,organ:.3};
  case'chimera':return{...EMPTY_BONUSES,damage:.25};
  case'rootwalker':return{...EMPTY_BONUSES,hp:2};
  case'hecaton':return{...EMPTY_BONUSES,rate:.2};
  default:return{...EMPTY_BONUSES};
 }
}

export const organEffect=s=>1+bodyBonuses(s).organ;
export const bodyTraitDescription=p=>p?.key==='broodmother'?(Number.isFinite(p.tier)?`Создаёт ${broodDroneAmount(broodDroneCount(p))}. ${broodDroneCount(p)===1?'Дрон атакует самостоятельно и получает':'Дроны атакуют самостоятельно и получают'} усиления роя.`:'Создаёт постоянных неуязвимых дронов. Они атакуют самостоятельно и получают усиления роя.'):bodyTraitState(null,p).description;
export const bodyTraitStatus=(s,p=s?.body)=>bodyTraitState(s,p).status;

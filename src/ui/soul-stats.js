import {digestionMultiplier,stackedReturnNerveDamage,slimeSlowdown} from '../assembly.js';
import {modifiers} from '../systems/abilities.js';
import {healthView} from '../systems/health.js';
import {shieldArmReduction} from '../systems/shield-arm.js';
import {summonTuning} from '../systems/symbionts.js';
import {setBonuses} from '../systems/sets/bonuses.js';
import {soulEffectGroups} from './soul-effect-stats.js';
import {bodyBonuses,bodyDamageBonus,speedRushBonus} from '../systems/body-traits.js';
import {loadoutDps} from './adapters.js';

const statNumber=(value,digits=1)=>Number(Number(value).toFixed(digits)).toString().replace('.',',');
const statPercent=(value,digits=1)=>`${statNumber(value*100,digits)}%`;
const statSigned=value=>`${value<0?'−':'+'}${statPercent(Math.abs(value))}`;
const seconds=value=>`${statNumber(value,2)} с`;
// Shared bonuses belong here; weapon base stats and local upgrades stay in the item inspector.
export function soulStatGroups(s,st){
 const health=healthView(s,st.hp,st.armor,st),buff=modifiers(s),sets=setBonuses(s),bodyBonus=bodyBonuses(s);
 const commonDamage=(buff.damage||0)+bodyDamageBonus(s,st);
 const swarm=summonTuning(s,buff),revivesUsed=s.health?.abilityRevivesUsed||0;
 const present=(label,value,active)=>active?[label,value]:null;
 const percent=(label,value)=>present(label,statSigned(value),Math.abs(value)>1e-9&&statNumber(Math.abs(value)*100)!=='0');
 const group=(title,rows)=>({title,rows:rows.filter(Boolean)});
 const runner=s.legs.some(p=>p?.key==='runner'),activeArm=keys=>s.arms.some(p=>p&&!p.disabled&&keys.includes(p.key));
 const bodyReload=activeArm(['seed','shotgun','pistol','claws'])?bodyBonus.familyReload:0;
 return [
  group('Защита и восстановление',[
   present('Здоровье',`${statNumber(s.hp)}/${statNumber(st.hp)}`,st.hp>0),
   present('Броня',`${statNumber(health.armor)}/${statNumber(st.armor)}`,st.armor>0),
   present('Щит',`${health.shieldCharges}/${health.shieldMax}`,health.shieldMax>0),
   percent('Защита от снарядов',shieldArmReduction(s)),percent('Уклонение',st.dodge),
   present('Регенерация',`${statPercent(st.regenPerSecond)}/с`,st.regenPerSecond>0),
   present('Ремонт брони',`${statPercent(st.armorRepairPerSecond||0)} брони/с`,st.armorRepairPerSecond>0),
   present('Возрождения',String(s.consumables?.revivalCharges||0),s.consumables?.revivalCharges>0),
   present('Вторая жизнь',`${Math.max(0,st.revive-revivesUsed)}/${st.revive}`,st.revive>0),
  ]),
  group('Движение',[
   present('Скорость',`${statNumber(st.speed)} м/с`,st.speed>0),
   present('Вес / лимит',`${statNumber(st.weight,0)}/${statNumber(st.capacity,0)}`,st.capacity>0),
   percent('Замедление от веса',1-st.loadFactor),
  ]),
  group('Оружие',[
   present('Общий урон в сек',statNumber(loadoutDps(s,st)),s.arms.some(p=>p&&!p.disabled)),
   percent('Общий урон',commonDamage),
   percent('Ближний урон',(buff.meleeDamage||0)+sets.meleeDamage+(runner&&activeArm(['claws'])?.1:0)),
   percent('Дальний урон',(buff.rangedDamage||0)+bodyBonus.rangedDamage+sets.rangedDamage+(runner&&activeArm(['shotgun','pistol'])?.1:0)),
   percent('Скорость атаки',(buff.rate||0)+st.rate+speedRushBonus(s,st.speed)),
   percent('Перезарядка',1-Math.max(.2,1-(buff.weaponReload||0))*Math.max(.2,1-st.reloadReduction)/(1+sets.reload+bodyReload)),
   present('Базовый крит',statPercent(.05+(buff.crit||0)),true),
   percent('Ближний крит',buff.meleeCrit||0),percent('Дальний крит',buff.rangedCrit||0),
   present('Множитель крита',`×${statNumber(1.5+(buff.critPower||0),2)}`,true),
   percent('Ближняя дальность',(buff.reach||0)+(buff.meleeReach||0)+sets.reach),
   percent('Дальняя дальность',(buff.range||0)+(buff.rangedReach||0)+sets.range),
   present('Доп. снаряды',String(buff.extra||0),buff.extra>0),
   present('Осколки при убийстве','3',buff.splinter),
   percent('Урон снарядов',Math.max(.2,1+(buff.projectileDamage||0))-1),
   percent('Скорость снарядов',st.projectile*(1+(buff.velocity||0))-1),
   present('Пробивание','+1 цель',buff.pierce),
   present('Рикошеты',String((buff.ricochet?1:0)+(buff.ricochetTargets||0)),buff.ricochet),
   percent('Урон рикошета',buff.ricochet?(buff.ricochetDamage ? .7+buff.ricochetDamage : .5):0),
   present('Наведение рикошета','По раненым',buff.ricochetHunter),
   percent('Добивание рикошетом',buff.ricochetFinisher||0),
  ]),
  ...soulEffectGroups(buff,s),
  group('Рой',[
   present('Помощники',String(swarm.count),swarm.count>0),
   percent('Урон роя',swarm.damage-1),percent('Скорость атаки роя',swarm.rate-1),
   percent('Урон боссам',swarm.bossDamage-1),
   present('Повторные укусы',String(buff.swarmHits||1),buff.swarm),
   present('Споровый выводок',`1 / ${Math.max(1,6-(buff.sporeBroodRank||1))} попаданий`,buff.sporeBrood),
  ]),
  group('Органы',[
   percent('Сила органов',st.organEffect-1),
   percent('Возвратный урон',stackedReturnNerveDamage(s)),
   percent('Замедление слизью',Math.min(.4,s.organs.filter(p=>p?.key==='slime').reduce((sum,p)=>sum+slimeSlowdown(p),0)*st.organEffect)),
   present('Импульс сердца',statPercent(s.organs.filter(p=>p?.key==='reverseHeart').reduce((sum,p)=>sum+2+Math.max(0,Math.min(4,(p.tier??1)-1))*.2+(p.upgrades.heartDamage||0)*.2,0)*st.organEffect),s.organs.some(p=>p?.key==='reverseHeart')),
  ]),
  group('Ресурсы',[
   percent('Биомасса',s.organs.some(p=>p?.key==='digestion')?digestionMultiplier(s)-1:0),
   percent('Бонус опыта',buff.xpGain||0),
   percent('Подбор',st.pickup/7-1),
  ]),
 ].filter(g=>g.rows.length);
}
export function soulStatColumns(s,st){
 const groups=soulStatGroups(s,st),bodyGroups=new Set(['Защита и восстановление','Движение','Органы','Ресурсы']);
 return [
  {title:'Тело',groups:groups.filter(g=>bodyGroups.has(g.title))},
  {title:'Бой',groups:groups.filter(g=>!bodyGroups.has(g.title))},
 ];
}

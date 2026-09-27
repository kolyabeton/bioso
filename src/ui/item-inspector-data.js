import {chassisDescription} from '../systems/support-chassis.js';
import {reverseStomachHealth} from '../systems/reverse-stomach.js';
import {heroHealthPoints} from '../systems/health-scale.js';
import {resonanceBonus,stabilizerPartReduction} from '../systems/organ-upgrades.js';
import {continuousRecoveryRate} from '../assembly.js';
import {bodyTraitDescription,chassisTraitBoost} from '../systems/body-traits.js';
import {summonPartBonus} from '../systems/summon-equipment.js';
import {organEffect} from '../systems/body-traits.js';
import {organCapacity,slotCount} from '../systems/body-slots.js';
import {describePart,formatUiNumber,partPropertyRows,weaponChargeLabel} from './adapters.js';
import {digestionTierFactor,def,weight,capacity,bodyHealth,weaponStats,stats,addBonus,tierFactor,upgradeOptions,upgradePrice,armorPlateCapacity,installed,upgrade,legArmor,legHealth,legSpeed,returnNerveDamage,parasiteLarvaDamage,coolerDamageFraction,commonNerveVolleyMultiplier,reverseHeartDamageMultiplier} from '../assembly.js';
import {STAT_LABELS,ROMAN,BODY_BASE_BONUSES} from '../catalog.js';
import {partTraitLines,reloadDuration,affixBonus,SETS,partMeta,setCounts} from '../systems/sets-loot.js';
import {shieldRechargeDelay} from '../systems/health.js';

const row=(label,value,wide=false)=>({label,value,...(wide?{wide:true}:{})});
function bodyBonusRow(key){
 const bonus=BODY_BASE_BONUSES[key];if(!bonus)return null;
 const percent=value=>`${formatUiNumber(value*100,0)}%`;
 if(bonus.dodge)return row('Уклонение',`+${percent(bonus.dodge)}`);
 if(bonus.shieldRechargeRate)return row('Восстановление Кожуха',`+${percent(bonus.shieldRechargeRate)}`);
 if(bonus.critDamage)return row('Критический урон',`+${percent(bonus.critDamage)}`);
 if(bonus.xpGain)return row('Получаемый опыт',`+${percent(bonus.xpGain)}`);
 if(bonus.acidDuration)return row('Длительность кислотных луж',`+${percent(bonus.acidDuration)}`);
 if(bonus.regenPerSecond)return row('Восстановление здоровья',`${percent(bonus.regenPerSecond)}/с`);
 if(bonus.frozenDamage)return row('Урон по замороженным врагам',`+${percent(bonus.frozenDamage)}`);
 if(bonus.attackSpeedReloadStep)return row('Время перезарядки оружия',`−${percent(bonus.attackSpeedReloadStep)} за каждые +${percent(bonus.attackSpeedReloadStep)} скорости атаки`);
 return null;
}
function values(s,p){
 const d=def(p),w=d.kind==='arm'?weaponStats(s,p):null;
return {stomachHealth:`+${heroHealthPoints(reverseStomachHealth(p))} HP`,resonance:`+${formatUiNumber(resonanceBonus(s)*100,1)}%`,sensorDodge:`${formatUiNumber(stats(s).dodge*100,1)}%`,regenRate:`${formatUiNumber(stats(s).regenPerSecond*100,1)}%/с`,repairRate:`${formatUiNumber(Math.max(.5,stats(s).armorRepairDelay))} с`,traitBoost:`+${formatUiNumber(chassisTraitBoost(s)*100,0)}%`,plateCapacity:`${formatUiNumber(stats(s).armorRepairPerSecond*100,1)}%/с`,summonRate:`+${formatUiNumber(summonPartBonus(p,'summonRate')*100,1)}%`,summonDamage:`+${formatUiNumber(summonPartBonus(p,'summonDamage')*100,1)}%`,returnDamage:`${formatUiNumber(returnNerveDamage(s,p)*100,1)}%`,larvaDamage:formatUiNumber(parasiteLarvaDamage(s,p)),slimeSlow:`${formatUiNumber(coolerDamageFraction(p)*organEffect(s)*100,1)}%`,commonVolley:`+${formatUiNumber((commonNerveVolleyMultiplier(s,p)-1)*100,1)}%`,heartDamage:`${formatUiNumber(reverseHeartDamageMultiplier(s,p)*100,1)}%`,shieldRecharge:`${formatUiNumber(shieldRechargeDelay(s,p))} с`,damage:formatUiNumber(p.key==='shieldArm'?w?.auraDps||0:w?.damage||0,1),rate:w?`${formatUiNumber(w.interval)} с`:null,crit:w?`${formatUiNumber(w.crit*100,0)}%`:null,critPower:w?`×${formatUiNumber(w.critPower)}`:null,hp:String(stats(s).hp),armor:d.kind==='leg'?`+${formatUiNumber(legArmor(p))} дел.`:stats(s).armor?formatUiNumber(stats(s).armor)+' пластин':'Нет',regen:d.kind==='leg'?`${formatUiNumber(continuousRecoveryRate(p,'regen')*100,1)}%/с`:`${formatUiNumber(continuousRecoveryRate(p,'regenRate')*organEffect(s)*100,1)}%/с`,capacity:stats(s).capacity.toFixed(0),speed:`${formatUiNumber(d.kind==='leg'?legSpeed(p):0)} м/с`,power:`×${formatUiNumber((p.key==='digestion'?digestionTierFactor(p):tierFactor(p))*(1+addBonus(p,'power'))*organEffect(s,p.key))}`};
}
export function itemInspectorData(s,p,selected){
 const info=describePart(s,p),d=def(p),isInstalled=installed(s).includes(p),options=isInstalled?upgradeOptions(p,s):[],stat=options.includes(selected)?selected:options[0];
 info.cost=upgradePrice(s,p,stat);
 const current=values(s,p),rows=[];
 const armorAffix=affixBonus(p,'armor');
 const armor=(d.kind==='leg'?legArmor(p):p.key==='armor'?armorPlateCapacity(p,organEffect(s)):(d.armor||0)/20*(1+addBonus(p,'armor')))+(p.modifier==='armored'?1:0)+armorAffix;
 const intrinsicArmor=armor-armorAffix;
 // Row names, ordering and formatting are fixed by docs/UI_ITEM_CONTRACT.md.
 if(d.kind==='arm'){const w=weaponStats(s,p);if(p.key==='shieldArm')rows.push(row('Урон ауры',`${current.damage}/с`));else rows.push(row('Урон',current.damage),row('Интервал атак',current.rate),row('Дальность',`${formatUiNumber(w.range,1)} м`),...(p.key==='drone'?[]:[row('Крит',`${current.crit} · ${current.critPower}`)]));if(w.magazine)rows.push(row(weaponChargeLabel(w),`${p.ammo??w.magazine} из ${w.magazine}`),row('Время перезарядки',`${formatUiNumber(reloadDuration(s,p,w.reload))} с`));for(const [label,value] of partPropertyRows(p,s))rows.push(row(label,value,value.length>30));}
 if(d.kind==='body'){rows.push(row('Здоровье корпуса',`${heroHealthPoints(bodyHealth(p))} HP`));if(intrinsicArmor)rows.push(row('Броня детали',`${formatUiNumber(intrinsicArmor)} пласт.`));rows.push(row('Вместимость',formatUiNumber(isInstalled?stats(s).capacity:capacity(p),0)),row('Крепления',`Рук: ${d.arms} · ног: ${d.legs} · органов: ${isInstalled?slotCount(s,p,'organs'):organCapacity(p)}`));if(d.baseSpeedBonus)rows.push(row('Бонус скорости',`+${formatUiNumber(d.baseSpeedBonus,0)} м/с`));const bonusRow=bodyBonusRow(p.key);if(bonusRow)rows.push(bonusRow);}
 if(d.kind==='leg'){rows.push(row('Скорость движения',current.speed));if(legHealth(p)>0)rows.push(row('Здоровье детали',`+${heroHealthPoints(legHealth(p))} HP`));if(intrinsicArmor)rows.push(row('Броня детали',`${formatUiNumber(intrinsicArmor)} пласт.`));if(d.regen)rows.push(row('Регенерация',current.regen));for(const [label,value] of partPropertyRows(p))rows.push(row(label,value,value.length>30));}
 if(d.kind==='organ'){if(p.key==='reverseStomach')rows.push(row('Здоровье детали',current.stomachHealth));if(intrinsicArmor)rows.push(row('Броня детали',`${formatUiNumber(intrinsicArmor)} пласт.`));for(const [i,line] of (p.key==='reverseStomach'?info.lines.slice(1):info.lines).entries()){const prefix=i&&['Бонус корпуса'].find(label=>line.startsWith(label+':'));rows.push(row(i?(prefix||'Свойство'):'Эффект',prefix?line.slice(prefix.length+1).trim():line,true));}}
 rows.push(row('Вес',weight(p).toFixed(0)));
 let preview=null;
 if(stat){
  const copy=structuredClone(p),next={...s,setsV2:s.setsV2?structuredClone(s.setsV2):undefined,abilities:structuredClone(s.abilities),body:s.body===p?copy:s.body,arms:s.arms.map(q=>q===p?copy:q),legs:s.legs.map(q=>q===p?copy:q),organs:s.organs.map(q=>q===p?copy:q),health:s.health?structuredClone(s.health):s.health};
  upgrade(next,p.id,stat);
  const after=values(next,copy);
  const organLabel={digestion:'Выход биомассы',stabilizer:'Сокращение времени перезарядки',accelerator:'Скорость атак'}[p.key];
  const organValue=q=>`${formatUiNumber(p.key==='stabilizer'?stabilizerPartReduction(s,q)*100:15*tierFactor(q)*(1+addBonus(q,'power'))*organEffect(s),1)}%`;
  preview={label:p.key==='shieldArm'&&stat==='damage'?'Урон ауры':stat==='power'?organLabel:stat==='speed'?'Скорость движения':STAT_LABELS[stat],before:p.key==='shieldArm'&&stat==='damage'?`${current.damage}/с`:stat==='power'&&p.key!=='digestion'?organValue(p):current[stat],after:p.key==='shieldArm'&&stat==='damage'?`${after.damage}/с`:stat==='power'&&p.key!=='digestion'?organValue(copy):after[stat]};
  if(stat==='speed'){preview.before=preview.before.replace(' м/с','');preview.after=preview.after.replace(' м/с','');}
  if(stat==='armor'&&d.kind==='leg'){preview.label='Броня, дел.';preview.before=preview.before.replace(' дел.','');preview.after=preview.after.replace(' дел.','');}
 }
 const lines=partTraitLines(p);
 if(d.kind==='body')lines.push(chassisDescription(s,p));
 const setId=partMeta(p).setId;
 return {key:p.key,name:info.name,subtitle:`${info.kind} · ${info.tier}${p.modifier?' · '+info.modifier:''}`,rows,lines,setBonus:setId?{id:setId,count:setCounts(s)[setId]||0}:null,preview,options:options.map(key=>({key,label:p.key==='shieldArm'&&key==='damage'?'Урон ауры':STAT_LABELS[key]})),selected:stat,rank:info.rank,maxRank:info.maxRank,biomass:s.biomass,actionLabel:isInstalled&&stat?(info.cost===0?'Улучшить бесплатно':'Улучшить · '+info.cost):undefined,disabled:isInstalled&&(!stat||s.biomass<info.cost),notice:isInstalled?(!stat?(upgradeOptions(p).length?'Достигнут предел сборки':upgradeOptions({...p,upgrades:{}}).length?'Все доступные улучшения получены':''):s.biomass<info.cost?`Не хватает ${info.cost-s.biomass} биомассы`:''):''};
}

// Catalog entries describe a base part, not an equipped instance or a random drop.
export function catalogInspectorData(s,key,tier=1){
 const p={key,tier,modifier:null,upgrades:{},spent:0,affixes:[]};
 const {name,rows,lines,setBonus}=itemInspectorData(s,p);
 const catalogLines=key==='chimera'?lines.map(line=>line.startsWith('Мойка:')?bodyTraitDescription(p):line):lines;
 return {key,name,subtitle:`${ROMAN[tier]} · с бонусами сборки`,rows,lines:catalogLines,setBonus};
}

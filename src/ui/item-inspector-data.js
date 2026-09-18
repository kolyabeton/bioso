import {resonanceBonus} from '../systems/organ-upgrades.js';
import {continuousRecoveryRate} from '../assembly.js';
import {chassisTraitBoost} from '../systems/body-traits.js';
import {summonPartBonus} from '../systems/summon-equipment.js';
import {bodyTraitDescription,organEffect} from '../systems/body-traits.js';
import {organCapacity,slotCount} from '../systems/body-slots.js';
import {describePart,formatUiNumber,partPropertyRows,weaponChargeLabel} from './adapters.js';
import {def,weight,capacity,bodyHealth,weaponStats,stats,addBonus,tierFactor,upgradeOptions,armorPlateCapacity,installed,upgrade,regenerationDelay,legArmor,legHealth,legSpeed,returnNerveDamage,parasiteLarvaDamage,slimeSlowdown,commonNerveVolleyMultiplier,reverseHeartDamageMultiplier} from '../assembly.js';
import {STAT_LABELS,ROMAN} from '../catalog.js';
import {partTraitLines,reloadDuration,affixBonus,SETS,partMeta,setCounts} from '../systems/sets-loot.js';
import {shieldRechargeDelay} from '../systems/health.js';

const row=(label,value,wide=false)=>({label,value,...(wide?{wide:true}:{})});
function values(s,p){
 const d=def(p),w=d.kind==='arm'?weaponStats(s,p):null;
 return {resonance:`+${formatUiNumber(resonanceBonus(s)*100,1)}%`,sensorDodge:`${formatUiNumber(stats(s).dodge*100,1)}%`,regenRate:`${formatUiNumber(regenerationDelay(s,p))} с`,repairRate:`${formatUiNumber(Math.max(.5,stats(s).armorRepairDelay))} с`,traitBoost:`+${formatUiNumber(chassisTraitBoost(s)*100,0)}%`,plateCapacity:`${formatUiNumber(stats(s).armor)} пласт.`,summonRate:`+${formatUiNumber(summonPartBonus(p,'summonRate')*100,1)}%`,summonDamage:`+${formatUiNumber(summonPartBonus(p,'summonDamage')*100,1)}%`,returnDamage:`${formatUiNumber(returnNerveDamage(s,p)*100,1)}%`,larvaDamage:formatUiNumber(parasiteLarvaDamage(s,p)),slimeSlow:`−${formatUiNumber(slimeSlowdown(p)*100,1)}%`,commonVolley:`${formatUiNumber(commonNerveVolleyMultiplier(s,p)*100,1)}%`,heartDamage:`${formatUiNumber(reverseHeartDamageMultiplier(s,p)*100,1)}%`,shieldRecharge:`${formatUiNumber(shieldRechargeDelay(s,p))} с`,damage:formatUiNumber(w?.damage||0,1),rate:w?`${formatUiNumber(w.interval)} с`:null,crit:w?`${formatUiNumber(w.crit*100,0)}%`:null,critPower:w?`×${formatUiNumber(w.critPower)}`:null,hp:String(stats(s).hp),armor:d.kind==='leg'?`+${formatUiNumber(legArmor(p))} дел.`:stats(s).armor?formatUiNumber(stats(s).armor)+' пластин':'Нет',regen:d.kind==='leg'?`${formatUiNumber(continuousRecoveryRate(p,'regen')*100,1)}% здоровья/с`:`${formatUiNumber(regenerationDelay(s,p))} с`,capacity:stats(s).capacity.toFixed(0),speed:`${formatUiNumber(d.kind==='leg'?legSpeed(p):0)} м/с`,power:`×${formatUiNumber(tierFactor(p)*(1+addBonus(p,'power'))*organEffect(s,p.key))}`};
}
export function itemInspectorData(s,p,selected){
 const info=describePart(s,p),d=def(p),isInstalled=installed(s).includes(p),options=isInstalled?upgradeOptions(p,s):[],stat=options.includes(selected)?selected:options[0];
 const current=values(s,p),rows=[];
 const armorAffix=affixBonus(p,'armor');
 const armor=(d.kind==='leg'?legArmor(p):p.key==='armor'?armorPlateCapacity(p,organEffect(s)):(d.armor||0)/20*(1+addBonus(p,'armor')))+(p.modifier==='armored'?1:0)+armorAffix;
 const intrinsicArmor=armor-armorAffix;
 if(d.kind==='arm'){const w=weaponStats(s,p);rows.unshift(row('Урон',current.damage));rows.push(row('Скорость атаки',current.rate),row('Дальность',`${formatUiNumber(w.range,1)} м`),...(p.key==='drone'?[]:[row('Крит',`${current.crit} · ${current.critPower}`)]));if(w.magazine)rows.push(row(weaponChargeLabel(w),`${p.ammo??w.magazine} из ${w.magazine}`),row('Перезарядка',`${formatUiNumber(reloadDuration(s,p,w.reload))} с`));for(const [label,value] of partPropertyRows(p))rows.push(row(label,value,value.length>30));}
 if(d.kind==='body'){rows.push(row('Здоровье корпуса',`${formatUiNumber(bodyHealth(p))} дел.`));if(intrinsicArmor)rows.push(row('Броня детали',`${formatUiNumber(intrinsicArmor)} пласт.`));rows.push(row('Вместимость',formatUiNumber(isInstalled?stats(s).capacity:capacity(p),0)),row('Крепления',`Рук: ${d.arms} · ног: ${d.legs} · органов: ${isInstalled?slotCount(s,p,'organs'):organCapacity(p)}`));}
 if(d.kind==='leg'){rows.push(row('Скорость движения',current.speed));if(legHealth(p)>0)rows.push(row('Здоровье детали',`+${formatUiNumber(legHealth(p))} HP`));if(intrinsicArmor)rows.push(row('Броня детали',`${formatUiNumber(intrinsicArmor)} пласт.`));if(d.regen)rows.push(row('Регенерация',current.regen));for(const [label,value] of partPropertyRows(p))rows.push(row(label,value,value.length>30));}
 if(d.kind==='organ'){if(intrinsicArmor)rows.push(row('Броня детали',`${formatUiNumber(intrinsicArmor)} пласт.`));for(const [i,line] of info.lines.entries()){const prefix=i&&['Бонус корпуса'].find(label=>line.startsWith(label+':'));rows.push(row(i?(prefix||'Свойство'):'Эффект',prefix?line.slice(prefix.length+1).trim():line,true));}}
 rows.push(row('Вес',weight(p).toFixed(0)));
 let preview=null;
 if(stat){
  const copy=structuredClone(p),next={...s,setsV2:s.setsV2?structuredClone(s.setsV2):undefined,abilities:structuredClone(s.abilities),body:s.body===p?copy:s.body,arms:s.arms.map(q=>q===p?copy:q),legs:s.legs.map(q=>q===p?copy:q),organs:s.organs.map(q=>q===p?copy:q),health:s.health?structuredClone(s.health):s.health};
  upgrade(next,p.id,stat);
  const after=values(next,copy);
  const organLabel={digestion:'Выход биомассы',stabilizer:'Скорость снарядов',accelerator:'Скорость атак'}[p.key];
  const organValue=q=>`${formatUiNumber((p.key==='stabilizer'?30:15)*tierFactor(q)*(1+addBonus(q,'power'))*organEffect(s),1)}%`;
  preview={label:stat==='power'?organLabel:stat==='speed'?'Скорость движения':STAT_LABELS[stat],before:stat==='power'&&p.key!=='digestion'?organValue(p):current[stat],after:stat==='power'&&p.key!=='digestion'?organValue(copy):after[stat]};
  if(stat==='speed'){preview.before=preview.before.replace(' м/с','');preview.after=preview.after.replace(' м/с','');}
  if(stat==='armor'&&d.kind==='leg'){preview.label='Броня, дел.';preview.before=preview.before.replace(' дел.','');preview.after=preview.after.replace(' дел.','');}
 }
 const lines=partTraitLines(p);
 if(d.kind==='body')lines.push(bodyTraitDescription(p));
 const setId=partMeta(p).setId;
 return {key:p.key,name:info.name,subtitle:`${info.kind} · ${info.tier}${p.modifier?' · '+info.modifier:''}`,rows,lines,setBonus:setId?{id:setId,count:setCounts(s)[setId]||0}:null,preview,options:options.map(key=>({key,label:STAT_LABELS[key]})),selected:stat,rank:info.rank,maxRank:info.maxRank,biomass:s.biomass,actionLabel:isInstalled&&stat?'Улучшить · '+info.cost:undefined,disabled:isInstalled&&(!stat||s.biomass<info.cost),notice:isInstalled?(!stat?(upgradeOptions(p).length?'Достигнут предел сборки':upgradeOptions({...p,upgrades:{}}).length?'Все доступные улучшения получены':'Не улучшается за биомассу'):s.biomass<info.cost?`Не хватает ${info.cost-s.biomass} биомассы`:''):'Улучшение доступно после установки'};
}

// Catalog entries describe a base part, not an equipped instance or a random drop.
export function catalogInspectorData(s,key,tier=1){
 const p={key,tier,modifier:null,upgrades:{},spent:0,affixes:[]};
 const {name,rows,lines,setBonus}=itemInspectorData(s,p);
 return {key,name,subtitle:`${ROMAN[tier]} · с бонусами сборки`,rows,lines,setBonus};
}

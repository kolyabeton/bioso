import {summonPartBonus} from '../systems/summon-equipment.js';
import {affectedHands} from '../systems/organs/compatibility.js';
import {bodyTraitDescription,bodyTraitStatus,organEffect} from '../systems/body-traits.js';
import {organCapacity,slotCount} from '../systems/body-slots.js';
import {describePart,partPropertyRows,weaponChargeLabel} from './adapters.js';
import {def,weight,capacity,bodyHealth,weaponStats,stats,addBonus,tierFactor,upgradeOptions,installed,upgrade,regenerationDelay,legArmor,legHealth,legSpeed,returnNerveDamage,parasiteLarvaDamage,slimeSlowdown,commonNerveVolleyMultiplier,reverseHeartDamageMultiplier} from '../assembly.js';
import {STAT_LABELS,ROMAN} from '../catalog.js';
import {partTraitLines,reloadDuration,affixBonus,SETS,partMeta,setCounts} from '../systems/sets-loot.js';
import {shieldRechargeDelay} from '../systems/health.js';

const row=(label,value,wide=false)=>({label,value,...(wide?{wide:true}:{})});
function values(s,p){
 const d=def(p),w=d.kind==='arm'?weaponStats(s,p):null;
 return {summonRate:`+${Number((summonPartBonus(p,'summonRate')*100).toFixed(1))}%`,summonDamage:`+${Number((summonPartBonus(p,'summonDamage')*100).toFixed(1))}%`,returnDamage:`${Number((returnNerveDamage(s,p)*100).toFixed(1))}%`,larvaDamage:`${Number(parasiteLarvaDamage(s,p).toFixed(2))}`,slimeSlow:`−${Number((slimeSlowdown(p)*100).toFixed(1))}%`,commonVolley:`${Number((commonNerveVolleyMultiplier(s,p)*100).toFixed(1))}%`,heartDamage:`${Number((reverseHeartDamageMultiplier(s,p)*100).toFixed(1))}%`,shieldRecharge:`${Number(shieldRechargeDelay(s,p).toFixed(2))} с`,damage:w?.damage.toFixed(1).replace(/\.0$/,''),rate:w?`${w.interval.toFixed(2)} с`:null,crit:w?`${(w.crit*100).toFixed(0)}%`:null,critPower:w?`×${w.critPower.toFixed(2)}`:null,hp:String(stats(s).hp),armor:d.kind==='leg'?`+${legArmor(p)} дел.`:stats(s).armor?stats(s).armor+' пластин':'Нет',regen:`${Number(regenerationDelay(s,p).toFixed(2))} с`,capacity:stats(s).capacity.toFixed(0),speed:`${(d.kind==='leg'?legSpeed(p):0).toFixed(2)} м/с`,power:`×${(tierFactor(p)*(1+addBonus(p,'power'))*organEffect(s)).toFixed(2)}`};
}
export function itemInspectorData(s,p,selected){
 const info=describePart(s,p),d=def(p),isInstalled=installed(s).includes(p),options=isInstalled?upgradeOptions(p):[],stat=options.includes(selected)?selected:options[0];
 const current=values(s,p),rows=[];
 const armorAffix=affixBonus(p,'armor');
 const armor=(d.kind==='leg'?legArmor(p):(d.armor||0)/20*(1+addBonus(p,'armor'))*(p.key==='armor'?organEffect(s):1))+(p.modifier==='armored'?1:0)+armorAffix;
 const intrinsicArmor=armor-armorAffix;
 if(d.kind==='arm'){const w=weaponStats(s,p);rows.unshift(row('Урон',current.damage));rows.push(row('Скорость атаки',current.rate),row('Дальность',`${w.range.toFixed(1)} м`),...(p.key==='drone'?[]:[row('Крит',`${current.crit} · ${current.critPower}`)]));if(w.magazine)rows.push(row(weaponChargeLabel(w),`${p.ammo??w.magazine} / ${w.magazine}`),row('Перезарядка',`${reloadDuration(s,p,w.reload).toFixed(2)} с`));for(const [label,value] of partPropertyRows(p))rows.push(row(label,value,value.length>30));}
 if(d.kind==='body'){rows.push(row('Здоровье корпуса',`${bodyHealth(p)} дел.`));if(intrinsicArmor)rows.push(row('Броня детали',`${Number(intrinsicArmor.toFixed(2))} пласт.`));rows.push(row('Вместимость',(isInstalled?stats(s).capacity:capacity(p)).toFixed(0)),row('Крепления',`Руки: ${d.arms} · ноги: ${d.legs} · ${isInstalled?slotCount(s,p,'organs'):organCapacity(p)} органов`));const status=isInstalled?bodyTraitStatus(s,p):'';if(status)rows.push(row('Состояние бонуса',status,true));}
 if(d.kind==='leg'){rows.push(row('Скорость ноги',current.speed));if(d.rankStat==='hp')rows.push(row('Здоровье детали',`+${String(legHealth(p)).replace('.',',')} HP`));if(intrinsicArmor)rows.push(row('Броня детали',`${Number(intrinsicArmor.toFixed(2))} пласт.`));if(d.regen)rows.push(row('Регенерация',`1 дел. / ${current.regen}`));for(const [label,value] of partPropertyRows(p))rows.push(row(label,value,value.length>30));}
 if(d.kind==='organ'){if(intrinsicArmor)rows.push(row('Броня детали',`${Number(intrinsicArmor.toFixed(2))} пласт.`));for(const [i,line] of info.lines.entries())rows.push(row(i?'Свойство':'Эффект',line,true));const names=['returnNerve','commonNerve'].includes(p.key)?affectedHands(s,p.key):null;if(names?.length)rows.push(row('Совместимость',names.join(', '),true));}
 rows.push(row('Вес',weight(p).toFixed(0)));
 let preview=null;
 if(stat){
  const copy=structuredClone(p),next={...s,setsV2:s.setsV2?structuredClone(s.setsV2):undefined,abilities:structuredClone(s.abilities),body:s.body===p?copy:s.body,arms:s.arms.map(q=>q===p?copy:q),legs:s.legs.map(q=>q===p?copy:q),organs:s.organs.map(q=>q===p?copy:q),health:s.health?structuredClone(s.health):s.health};
  upgrade(next,p.id,stat);
  const after=values(next,copy);
  const organLabel={digestion:'Выход биомассы',stabilizer:'Скорость снарядов',accelerator:'Скорость атак'}[p.key];
  const organValue=q=>`${((p.key==='stabilizer'?30:15)*tierFactor(q)*(1+addBonus(q,'power'))*organEffect(s)).toFixed(1)}%`;
  preview={label:stat==='power'?organLabel:stat==='speed'?'Скорость ноги':STAT_LABELS[stat],before:stat==='power'&&p.key!=='digestion'?organValue(p):current[stat],after:stat==='power'&&p.key!=='digestion'?organValue(copy):after[stat]};
  if(stat==='speed'){preview.before=preview.before.replace(' м/с','');preview.after=preview.after.replace(' м/с','');}
  if(stat==='armor'&&d.kind==='leg'){preview.label='Броня, дел.';preview.before=preview.before.replace(' дел.','');preview.after=preview.after.replace(' дел.','');}
 }
 const lines=partTraitLines(p);
 if(d.kind==='body')lines.push(bodyTraitDescription(p));
 return {key:p.key,name:info.name,subtitle:`${info.kind} · ${info.tier}${p.modifier?' · '+info.modifier:''}`,rows,lines,setBonus:{id:partMeta(p).setId,count:setCounts(s)[partMeta(p).setId]||0},preview,options:options.map(key=>({key,label:STAT_LABELS[key]})),selected:stat,rank:info.rank,biomass:s.biomass,actionLabel:isInstalled&&stat?'Улучшить · '+info.cost:undefined,disabled:isInstalled&&(!stat||s.biomass<info.cost),notice:isInstalled?(!stat?(upgradeOptions({...p,upgrades:{}}).length?'Все доступные улучшения получены':'Не улучшается за биомассу'):s.biomass<info.cost?`Не хватает ${info.cost-s.biomass} биомассы`:''):'Улучшение доступно после установки'};
}

// Catalog entries describe a base part, not an equipped instance or a random drop.
export function catalogInspectorData(s,key,tier=1){
 const p={key,tier,modifier:null,upgrades:{},spent:0,affixes:[]};
 const {name,rows,lines,setBonus}=itemInspectorData(s,p);
 return {key,name,subtitle:`${ROMAN[tier]} · с бонусами сборки`,rows,lines,setBonus};
}

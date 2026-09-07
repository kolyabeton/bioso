import {affectedHands} from '../systems/organs/compatibility.js';
import {bodyTraitDescription,organEffect} from '../systems/body-traits.js';
import {organCapacity,slotCount} from '../systems/body-slots.js';
import {describePart} from './adapters.js';
import {def,weight,capacity,bodyHealth,weaponStats,stats,addBonus,tierFactor,upgradeOptions,installed,upgrade,regenerationDelay,legArmor} from '../assembly.js';
import {STAT_LABELS,ROMAN} from '../catalog.js';
import {partTraitLines,reloadDuration,affixBonus} from '../systems/sets-loot.js';

const row=(label,value)=>({label,value});
function values(s,p){
 const d=def(p),w=d.kind==='arm'?weaponStats(s,p):null;
 return {damage:w?.damage.toFixed(1).replace(/\.0$/,''),rate:w?`${w.interval.toFixed(2)} с`:null,crit:w?`${(w.crit*100).toFixed(0)}%`:null,critPower:w?`×${w.critPower.toFixed(2)}`:null,hp:String(stats(s).hp),armor:d.kind==='leg'?`+${(legArmor(p)*100).toFixed(0)}%`:stats(s).armor?stats(s).armor+' пластин':'Нет',regen:`${Number(regenerationDelay(s,p).toFixed(2))} с`,capacity:stats(s).capacity.toFixed(0),speed:`${((d.speed||0)*(1+Math.min(.6,addBonus(p,'speed')+affixBonus(p,'speed')))).toFixed(2)} м/с`,power:`×${(tierFactor(p)*(1+addBonus(p,'power'))*organEffect(s)).toFixed(2)}`};
}
export function itemInspectorData(s,p,selected){
 const info=describePart(s,p),d=def(p),isInstalled=installed(s).includes(p),options=isInstalled?upgradeOptions(p):[],stat=options.includes(selected)?selected:options[0];
 const current=values(s,p),rows=[];
 const armor=(d.kind==='leg'?legArmor(p):(d.armor||0)/20*(1+addBonus(p,'armor'))*(p.key==='armor'?organEffect(s):1))+(p.modifier==='armored'?1:0)+affixBonus(p,'armor');
 if(d.kind==='arm'){const w=weaponStats(s,p);rows.unshift(row('Урон',current.damage));rows.push(row('Скорость атаки',current.rate),row('Дальность',`${w.range.toFixed(1)} м`),row('Крит',`${current.crit} · ${current.critPower}`));if(w.magazine)rows.push(row('Магазин',`${p.ammo??w.magazine} / ${w.magazine}`),row('Перезарядка',`${reloadDuration(s,p,w.reload).toFixed(2)} с`));}
 if(d.kind==='body')rows.push(row('Здоровье корпуса',`${bodyHealth(p)} дел.`),row('Броня детали',`${Number(armor.toFixed(2))} пласт.`),row('Вместимость',(isInstalled?stats(s).capacity:capacity(p)).toFixed(0)),row('Крепления',`Руки: ${d.arms} · ноги: ${d.legs} · органы: ${isInstalled?slotCount(s,p,'organs'):organCapacity(p)}`));
 if(d.kind==='leg'){rows.push(row('Скорость ноги',current.speed));if(armor)rows.push(row('Броня детали',`${Number(armor.toFixed(2))} пласт.`));if(d.regen)rows.push(row('Регенерация',`1 дел. / ${current.regen}`));}
 if(d.kind==='organ'&&armor)rows.push(row('Броня детали',`${Number(armor.toFixed(2))} пласт.`));
 rows.push(row('Вес',weight(p).toFixed(0)));
 let preview=null;
 if(stat){
  const copy=structuredClone(p),next={...s,body:s.body===p?copy:s.body,arms:s.arms.map(q=>q===p?copy:q),legs:s.legs.map(q=>q===p?copy:q),organs:s.organs.map(q=>q===p?copy:q),health:s.health?structuredClone(s.health):s.health};
  upgrade(next,p.id,stat);
  const after=values(next,copy);
  const organLabel={digestion:'Выход биомассы',stabilizer:'Скорость снарядов',accelerator:'Скорость атак'}[p.key];
  const organValue=q=>`${((p.key==='stabilizer'?30:15)*tierFactor(q)*(1+addBonus(q,'power'))*organEffect(s)).toFixed(1)}%`;
  preview={label:stat==='power'?organLabel:stat==='speed'?'Скорость ноги':STAT_LABELS[stat],before:stat==='power'&&p.key!=='digestion'?organValue(p):current[stat],after:stat==='power'&&p.key!=='digestion'?organValue(copy):after[stat]};
  if(stat==='speed'){preview.before=preview.before.replace(' м/с','');preview.after=preview.after.replace(' м/с','');}
 }
 const compatibility=['returnNerve','commonNerve','slime','parasite'].includes(p.key)?(affectedHands(s,p.key).length?'Действует на: '+affectedHands(s,p.key).join(', '):'Нет совместимого оружия · эффект не действует'):'';
 const primaryEffect=d.kind==='organ'?info.lines[0]:undefined;
 const descriptions=['arm','leg'].includes(d.kind)?[d.description]:d.kind==='body'?[bodyTraitDescription(p)]:info.lines;
 return {key:p.key,name:info.name,primaryEffect,subtitle:`${info.kind} · Ранг ${info.tier}${p.modifier?' · '+info.modifier:''}`,rows,lines:[compatibility,...descriptions,...partTraitLines(p)].filter(Boolean),preview,options:options.map(key=>({key,label:STAT_LABELS[key]})),selected:stat,rank:info.rank,biomass:s.biomass,actionLabel:isInstalled&&stat?'Улучшить · '+info.cost:undefined,disabled:isInstalled&&(!stat||s.biomass<info.cost),notice:isInstalled?(!stat?(upgradeOptions({...p,upgrades:{}}).length?'Все доступные улучшения получены':'Не улучшается за биомассу'):s.biomass<info.cost?`Не хватает ${info.cost-s.biomass} биомассы`:''):'Улучшение доступно после установки'};
}

// Catalog entries describe a base part, not an equipped instance or a random drop.
export function catalogInspectorData(s,key,tier=1){
 const p={key,tier,modifier:null,upgrades:{},spent:0,affixes:[]};
 const {name,rows,lines,primaryEffect}=itemInspectorData(s,p);
 return {key,name,subtitle:`Ранг ${ROMAN[tier]} · с бонусами сборки`,rows,lines,primaryEffect};
}

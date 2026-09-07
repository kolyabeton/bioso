import {installed,upgradeOptions,digestionYield} from '../assembly.js';
import {upgradeCost} from '../systems/balance.js';
export function firstUpgradeGuide(s){
 if(s.mode!=='survival'||s.firstPaidUpgrade||installed(s).some(p=>p.spent>0))return '';
 const stomach=p=>['digestion','outerStomach'].includes(p?.key);
 if(!s.organs.some(stomach))return s.inventory.some(stomach)?'Установите желудок в свободное крепление органа. Затем переработайте лишние детали.':s.bosses?'Подберите желудок рядом с первым побеждённым боссом.':'Первый босс оставит желудок: он превращает лишние детали в биомассу.';
 const costs=installed(s).filter(p=>upgradeOptions(p).length).map(p=>upgradeCost(Object.values(p.upgrades).reduce((a,b)=>a+b,0)));
 if(!costs.length)return '';
 const cost=Math.min(...costs);
 if(s.biomass>=cost)return `Биомассы хватает! Нажмите на установленную деталь → «Улучшить». От ${cost} биомассы.`;
 const spare=s.inventory.some(p=>digestionYield(s,p.id)>0);
 return spare?`Нажмите на лишнюю деталь в инвентаре → «Переработать». До улучшения: ${s.biomass} / ${cost}.`:`Подберите лишние детали и переработайте их в сборке. До улучшения: ${s.biomass} / ${cost}.`;
}

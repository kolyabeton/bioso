import {CATALOG} from '../../catalog.js';

export const partAffixes=p=>p.affixes?.length?p.affixes:(p.affix?[p.affix]:[]);
export const affixBonus=(p,stat)=>partAffixes(p).reduce((sum,a)=>sum+(a.stat===stat?a.value:0),0);
export function rollAffixes(p,rng){
 const count=({common:0,uncommon:1,rare:1,relic:2})[p.rarity]||0;
 const d=CATALOG[p.key],pool=['rate','armor','movement','pickup','weight'];
 if(d.kind==='arm'){pool.push('damage');if(d.magazine)pool.push('reload');}
 if(d.kind==='body')pool.push('capacity');
 const weak=p.rarity==='uncommon',result=[];
 for(let i=0;i<count;i++){
  const stat=pool.splice(Math.floor(rng()*pool.length),1)[0];
  result.push({stat,value:stat==='armor'?1:stat==='weight'?(weak?.08:.12):(weak?.05:.1)});
 }
 return result;
}
export function affixDescriptions(p){return partAffixes(p).map(a=>{
 const percent=Math.round(a.value*100)+'%';
 return ({rate:`Скорость атаки всех рук +${percent}`,armor:`Броня +${a.value}`,movement:`Скорость движения +${percent}`,pickup:`Радиус притяжения опыта +${percent}`,weight:`Вес этой детали −${percent}`,damage:`Урон этой руки +${percent}`,reload:`Скорость перезарядки этой руки +${percent}`,capacity:`Грузоподъёмность корпуса +${percent}`,speed:`Скорость этой ноги +${percent}`})[a.stat]||'';
}).filter(Boolean);}

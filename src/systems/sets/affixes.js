import {CATALOG} from '../../catalog.js';

export const partAffixes=p=>p.affixes?.length?p.affixes:(p.affix?[p.affix]:[]);
export const affixBonus=(p,stat)=>partAffixes(p).reduce((sum,a)=>sum+(a.stat===stat?a.value:0),0);
export const magazineCapacity=p=>{const base=CATALOG[p.key]?.magazine;return base?base+affixBonus(p,'magazine'):0;};
/** Affixes with their own magnitude instead of the shared 5%/10% roll. */
export const AFFIX_VALUES={weight:{weak:.2,strong:.3},capacity:{weak:.2,strong:.3}};
export function rollAffixes(p,rng){
 const count=({common:0,uncommon:1,rare:2,relic:3})[p.rarity]||0;
 const d=CATALOG[p.key],pool=['rate','armor','movement','pickup','weight'];
 if(d.kind==='arm'){pool.push('damage');if(d.magazine){pool.push('reload');if(p.rarity==='relic')pool.push('magazine');}}
 if(d.kind==='body')pool.push('capacity');
 const weak=p.rarity==='uncommon',result=[];
 for(let i=0;i<count;i++){
  const stat=pool.splice(Math.floor(rng()*pool.length),1)[0];
  const own=AFFIX_VALUES[stat];
  result.push({stat,value:stat==='armor'?1:stat==='magazine'?2:stat==='reload'&&p.rarity==='relic'?.25:own?(weak?own.weak:own.strong):(weak?.05:.1)});
 }
 return result;
}
export function affixDescriptions(p){return partAffixes(p).map(a=>{
 const percent=Math.round(a.value*100)+'%';
 return ({rate:`Скорость атак всего оружия +${percent}`,armor:`Броня +${a.value}`,movement:`Скорость движения +${percent}`,pickup:`Радиус притяжения опыта +${percent}`,weight:`Вес этой детали −${percent}`,damage:`Урон этого оружия +${percent}`,reload:`Скорость перезарядки этого оружия +${percent}`,magazine:`Заряды этого оружия +${a.value}`,capacity:`Грузоподъёмность корпуса +${percent}`,speed:`Скорость этой ноги +${percent}`})[a.stat]||'';
}).filter(Boolean);}

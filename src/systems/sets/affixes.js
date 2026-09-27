import {CATALOG} from '../../catalog.js';

export const partAffixes=p=>p.affixes?.length?p.affixes:(p.affix?[p.affix]:[]);
export const affixBonus=(p,stat)=>partAffixes(p).reduce((sum,a)=>sum+(a.stat===stat?a.value:0),0);
export const magazineCapacity=(p,bonus=0)=>{const base=CATALOG[p.key]?.magazine;return base?base+affixBonus(p,'magazine')+Math.max(0,Math.floor(bonus||0)):0;};
/** Affixes with their own magnitude instead of the shared 5%/10% roll. */
export const AFFIX_VALUES={weight:{weak:.2,strong:.3,relic:.45},capacity:{weak:.2,strong:.3,relic:.45}};
export function rollAffixes(p,rng){
 const count=({common:0,uncommon:1,rare:2,relic:3})[p.rarity]||0;
 const d=CATALOG[p.key],arm=d.kind==='arm',attacks=arm&&!['aura','summon'].includes(d.mode);
 const pool=arm?['rate','globalDamage','damage']:['rate','armor','movement','pickup','weight','maxHp','armorPct','xpGain','biomassYield','rarityWeight'];
 if(attacks)pool.push('localRate');
 if(arm&&d.magazine){pool.push('reload');if(p.rarity==='relic')pool.push('magazine');}
 if(d.kind==='body')pool.push('capacity');
 if(attacks&&count>=2){
  pool.push('burst','rangeBoost','rearAttack','woundedFury','stationaryDamage');
  if(d.knockback)pool.push('doubleKnockback');
  if(d.mode==='projectile')pool.push('homing');
  if(['projectile','rocket','acid','arc'].includes(d.mode))pool.push('closeAssault');
 }
 const weak=p.rarity==='uncommon',result=[];
 for(let i=0;i<count;i++){
  const stat=pool.splice(Math.floor(rng()*pool.length),1)[0];
  const own=AFFIX_VALUES[stat],relic=p.rarity==='relic';
  const special={doubleKnockback:2,burst:1,rangeBoost:.2,homing:1,rearAttack:1,woundedFury:.3,closeAssault:.25,stationaryDamage:.25};
  const value=stat in special?special[stat]:stat==='armor'?(relic?1.5:1):stat==='magazine'?(relic?3:2):stat==='reload'&&relic?.375:own?(relic?own.relic:weak?own.weak:own.strong):(arm&&['damage','localRate'].includes(stat)?relic?.3:weak?.1:.2:relic?.15:weak?.05:.1);
  result.push({stat,value});
 }
 return result;
}
export function affixDescriptions(p){return partAffixes(p).map(a=>{
 const percent=Math.round(a.value*100)+'%';
 const reloadReduction=Math.round(a.value/(1+a.value)*100);
 return ({rate:`Скорость атак всего оружия +${percent}`,localRate:`Скорость этого оружия +${percent}`,globalDamage:`Урон всего оружия +${percent}`,armor:`Броня +${a.value}`,movement:`Скорость движения +${percent}`,pickup:`Радиус притяжения опыта +${percent}`,weight:`Вес этой детали −${percent}`,damage:`Урон этого оружия +${percent}`,reload:`Время перезарядки этого оружия −${reloadReduction}%`,magazine:`Заряды этого оружия +${a.value}`,capacity:`Грузоподъёмность корпуса +${percent}`,speed:`Скорость этой ноги +${percent}`,maxHp:`Максимальное HP +${percent}`,armorPct:`Общий запас брони +${percent}`,xpGain:`Получаемый опыт +${percent}`,biomassYield:`Биомасса от переработки +${percent}`,rarityWeight:`Относительный шанс необычной и более редкой добычи +${percent}`,doubleKnockback:'Отталкивание этого оружия ×2',burst:'Всплеск скорости: +100% на 1 секунду; готовность 10 секунд',rangeBoost:'Дальность этого оружия +20%',homing:'Самонаводящиеся патроны',rearAttack:'Дополнительная атака назад с полным уроном',woundedFury:'Ярость раненого: при HP ниже 50% урон и скорость +30%',closeAssault:'Ближний натиск: дальность −40%, урон +25%',stationaryDamage:'Выжидание: после 3 с без движения урон этого оружия +25%. Движение сбрасывает бонус'})[a.stat]||'';
}).filter(Boolean);}

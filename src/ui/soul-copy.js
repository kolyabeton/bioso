export function soulRecoveryRows(stats){
 const rate=Number(stats.regenPerSecond)||0;
 const percent=n=>Number((n*100).toFixed(1)).toString().replace('.',',');
 return [
  ['Регенерация',rate>0?`${percent(rate)}%/с`:'Нет'],
  ...(Number(stats.armorRepairPerSecond)>0?[['Ремонт брони',`${percent(stats.armorRepairPerSecond)}% брони/с`]]:[]),
 ];
}

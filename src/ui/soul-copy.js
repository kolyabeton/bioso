export function soulRecoveryRows(stats){
 const continuous=Number(stats.regenPerSecond)||0;
 return [
  ['Регенерация',stats.regen?`+${stats.regenAmount||1} HP / ${stats.regenDelay.toFixed(1)} с${stats.regenPersistsThroughDamage?'':' без урона'}`:'Нет'],
  ...(continuous>0?[['Восстановление корней',`${Number((continuous*100).toFixed(1)).toString().replace('.',',')}% здоровья/с`]]:[]),
  ...(stats.setRegen?[['Живые ткани','+1 HP / 12 с']]:[]),
 ];
}

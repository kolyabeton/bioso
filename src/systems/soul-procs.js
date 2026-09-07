/** Presentation events only: never consume combat RNG or change proc timing. */
export const SOUL_PROCS={
 burn:['Поджог','#ffae55'],cold:['Замедление','#8ae8ff'],freeze:['Заморозка','#caf8ff'],
 spread:['Пожар','#ff8949'],thermal:['Термошок','#fff0bd'],electric:['Разряд','#98edff'],plasma:['Плазма','#ffc583'],
 critical:['Критический удар','#f5d4a4'],splinter:['Разгон осколков','#c5dbd7'],pierce:['Сквозная игла','#c0e3e6'],multishot:['Размножение','#b7dcbf'],
 echo:['Эхо атаки','#c9afff'],summon:['Спутник','#b5f9b0'],swarm:['Резонанс роя','#d9ffc5'],
 armorReady:['Панцирь готов','#e9d99f'],armor:['Броня −½','#fff0b7'],regen:['Восстановление +1','#adf8c5'],
 revive:['Вторая жизнь','#fff4c6'],running:['Разбег','#b6eedc']
};
export function soulProc(s,kind,at=s.player,extra={}){
 s.events.push({type:'soul-proc',kind,x:at.x,y:at.y??0,z:at.z,...extra});
}

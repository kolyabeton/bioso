/** Presentation events only: never consume combat RNG or change proc timing. */
export const SOUL_PROCS={
 'set-hunter':['Точный залп','#f5d4a4'],'set-hecaton':['Общий затвор','#b7dcff'],
 'set-reactor':['Разряд комплекта','#98edff'],'set-collector':['Сборщик','#b6eedc'],
 'set-bastion':['Панцирь комплекта','#e9d99f'],'set-broodmother':['Защита выводка','#d9ffc5'],
 burn:['Поджог','#ffae55'],cold:['Замедление','#8ae8ff'],freeze:['Заморозка','#caf8ff'],
 spread:['Пожар','#ff8949'],thermal:['Термошок','#fff0bd'],electric:['Разряд','#98edff'],plasma:['Плазма','#ffc583'],
 critical:['Критический удар','#f5d4a4'],splinter:['Разгон осколков','#c5dbd7'],pierce:['Сквозная игла','#c0e3e6'],ricochet:['Живой рикошет','#b9e4c5'],multishot:['Размножение','#b7dcbf'],
 echo:['Эхо атаки','#c9afff'],summon:['Спутник','#b5f9b0'],swarm:['Резонанс роя','#d9ffc5'],
 focus:['Нервный разгон','#c8ffda'],impulse:['Импульс','#b7dcff'],rupture:['Разрыв тканей','#ffd7bc'],guardian:['Стражевик','#d3fff0'],neuralweb:['Нервная сеть','#c8fbff'],
 'countershell-charge':['Ответный панцирь готов','#dfedc5'],countershell:['Ответный панцирь','#ffe6ae'],sporeplant:['Спора посажена','#c9d992'],sporebrood:['Споровый выводок','#e7b36f'],overgrowth:['Сверхпитание','#d9d98a'],cryotrail:['Криослед','#c5f5ef'],
 armorReady:['Панцирь готов','#e9d99f'],armor:['Броня −½','#fff0b7'],armorRepair:['Ремонт брони','#e9d99f'],regen:['Восстановление +1','#adf8c5'],
 revive:['Вторая жизнь','#fff4c6'],running:['Разбег','#b6eedc']
};
export function soulProc(s,kind,at=s.player,extra={}){
 s.events.push({type:'soul-proc',kind,x:at.x,y:at.y??0,z:at.z,...extra});
}

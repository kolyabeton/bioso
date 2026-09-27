const objectiveBoss=s=>s.mode==='survival'&&s.introBossId?s.enemies.find(e=>e.id===s.introBossId&&e.hp>0):null;

export function selectFirstBoss(s){
 const boss=objectiveBoss(s);
 s.missionWaypoint=boss?{id:boss.id,label:'Первый босс',source:'enemy'}:null;
 if(!s.waypoint||s.waypoint.autoObjective)s.waypoint=boss?{x:boss.x,y:boss.y??0,z:boss.z,id:boss.id,label:'Первый босс',source:'enemy',autoObjective:true}:null;
 return s;
}

export const survivalObjective=s=>s.recordMode?`Рекорд · биомасса ${Math.floor(s.biomassCollected||0).toLocaleString('ru-RU')} · ×3`:s.escapeQuest&&!s.won?`Соберите биомассу: ${Math.min(s.escapeQuest.goal,Math.floor((s.biomassCollected||0)-s.escapeQuest.startMass)).toLocaleString('ru-RU')} / ${s.escapeQuest.goal.toLocaleString('ru-RU')}`:objectiveBoss(s)?'Убейте первого босса':'';

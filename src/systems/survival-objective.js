const objectiveBoss=s=>s.mode==='survival'&&s.introBossId?s.enemies.find(e=>e.id===s.introBossId&&e.hp>0):null;

export function selectFirstBoss(s){
 const boss=objectiveBoss(s);
 s.missionWaypoint=boss?{id:boss.id,label:'Первый босс',source:'enemy'}:null;
 if(!s.waypoint||s.waypoint.autoObjective)s.waypoint=boss?{x:boss.x,y:boss.y??0,z:boss.z,id:boss.id,label:'Первый босс',source:'enemy',autoObjective:true}:null;
 return s;
}

export const survivalObjective=s=>objectiveBoss(s)?'Убейте первого босса':'';

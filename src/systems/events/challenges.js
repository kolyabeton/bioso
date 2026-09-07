import {stats} from '../../assembly.js';
import {bossEngaged} from '../territories.js';
import {EVENTS as ENCOUNTERS} from './definitions.js';
import {spatialDistance} from '../../elevation.js';
import {nearEncounter as near,availableEncounter} from './proximity.js';
export function challengeAllowed(s,n){return !!n&&ENCOUNTERS[n.type]?.kind==='challenge'&&n.state==='ready'&&availableEncounter(s,n)&&near(s,n,4)&&!s.encounters.active&&!s.dead&&!s.pending&&!s.enemies.some(bossEngaged);}
export function startChallenge(s,id,spawn){const n=s.encounters?.nodes.find(n=>n.id===id);if(!challengeAllowed(s,n))return false;
 const tier=n.challengeTier||1,count=n.type==='infection'?2+tier:n.type==='hunt'?1:6+tier*2,members=[];for(let i=0;i<count;i++){const a=i*Math.PI*2/count,p={x:n.x+Math.cos(a)*5,y:n.y,z:n.z+Math.sin(a)*5},e=spawn(['hunt','infection'].includes(n.type)?'elite':'normal',p,n.type==='infection'?'mass':i%3===0?'ranged':'mass',s.mode==='survival'?s.time:300);if(e){e.challengeId=n.id;e.hp*=1+(tier-1)*1.5;e.maxHp=e.hp;if(n.type==='infection'){e.hp*=8;e.maxHp=e.hp;e.speed=Math.min(e.speed,Math.max(1,stats(s).speed*.7));}members.push(e.id);}}
 if(!members.length)return false;
 n.state='active';n.members=members;n.elapsed=0;n.progress=0;s.encounters.active=n;if(n.type==='sealed')Object.assign(s.player,{x:n.x,y:n.y,z:n.z});return true;
}
export function containChallenge(s,old){const a=s.encounters?.active;if(a?.type!=='sealed')return;if(spatialDistance(s.player,a)>a.radius-.7)Object.assign(s.player,old);
 for(const e of s.enemies)if(e.hp>0&&e.challengeId===a.id){const d=Math.hypot(e.x-a.x,e.z-a.z),r=a.radius-e.radius;if(d>r){e.x=a.x+(e.x-a.x)/d*r;e.z=a.z+(e.z-a.z)/d*r;}}
}
export function tickChallenge(s,dt){const a=s.encounters?.active;if(!a)return;a.elapsed+=dt;const alive=a.members.some(id=>s.enemies.some(e=>e.id===id&&e.hp>0));
 if(a.type==='infection'&&spatialDistance(s.player,a)<=a.radius)a.progress=Math.min(30,a.progress+dt);
 const complete=a.type==='infection'?a.progress>=30:a.type==='sealed'?a.elapsed+1e-8>=45&&!alive:!alive&&a.elapsed<=60+1e-8;
 const failed=a.type==='hunt'&&!complete&&a.elapsed>=60;
 if(complete||failed){if(a.type==='infection')s.enemies=s.enemies.filter(e=>e.challengeId!==a.id);a.state=complete?'reward':'failed';s.encounters.active=null;s.events.push({type:'notice',text:complete?'Испытание пройдено · выберите награду':'Носитель уцелел · награда потеряна'});}
}
export function encounterStatus(s){
 const a=s.encounters?.active;if(!a)return '';
 const alive=(a.members||[]).filter(id=>s.enemies.some(e=>e.id===id&&e.hp>0)).length;
 const detail=a.type==='infection'?`${Math.floor(a.progress)} / 30 с${spatialDistance(s.player,a)>a.radius?' · пауза: вернитесь в круг':''}`:a.type==='hunt'?`${Math.max(0,Math.ceil(60-a.elapsed))} с осталось · цель ${alive?'жива':'побеждена'}`:`${Math.min(45,Math.floor(a.elapsed))} / 45 с · врагов: ${alive}`;
 return `${ENCOUNTERS[a.type].name} · ${detail}`;
}

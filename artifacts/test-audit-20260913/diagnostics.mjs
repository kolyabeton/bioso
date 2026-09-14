import {writeFile} from 'node:fs/promises';
import {createWorldRun,stepWorldRun} from '../../src/world-run.js';
import {hurtEnemy,step} from '../../src/game.js';
import {skipMissionEvent} from '../../src/mission-run.js';
import {MISSIONS} from '../../src/catalog.js';
import {autoPickup,installed} from '../../src/assembly.js';
const report={method:'Headless diagnosis of failing test assumptions, no source changes. Instantly kills test enemies; not a human or browser playthrough.',missions:[],pickup:[]};
for(const m of MISSIONS){
 const s=createWorldRun(undefined,m.id,42);s.arms=[];let children=0;
 for(let i=0;i<25;i++){
  s.player={x:0,y:0,z:-i*64+20};s.pending=0;s.xpDrops=[];step(s,0);const f=s.mission.floorsState[i];
  for(let wave=0;wave<5;wave++){const alive=s.enemies.filter(e=>f.members.includes(e.id)&&e.hp>0);if(!alive.length)break;if(wave)children+=alive.length;for(const e of alive)hurtEnemy(s,e,1e9);s.pending=0;s.xpDrops=[];step(s,0);}
  if(s.mission.event)skipMissionEvent(s,s.mission.event.nodeId);
 }
 report.missions.push({id:m.id,won:s.won,rewarded:s.mission.rewarded,descendantsMissedByOldHelper:children,achievement:s.profile.achievements.includes('mission:'+m.id)});
 const r=createWorldRun(undefined,m.id,42);stepWorldRun(r,0);const f=r.mission.floorsState[0];
 for(let wave=0;wave<5;wave++){const alive=r.enemies.filter(e=>f.members.includes(e.id)&&e.hp>0);if(!alive.length)break;for(const e of alive)hurtEnemy(r,e,1e9);r.pending=0;r.xpDrops=[];stepWorldRun(r,0);}
 const reward=r.ground.find(g=>g.missionRoomLoot);if(reward){r.player={x:reward.x,y:reward.y,z:reward.z};autoPickup(r);report.pickup.push({id:m.id,key:reward.part.key,inInventory:r.inventory.some(p=>p.id===reward.part.id),installed:installed(r).some(p=>p.id===reward.part.id),stillOnGround:r.ground.some(p=>p.id===reward.id)});}else report.pickup.push({id:m.id,error:'no reward'});
}
await writeFile('artifacts/test-audit-20260913/diagnostics.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));

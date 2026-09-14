import {stepWorldRun} from '/src/world-run.js';
import {chooseUpgrade} from '/src/game.js';
import {chooseBossReward} from '/src/systems/sets/loot.js';

export function prepare(s,params){
 s.time=119;s.health.invulnerableUntil=Infinity;
 const stop=Number(params.get('at')||170),checkpoints=[];
 const report=document.createElement('script');report.id='wave-pressure-proof';report.type='application/json';document.body.append(report);
 let started=false,frames=0,lastSample=119,peakNear=0;
 return {paused:true,tick(){
  const info=window.bioso.snapshot();
  if(info.residentTiles>0&&info.loadingTiles===0&&!info.failedModels.length)started=true;
  if(started&&s.time<stop){
   for(let i=0;i<6&&s.time<stop;i++){
    while(s.pending)chooseUpgrade(s,0);
    while(s.bossRewards?.length)chooseBossReward(s,0);
    const a=(s.time-119)/14;
    stepWorldRun(s,.05,{x:Math.cos(a),z:Math.sin(a)});
    s.events.length=0;
   }
   frames++;
  }
  const near=s.enemies.filter(e=>e.hp>0&&Math.hypot(e.x-s.player.x,e.z-s.player.z)<20).length;peakNear=Math.max(peakNear,near);
  if(s.time-lastSample>=5){checkpoints.push({time:s.time,enemies:s.enemies.length,near,kills:s.kills,spawned:s.metrics.spawned,player:{...s.player},pressure:s.waves.pressure});lastSample=s.time;}
  report.textContent=JSON.stringify({method:'Accelerated production world simulation from 1:59; protected player, normal spawn/AI/combat, automatic earned choices, circular movement. Density proof, not a difficulty playtest.',finished:s.time>=stop,time:s.time,frames,peakNear,near,checkpoints,snapshot:info});
 }};
}

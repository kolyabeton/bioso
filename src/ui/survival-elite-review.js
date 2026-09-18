import {step} from '../game.js';

/** DEV checkpoint: real map and spawner, accelerated clock, protected player. */
export function prepareSurvivalEliteReview(s){
 s.arms=s.arms.map(()=>null);s.health.invulnerableUntil=Infinity;
 const checkpoints=[];
 for(const minute of [1,2,3]){
  s.time=minute*60-.05;step(s,.05);
  const elites=s.enemies.filter(e=>e.survivalMinuteElite);
  checkpoints.push({time:s.time,count:elites.length,nextAt:s.survivalElites?.nextAt});
 }
 const elite=s.enemies.filter(e=>e.survivalMinuteElite).at(-1);
 if(elite)for(let i=0;i<16;i++){
  const angle=i*Math.PI/8,x=elite.x+Math.cos(angle)*9,z=elite.z+Math.sin(angle)*9;
  if(s.world.walkable(x,z,2.4)){Object.assign(s.player,{x,z,y:s.world.heightAt(x,z)});break;}
 }
 const report={method:'Real Survival step at accelerated minute boundaries; invulnerable player, weapons removed.',checkpoints,
  elite:elite?{id:elite.id,hp:elite.hp,home:elite.territory?.home,waveElite:!!elite.waveElite,walkable:s.world.walkable(elite.x,elite.z,elite.radius)}:null};
 const panel=document.createElement('aside');panel.id='survival-elite-review';
 panel.style.cssText='position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:120;padding:8px;background:#14211ef0;color:#dfebe4;font:12px system-ui;text-align:center';
 panel.textContent=`QA · 1:00 → ${checkpoints[0].count} · 2:00 → ${checkpoints[1].count} · 3:00 → ${checkpoints[2].count} элиты · следующая 4:00`;
 panel.dataset.proof=JSON.stringify(report);document.body.append(panel);
 return{paused:true};
}

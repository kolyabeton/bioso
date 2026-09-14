import {step,hurtEnemy} from './game.js';
/** Development-only checkpoint of the real mission route; production saves are isolated by main.js. */
export function prepareBossRuntimeReview(s){
 const m=s.mission,index=m.floors-1;m.currentFloor=index;
 for(let i=0;i<index;i++){m.floorsState[i].state='cleared';s.exploration.groups[i].state='cleared';}
 m.floorsState[index].state='ready';s.exploration.groups[index].state='ready';
 s.player={x:0,y:0,z:-index*64+1,vy:0,vertical:'grounded'};s.arms=s.arms.map(()=>null);s.health.invulnerableUntil=Infinity;
 step(s,0);
 let paused=true;
 const controls=document.createElement('aside');controls.id='boss-runtime-review';controls.style.cssText='position:fixed;bottom:74px;left:50%;transform:translateX(-50%);z-index:120;width:min(280px,calc(var(--game-stage-width) - 24px));padding:8px;background:#14211ee8;color:#dfebe4;font:11px system-ui;text-align:center';
 const text=document.createElement('div');text.textContent=`Тест боя · ${m.bossName} · комната ${m.floors}`;controls.append(text);
 const button=document.createElement('button');button.textContent='Начать бой';button.style.cssText='min-height:44px;min-width:132px;margin-top:6px;white-space:nowrap';button.onclick=()=>{paused=!paused;button.textContent=paused?'Продолжить':'Пауза';};controls.append(button);
 const add=(label,fn)=>{const b=document.createElement('button');b.textContent=label;b.style.cssText='min-height:44px;margin:4px;white-space:nowrap';b.onclick=()=>{paused=true;button.textContent='Продолжить';fn();};controls.append(b);};
 add('Атака',()=>{const boss=s.enemies.find(e=>e.hp>0&&e.bossCombat);if(!boss)return;const cycle=boss.bossCombat.cycle;for(let i=0;i<900&&!s.dead;i++){step(s,1/60);if(boss.bossCombat.cycle>cycle)break;}});
 add('Узел',()=>{const q=s.enemies.find(e=>e.hp>0&&e.kind==='boss-part');if(q)hurtEnemy(s,q,1e9);step(s,1/60);});
 add('Фаза 2',()=>{const boss=s.enemies.find(e=>e.hp>0&&e.bossCombat);if(boss)boss.hp=boss.maxHp*.45;step(s,1/60);});
 const record=document.createElement('button');record.textContent='Record 8s';record.style.cssText='min-height:44px;margin:4px;white-space:nowrap';
 record.onclick=()=>{if(record.disabled)return;const canvas=document.querySelector('#world'),stream=canvas.captureStream(30),type=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(t=>MediaRecorder.isTypeSupported(t)),recorder=new MediaRecorder(stream,{mimeType:type,videoBitsPerSecond:3500000}),chunks=[];record.disabled=true;paused=false;button.textContent='Пауза';controls.dataset.recording='true';
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onstop=async()=>{paused=true;button.textContent='Продолжить';stream.getTracks().forEach(t=>t.stop());try{const response=await fetch('/__boss-animation-proof/'+m.id,{method:'POST',body:new Blob(chunks,{type})});if(!response.ok)throw Error('Proof server unavailable');controls.dataset.recording='saved';record.textContent='Saved';}catch(error){controls.dataset.recording='failed';record.textContent='Record failed';}record.disabled=false;};recorder.start();setTimeout(()=>recorder.stop(),8000);
 };controls.append(record);
 const report=document.createElement('output');report.id='boss-runtime-report';report.style.cssText='display:block;font:9px monospace;margin-top:4px';controls.append(report);document.body.append(controls);
 return {get paused(){return paused;},tick(){const info=window.bioso?.snapshot?.();if(info){controls.dataset.paused=String(paused);controls.dataset.cameraBlend=String(info.missionBossCamera?.blend??0);controls.dataset.ready=String(info.bossModels===1&&info.residentTiles>0&&info.loadingTiles===0&&info.assetErrors===0);controls.dataset.proof=JSON.stringify({model:info.bossModelIds,tiles:info.residentTiles,loading:info.loadingTiles,errors:info.assetErrors,boss:s.enemies.filter(e=>e.bossDesignId).map(e=>({id:e.bossDesignId,x:e.x,y:e.y,z:e.z,contact:e.contact,radius:e.radius,speed:e.speed,hp:e.hp,phase:e.bossCombat?.phase,actions:e.bossCombat?.counts,warning:e.enemyAttack?.warning,hover:e.bossHover})),parts:s.enemies.filter(e=>e.hp>0&&e.kind==='boss-part').length,bees:s.enemies.filter(e=>e.hp>0&&e.kind==='boss-drone').length,shots:s.hostileShots.length,animation:info.bossAnimations,camera:info.missionBossCamera,time:s.time,fps:info.fps});report.textContent=JSON.stringify({mode:s.mode,id:info.bossModelIds,errors:info.bossModelFailures,objects:info.bossModelObjects,time:+s.time.toFixed(2),fps:info.fps});}}};
}

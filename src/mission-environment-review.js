import {step,hurtEnemy} from './game.js';
import {movePlayer} from './elevation.js';
import {missionGateClosed,missionGateZ} from './mission-environment.js';
import {skipMissionEvent} from './mission-run.js';

/** Isolated development checkpoint. Uses the production mission, movement and kill paths. */
export function prepareMissionEnvironmentReview(s,params,ui,proof={}){
 s.health.invulnerableUntil=Infinity;if(params.get('scene')==='middle')s.player.z=0;step(s,0);
 const eventRoom=Number(params?.get('eventRoom'));
 const returnGateReview=params?.get('gateReturn')==='1';
 if([3,6,9,12,15,18,21,24].includes(eventRoom)){
  for(let index=0;index<eventRoom;index++){
   s.player={x:0,y:0,z:-index*64};step(s,0);
   const floor=s.mission.floorsState[index];
   for(const enemy of s.enemies.filter(e=>e.hp>0&&floor.members.includes(e.id)))hurtEnemy(s,enemy,1e12);
   s.pending=0;s.xpDrops=[];step(s,0);
   if(s.mission.event&&index<eventRoom-1)skipMissionEvent(s,s.mission.event.nodeId);
  }
  const node=s.encounters.nodes.find(n=>n.id===s.mission.event.nodeId);
  s.player={x:node.x,y:node.y,z:node.z+2};ui.open('encounter-detail',{id:node.id});
 }
 const clearCurrentRoom=()=>{
  const floor=s.mission.floorsState[s.mission.currentFloor];
  for(const enemy of s.enemies.filter(e=>e.hp>0&&floor.members.includes(e.id)))hurtEnemy(s,enemy,1e12);
  s.pending=0;s.xpDrops=[];step(s,0);
 };
 const enterCurrentRoom=()=>{
  const floor=s.mission.floorsState[s.mission.currentFloor];
  if(floor?.state==='ready'){s.player={x:0,y:0,z:floor.z+20};step(s,0);}
 };
 let returnBlocked=null;
 const tryPreviousGate=()=>{
  const index=s.mission.currentFloor-1;if(index<0)returnBlocked=false;
  else{const gateZ=missionGateZ(index);s.player={x:0,y:0,z:gateZ-4};movePlayer(s,1,0,8);step(s,0);returnBlocked=s.player.z<gateZ;}
 };
 if(returnGateReview){clearCurrentRoom();enterCurrentRoom();tryPreviousGate();}
 const controls=document.createElement('aside');controls.id='mission-environment-review';
 controls.style.cssText='position:fixed;bottom:106px;left:50%;transform:translateX(-50%);z-index:120;width:min(340px,calc(var(--game-stage-width) - 24px));box-sizing:border-box;background:#14211ef0;color:#dfebe4;padding:8px;font:11px system-ui;text-align:center';
 const title=document.createElement('div');title.textContent=returnGateReview?'Проверка: обратный путь закрыт':'Проверка окружения · игровой маршрут';title.style.cssText='font-weight:700;margin-bottom:4px';controls.append(title);
 if(returnGateReview){const explanation=document.createElement('div');explanation.textContent='После входа на этаж 2 ворота этажа 1 закрываются за игроком.';explanation.style.cssText='line-height:1.35;margin-bottom:5px';controls.append(explanation);}
 const report=document.createElement('output');report.id='mission-environment-report';report.style.display='block';
 const add=(label,fn)=>{const b=document.createElement('button');b.textContent=label;b.style.cssText='min-height:44px;min-width:44px;margin:2px;white-space:nowrap';b.onclick=fn;controls.append(b);};
 if(returnGateReview){
  add('Проверить назад',tryPreviousGate);
 }else{
  add('Вход',()=>{s.player={x:0,y:0,z:22};});
  add('К воротам',()=>{s.player={x:0,y:0,z:missionGateZ(s.mission.currentFloor)+7};});
  add('Зачистить этаж',clearCurrentRoom);
  add('Войти дальше',enterCurrentRoom);
  add('Край',()=>{s.player.x=6;});
  add('Центр',()=>{s.player.x=0;});
 }
 add('Снимок',()=>{controls.hidden=true;});
 add('Сохранить кадр',async()=>{
  try{
   const deadline=performance.now()+20000;
   while(proof.snapshot?.().loadingTiles||proof.snapshot?.().missionGateLoading){if(performance.now()>deadline)throw Error('Environment still loading');await new Promise(r=>setTimeout(r,100));}
   proof.render?.();const canvas=document.querySelector('#world'),name=params.get('proof')||'mission-environment';
   const image=await new Promise(resolve=>canvas.toBlob(resolve));
   for(const [suffix,data] of [['png',image],['json',JSON.stringify({viewport:{width:innerWidth,height:innerHeight},stage:{width:canvas.clientWidth,height:canvas.clientHeight},route:location.href,...proof.snapshot?.()})]]){
    const r=await fetch('/__forest-proof/'+name+'.'+suffix,{method:'POST',body:data});if(!r.ok)throw Error('Evidence save failed');
   }report.textContent='Кадр сохранён';
  }catch(e){report.textContent=e.message;}
 });
 controls.append(report);document.body.append(controls);
 return{paused:true,tick(){const info=window.bioso?.snapshot?.(),gateIndex=returnGateReview?s.mission.currentFloor-1:eventRoom?eventRoom-1:0;const proof={room:s.mission.currentFloor+1,previousRoom:Math.max(1,s.mission.currentFloor),gateClosed:missionGateClosed(s.mission,gateIndex),returnBlocked,event:s.mission.event,eventHistory:s.mission.eventHistory,eventRewards:s.ground.filter(g=>g.missionEventReward).length,enemies:s.enemies.filter(e=>e.hp>0).length,player:s.player,ready:info?.residentTiles>0&&info?.loadingTiles===0&&!info?.missionGateLoading&&info?.missionGates>0,errors:info?.assetErrors,gateErrors:info?.missionGateErrors,gateModels:info?.missionGateModels,models:info?.failedModels,gates:info?.missionGates};controls.dataset.proof=JSON.stringify(proof);report.textContent=returnGateReview?`Этаж ${proof.room} · ворота этажа ${proof.previousRoom} ${proof.gateClosed?'закрыты':'открыты'} · назад ${proof.returnBlocked?'нельзя':'можно'}`:`Этаж ${proof.room} · врагов ${proof.enemies} · ворота ${proof.gateClosed?'закрыты':'открыты'} · Z ${s.player.z.toFixed(1)}`;}};
}

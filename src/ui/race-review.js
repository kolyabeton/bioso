import {createPart,stats} from '../assembly.js';
import {prepareRace} from '../systems/events/race.js';

/** Prepared loadout, real map and real-time combat. No invulnerability or simulation overrides. */
export function prepareRaceReview(s,params,setMovement){
 const build=params.get('build')==='slow'?'slow':'fast';s.level=8;s.time=480;
 s.body=createPart(s,build==='fast'?'wanderer':'bastion');s.legs=Array.from({length:build==='fast'?2:4},()=>createPart(s,build==='fast'?'runner':'plated'));
 s.arms=[createPart(s,'seed',3),createPart(s,'claws',3)];s.organs=[createPart(s,'shield'),createPart(s,'regen')];s.inventory=[];s.hp=stats(s).hp;
 const n=s.encounters.nodes.find(n=>n.type==='race');Object.assign(s.player,{x:n.x,y:n.y,z:n.z});prepareRace(s,n);
 let auto=false,cursor=1;
 const controls=document.createElement('aside');controls.id='race-review';controls.style.cssText='position:fixed;top:136px;left:50%;transform:translateX(-50%);z-index:110;width:min(280px,calc(var(--game-stage-width) - 24px));padding:8px;background:#14211eee;color:#dfebe4;font:12px system-ui;text-align:center';
 const title=document.createElement('div');title.textContent=`Тестовый забег · ${build==='fast'?'быстрая':'тяжёлая'} сборка`;controls.append(title);
 const button=document.createElement('button');button.textContent='Автопробег';button.style.cssText='min-height:44px;margin:6px;white-space:nowrap';button.onclick=()=>{auto=!auto;button.textContent=auto?'Ручное управление':'Автопробег';setMovement({x:0,z:0});};controls.append(button);
 const report=document.createElement('output');report.style.display='block';controls.append(report);document.body.append(controls);
 return{nodeId:n.id,get paused(){return ['reward','failed','complete'].includes(n.state);},tick(){
  controls.hidden=!!document.querySelector('#panel[open]');
  if(auto&&n.state==='active'){
   const path=n.race.path;
   while(cursor<path.length-1&&Math.hypot(path[cursor].x-s.player.x,path[cursor].z-s.player.z)<.6)cursor++;
   const p=path[cursor],dx=p.x-s.player.x,dz=p.z-s.player.z,d=Math.hypot(dx,dz)||1;setMovement({x:dx/d,z:dz/d});
  }else if(auto)setMovement({x:0,z:0});
  const proof={build,state:n.state,time:s.time,elapsed:n.elapsed||0,limit:n.race?.limit,route:n.race?.length,speed:stats(s).speed,remaining:Math.hypot(n.x-s.player.x,n.z-s.player.z),kills:s.kills,hits:s.health.hits,dead:s.dead,hp:s.hp,packs:n.race?.packs.filter(p=>p.spawned).length};controls.dataset.proof=JSON.stringify(proof);report.textContent=`${proof.state} · ${proof.elapsed.toFixed(1)} / ${proof.limit} с · ${proof.kills} убийств`;
 }};
}

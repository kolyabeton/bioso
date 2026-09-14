import {preparePress} from '/scripts/store-screenshots-fixture.js';
import {spawnEnemy} from '/src/game.js';
import {learn} from '/src/systems/abilities.js';
import {setupMissionBoss} from '/src/systems/mission-bosses.js';
import {createPart} from '/src/assembly.js';
import {rollChoices} from '/src/systems/progression.js';
import {installUiCapture} from './ui-capture.js';
export function prepareTrailer(s,q,ui,{snapshot,setInput,settings}){
 preparePress(s,q,ui,snapshot);document.querySelector('#press-capture-proof')?.remove();
 settings.update('fps',30);settings.update('quality','high');settings.update('music',0);settings.update('effects',100);settings.update('soundEnabled',true);
 const name=q.get('shot')||'forest',boss=q.get('scene')==='boss'||q.get('scene')==='duel';
 if(q.get('scene')==='duel'){
  s.enemies=[];const e=spawnEnemy(s,'boss',{x:s.player.x,z:s.player.z-9},'mass',s.time);
  setupMissionBoss(s,e,q.get('boss')||'boss-scrap-leviathan');e.hp=e.maxHp=50000;e.bossName='Свалочный Левиафан';
 }
 for(const id of (q.get('skills')||'').split(',').filter(Boolean))learn(s,id);
 s.waves.credit=-Infinity;s.nextElite=s.nextBoss=s.waves.nextElite=s.waves.nextBoss=Infinity;
 const home={...s.player},samples=[],errors=[];let paused=true,elapsed=0,last=performance.now(),nextSample=0,recordPaint=()=>{};
 window.addEventListener('error',e=>errors.push(e.message));
 const box=document.createElement('aside');box.style.cssText='position:fixed;bottom:110px;left:8px;z-index:999;background:#17241e;color:white;padding:10px;font:14px sans-serif';
 const button=document.createElement('button');button.textContent='Записать сцену';button.style.cssText='padding:12px';const status=document.createElement('output');status.textContent='Готово к записи';
 box.append(button,status);document.body.append(box);
 const captureUi=installUiCapture(name,status);
 if(q.has('screen')){
  box.hidden=true;
  s.inventory=['needle','claws','drill','arc','regen','shield','plated','harpoon'].map((key,i)=>createPart(s,key,i%3+1));s.biomass=1200;
  const screen=q.get('screen');
  if(screen==='map')s.exploration.visited=new Set(s.world.tiles.map(t=>t.id));
  if(screen==='level'){s.pending=1;rollChoices(s);}
  if(screen==='ability-detail')ui.open(screen,{browse:true,branch:'electric'});
  else if(screen==='part')ui.open(screen,{id:s.arms[0].id,group:'arms',slot:0});
  else ui.open(screen);
 }
 const report=()=>({method:'Staged capture of current game renderer: granted equipment, abilities, invulnerability and replenished enemy population. No production source edits.',route:location.href,elapsed,errors,samples,current:snapshot()});
 const save=async(ext,data)=>{const r=await fetch('/__trailer/'+name+'.'+ext,{method:'POST',body:data});if(!r.ok)throw Error('Save failed');};
 button.onclick=async()=>{button.disabled=true;try{
  if(snapshot().loadingTiles||snapshot().assetErrors)throw Error('Assets not ready');
  elapsed=0;last=performance.now();samples.length=0;paused=false;
  const canvas=document.querySelector('#world'),output=document.createElement('canvas');output.width=1280;output.height=720;const ctx=output.getContext('2d');
  recordPaint=()=>{ctx.drawImage(canvas,0,0,1280,720);};recordPaint();
  const stream=output.captureStream(30);for(const t of window.__biosoTrailerAudio?.getAudioTracks()||[])stream.addTrack(t.clone());
  const type=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus'].find(t=>MediaRecorder.isTypeSupported(t)),chunks=[],rec=new MediaRecorder(stream,{mimeType:type,videoBitsPerSecond:9000000});
  rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};rec.onstop=async()=>{paused=true;setInput({x:0,z:0});recordPaint=()=>{};stream.getTracks().forEach(t=>t.stop());try{await save(type.includes('mp4')?'mp4':'webm',new Blob(chunks,{type}));await save('json',JSON.stringify(report(),null,2));status.textContent='Сцена сохранена';}catch(e){status.textContent=e.message;}};
  rec.start();status.textContent='Запись 10 секунд';setTimeout(()=>rec.stop(),10000);
 }catch(e){status.textContent=e.message;button.disabled=false;}};
 return{get paused(){return paused;},afterRender:()=>{recordPaint();captureUi();},tick(){
  const now=performance.now(),dt=Math.min(.06,(now-last)/1000);last=now;
  if(!paused){elapsed+=dt;s.waves.credit=-Infinity;s.health.invulnerableUntil=Infinity;s.pending=0;
   const dx=home.x+Math.sin(elapsed*.65)*2.3-s.player.x,dz=home.z+Math.cos(elapsed*.65)*2.3-s.player.z,d=Math.hypot(dx,dz);setInput(d>.3?{x:dx/d*.55,z:dz/d*.55}:{x:0,z:0});
   if(!boss&&s.enemies.filter(e=>e.hp>0).length<52){for(let i=0;i<4;i++){const a=elapsed*2.7+i*1.6,r=8+i;spawnEnemy(s,'normal',{x:s.player.x+Math.cos(a)*r*.7,z:s.player.z+Math.sin(a)*r},['mass','fast','armored','ranged'][i],s.time);}}
   if(elapsed>=nextSample){samples.push({elapsed,enemies:s.enemies.length,shots:s.shots.length,fps:snapshot().fps});nextSample=elapsed+.5;}
  }
 }};
}

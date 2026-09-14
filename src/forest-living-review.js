import {spawnEnemy} from './game.js';
import {environmentId} from './environment-profiles.js';
// Explicit DEV/acceptance checkpoint in the real renderer, isolated from saves.
export function prepareForestLivingReview(s,params,{snapshot,render,setInput,resetView,settings}){
 const tile=s.world.tiles.find(t=>environmentId(t)===(params.get('environment')||'root-forest')&&t.kind!=='transition');
 const edge=params.get('edge');
 const weatherNeighbor=params.has('weatherTransition')?s.world.neighbors(tile).find(t=>environmentId(t)!==environmentId(tile)):null;
 const weatherDirection=weatherNeighbor?{x:(weatherNeighbor.x-tile.x)/64,z:(weatherNeighbor.z-tile.z)/64}:null;
 const home={x:tile.x+(params.has('vista')?8:edge==='east'?28:params.has('landmark')||edge==='north'||edge==='south'?0:14),z:tile.z+(params.has('vista')?0:edge==='north'?-28:edge==='south'?28:4),y:0};home.y=s.world.heightAt(home.x,home.z)??0;Object.assign(s.player,home);
 if(edge==='west'){home.x=tile.x-28;home.y=s.world.heightAt(home.x,home.z)??0;Object.assign(s.player,home);}
 if(weatherDirection){home.x=tile.x+weatherDirection.x*24;home.z=tile.z+weatherDirection.z*24;home.y=s.world.heightAt(home.x,home.z)??0;Object.assign(s.player,home);}
 s.enemies=[];s.progressionLocked=true;s.nextElite=s.nextBoss=s.waves.nextElite=s.waves.nextBoss=Infinity;s.health.invulnerableUntil=0;
 const label=params.get('proof')||'forest',status=document.createElement('output');status.id='forest-proof-status';
 const box=document.createElement('aside');box.style.cssText='position:fixed;right:4px;top:95px;z-index:90;background:#16221fe8;color:white;padding:6px;font:11px monospace;max-width:170px';
 const save=async(name,data)=>{const r=await fetch('/__forest-proof/'+name,{method:'POST',body:data});if(!r.ok)throw Error('Evidence save failed');};
 const samples=[],errors=[];let lastSample=0,elapsed=0,started=0,mode='still',last=performance.now(),battle=false,transitions=0,lastTransition=0;
 window.addEventListener('error',e=>errors.push(e.message));window.addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
 const meta=()=>({route:location.href,viewport:{width:innerWidth,height:innerHeight},canvas:{width:document.querySelector('#world').clientWidth,height:document.querySelector('#world').clientHeight},errors,...snapshot()});
 async function capture(){render();const canvas=document.querySelector('#world');await new Promise((resolve,reject)=>canvas.toBlob(async b=>{try{await save(label+'.png',b);resolve();}catch(e){reject(e);}}));await save(label+'.json',JSON.stringify({current:meta(),samples}));status.textContent='Кадр сохранён';}
 const button=document.createElement('button');button.textContent='Сохранить кадр';button.onclick=()=>capture().catch(e=>status.textContent=e.message);
 const live=document.createElement('button');live.textContent='Живой проход';live.onclick=()=>begin('live');
 const record=document.createElement('button');record.textContent='Записать 32 с';record.onclick=()=>recordClip().catch(e=>status.textContent=e.message);
 const stress=document.createElement('button');stress.textContent='Стресс 30 минут';stress.onclick=()=>begin('stress');
 const reduced=document.createElement('button');reduced.textContent='Reduced motion';reduced.onclick=()=>settings.update('reducedMotion',!settings.get().reducedMotion);
 box.append(button,live,record,stress,reduced,status);document.body.append(box);
 if(params.has('capture'))(async()=>{
  const deadline=performance.now()+20000;
  while((snapshot().loadingTiles||!snapshot().residentTiles)&&performance.now()<deadline)await new Promise(resolve=>setTimeout(resolve,100));
  if(snapshot().assetErrors)throw Error('World assets failed');
  await new Promise(resolve=>setTimeout(resolve,500));await capture();
 })().catch(e=>status.textContent=e.message);
 if(weatherDirection){const crossing=document.createElement('button');crossing.textContent='Переход погоды';crossing.onclick=()=>begin('weather');box.insertBefore(crossing,status);}
 settings.update('fps',30);
 let paused=true,recordPaint=()=>{};
 function begin(next){mode=next;paused=false;elapsed=0;started=last=performance.now();samples.length=0;battle=false;transitions=lastTransition=0;Object.assign(s.player,home);s.enemies=[];resetView();}
 function walkTo(x,z){const dx=x-s.player.x,dz=z-s.player.z,d=Math.hypot(dx,dz);setInput(d>.4?{x:dx/d,z:dz/d}:{x:0,z:0});}
 async function recordClip(){
  begin('record');paused=true;
  const readyUntil=performance.now()+20000;
  while(snapshot().loadingTiles||!snapshot().residentTiles){if(performance.now()>readyUntil)throw Error('World assets did not become ready');await new Promise(r=>setTimeout(r,50));}
  if(snapshot().assetErrors)throw Error('World assets failed');
  elapsed=0;samples.length=0;last=performance.now();paused=false;
  const canvas=document.querySelector('#world'),output=document.createElement('canvas');output.width=innerWidth;output.height=innerHeight;const ctx=output.getContext('2d');
  recordPaint=()=>{const r=canvas.getBoundingClientRect();ctx.fillStyle='#171d18';ctx.fillRect(0,0,output.width,output.height);ctx.drawImage(canvas,r.x,r.y,r.width,r.height);};
  const stream=output.captureStream(30),chunks=[];
  const mime=['video/mp4;codecs=avc1.42E01E','video/mp4','video/webm;codecs=vp9','video/webm'].find(v=>MediaRecorder.isTypeSupported(v));
  const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:5000000});
  const done=new Promise((resolve,reject)=>{recorder.onerror=reject;recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onstop=async()=>{stream.getTracks().forEach(t=>t.stop());recordPaint=()=>{};try{await save(label+(mime.includes('mp4')?'.mp4':'.webm'),new Blob(chunks,{type:mime}));await save(label+'-video.json',JSON.stringify({current:meta(),samples}));resolve();}catch(e){reject(e);}};});
  recorder.start();setTimeout(()=>recorder.stop(),32000);await done;status.textContent='Видео сохранено';mode='still';paused=true;setInput({x:0,z:0});
 }
 async function finishStress(){mode='still';paused=true;setInput({x:0,z:0});await save(label+'-stress.json',JSON.stringify({startedAt:new Date(Date.now()-elapsed*1000).toISOString(),activeSeconds:elapsed,wallSeconds:(performance.now()-started)/1000,transitions,current:meta(),samples}));status.textContent='30 минут завершены';}
 return{get paused(){return paused;},afterRender:()=>recordPaint(),tick(){
  const now=performance.now(),delta=Math.min(.1,(now-last)/1000);last=now;
  if(!paused&&!document.hidden&&!document.querySelector('#panel').open){elapsed+=delta;s.waves.credit=-1000;
   const phase=elapsed%32;
   if(mode==='stress'&&elapsed-lastTransition>=25&&transitions<50){
    transitions++;lastTransition=elapsed;const next=s.world.tiles.filter(t=>t.biome==='forest')[transitions%4];Object.assign(s.player,{x:next.x,z:next.z,y:0});if(transitions%10===0)resetView();
   }
   if(mode==='weather'){walkTo(tile.x+weatherDirection.x*43,tile.z+weatherDirection.z*43);if(elapsed>=16){paused=true;setInput({x:0,z:0});capture().catch(e=>status.textContent=e.message);}}
   else if(phase>=18&&phase<25){if(!battle){battle=true;s.health.invulnerableUntil=Infinity;for(let i=0;i<3;i++)spawnEnemy(s,'normal',{x:s.player.x+(i-1)*3,z:s.player.z-7},'mass',0);}if(mode==='stress')setInput({x:0,z:0});else walkTo(home.x,home.z+1.5);}
   else{if(battle){s.enemies=[];battle=false;s.health.invulnerableUntil=0;}if(mode==='stress'){const cell=s.world.tileAt(s.player.x,s.player.z)||tile;walkTo(cell.x+Math.sin(elapsed*.25)*3,cell.z+Math.cos(elapsed*.25)*3);}else if(phase>=8&&phase<15)walkTo(home.x+4,home.z+6);else if(phase>=15&&phase<18)walkTo(home.x,home.z);else setInput({x:0,z:0});}
   if(mode==='stress'&&elapsed>=1800)finishStress().catch(e=>status.textContent=e.message);
  }
  if(now-lastSample>1000){lastSample=now;samples.push({...meta(),activeSeconds:elapsed,transitions,fixtureMode:mode});if(samples.length>1810)samples.shift();status.textContent=JSON.stringify({seconds:Math.floor(elapsed),fps:snapshot().fps,draws:snapshot().drawCalls,triangles:snapshot().triangles});if(mode==='stress'&&Math.floor(elapsed)%30===0)save(label+'-progress.json',JSON.stringify({elapsed,transitions,latest:samples.at(-1)})).catch(()=>{});}
 }};
}

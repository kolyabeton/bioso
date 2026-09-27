import {preparePress} from '/scripts/store-screenshots-fixture.js';
import {spawnEnemy} from '/src/game.js';
import {setupMissionBoss} from '/src/systems/mission-bosses.js';
import {createPart,stats} from '/src/assembly.js';
import {learn} from '/src/systems/abilities.js';
import {motherDefeated,collectBiomass} from '/src/systems/survival-endgame.js';
import {bodyRadius} from '/src/elevation.js';
import {findPath,clearSegment} from '/src/world-navigation.js';

export function prepareTrailer(s,q,ui,{snapshot,setInput,settings}){
 settings.update('soundEnabled',false);settings.update('storyEnabled',false);
 settings.update('quality','high');settings.update('fps',30);settings.update('reducedMotion',false);
 preparePress(s,q,ui,snapshot);document.querySelector('#press-capture-proof')?.remove();
 s.body.upgrades.capacity=10;s.inventory=[];s.ground=[];s.legs=s.legs.map(()=>createPart(s,'universal',5));
 s.hp=stats(s).hp;
 const name=q.get('shot')||'horde',boss=['boss','duel'].includes(q.get('scene')),ending=q.get('scene')==='ending';
 if(q.get('scene')==='duel'){
  s.enemies=[];
  let e=null;
  for(const r of [10,14,18,22,26]){for(const a of [Math.PI,-2.6,2.6,-2,2,0]){const p={x:s.player.x+Math.sin(a)*r,z:s.player.z+Math.cos(a)*r};if(s.world.walkable(p.x,p.z,7)){e=spawnEnemy(s,'boss',p,'mass',s.time);if(e)break;}}if(e)break;}
  if(!e)throw Error('No clear boss position');
  setupMissionBoss(s,e,'boss-scrap-leviathan');e.bossName='Свалочный Левиафан';
 }
 const target=Number(q.get('count'))||100,duration=ending?17000:12000;
 for(const id of (q.get('skills')||'').split(',').filter(Boolean))for(let rank=0;rank<3;rank++)learn(s,id);
 s.waves.credit=-Infinity;s.nextElite=s.nextBoss=s.waves.nextElite=s.waves.nextBoss=Infinity;
 if(boss)for(const e of s.enemies.filter(e=>e.bossDesignId)){e.hp=e.maxHp=90000;}
 if(ending){s.enemies=[];motherDefeated(s);collectBiomass(s,100000);}
 const home={...s.player},samples=[],errors=[];let paused=true,elapsed=0,last=performance.now(),nextSample=0,paint=()=>{},path=[],goalIndex=0;
 if(q.get('travel')==='1'){
  for(let i=0;i<3;i++)learn(s,'motion.0');
  s.legs.forEach(p=>p.upgrades.speed=5);
 }
 window.addEventListener('error',e=>errors.push(e.message));
 const box=document.createElement('aside');box.style.cssText='position:fixed;bottom:90px;left:8px;z-index:999;background:#17241e;color:white;padding:8px;font:14px sans-serif';
 const button=document.createElement('button');button.textContent='Записать сцену';button.style.cssText='padding:12px';
 const status=document.createElement('output');status.textContent='Загрузка';box.append(button,status);document.body.append(box);
 const save=async(ext,data)=>{const r=await fetch('/__trailer/'+name+'.'+ext,{method:'POST',body:data});if(!r.ok)throw Error('Save failed');};
 button.onclick=()=>{try{
  if(snapshot().loadingTiles||snapshot().assetErrors)throw Error('Assets not ready');
  button.disabled=true;elapsed=0;last=performance.now();paused=false;
  const canvas=document.querySelector('#world'),output=document.createElement('canvas');output.width=1280;output.height=720;
  const ctx=output.getContext('2d');paint=()=>ctx.drawImage(canvas,0,0,1280,720);paint();
  const stream=output.captureStream(30),type=['video/mp4;codecs=avc1.42E01E','video/mp4','video/webm;codecs=vp9'].find(t=>MediaRecorder.isTypeSupported(t));
  const chunks=[],rec=new MediaRecorder(stream,{mimeType:type,videoBitsPerSecond:14000000});
  rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  rec.onstop=async()=>{paused=true;setInput({x:0,z:0});paint=()=>{};stream.getTracks().forEach(t=>t.stop());
   try{await save(type.includes('mp4')?'mp4':'webm',new Blob(chunks,{type}));await save('json',JSON.stringify({method:'Current game renderer, staged equipment and replenished enemy population, invulnerability. Silent IAB recording; no production edits.',route:location.href,elapsed,samples,errors,current:snapshot()},null,2));status.textContent='Сцена сохранена';}catch(e){status.textContent=e.message;}
  };rec.start();status.textContent='Идёт запись';setTimeout(()=>rec.stop(),duration);
 }catch(e){status.textContent=e.message;}};
 return {get paused(){return paused;},afterRender(){paint();},tick(){
  const now=performance.now(),dt=Math.min(.06,(now-last)/1000);last=now;
  if(paused){if(!button.disabled)status.textContent=snapshot().loadingTiles?'Загрузка':'Готово к записи';return;}
  elapsed+=dt;s.inventory=[];s.ground=[];s.waves.credit=-Infinity;s.health.invulnerableUntil=Infinity;s.pending=0;
  if(!ending){
   let target={x:home.x+Math.sin(elapsed*.6)*4,z:home.z+Math.sin(elapsed*.9)*3};
   if(q.get('travel')==='1'){
    while(path.length&&Math.hypot(path[0].x-s.player.x,path[0].z-s.player.z)<1.5)path.shift();
    if(!path.length){
     const goals=[[26,-18],[-22,-24],[-24,20],[25,20]],g=goals[goalIndex++%goals.length],goal={x:home.x+g[0],z:home.z+g[1]};
     path=clearSegment(s.world,s.player,goal,bodyRadius(s))?[goal]:findPath(s.world,s.player,goal,bodyRadius(s),{cell:2,budget:3000});
    }
    if(path.length)target=path[0];
   }
   const dx=target.x-s.player.x,dz=target.z-s.player.z,d=Math.hypot(dx,dz);
   setInput(d>.3?{x:dx/d,z:dz/d}:{x:0,z:0});
   if(q.get('travel')==='1')s.enemies=s.enemies.filter(e=>e.kind!=='normal'||Math.hypot(e.x-s.player.x,e.z-s.player.z)<40);
   const alive=s.enemies.filter(e=>e.hp>0&&(q.get('travel')!=='1'||Math.hypot(e.x-s.player.x,e.z-s.player.z)<18)).length;
   if(alive<(boss?30:target))for(let i=0;i<Math.min(6,(boss?30:target)-alive);i++){
    const a=elapsed*2.7+i*2.4,r=7+i*1.2;
    spawnEnemy(s,'normal',{x:s.player.x+Math.cos(a)*r*.75,z:s.player.z+Math.sin(a)*r},['mass','fast','armored','ranged','flying'][i%5],s.time);
   }
  }
  if(elapsed>=nextSample){samples.push({elapsed,enemies:s.enemies.filter(e=>e.hp>0).length,shots:s.shots.length,fps:snapshot().fps,player:{...s.player},ending:s.ending?{...s.ending}:null});nextSample=elapsed+.5;}
 }};
}

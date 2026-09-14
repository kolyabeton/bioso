import {createPart,stats} from '/src/assembly.js';
import {spawnEnemy} from '/src/game.js';
import {learn} from '/src/systems/abilities.js';
import {onDeath} from '/src/systems/effects.js';
export function prepare(s,params){
 s.progressionLocked=true;s.nextElite=s.nextBoss=Infinity;s.waves.credit=-Infinity;s.enemies=[];s.ground=[];s.shots=[];s.time=180;
 s.body=createPart(s,'rootwalker',4);s.arms=[];s.legs=Array.from({length:4},()=>createPart(s,'universal',4));s.organs=[];s.hp=stats(s).hp;s.health.invulnerableUntil=Infinity;
 for(const id of ['fire.0','fire.3'])for(let rank=0;rank<5;rank++)learn(s,id);
 s.world.walkable=()=>true;s.world.lineClear=()=>true;
 const origin={x:s.player.x,y:s.player.y??0,z:s.player.z+5};
 for(let i=0;i<6;i++){const a=i*Math.PI/3,e=spawnEnemy(s,'normal',{x:origin.x+Math.cos(a)*2.6,z:origin.z+Math.sin(a)*2.6},'armored',180);if(e){e.hp=e.maxHp=50000;e.speed=e.damage=0;e.y=origin.y;}}
 let next=181,last=0,events=0,paused=false;
 const output=document.createElement('output');output.id='fire-proof';output.style.cssText='position:absolute;left:16px;top:75px;color:white;font:12px monospace';document.getElementById('game').append(output);
 const button=document.createElement('button');button.textContent='Pause fire';button.style.cssText='position:absolute;left:16px;top:100px;z-index:50';button.onclick=()=>{paused=!paused;button.textContent=paused?'Resume fire':'Pause fire';};document.getElementById('game').append(button);
 return {get paused(){return paused;},tick(){
  s.waves.credit=-Infinity;
  if(s.time>=next){next=s.time+1.2;last=s.time;const stack={until:s.time+.8,dps:2};onDeath(s,{...origin,hp:0,burn:{stacks:[stack],until:stack.until,dps:2}});events+=s.events.filter(e=>e.kind==='spread').length;}
  output.textContent=`Wildfire · ${events} real spread events · ${(s.time-last).toFixed(2)} s`;
  if(params.has('still')&&events&&s.time-last>=Number(params.get('still')))paused=true;
 }};
}

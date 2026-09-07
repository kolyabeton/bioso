import {createPart,stats} from './assembly.js';
import {spawnEnemy} from './game.js';
import {ABILITIES,learn} from './systems/abilities.js';
import {eligible} from './systems/progression.js';
import {createPilot} from './qa-pilot.js';

// Explicit DEV/acceptance fixture. The normal save and combat coefficients are untouched.
export function prepareStressRun(s){
 s.body=createPart(s,'rootwalker',5);
 s.arms=['claws','seed','needle','rocket'].map(key=>createPart(s,key,5));
 s.legs=Array.from({length:4},()=>createPart(s,'universal',5));
 s.organs=['armor','shield','regen'].map(key=>createPart(s,key,5));
 const omitted=new Set(['metabolism.0','metabolism.1','metabolism.2','metabolism.3','melee.3']);
 for(const d of Object.values(ABILITIES))if(!omitted.has(d.id)){
  if(!eligible(s,d))throw Error(`Stress fixture prerequisite missing: ${d.id}`);
  learn(s,d.id);
 }
 s.level=s.abilities.learned.length+1;s.hp=stats(s).hp;s.time=1200;
 s.enemies=[];s.nextElite=s.nextBoss=Infinity;s.waves.credit=0;
 s.metrics={spawned:0,maxEnemies:0,killed:[]};
 replenishStressEnemies(s);
 return {learned:s.abilities.learned.length,total:Object.keys(ABILITIES).length,percentage:s.abilities.learned.length/Object.keys(ABILITIES).length*100,weapons:s.arms.map(p=>p.key),tier:5,threatSeconds:1200,initialEnemies:s.enemies.length};
}

export function replenishStressEnemies(s){
 s.waves.credit=0;
 let attempts=0;
 while(s.enemies.length<100&&attempts++<2000){
  const angle=s.rng()*Math.PI*2,radius=5+s.rng()*12;
  const p={x:s.player.x+Math.cos(angle)*radius,z:s.player.z+Math.sin(angle)*radius};
  if(s.enemies.some(e=>Math.hypot(e.x-p.x,e.z-p.z)<1.3))continue;
  const roles=['mass','mass','mass','fast','armored','ranged','flying'];
  spawnEnemy(s,'normal',p,roles[s.enemies.length%roles.length],1200);
 }
}

export function installStressReview(s,setInput,snapshot){
 const setup=prepareStressRun(s),pilot=createPilot({style:'mixed'});
 const panel=document.createElement('aside');panel.id='stress-controls';
 panel.style.cssText='position:absolute;left:8px;right:8px;top:100px;z-index:60;background:#10271eee;color:#eef4ee;padding:6px;font:11px/1.4 monospace';
 panel.innerHTML='<div>100 врагов · 46/51 навыков · 4 оружия</div><button style="min-height:44px">Начать 60 с</button><output style="display:block"></output><script id="stress-report" type="application/json"></script>';
 document.querySelector('#game').append(panel);
 const button=panel.querySelector('button'),output=panel.querySelector('output'),record=panel.querySelector('script');
 let active=false,started=0,last=0,nextPublish=0,previousGameTime=s.time;
 const intervals=[],overheads=[],report={setup,method:'Real rendered game; normal HP, damage, movement, collision and weapon logic. Granted tier-5 loadout and 46 eligible skills. Replenish defeated enemies to 100 before each step, suppress scheduled elite/boss spawns. Mixed QA movement; no further skill/equipment purchases. Stop on new level to preserve exactly 46 learned skills. Frame intervals exclude initial loading and pauses.',populationBeforeStep:{min:100,max:100},checkpoints:[],errors:[]};
 const controller={paused:true,tick};
 const publish=()=>{record.textContent=JSON.stringify(report);};
 const summarize=()=>{const sorted=[...intervals].sort((a,b)=>a-b),activeMs=intervals.reduce((a,b)=>a+b,0);return{frames:sorted.length,activeWallSeconds:activeMs/1000,averageFps:sorted.length?1000*sorted.length/activeMs:0,p50Ms:sorted[Math.floor(sorted.length*.5)]??0,p95Ms:sorted[Math.floor(sorted.length*.95)]??0,p99Ms:sorted[Math.floor(sorted.length*.99)]??0,maxMs:sorted.at(-1)??0,over50Ms:sorted.filter(v=>v>50).length,fixtureMeanMs:overheads.length?overheads.reduce((a,b)=>a+b,0)/overheads.length:0,fixtureMaxMs:overheads.length?Math.max(...overheads):0};};
 window.addEventListener('error',e=>{report.errors.push(e.message);publish();});
 window.addEventListener('unhandledrejection',e=>{report.errors.push(String(e.reason));publish();});
 function stop(reason){active=false;controller.paused=true;setInput({x:0,z:0});report.end={reason,wallSeconds:(performance.now()-started)/1000,...snapshot(),damage:s.metrics.damage,weaponAttacks:s.arms.map(p=>({key:p.key,attacks:s.abilities.attacks[p.id]??0})),frameTiming:summarize()};output.textContent=`${reason} · ${report.end.frameTiming.averageFps.toFixed(1)} FPS · ${s.kills} убито`;button.hidden=true;publish();}
 button.onclick=()=>{active=true;controller.paused=false;started=last=performance.now();previousGameTime=s.time;nextPublish=0;report.startedAt=new Date().toISOString();report.initial=snapshot();button.textContent='Остановить';button.onclick=()=>stop('Остановлено');publish();};
 function tick(){
  if(!active)return;
  const now=performance.now(),wall=(now-started)/1000;
  if(s.time!==previousGameTime){intervals.push(now-last);previousGameTime=s.time;}
  last=now;
  if(s.dead||s.pending||wall>=60){stop(s.dead?'Поражение':s.pending?'Получен новый уровень':'60 секунд завершены');return;}
  if(document.querySelector('#panel').open)return;
  if(wall>=nextPublish){report.checkpoints.push({wallSeconds:wall,...snapshot(),frameTiming:summarize()});output.textContent=`${wall.toFixed(0)} с · ${s.enemies.length} врагов · ${s.kills} убито · ${snapshot().fps} FPS`;nextPublish=wall+2;publish();}
  const overheadStart=performance.now();replenishStressEnemies(s);setInput(pilot.direction(s));overheads.push(performance.now()-overheadStart);
  report.populationBeforeStep.min=Math.min(report.populationBeforeStep.min,s.enemies.length);report.populationBeforeStep.max=Math.max(report.populationBeforeStep.max,s.enemies.length);
 }
 publish();return controller;
}

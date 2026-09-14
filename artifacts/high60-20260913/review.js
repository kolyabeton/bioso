import {chooseUpgrade,spawnEnemy} from '/src/game.js';
import {chooseBossReward} from '/src/systems/sets/loot.js';
import {prepareStressRun,replenishStressEnemies} from '/src/stress-review.js';
export function prepare(s,params,setInput,ui){
 const scenario=params.get('case')||'early',duration=Number(params.get('seconds')||180);
 if(scenario==='effects')prepareStressRun(s);
 else s.time=scenario==='late'?1120:115;
 s.health.invulnerableUntil=Infinity;s.performanceEnabled=true;if(scenario==='visual'){s.player.x=Number(params.get('x')||0);s.player.z=Number(params.get('z')||22);s.player.y=s.world.heightAt(s.player.x,s.player.z)||0;}
 if(scenario==='late'){
  for(let i=0;i<1000&&s.enemies.length<180;i++)spawnEnemy(s,i<6?'elite':'normal',null,i%5===0?'ranged':'mass',s.time,{wave:true,promote:false});
 }
 const output=document.createElement('script');output.id='high60-report';output.type='application/json';document.body.append(output);
 let started=0,readyAt=0,finished=false,lastPublish=0,lastGpu=0,lastInfo=null;const frames=[],cpu=[],gpu=[],checkpoints=[],errors=[],outliers=[];
 const summary=a=>{if(!finished)return {count:a.length};const b=[...a].sort((a,b)=>a-b);return {count:b.length,mean:b.reduce((a,b)=>a+b,0)/b.length,p95:b[Math.floor(b.length*.95)],p99:b[Math.floor(b.length*.99)],max:b.at(-1),over50:b.filter(v=>v>50).length};};
 const publish=info=>{lastInfo=info;const f=summary(frames);output.textContent=JSON.stringify({fixtureVersion:'high60-v3-fixed-profile',scenario,duration,finished,seconds:started?(performance.now()-started)/1000:0,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},frames:{...f,fps:1000/f.mean},cpu:summary(cpu),gpu:summary(gpu),checkpoints:finished?checkpoints:checkpoints.slice(-2),errors,outliers:finished?outliers:[],snapshot:info});if(finished)fetch('/_high60-result',{method:'POST',headers:{'Content-Type':'application/json'},body:output.textContent}).catch(()=>{});};
 addEventListener('error',e=>errors.push(e.message));addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
 return {afterSimulation(){while(s.pending)chooseUpgrade(s,0);while(s.bossRewards?.length)chooseBossReward(s,0);},get finished(){return finished;},get paused(){return scenario==='visual'||!started||finished;},tick(){
  if(finished)return;
  const now=performance.now();
  if(!started){const info=window.bioso.snapshot();if(!readyAt&&info.residentTiles>0&&info.loadingTiles===0&&info.preparationQueued===0&&!info.failedModels.length)readyAt=now+3000;if(readyAt&&now>=readyAt)started=now;publish(info);return;}
  while(s.pending)chooseUpgrade(s,0);while(s.bossRewards?.length)chooseBossReward(s,0);if(ui.screen)ui.close();
  if(scenario==='effects'){s.inventory.length=0;replenishStressEnemies(s);}
  if(scenario==='visual')return;const elapsed=(now-started)/1000;setInput({x:Math.cos(elapsed*.25),z:Math.sin(elapsed*.25)});
 },afterFrame({cpuMs,intervalMs,gpuInfo}){
  if(!started||finished)return;
  cpu.push(cpuMs);frames.push(intervalMs);const now=performance.now(),info={...lastInfo,...gpuInfo};
  if((cpuMs>16.7||intervalMs>50)&&outliers.length<100)outliers.push({seconds:(now-started)/1000,cpuMs,intervalMs,preparation:info.preparationMs,job:info.preparationMaxJobName,gpu:info.gpuMs,screen:info.screen});
  for(const sample of gpuInfo?.gpuSamples||[])if(sample.id>lastGpu&&Number.isFinite(sample.ms)){gpu.push(sample.ms);lastGpu=sample.id;}
  if(now-lastPublish>=1000){Object.assign(info,window.bioso.snapshot());lastPublish=now;checkpoints.push({seconds:(now-started)/1000,enemies:info.enemies,visible:info.visibleEnemies,shapes:info.enemyFittedShapes,pools:info.enemyMeshPools,geometries:info.geometries,textures:info.textures,preparation:info.preparationQueued,maxJob:info.preparationMaxJobMs,ambientTier:info.ambientTier,player:info.player});publish(info);}
  if(now-started>=duration*1000||scenario==='visual'&&frames.length>=3){Object.assign(info,window.bioso.snapshot());finished=true;setInput({x:0,z:0});publish(info);}
 }};
}

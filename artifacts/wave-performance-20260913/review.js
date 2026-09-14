import {obstacleContains,obstacleHeight} from '/src/architecture-collision.js';
import {stepWorldRun} from '/src/world-run.js';
import {chooseUpgrade} from '/src/game.js';
import {chooseBossReward} from '/src/systems/sets/loot.js';
export function prepare(s,params){
 if(params.has('baseline')){
 s.world.solidAt=function(x,y,z,r=0){return this.obstacles(x,z).some(o=>obstacleContains(o,x,z,r)&&y<(this.heightAt(o.x,o.z)??0)+obstacleHeight(o));};
 s.world.flyable=function(x,z,r=.4){const h=this.heightAt(x,z);if(h===null||this.obstacles(x,z).some(o=>o.feature!=='thicket'&&obstacleContains(o,x,z,r)))return false;for(let i=0;i<8;i++){const a=i*Math.PI/4;if(this.heightAt(x+Math.cos(a)*r,z+Math.sin(a)*r)===null)return false;}return true;};
 }
 s.time=215;s.health.invulnerableUntil=Infinity;s.performanceEnabled=true;
 const report=document.createElement('script');report.id='wave-perf';report.type='application/json';document.body.append(report);
 let readyAt=0,last=0,simMs=0;const samples=[],stop=250;
 const summary=values=>{const a=values.filter(Number.isFinite).sort((a,b)=>a-b);return {mean:a.reduce((a,b)=>a+b,0)/a.length,p95:a[Math.floor(a.length*.95)],max:a.at(-1)};};
 return {paused:true,get finished(){return s.time>=stop;},tick(){
  const info=window.bioso.snapshot(),now=performance.now();
  if(!readyAt&&info.residentTiles>0&&info.loadingTiles===0&&!info.failedModels.length){readyAt=now+3000;last=now;}
  if(now>=readyAt&&readyAt&&s.time<stop){
   while(s.pending)chooseUpgrade(s,0);while(s.bossRewards?.length)chooseBossReward(s,0);
   const t=performance.now();stepWorldRun(s,Math.min(.05,(now-last)/1000),{x:0,z:0});simMs=performance.now()-t;s.events.length=0;
  }last=now;
 },afterRender(){
  const info=window.bioso.snapshot();
  if(readyAt&&performance.now()>=readyAt&&s.time<stop)samples.push({time:s.time,sim:simMs,render:info.subsystemMs.render?.last,...globalThis.__wavePerf,enemies:info.enemies,visible:info.visibleEnemies,draws:info.drawCalls,triangles:info.triangles,gpu:info.gpuMs,shapes:info.enemyFittedShapes});
  if(s.time>=stop||samples.length%30===0){const metrics={};for(const key of ['sim','modular','contacts','warnings','gpuSubmit','gpu'])metrics[key]=summary(samples.map(s=>s[key]));report.textContent=JSON.stringify({finished:s.time>=stop,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},time:s.time,metrics,samples,snapshot:info,method:'215–250s normal frame dt, stationary protected starter, seed20317, same viewport and quality. Review pauses ambient; combat simulation and rendering run once per frame.'});}
 }};
}

import {obstacleContains,obstacleHeight} from '../../src/architecture-collision.js';
import {createWorldRun,stepWorldRun} from '../../src/world-run.js';
import {chooseUpgrade} from '../../src/game.js';
import {chooseBossReward} from '../../src/systems/sets/loot.js';
const s=createWorldRun(undefined,'survival',20317);s.time=215;s.health.invulnerableUntil=Infinity;s.performanceEnabled=true;
if(process.argv.includes('--baseline')){
 s.world.solidAt=function(x,y,z,r=0){return this.obstacles(x,z).some(o=>obstacleContains(o,x,z,r)&&y<(this.heightAt(o.x,o.z)??0)+obstacleHeight(o));};
 s.world.flyable=function(x,z,r=.4){const h=this.heightAt(x,z);if(h===null||this.obstacles(x,z).some(o=>o.feature!=='thicket'&&obstacleContains(o,x,z,r)))return false;for(let i=0;i<8;i++){const a=i*Math.PI/4;if(this.heightAt(x+Math.cos(a)*r,z+Math.sin(a)*r)===null)return false;}return true;};
}
const samples=[],start=performance.now();
for(let frame=0;frame<2100;frame++){
 while(s.pending)chooseUpgrade(s,0);while(s.bossRewards?.length)chooseBossReward(s,0);
 const t=performance.now();stepWorldRun(s,1/60,{x:0,z:0});samples.push(performance.now()-t);s.events.length=0;
}
samples.sort((a,b)=>a-b);console.log(JSON.stringify({elapsedMs:performance.now()-start,mean:samples.reduce((a,b)=>a+b,0)/samples.length,p95:samples[Math.floor(samples.length*.95)],max:samples.at(-1),steps:s.performanceTimings,enemies:s.enemies.length,kills:s.kills,spawned:s.metrics.spawned,positions:s.enemies.map(e=>[e.id,e.x,e.z,e.hp])},null,2));

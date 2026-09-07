import {writeFileSync,mkdirSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {createPaintedRun,stepPaintedRun} from '../src/painterly-stage.js';
import {createPart,newProfile,stats} from '../src/assembly.js';
import {chooseUpgrade} from '../src/game.js';
const scenarios={ordinary:[],mixed:['slime','shield'],combined:['returnNerve','slime','parasite']};
const results=[];
for(const seed of [17,29,41,53,67])for(const [name,organs] of Object.entries(scenarios)){
 const s=createPaintedRun(newProfile(),'survival',seed);s.body=createPart(s,'bastion');s.arms=['seed','needle'].map(k=>createPart(s,k));s.legs=Array.from({length:4},()=>createPart(s,'universal'));s.organs=organs.map(k=>createPart(s,k));s.hp=stats(s).hp;
 const peaks={shots:0,returning:0,larvae:0,slime:0,enemies:0},start=performance.now();let maxStepMs=0;
 while(!s.dead&&s.time<120){if(s.pending){chooseUpgrade(s,0);continue;}const a=s.time*.13,p={x:3+Math.sin(a)*5,z:3+Math.cos(a)*13},dx=p.x-s.player.x,dz=p.z-s.player.z,d=Math.hypot(dx,dz)||1,t=performance.now();stepPaintedRun(s,.05,{x:dx/d,z:dz/d});maxStepMs=Math.max(maxStepMs,performance.now()-t);
  for(const [k,v]of Object.entries({shots:s.shots.length,returning:s.shots.filter(q=>q.returning).length,larvae:s.isaac?.larvae.length||0,slime:s.isaac?.slimePools.length||0,enemies:s.enemies.length}))peaks[k]=Math.max(peaks[k],v);s.events.length=0;
 }
 results.push({seed,scenario:name,seconds:s.time,dead:s.dead,hp:s.hp,kills:s.kills,level:s.level,damage:s.metrics.damage,peaks,cpuMs:performance.now()-start,maxStepMs});
}
mkdirSync('proof/isaac-v1',{recursive:true});writeFileSync('proof/isaac-v1/probe.json',JSON.stringify({kind:'Prepared equipment comparison; same seeds, current painted adapter, real rules, 120 simulated seconds maximum; not a 40-minute human playthrough.',results},null,2));
for(const [name]of Object.entries(scenarios)){const rows=results.filter(r=>r.scenario===name);console.log(name,JSON.stringify({runs:rows.length,survived:rows.filter(r=>!r.dead).length,meanKills:rows.reduce((a,r)=>a+r.kills,0)/rows.length,peakLarvae:Math.max(...rows.map(r=>r.peaks.larvae)),peakReturning:Math.max(...rows.map(r=>r.peaks.returning)),maxStepMs:Math.max(...rows.map(r=>r.maxStepMs))}));}

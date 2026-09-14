// Internal evidence gate. Never deploy from a single favorable diagnostic run.
import {readFile,writeFile} from 'node:fs/promises';
const files=process.argv.slice(2),required=['early','late','effects'],sizes=[[1280,720],[414,736]],results=[];
for(const file of files){
 const r=JSON.parse(await readFile(file,'utf8')),failures=[];
 if(!r.finished||r.seconds<180)failures.push('incomplete duration');
 if(r.fixtureVersion!=='high60-v3-fixed-profile')failures.push('uncontrolled initial profile');
 if(r.viewport.dpr!==2||!sizes.some(([w,h])=>w===r.viewport.width&&h===r.viewport.height))failures.push('viewport/DPR');
 if(r.snapshot.settings.quality!=='high'||r.snapshot.settings.fps!==60)failures.push('quality/cadence');
 if(r.errors.length)failures.push('runtime exceptions');
 if(r.snapshot.missingGroundItemModels?.length)failures.push('missing loot artwork');
 if(!(r.frames.fps>=59))failures.push('average FPS below 59');
 if(r.frames.over50||r.cpu.over50)failures.push('stall over 50 ms requires attribution');
 for(const key of ['cpu','gpu'])if(!(r[key].count>0&&r[key].p95<=7&&r[key].p99<=8.3))failures.push(key+' budget');
 if(!r.snapshot.gpuTimerAvailable||r.gpu.count<r.frames.count*.98)failures.push('incomplete GPU samples');
 results.push({file,scenario:r.scenario,viewport:r.viewport,failures,fps:r.frames.fps,cpu:r.cpu,gpu:r.gpu});
}
const missingRuns=[];
for(const [width,height]of sizes)for(const scenario of required){const count=results.filter(r=>r.scenario===scenario&&r.viewport.width===width&&r.viewport.height===height&&r.failures.length===0).length;if(count<3)missingRuns.push({width,height,scenario,missing:3-count});}
// These require separate evidence, not a percentile calculated from callbacks.
const remaining=['Full CPU coverage including asynchronous tasks','Strict 1 ms preparation budget','Interactive mission/boss/biome routes','20 minute summons/transitions memory soak'];
const report={status:'INCOMPLETE',deploymentAllowed:false,results,missingRuns,remaining};
await writeFile(new URL('./acceptance-status.json',import.meta.url),JSON.stringify(report,null,2));
console.log(JSON.stringify({status:report.status,deploymentAllowed:false,runs:results.length,remaining}));

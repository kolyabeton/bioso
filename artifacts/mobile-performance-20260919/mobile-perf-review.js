import {prepareStressRun,replenishStressEnemies} from './stress-review.js';
export function prepareMobilePerf(s,params,{settings,setInput,snapshot}){
 const scenario=params.get('scenario')||'start',fps=Number(params.get('fps'))===30?30:60;
 settings.update('fps',fps);settings.update('soundEnabled',false);settings.update('quality','low');
 s.progressionLocked=true;s.health.invulnerableUntil=Infinity;
 if(scenario==='crowd')prepareStressRun(s);
 const output=document.createElement('script');output.type='application/json';output.id='mobile-perf-report';document.body.append(output);
 const label=document.createElement('output');label.id='mobile-perf-status';label.style.cssText='position:fixed;top:75px;left:8px;color:white;background:#18251ce0;z-index:100;font:11px monospace';document.body.append(label);
 let start=0,done=false;const intervals=[],cpu=[],checkpoints=[];
 const summary=xs=>{const a=[...xs].sort((a,b)=>a-b);return {p50:a[Math.floor(a.length*.5)]??0,p95:a[Math.floor(a.length*.95)]??0,max:a.at(-1)??0};};
 const control={paused:false,tick(){if(done)return;if(!start)start=performance.now();const wall=(performance.now()-start)/1000;
 if(params.has('pressure')&&wall>8){const until=performance.now()+30;while(performance.now()<until){}}
 if(scenario==='crowd'){replenishStressEnemies(s);s.inventory.length=0;s.hp=10000;}
 if(scenario==='movement')setInput({x:Math.cos(wall*.35),z:Math.sin(wall*.35)});
 if(wall>=28){done=true;control.paused=true;setInput({x:0,z:0});const snap=snapshot();output.textContent=JSON.stringify({scenario,syntheticPressure:params.has('pressure'),targetFps:fps,viewport:[innerWidth,innerHeight],frames:intervals.length,fps:1000*intervals.length/intervals.reduce((a,b)=>a+b,0),interval:summary(intervals),cpu:summary(cpu),over50:intervals.filter(v=>v>50).length,checkpoints,snapshot:snap});label.textContent='Завершено · '+scenario+' · '+fps;fetch('/__proof/'+params.get('label')+'.json',{method:'POST',body:output.textContent}).then(()=>{if(params.get('sequence')==='1'){const order=['start-60','crowd-60','movement-60','start-30','crowd-30','movement-30'],next=order[order.indexOf(scenario+'-'+fps)+1];if(next){const [scene,rate]=next.split('-');location.href='/?review=mobile-perf&sound=0&sequence=1&scenario='+scene+'&fps='+rate+'&label=after-'+next;}}});}
 },afterFrame({cpuMs,intervalMs}){if(done||!start)return;const wall=(performance.now()-start)/1000;if(wall<8)return;intervals.push(intervalMs);cpu.push(cpuMs);if(intervals.length%fps===0){const snap=snapshot();checkpoints.push({wall,fps:snap.fps,renderScale:snap.renderScale,decorationScale:snap.decorationScale,pixelRatio:snap.appliedPixelRatio,draws:snap.drawCalls,triangles:snap.triangles,gpuMs:snap.gpuMs,subsystem:snap.subsystemMs});}label.textContent=scenario+' · '+fps+' · '+wall.toFixed(0)+' с';}};return control;
}

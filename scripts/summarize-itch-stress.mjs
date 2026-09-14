import {readdir,readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
const root=resolve(process.argv[2]||'docs/proof/itch-stress-20260910'),rows=[];
for(const file of (await readdir(root)).filter(n=>/^stress-(low|medium|high)-\d+\.json$/.test(n)).sort()){
 const data=JSON.parse(await readFile(join(root,file),'utf8')),r=data.report,e=r.end,t=e.frameTiming;
 const expected=e.reason.startsWith('180')?180:60;
 const targetFps=data.environment.browserRefreshHz?Math.min(60,Math.round(data.environment.browserRefreshHz)):60;
 const errors=[...r.errors,...data.environment.failures,...data.environment.failedResources,...data.environment.brokenImages];
 const pass=t.averageFps>=targetFps*.9167&&t.p95Ms<=(targetFps===60?33.4:50)&&t.over50Ms/t.frames<=.01&&t.activeWallSeconds>=expected*.98&&errors.length===0&&!e.dead&&r.populationBeforeStep.min>=100;
 const tail=r.checkpoints.filter(p=>p.wallSeconds>=expected-20);
 rows.push({file,quality:e.settings.quality,viewport:data.environment.viewport,requestedFps:60,targetFps,seconds:t.activeWallSeconds,fps:t.averageFps,p95Ms:t.p95Ms,p99Ms:t.p99Ms,maxMs:t.maxMs,over50Percent:100*t.over50Ms/t.frames,controllerMaxMs:t.fixtureMaxMs,kills:e.kills,population:r.populationBeforeStep,errors,pass,texturesAtEnd:e.textures,geometriesAtEnd:e.geometries,last20Seconds:{textures:[Math.min(...tail.map(p=>p.textures)),Math.max(...tail.map(p=>p.textures))],geometries:[Math.min(...tail.map(p=>p.geometries)),Math.max(...tail.map(p=>p.geometries))]}});
}
await writeFile(join(root,'stress-summary.json'),JSON.stringify({browser:'Codex in-app browser on current Mac; viewport tests, not physical mobile hardware',requestedFps:60,thresholds:{minFpsFraction:.9167,maxP95Ms60Hz:33.4,maxP95Ms30Hz:50,maxOver50Percent:1,minActiveFraction:.98},rows},null,2)+'\n');
console.table(rows.map(r=>({quality:r.quality,target:r.targetFps,viewport:r.viewport.join('x'),seconds:r.seconds.toFixed(1),fps:r.fps.toFixed(1),p95:r.p95Ms.toFixed(1),errors:r.errors.length,result:r.pass?'PASS':'FAIL'})));
if(rows.length<4||rows.some(r=>!r.pass))process.exitCode=1;

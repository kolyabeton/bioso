import {mkdir,writeFile} from 'node:fs/promises';
import {probe,STYLES} from './progression-probe.mjs';

const seeds=Number(process.env.PROBE_SEEDS||20),seconds=Number(process.env.PROBE_SECONDS||2490),dt=Number(process.env.PROBE_DT||.1),rows=[];
for(let i=0;i<seeds;i++){
 const row=probe('ranged',20260909+i,{seconds,dt,catalog:false});rows.push(row);console.log(JSON.stringify(row));
}
for(const style of Object.keys(STYLES))for(let i=0;i<seeds;i++){
 const row=probe(style,20261909+i,{seconds,dt,catalog:true});rows.push(row);console.log(JSON.stringify(row));
}
const group=profile=>rows.filter(row=>row.profile===profile),median=values=>values.sort((a,b)=>a-b)[Math.floor(values.length/2)]??null;
const summary=profile=>{const selected=group(profile);return{runs:selected.length,earlyDeaths:selected.filter(row=>!row.alive&&row.seconds<480).length,medianLife:median(selected.map(row=>row.seconds)),reached40:selected.filter(row=>row.seconds>=2400).length,wins:selected.filter(row=>row.won).length,firstChoiceMedian:median(selected.map(row=>row.firstChoice).filter(Number.isFinite)),styles:Object.fromEntries(Object.keys(STYLES).map(style=>{const set=selected.filter(row=>row.style===style);return[style,{runs:set.length,reached40:set.filter(row=>row.seconds>=2400).length,wins:set.filter(row=>row.won).length}];}))};};
const report={createdAt:new Date().toISOString(),method:'Sequential production painted-stage survival runs. Twenty fresh-profile ranged-controller seeds and twenty mature-catalogue seeds for each of five build directions. All XP, health, equipment, biomass and rewards are earned; no coefficient or time manipulation. Automated evidence, not human difficulty acceptance.',settings:{seeds,seconds,dt},summary:{fresh:summary('fresh'),mature:summary('mature')},rows};
await mkdir('proof',{recursive:true});await writeFile(process.env.PROBE_OUTPUT||'proof/survival-balance-probe.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report.summary));

import {writeFileSync,mkdirSync} from 'node:fs';
import {runRace} from '../tests/helpers/race-playtest.mjs';
import {RACE_RULES} from '../src/systems/events/race.js';

const runs=[];
for(const seed of [1,2,3,42,71,20317]){
 runs.push(runRace(seed,'fast',{extraStop:5}),runRace(seed,'slow'));
}
for(const build of ['fast','slow'])runs.push(runRace(20317,build,{combat:false}));
const output=process.argv[2]||'proof/race-20260908/balance.json';
mkdirSync(new URL('../proof/race-20260908/',import.meta.url),{recursive:true});
writeFileSync(output,JSON.stringify({rules:RACE_RULES,method:'Actual game.step, normal damage, collision-checked route inputs; fast build additionally stops for five seconds.',runs},null,2)+'\n');
console.table(runs.map(({seed,build,combat,extraStop,state,route,limit,elapsed,remaining,kills,hits})=>({seed,build,combat,extraStop,state,route,limit,elapsed,remaining,kills,hits})));

import {createWorldRun,stepWorldRun} from '../src/world-run.js';
import {createPilot} from '../src/qa-pilot.js';
import {chooseUpgrade} from '../src/game.js';
import {writeFile} from 'node:fs/promises';
const rows=[],seed=Number(process.env.ROUTE_SEED||20260907),dt=Number(process.env.PROBE_DT||1/60);
for(const approach of ['gate','relays'])for(const exit of ['far','near']){
 const s=createWorldRun(undefined,'core',seed),bot=createPilot({approach,exit}),checkpoints=[];let next=0,nextAssembly=0;
 while(s.time<601&&!s.won&&!s.dead){while(s.pending)chooseUpgrade(s,bot.choice(s));if(s.time>=nextAssembly){bot.assemble(s);nextAssembly=s.time+1;}stepWorldRun(s,dt,bot.direction(s));s.events=[];if(s.time>=next){checkpoints.push({time:Math.round(s.time),player:{...s.player},hp:s.hp,kills:s.kills,stage:s.mission.stage,waypoint:bot.state.waypoint});next+=30;}}
 const row={seed,dt,approach,exit,time:s.time,won:s.won,hp:s.hp,stage:s.mission.stage,cleared:[...s.exploration.cleared],checkpoints};rows.push(row);console.log(JSON.stringify(row));
}
await writeFile('proof/world-v1/routes-simulation.json',JSON.stringify(rows,null,2));

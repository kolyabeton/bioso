import {createWorldRun,stepWorldRun} from '../src/world-run.js';
import {createPilot} from '../src/qa-pilot.js';
import {chooseUpgrade} from '../src/game.js';
import {chooseBossReward} from '../src/systems/sets-loot.js';
import {writeFile} from 'node:fs/promises';
const s=createWorldRun(undefined,'survival',20260907),bot=createPilot(),checkpoints=[];let next=0,nextAssembly=0;
while(s.time<2460&&!s.dead&&!s.finalDefeated){while(s.bossRewards?.length)chooseBossReward(s,0);while(s.pending)chooseUpgrade(s,bot.choice(s));if(s.time>=nextAssembly){bot.assemble(s);nextAssembly=s.time+1;}stepWorldRun(s,Number(process.env.PROBE_DT||1/60),bot.direction(s));s.events=[];if(s.time>=next){const r={time:Math.round(s.time),player:{...s.player},hp:s.hp,kills:s.kills,level:s.level,arms:s.arms.map(p=>p?.key),enemies:s.enemies.length};checkpoints.push(r);console.log(JSON.stringify(r));next+=120;}}
await writeFile('proof/world-v1/survival-simulation.json',JSON.stringify({time:s.time,dead:s.dead,won:s.won,hp:s.hp,hits:s.health.hits,checkpoints},null,2));

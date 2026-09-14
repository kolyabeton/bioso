import {createWorldRun,stepWorldRun} from '../../src/world-run.js';
import {createPilot} from '../../src/qa-pilot.js';
import {chooseUpgrade} from '../../src/game.js';
import {chooseBossReward} from '../../src/systems/sets-loot.js';
import {stats,newProfile} from '../../src/assembly.js';
import {unlockTestProfile} from '../../src/playtest-tools.js';
import {writeFile} from 'node:fs/promises';
const rows=[];
for(const unlocked of [false,true])for(const seed of [20317,20260912,147]){
 const p=newProfile();if(unlocked)unlockTestProfile(p);
 const s=createWorldRun(p,'survival',seed),bot=createPilot(),started=performance.now();let nextAssembly=0,steps=0,reason='time-limit';
 for(;steps<18000&&!s.dead&&!s.won;steps++){
  if(performance.now()-started>20000){reason='wall-budget';break;}
  for(let j=0;j<10&&s.bossRewards?.length;j++)if(!chooseBossReward(s,0))break;
  for(let j=0;j<10&&s.pending;j++)if(!chooseUpgrade(s,bot.choice(s)))break;
  if(s.time>=nextAssembly){bot.assemble(s);nextAssembly=s.time+1;}
  stepWorldRun(s,1/30,bot.direction(s));s.events=[];
  if(!Number.isFinite(s.hp)||!Number.isFinite(s.player.x)||!Number.isFinite(stats(s).speed))throw Error('Nonfinite state');
 }
 const row={unlocked,seed,steps,seconds:s.time,wallMs:performance.now()-started,dead:s.dead,won:s.won,hp:s.hp,kills:s.kills,level:s.level,body:s.body.key,arms:s.arms.map(p=>p?.key),enemies:s.enemies.length,overloaded:stats(s).overloaded,reason:s.dead?'death':s.won?'victory':reason};rows.push(row);console.log(JSON.stringify(row));
}
await writeFile('artifacts/stable-playtest-20260912/simulation.json',JSON.stringify({method:'Headless current world from initial state, 30 simulation steps/sec. Existing pilot, earned equipment and choices. No HP grants or invulnerability. Max 600 simulation seconds / 20 wall seconds per run. Not a human difficulty verdict.',rows},null,2));

import {writeFile,mkdir} from 'node:fs/promises';
import {createWorldRun,stepWorldRun} from '../src/world-run.js';
import {createRun,spawnEnemy,chooseUpgrade} from '../src/game.js';
import {createPilot} from '../src/qa-pilot.js';
import {eligibleRecipes,ENEMY_RECIPES,BOSS_RECIPES,assembleEnemy} from '../src/systems/enemy-assembly.js';
import {tickModularAttack} from '../src/systems/enemy-combat.js';
import {territoryTarget} from '../src/systems/territories.js';
const report={createdAt:new Date().toISOString(),method:'Phase snapshots and controlled weapon/territory checks; separate 90-second fresh-profile runs on the actual biome world with ordinary pilot input and earned upgrades. No HP, items or XP granted to opening runs. Not a full 40-minute human playthrough.',phases:[],bosses:[],opening:[]};
for(const time of [0,480,960,1440,1920,2400]){
 const s=createRun(undefined,'survival',77);s.world={walkable:()=>true};s.time=time;
 const rows=eligibleRecipes(time).map(r=>{const e=spawnEnemy(s,'normal',{x:0,z:1},r.role,time);e.recipeId=r.id;e.assembly=assembleEnemy(r,e.tier);e.enemyAttack.readyAt=time;tickModularAttack(s,e,s.player,()=>{});return {recipe:r.id,tier:e.tier,hp:e.hp,armor:e.armor,speed:e.speed,warning:e.enemyAttack.warning?.warning,weapon:e.enemyAttack.warning?.key};});report.phases.push({time,rows});
}
for(let i=0;i<5;i++){
 const s=createRun(undefined,'survival',77);s.world={walkable:()=>true,flat:true};s.time=(i+1)*480;s.player={x:0,z:0};const e=spawnEnemy(s,i===4?'final':'boss',{x:0,z:2},'mass',s.time);
 territoryTarget(s,e,s.player);e.enemyAttack.readyAt=s.time;const attacks=[];
 for(let n=0;n<e.assembly.arms.filter(Boolean).length*2;n++){tickModularAttack(s,e,s.player,()=>{});const w=e.enemyAttack.warning;if(!w)throw Error('Missing warning '+e.recipeId);attacks.push(w.key);s.time=w.at;tickModularAttack(s,e,s.player,()=>{});s.time=e.enemyAttack.readyAt;}
 s.player.x=80;territoryTarget(s,e,s.player);tickModularAttack(s,e,s.player,()=>{throw Error('Returning boss attacked');});report.bosses.push({recipe:e.recipeId,expected:BOSS_RECIPES[i].id,attacks,territory:e.territory.state,warning:e.enemyAttack.warning,hp:e.hp,tier:e.tier});
}
for(const seed of [20260907,20260908,20260909]){
 const s=createWorldRun(undefined,'survival',seed),pilot=createPilot({style:'melee'});let ticks=0;
 while(s.time<90&&!s.dead&&ticks++<6000){while(s.pending)chooseUpgrade(s,pilot.choice(s));if(ticks%40===0)pilot.assemble(s);stepWorldRun(s,.05,pilot.direction(s));s.events.length=0;}
 const row={seed,seconds:s.time,hp:s.hp,hits:s.health.hits,lastCause:s.health.lastCause,kills:s.kills,level:s.level,dead:s.dead,maxEnemies:s.metrics.maxEnemies};report.opening.push(row);console.log(JSON.stringify(row));
}
await mkdir('proof/enemy-assemblies',{recursive:true});await writeFile('proof/enemy-assemblies/balance.json',JSON.stringify(report,null,2));

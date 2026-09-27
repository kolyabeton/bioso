import {createRun,spawnEnemy,step} from '../../src/game.js';
import {assignEnemyAssembly} from '../../src/systems/enemy-assembly.js';
import {paintedTerrain} from '../../src/painterly-stage.js';
const results=[];
for(const recipe of ['worker','digger']){
 const s=createRun(undefined,'survival',123);s.world=paintedTerrain(123);s.player={...s.player,x:0,y:0,z:0};s.time=120;s.arms=[];s.health.invulnerableUntil=Infinity;s.waves.credit=-1e6;s.nextElite=s.nextBoss=s.waves.nextElite=s.waves.nextBoss=Infinity;
 const e=spawnEnemy(s,'normal',{x:0,z:5},'mass',120,{promote:false});assignEnemyAssembly(s,e,120,{missionRole:'mass',missionRecipeId:recipe});e.volatile=true;e.hp=e.maxHp=100;e.speed=3;
 const events=[];
 for(let i=0;i<360;i++){step(s,1/60);for(const event of s.events)if(['volatile-blast','fuse-start','enemy-burrow-start','enemy-burrow-emerge'].includes(event.type))events.push({time:+s.time.toFixed(3),type:event.type,x:event.x,y:event.y,z:event.z});s.events.length=0;}
 results.push({recipe,hp:e.hp,detonated:e.detonated,fuse:e.fuseRemaining,locomotion:e.locomotionState,blasts:events.filter(e=>e.type==='volatile-blast').length,firstEvents:events.slice(0,5),lastEvents:events.slice(-2)});
}
console.log(JSON.stringify(results,null,2));

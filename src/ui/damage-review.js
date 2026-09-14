import {spawnEnemy} from '../game.js';
import {createPart} from '../assembly.js';
// DEV-only loop of the real attack: settle, wind up, impact, strong scatter, reset.
export function prepareDamageReview(run,_emit,now=()=>performance.now()){
 run.arms=[createPart(run,'hammer'),null];run.reliefUntil=Infinity;run.nextElite=run.nextBoss=Infinity;run.waves.nextElite=run.waves.nextBoss=Infinity;
 let rolled=0,started=now();run.rng=()=>++rolled%2?0:.99;
 function reset(){
  run.enemies=[];run.shieldStrikes=[];const shield=run.arms[0];shield.cooldown=.55;shield.reloadRemaining=0;shield.ammo=2;
  for(const [x,z] of [[-1.35,2],[0,2.2],[1.35,2]]){const e=spawnEnemy(run,'normal',{x:run.player.x+x,y:run.player.y,z:run.player.z+z},'mass',0,{promote:false});if(e){e.hp=e.maxHp=10000;e.speed=e.damage=0;e.enemyAttack.readyAt=Infinity;}}
 }
 reset();
 return{paused:false,tick(){const current=now();if(current-started>=2800){started=current;reset();}}};
}

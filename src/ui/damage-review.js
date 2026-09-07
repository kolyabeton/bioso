import {spawnEnemy,attack} from '../game.js';
import {createPart} from '../assembly.js';
// DEV-only reproducible real attacks; the pause captures the impact for mobile inspection.
export function prepareDamageReview(run,emit){
 run.enemies=[];run.arms=[createPart(run,'hammer'),null];
 for(const [x,z] of [[-1.6,0],[1.6,0]]){const e=spawnEnemy(run,'normal',{x:run.player.x+x,y:run.player.y,z:run.player.z+z});if(e){e.hp=e.maxHp=10000;e.speed=0;}}
 let rolled=0;run.rng=()=>++rolled%2?0:.99;
 attack(run,.01);for(const e of run.events)emit(e);run.events.length=0;
 return{paused:true};
}

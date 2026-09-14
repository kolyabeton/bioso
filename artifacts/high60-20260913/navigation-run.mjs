import {createHash} from 'node:crypto';
import {createWorldRun,stepWorldRun} from '../../src/world-run.js';
import {spawnEnemy} from '../../src/game.js';
const s=createWorldRun(undefined,'survival',20317),hashes=[];s.time=1120;s.health.invulnerableUntil=Infinity;for(let i=0;i<1000&&s.enemies.length<180;i++)spawnEnemy(s,i<6?'elite':'normal',null,i%5===0?'ranged':'mass',s.time,{wave:true,promote:false});
for(let frame=0;frame<900;frame++){
 stepWorldRun(s,1/60,{x:Math.cos(frame/240),z:Math.sin(frame/240)});
 if(frame===450){s.world.tiles[0].decorations=s.world.tiles[0].decorations.slice(1);for(const t of s.world.tiles)delete t.collisionDecorations;}
 const {world,...state}=s;hashes.push(createHash('sha256').update(JSON.stringify(state,(key,value)=>value instanceof Set?[...value]:value instanceof Map?[...value]:value)).digest('hex'));
}
console.log(JSON.stringify({frames:900,initialCrowd:180,finalCrowd:s.enemies.length,obstacleInvalidationFrame:450,hashes,rng:[s.rng(),s.enemyAssemblyRng(),s.consumableRng?.()]}));

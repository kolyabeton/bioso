import {difficultyNormalCount} from '../difficulty.js';
import {EVENTS} from './definitions.js';

const roles=['mass','fast','mass','ranged','mass','armored'];

export function spawnSealedEnemies(s,n,count,spawn){
 const members=[],tier=n.challengeTier||1,radius=Math.min(3.2,n.radius-2);
 // Starting the challenge moves the player to the centre after spawning.
 const player=n.state==='ready'?n:s.player;
 for(let i=0;i<difficultyNormalCount(s,count);i++){
  const serial=n.sealedSpawned||0;
  for(let attempt=0;attempt<72;attempt++){
   const angle=serial*2.399963229728653+Math.floor(attempt/3)*Math.PI/12;
   const distance=radius*(attempt%3)/2;
   const p={x:n.x+Math.cos(angle)*distance,y:n.y,z:n.z+Math.sin(angle)*distance};
   if(Math.hypot(p.x-player.x,p.z-player.z)<3||
    !s.world.walkable(p.x,p.z,1)||
    s.enemies.some(e=>e.hp>0&&Math.hypot(e.x-p.x,e.z-p.z)<(e.radius??.55)+.8))continue;
   // Frequent reinforcements must not trigger the global every-30th elite promotion.
   const e=spawn('normal',p,roles[serial%roles.length],s.mode==='survival'?s.time:300,{promote:false});
   if(!e)continue;
   e.challengeId=n.id;e.hp*=1+(tier-1)*1.5;e.maxHp=e.hp;
   members.push(e.id);n.sealedSpawned=serial+1;break;
  }
 }
 return members;
}

export function tickSealedPressure(s,n,dt,spawn){
 if(n.elapsed+1e-8>=EVENTS.sealed.duration||!spawn)return;
 const tier=n.challengeTier||1,phase=Math.min(2,Math.floor(n.elapsed/15));
 const cap=8+tier*4+phase*2,batch=2+tier+phase;
 const alive=s.enemies.filter(e=>e.hp>0&&e.challengeId===n.id).length;
 n.sealedSpawnIn??=1.5;
 // A fast clear shortens the next gap to half a second; a full arena banks no backlog.
 if(alive<3)n.sealedSpawnIn=Math.min(n.sealedSpawnIn,.5);
 n.sealedSpawnIn-=dt;
 if(n.sealedSpawnIn>1e-8)return;
 n.sealedSpawnIn=1.5-phase*.25;
 n.members.push(...spawnSealedEnemies(s,n,Math.max(0,Math.min(batch,cap-alive)),spawn));
}

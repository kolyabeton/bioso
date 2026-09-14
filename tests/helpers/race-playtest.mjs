import {createWorldRun} from '../../src/world-run.js';
import {createPart,stats} from '../../src/assembly.js';
import {beginEncounter,step,chooseUpgrade} from '../../src/game.js';
import {chooseBossReward} from '../../src/systems/sets-loot.js';
import {prepareRace} from '../../src/systems/events/race.js';
import {movementFactor} from '../../src/combat-feel.js';
import {SURVIVAL_UNLOCKS} from '../../src/catalog.js';

export function raceScenario(seed,build='fast'){
 const s=createWorldRun(undefined,'survival',seed);s.time=480;
 s.body=createPart(s,build==='fast'?'wanderer':'bastion',build==='fast'?3:1);
 s.legs=Array.from({length:build==='fast'?2:4},()=>createPart(s,build==='fast'?'runner':'plated'));
 s.arms=[createPart(s,'seed',3),createPart(s,'claws',3)];s.organs=[createPart(s,'shield'),createPart(s,'regen')];s.inventory=[];s.ground=[];s.hp=stats(s).hp;
 const n=s.encounters.nodes.find(n=>n.type==='race');if(!n)throw Error('Missing race');s.level=n.unlockLevel;
 const earned=SURVIVAL_UNLOCKS.filter(unlock=>unlock.test(s));
 s.profile.achievements=[...new Set([...s.profile.achievements,...earned.map(unlock=>unlock.id)])];
 s.profile.unlocked=[...new Set([...s.profile.unlocked,...earned.flatMap(unlock=>unlock.rewards)])];
 s.player={x:n.x,y:n.y,z:n.z,vy:0,vertical:'grounded'};
 if(!prepareRace(s,n))throw Error('Missing route');
 if(!beginEncounter(s,n.id))throw Error('Cannot enter race');
 return{s,n};
}

export function runRace(seed,build='fast',{combat=true,extraStop=0}={}){
 const {s,n}=raceScenario(seed,build),path=n.race.path,dt=.05;let cursor=1,shootSeconds=0,stuckSeconds=0,travelled=0,stop=extraStop;
 // No-combat control measures the exact same obstacle route and physical build.
 if(!combat){s.enemies=[];n.race.packs.forEach(p=>p.spawned=true);}
 for(let i=0;i<5000&&!s.dead&&n.state==='active';i++){
  if(s.pending){const index=s.choices.findIndex(c=>!['motion','tempo'].some(k=>c.id.startsWith(k)));chooseUpgrade(s,Math.max(0,index));}
  if(s.bossRewards?.length)chooseBossReward(s,0);
  while(cursor<path.length-1&&Math.hypot(path[cursor].x-s.player.x,path[cursor].z-s.player.z)<.6)cursor++;
  const goal=path[cursor],dx=goal.x-s.player.x,dz=goal.z-s.player.z,d=Math.hypot(dx,dz)||1,old={...s.player};
  if(movementFactor(s)<1)shootSeconds+=dt;
  const input=stop>0?{x:0,z:0}:{x:dx/d,z:dz/d};stop-=dt;
  step(s,dt,input);
  const travelledStep=Math.hypot(s.player.x-old.x,s.player.z-old.z);travelled+=travelledStep;
  if(travelledStep<.001&&stop<=0)stuckSeconds+=dt;
 }
 return{seed,build,combat,extraStop,state:n.state,dead:s.dead,speed:stats(s).speed,route:+n.race.length.toFixed(1),limit:n.race.limit,elapsed:+n.elapsed.toFixed(2),remaining:+Math.hypot(n.x-s.player.x,n.z-s.player.z).toFixed(1),kills:s.kills,hits:s.health.hits,shootSeconds:+shootSeconds.toFixed(2),stuckSeconds:+stuckSeconds.toFixed(2),travelled:+travelled.toFixed(1),packs:n.race.packs.filter(p=>p.spawned).length};
}

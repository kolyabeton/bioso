import {createPart,stats} from './assembly.js';
import {eventObstacles} from './gameplay-modules/event-collision.js';
import {obstacleContains} from './architecture-collision.js';
import {bodyRadius} from './elevation.js';
import {nearEncounter} from './systems/events/proximity.js';

// DEV/acceptance fixture: drive the normal game loop into a rendered lair gate.
export function prepareEventCollisionReview(s,setInput){
 s.body=createPart(s,'wanderer');s.legs=[createPart(s,'universal'),createPart(s,'universal')];s.arms=[createPart(s,'claws'),null];s.organs=[];
 s.inventory=[];s.level=30;s.progressionLocked=true;s.enemies=[];s.ground=[];
 s.nextElite=s.nextBoss=s.waves.nextElite=s.waves.nextBoss=Infinity;
 s.waves.credit=-Infinity;s.health.invulnerableUntil=Infinity;
 const gate=s.encounters.nodes.find(n=>n.type==='dungeon_roots');
 gate.unlockLevel=1;gate.state='ready';
 s.encounters={nodes:[gate],active:null};Object.assign(s.player,{x:gate.x,y:gate.y,z:gate.z+3.8});
 const report=document.createElement('script');report.id='event-collision-proof';report.type='application/json';document.body.append(report);
 let started=0,finished=false,frames=0;
 return {get paused(){return !started||finished;},tick(){
  s.inventory=[];s.ground=[];
  const info=window.bioso?.snapshot();
  if(!started&&info?.residentTiles>0&&info.loadingTiles===0&&!info.failedModels?.length)started=performance.now();
  const elapsed=started?(performance.now()-started)/1000:0;
  if(started&&!finished)frames++;finished=frames>=160;setInput({x:0,z:started&&!finished?-1:0});s.waves.credit=-Infinity;
  report.textContent=JSON.stringify({finished,elapsed,frames,simulationTime:s.time,speed:stats(s).speed,radius:bodyRadius(s),gate,player:{...s.player},blocked:finished&&obstacleContains(eventObstacles(s)[0],s.player.x,s.player.z-.25,bodyRadius(s)),overlap:obstacleContains(eventObstacles(s)[0],s.player.x,s.player.z,bodyRadius(s)),canInteract:nearEncounter(s,gate,4)});
 }};
}

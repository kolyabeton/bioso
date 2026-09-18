import {createPart,stats} from './assembly.js';
import {eventObstacles} from './gameplay-modules/event-collision.js';
import {obstacleContains} from './architecture-collision.js';
import {bodyRadius} from './elevation.js';
import {nearEncounter} from './systems/events/proximity.js';

// DEV/acceptance fixture: drive the normal game loop into a rendered lair gate.
export function prepareEventCollisionReview(s,setInput,spawn){
 s.body=createPart(s,'wanderer');s.legs=[createPart(s,'universal'),createPart(s,'universal')];s.arms=[createPart(s,'claws'),null];s.organs=[];
 s.arms[0].disabled=true;
 s.inventory=[];s.level=30;s.progressionLocked=true;s.enemies=[];s.ground=[];
 s.nextElite=s.nextBoss=s.waves.nextElite=s.waves.nextBoss=Infinity;
 s.waves.credit=-Infinity;s.health.invulnerableUntil=Infinity;
 const gate=s.encounters.nodes.find(n=>n.type==='dungeon_roots');
 gate.unlockLevel=1;gate.state='ready';
 s.encounters={nodes:[gate],active:null};Object.assign(s.player,{x:gate.x,y:gate.y,z:gate.z+3.8});
 const creatures=[
  spawn('elite',{x:gate.x,z:gate.z-4.2},'mass',0,{introductory:false,promote:false}),
  spawn('normal',{x:gate.x-2.3,z:gate.z-4.5},'mass',0,{introductory:false,promote:false}),
  spawn('normal',{x:gate.x+2.3,z:gate.z-4.5},'mass',0,{introductory:false,promote:false}),
 ].filter(Boolean);
 for(const e of creatures)Object.assign(e,{assembly:null,specialty:null,role:'mass',speed:1.5,damage:0,hp:1e9,maxHp:1e9});
 const report=document.createElement('script');report.id='event-collision-proof';report.type='application/json';document.body.append(report);
 let started=0,finished=false,frames=0,creatureOverlap=false;
 return {get paused(){return !started||finished;},tick(){
  s.inventory=[];s.ground=[];
  const info=window.bioso?.snapshot();
  if(!started&&info?.residentTiles>0&&info.loadingTiles===0&&!info.failedModels?.length)started=performance.now();
  const elapsed=started?(performance.now()-started)/1000:0;
  if(started&&!finished)frames++;finished=frames>=160;setInput({x:0,z:started&&!finished?-1:0});s.waves.credit=-Infinity;
  const obstacle=eventObstacles(s)[0];creatureOverlap||=creatures.some(e=>obstacleContains(obstacle,e.x,e.z,e.radius));
  report.textContent=JSON.stringify({finished,elapsed,frames,simulationTime:s.time,speed:stats(s).speed,radius:bodyRadius(s),gate,player:{...s.player},blocked:finished&&obstacleContains(obstacle,s.player.x,s.player.z-.25,bodyRadius(s)),overlap:obstacleContains(obstacle,s.player.x,s.player.z,bodyRadius(s)),canInteract:nearEncounter(s,gate,4),creatureOverlap,creatures:creatures.map(e=>({id:e.id,kind:e.kind,x:e.x,z:e.z,alive:e.hp>0,overlap:obstacleContains(obstacle,e.x,e.z,e.radius)}))});
 }};
}

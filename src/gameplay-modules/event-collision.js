import profiles from './event-footprints.json' with {type:'json'};
import {obstacleContains} from '../architecture-collision.js';
import {availableEncounter} from '../systems/events/proximity.js';
import {EVENT_PRESENTATION} from './event-presentation.js';

const bounds=Object.fromEntries(Object.entries(profiles).map(([model,p])=>[model,{...p,radius:Math.max(...p.hull.map(([x,z])=>Math.hypot(x,z)))}]));
export function eventObstacles(s){
 const nodes=s.encounters?.active?.dungeon?[s.encounters.active]:s.encounters?.nodes||[];
 return nodes.filter(n=>EVENT_PRESENTATION[n.type]&&availableEncounter(s,n)).map(n=>{
  const {model,size}=EVENT_PRESENTATION[n.type];
  return {x:n.x,z:n.z,model,size,collisionProfile:bounds[model]};
 });
}
export function eventMovementClear(obstacles,from,x,z,r){
 return obstacles.every(o=>{
  if(!obstacleContains(o,x,z,r))return true;
  // An event can appear on level-up, and existing dungeon/arena transitions
  // place the player at its centre. Allow escape from overlap, never entry.
  return obstacleContains(o,from.x,from.z,r)&&Math.hypot(x-o.x,z-o.z)>Math.hypot(from.x-o.x,from.z-o.z)+1e-8;
 });
}

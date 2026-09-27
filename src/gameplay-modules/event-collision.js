import profiles from './event-footprints.json' with {type:'json'};
import {obstacleContains} from '../architecture-collision.js';
import {availableEncounter,layerEncounters} from '../systems/events/proximity.js';
import {EVENT_PRESENTATION} from './event-presentation.js';
import {move} from '../terrain.js';
import {ignoresBossObstacles,moveGiantBoss} from '../boss-traversal.js';

const bounds=Object.fromEntries(Object.entries(profiles).map(([model,p])=>[model,{...p,radius:Math.max(...p.hull.map(([x,z])=>Math.hypot(x,z)))}]));
export function eventObstacles(s){
 const nodes=layerEncounters(s);
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

const creatureWorlds=new WeakMap();
/** Collision view shared by every moving creature, including navigation searches. */
export function eventCollisionWorld(s,creature){
 const source=s.world,cached=creatureWorlds.get(s);
 const bossThroughThickets=s.mode==='survival'&&(creature?.kind==='boss'||creature?.kind==='final')&&!ignoresBossObstacles(creature)&&!!source.canMoveWithoutThickets;
 if(cached?.source===source)return bossThroughThickets?cached.bossWorld:cached.world;
 const obstacles=()=>eventObstacles(s),world=Object.create(source);
 const walkable=(x,z,r)=>!source.walkable||source.walkable(x,z,r);
 const clear=(from,to,r)=>eventMovementClear(obstacles(),from,to.x,to.z,r);
 world.eventCollisionKey=()=>obstacles().map(o=>`${o.model}:${o.x}:${o.z}:${o.size}`).join('|');
 world.walkable=(x,z,r)=>walkable(x,z,r)&&eventMovementClear(obstacles(),{x,z},x,z,r);
 world.canMove=(from,to,r)=>(source.canMove?source.canMove(from,to,r):walkable(to.x,to.z,r))&&clear(from,to,r);
 // Event structures block ground traffic; airborne creatures keep the world's
 // original flight rules and may pass above them.
 world.flyable=(x,z,r)=>source.flyable?source.flyable(x,z,r):walkable(x,z,r);
 world.canFly=(from,to,r)=>source.canFly?source.canFly(from,to,r):source.flyable?source.flyable(to.x,to.z,r):walkable(to.x,to.z,r);
 const bossWorld=Object.create(world);
 bossWorld.walkable=(x,z,r)=>source.walkableWithoutThickets(x,z,r)&&eventMovementClear(obstacles(),{x,z},x,z,r);
 bossWorld.canMove=(from,to,r)=>source.canMoveWithoutThickets(from,to,r)&&clear(from,to,r);
 creatureWorlds.set(s,{source,world,bossWorld});
 return bossThroughThickets?bossWorld:world;
}
export function moveCreature(s,creature,dx,dz,r=creature.radius){
 if(ignoresBossObstacles(creature)){moveGiantBoss(s,creature,dx,dz);return;}
 move(eventCollisionWorld(s,creature),creature,dx,dz,r);
}

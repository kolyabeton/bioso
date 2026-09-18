import {CATALOG} from '../catalog.js';
import {assignEnemyAssembly,ENEMY_RECIPES} from './enemy-assembly.js';
import {survivalSpawnLimit,survivalWavePosition} from './survival-cadence.js';
import {resetEnemyNavigation} from '../world-navigation.js';
import {cancelEnemyAttack} from './enemy-combat.js';
import {combatTime} from './mutations.js';

export const SURVIVAL_RESPONSE_START=15*60;
export const SURVIVAL_RESPONSE_INTERVAL=90;

const recipe=id=>ENEMY_RECIPES.find(entry=>entry.id===id);
const rangedModes=new Set(['projectile','rocket','acid','arc']);
const meleeModes=new Set(['sector','area','contact']);

export function survivalResponseBuild(s){
 const arms=(s.arms||[]).filter(part=>part&&!part.disabled),companions=(s.abilities?.companions||[]).length;
 if(companions>=2||arms.some(part=>part.key==='drone'))return'swarm';
 const ranged=arms.filter(part=>rangedModes.has(CATALOG[part.key]?.mode)).length,melee=arms.filter(part=>meleeModes.has(CATALOG[part.key]?.mode)).length;
 if(ranged>melee)return'ranged';
 if(melee>ranged)return'melee';
 return'mixed';
}

const templates=Object.freeze({
 ranged:['shield-bearer','runner','chaser','acid-spitter','sower'],
 swarm:['robo-bee','shield-bearer','acid-spitter','runner','sower'],
 melee:['acid-spitter','crusher','chaser','sower','carapace'],
});
const labels=Object.freeze({ranged:'щитоносцы и фланкеры',swarm:'охотники на рой',melee:'кислотники и таранщики'});

export function survivalResponseSize(time){return Math.min(5,3+Math.floor(Math.max(0,time-SURVIVAL_RESPONSE_START)/(5*60)));}

export function survivalResponseRoster(s,index,time=s.time){
 const build=survivalResponseBuild(s),counter=build==='mixed'?['ranged','swarm','melee'][((s.seed>>>0)+index)%3]:build;
 const ids=templates[counter].slice(0,survivalResponseSize(time));
 return{build,counter,label:labels[counter],members:ids.map((recipeId,slot)=>({recipeId,kind:slot===0?'elite':'normal',leader:slot===0,specialty:slot===0&&counter==='swarm'?'drone-hunter':null}))};
}

function maintainResponseEnemies(s){
 // Squads never despawn, not even once the next one is due: an abandoned member is
 // brought back to the front instead, whichever appearance it belongs to.
 for(const enemy of s.enemies){
  if(enemy.hp<=0||enemy.survivalResponseIndex==null||enemy.challengeId||enemy.habitat||Math.hypot(enemy.x-s.player.x,enemy.z-s.player.z)<=56)continue;
  const point=survivalWavePosition(s,enemy.radius);if(!point)continue;
  Object.assign(enemy,point,{y:s.world.heightAt?.(point.x,point.z)??0,windup:null,kickX:0,kickZ:0});
  resetEnemyNavigation(s,enemy);cancelEnemyAttack(enemy,combatTime(s));delete enemy.locomotionState;
 }
}

/** A bounded, retryable Survival-only response squad. It never owns wave completion. */
export function tickSurvivalResponse(s,spawn){
 if(s.mode!=='survival'||s.dead||s.encounters?.active||s.overrun?.state==='active'||s.won&&!s.continued)return;
 const state=s.survivalResponse??={nextAt:SURVIVAL_RESPONSE_START,index:0,pending:null,retryAt:0};
 maintainResponseEnemies(s);
 if(s.time<state.nextAt||s.time<state.retryAt)return;
 if(!state.pending){const roster=survivalResponseRoster(s,state.index,s.time);state.pending={...roster,index:state.index,at:s.time,issued:0,announced:false};}
 const pending=state.pending,limit=survivalSpawnLimit(s)?.softCap??120;let living=s.enemies.filter(enemy=>enemy.hp>0).length;
 while(pending.issued<pending.members.length&&living<limit){
  const member=pending.members[pending.issued],definition=recipe(member.recipeId);if(!definition)throw Error(`Unknown Survival response recipe: ${member.recipeId}`);
  const enemy=spawn(member.kind,null,definition.role,pending.at,{introductory:false,promote:false});
  if(!enemy){state.retryAt=s.time+1;break;}
  assignEnemyAssembly(s,enemy,pending.at,{missionRole:definition.role,missionRecipeId:definition.id});
  if(member.specialty)enemy.specialty=member.specialty;
  Object.assign(enemy,{territory:null,survivalResponseIndex:pending.index,survivalResponseBuild:pending.build,survivalResponseCounter:pending.counter,survivalResponseLeader:member.leader});
  pending.issued++;living++;state.retryAt=0;
  if(!pending.announced){pending.announced=true;s.events.push({type:'survival-response',index:pending.index,build:pending.build,counter:pending.counter,count:pending.members.length,x:enemy.x,y:enemy.y??0,z:enemy.z},{type:'notice',text:`Ответ среды · ${pending.label}`});}
 }
 if(pending.issued===pending.members.length){state.index++;state.nextAt=s.time+SURVIVAL_RESPONSE_INTERVAL;state.pending=null;state.retryAt=0;}
 return state;
}

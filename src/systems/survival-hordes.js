import {difficultyNormalCount} from './difficulty.js';
import {SURVIVAL_CADENCE,advanceSurvivalWave,survivalSpawnLimit,survivalWavePosition,survivalWaveSpec} from './survival-cadence.js';
import {resetEnemyNavigation} from '../world-navigation.js';
import {cancelEnemyAttack} from './enemy-combat.js';
import {combatTime} from './mutations.js';
import {phaseAt} from './balance.js';
import {eligibleRecipes} from './enemy-assembly.js';
import {assignWaveEliteDisposition} from './territories.js';
const PATTERNS=['ring','pincers','perimeter','spiral'];

function packRoster(s,q,pack){
 const eliteCount=pack===0?Math.ceil(q.eliteCap/2):Math.floor(q.eliteCap/2);
 const roles=[...new Set(eligibleRecipes(q.at).map(r=>r.role))].filter(role=>role!=='mass');
 const signature=phaseAt(q.at).minuteSignature;
 const cycle=roles.includes(signature)?[...roles,signature]:roles;
 let normal=0,bag=[];
 const roster=Array.from({length:eliteCount+difficultyNormalCount(s,(q.packSize-eliteCount)*SURVIVAL_CADENCE.density)},(_,i)=>{
  if(i<eliteCount)return{kind:'elite',role:'mass'};
  // Spread filler through the pack; every other slot cycles all unlocked roles.
  const mass=Math.ceil((normal+1)*SURVIVAL_CADENCE.massShare)>Math.ceil(normal*SURVIVAL_CADENCE.massShare);normal++;
  if(mass||!cycle.length)return{kind:'normal',role:'mass'};
  if(!bag.length){
   bag=[...cycle];
   for(let j=bag.length-1;j>0;j--){const k=Math.floor(s.rng()*(j+1));[bag[j],bag[k]]=[bag[k],bag[j]];}
  }
  return{kind:'normal',role:bag.pop()};
 });
 const ordinaryFast=eligibleRecipes(q.at,'fast').filter(recipe=>recipe.id!=='biter');
 for(const member of roster)if(member.kind==='normal'&&member.role==='fast'&&ordinaryFast.length)member.recipeId=ordinaryFast[Math.floor(s.rng()*ordinaryFast.length)].id;
 if(signature!=='fast'||!eligibleRecipes(q.at).some(recipe=>recipe.id==='biter'))return roster;
 const index=roster.findLastIndex(member=>member.kind==='normal'&&member.role==='fast'),fallback=roster.findLastIndex(member=>member.kind==='normal');
 if(index<0&&fallback<0)return roster;
 roster.splice(index>=0?index:fallback,1);
 roster.push({kind:'normal',role:'fast',recipeId:'biter',groupId:`biter:${q.index}:${pack}`,count:30});
 return roster;
}

// Describes a finite pack; there is deliberately no scheduled opening time.
export const survivalHordeSchedule=(index,time=0)=>({count:survivalWaveSpec(index,time).packSize,pattern:PATTERNS[index%PATTERNS.length]});
function position(s,pattern,index,count){
 const spread=index/Math.max(1,count-1),side=index%2?1:-1;
 if(pattern==='pincers')return{x:s.player.x+side*(24+8*spread),z:s.player.z+(spread-.5)*34};
 if(pattern==='perimeter'){const a=index*Math.PI*2/count;return{x:s.player.x+Math.cos(a)*(32+6*Math.sin(index*2.1)),z:s.player.z+Math.sin(a)*(32+6*Math.sin(index*2.1))};}
 if(pattern==='spiral'){const a=index*.72,r=20+8*spread;return{x:s.player.x+Math.cos(a)*r,z:s.player.z+Math.sin(a)*r};}
 const a=index*Math.PI*2/count;return{x:s.player.x+Math.cos(a)*27,z:s.player.z+Math.sin(a)*27};
}
function returnStragglers(s){
 // A wave member is never despawned. Whoever the player left behind — including
 // survivors of a finished pack and their descendants — is brought back to the front
 // instead, so the crowd the run spawned always stays on the field.
 for(const e of s.enemies){
  if(e.hp<=0||!(e.survivalWaveIndex!=null||e.kind==='normal'&&e.waveSpawn&&!e.summonOwner)||e.challengeId||e.habitat||Math.hypot(e.x-s.player.x,e.z-s.player.z)<=56)continue;
  const p=survivalWavePosition(s,e.radius);if(!p)continue;
  Object.assign(e,p,{y:s.world.heightAt?.(p.x,p.z)??0,windup:null,kickX:0,kickZ:0});
  resetEnemyNavigation(s,e);cancelEnemyAttack(e,combatTime(s));delete e.locomotionState;
  if(e.fuseAnchor)e.fuseAnchor={x:e.x,z:e.z};
  if(e.territory){e.territory.home={x:e.x,y:e.y,z:e.z};e.territory.state=e.territory.pursuit?'engaged':'idle';}
 }
}
export function tickSurvivalHordes(s,dt,spawn){
 if(s.mode!=='survival'||s.encounters?.active||s.overrun?.state==='active'||s.dead||s.won&&!s.continued)return;
 // Existing review fixtures suppress automatic pressure with negative credit.
 if(s.waves.credit<0)return;
 advanceSurvivalWave(s);returnStragglers(s);
 const pressure=survivalSpawnLimit(s);if(pressure.intro||pressure.rest)return;
 const q=s.waves.cadence;
 if(!q.rosters){
  q.rosters=[0,1].map(pack=>packRoster(s,q,pack));
  q.packSize=q.rosters[q.pack].length;
 }
 let living=s.enemies.filter(e=>e.hp>0).length;
 const pattern=PATTERNS[q.index%PATTERNS.length];
 while(q.issued<q.packSize&&(living<pressure.softCap||q.rosters[q.pack][q.issued].groupId)){
  const first=q.rosters[q.pack][q.issued],group=Array.from({length:first.count||1},()=>first);let spawned=0;
  for(const [groupIndex,member]of group.entries()){
   const index=first.count?groupIndex:q.issued,p=position(s,pattern,index,first.count||q.packSize);
   const enemy=spawn(member.kind,p,member.role,q.at,{promote:false,wave:true,recipeId:member.recipeId})||spawn(member.kind,null,member.role,q.at,{promote:false,wave:true,recipeId:member.recipeId});
   if(!enemy)break;
   enemy.survivalWaveIndex=q.index;enemy.survivalWavePack=q.pack;enemy.waveSpawn=true;enemy.groupId=member.groupId??enemy.groupId;
   assignWaveEliteDisposition(s,enemy);enemy.hordePattern=pattern;enemy.hordeEvent=true;spawned++;living++;
  }
  if(!spawned)break;
  if(spawned<group.length)break;
  q.issued++;
 }
}

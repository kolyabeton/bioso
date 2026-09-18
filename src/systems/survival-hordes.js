import {SURVIVAL_CADENCE,advanceSurvivalWave,survivalSpawnLimit,survivalWavePosition,survivalWaveSpec} from './survival-cadence.js';
import {resetEnemyNavigation} from '../world-navigation.js';
import {cancelEnemyAttack} from './enemy-combat.js';
import {combatTime} from './mutations.js';
import {phaseAt} from './balance.js';
import {signatureRole} from './waves.js';
import {assignWaveEliteDisposition} from './territories.js';
const PATTERNS=['ring','pincers','perimeter','spiral'];

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
  const phase=phaseAt(q.at);
  q.rosters=[0,1].map(pack=>Array.from({length:q.packSize},(_,i)=>({
   kind:i<(pack===0?Math.ceil(q.eliteCap/2):Math.floor(q.eliteCap/2))?'elite':'normal',
   role:s.rng()<SURVIVAL_CADENCE.massShare?'mass':signatureRole(s,phase)
  })));
 }
 let living=s.enemies.filter(e=>e.hp>0).length;
 const pattern=PATTERNS[q.index%PATTERNS.length];
 while(q.issued<q.packSize&&living<pressure.softCap){
  const member=q.rosters[q.pack][q.issued],p=position(s,pattern,q.issued,q.packSize);
  const enemy=spawn(member.kind,p,member.role,q.at,{promote:false,wave:true})||spawn(member.kind,null,member.role,q.at,{promote:false,wave:true});
  if(!enemy)break; // Retry this exact slot; neither failures nor a full cap clear it.
  enemy.survivalWaveIndex=q.index;enemy.survivalWavePack=q.pack;enemy.waveSpawn=true;
  assignWaveEliteDisposition(s,enemy);enemy.hordePattern=pattern;enemy.hordeEvent=true;q.issued++;living++;
 }
}

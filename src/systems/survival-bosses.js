import {MISSIONS} from '../catalog.js';
import {spawnPoint} from '../terrain.js';
import {enemyBalance,SURVIVAL_PRESSURE,SURVIVAL_WAVE_BOSS_LEVELS,SURVIVAL_MOTHER_GROWTH_AT} from './balance.js';
import {MISSION_BOSSES,setupMissionBoss} from './mission-bosses.js';

export const SURVIVAL_FIRST_BOSS_AT=9*60;
export const SURVIVAL_BOSS_INTERVAL=7*60;
export const SURVIVAL_BOSS_LIMIT=5;
export const survivalBossScheduledAt=count=>SURVIVAL_FIRST_BOSS_AT+Math.max(0,count-1)*SURVIVAL_BOSS_INTERVAL;

/** Mission encounters supplement the fixed habitats; only survival time advances this schedule. */
export function tickSurvivalBosses(s,spawn){
 if(s.mode!=='survival'||s.dead||s.encounters?.active||s.overrun?.state==='active'||s.won&&!s.continued)return;
 for(const enemy of s.enemies.filter(e=>e.hp>0&&e.kind==='final')){
  const stage=Math.max(0,Math.floor((s.time-SURVIVAL_MOTHER_GROWTH_AT)/60));
  if(stage>(enemy.post15Stage||0)){
   const steps=stage-(enemy.post15Stage||0),oldMax=enemy.maxHp;
   enemy.maxHp*=Math.pow(1.1,steps);enemy.hp+=enemy.maxHp-oldMax;enemy.armor=(enemy.armor||0)+2*steps;enemy.speed*=Math.pow(1.03,steps);enemy.attackRecoveryScale=(enemy.attackRecoveryScale||1)*Math.pow(.97,steps);enemy.post15Stage=stage;
   s.events.push({type:'notice',text:`Матка усиливается · ступень ${stage}`});
  }
 }
 const schedule=s.survivalBosses??={nextAt:SURVIVAL_FIRST_BOSS_AT,count:0,rotation:[]};
 if(schedule.count>=SURVIVAL_BOSS_LIMIT){schedule.nextAt=Infinity;return;}
 if(s.time<schedule.nextAt)return;
 if(s.enemies.some(e=>e.hp>0&&e.survivalInvader))return;
 const missionIndex=schedule.count%MISSIONS.length,mission=MISSIONS[missionIndex],design=MISSION_BOSSES[mission.bossId],superBoss=schedule.count%2===1,levelIndex=Math.min(4,Math.floor(schedule.count/1.25)),level=SURVIVAL_WAVE_BOSS_LEVELS[levelIndex];
 // Stationary roots must spawn within attack range. Respect the full authored footprint.
 const footprint=design.nodes?Math.max(design.radius,8):design.radius;
 const position=spawnPoint(s.world,s.player,s.rng,18,design.speed===0?22:32,footprint);
 if(!position)return;
 const enemy=spawn('boss',position,'mass',s.time,{introductory:false});
 if(!enemy)return;
 const overtime=Math.max(0,s.time-2400)/SURVIVAL_BOSS_INTERVAL;
 enemy.hp=enemy.maxHp=Math.round(enemyBalance(s.time,'boss').hp*SURVIVAL_PRESSURE.hp*level.hp*(superBoss?2:1)*(1+overtime*.5));
 enemy.bossName=mission.bossName;enemy.bossLevel=levelIndex+1;enemy.survivalInvader=true;enemy.survivalSuperBoss=superBoss;enemy.territory=null;
 setupMissionBoss(s,enemy,mission.bossId);
 enemy.bossSpeedScale=level.attack*(superBoss?1.15:1);
 enemy.speed*=enemy.bossSpeedScale;
 enemy.bossArmorBonus=level.armor+(superBoss?5:0);
 enemy.armor+=enemy.bossArmorBonus;
 schedule.rotation.push(mission.id);schedule.count++;schedule.nextAt=schedule.count<SURVIVAL_BOSS_LIMIT?survivalBossScheduledAt(schedule.count+1):Infinity;
 enemy.arrivalSounded=true;s.events.push({type:'boss-arrival',boss:enemy.id,kind:enemy.kind,x:enemy.x,y:enemy.y??0,z:enemy.z},{type:'notice',text:`${superBoss?'Супербосс':'Вторжение'} · УР. ${enemy.bossLevel}: ${mission.bossName}`});
 return enemy;
}

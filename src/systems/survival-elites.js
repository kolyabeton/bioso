export const SURVIVAL_ELITE_INTERVAL=60;

/** Local mini-bosses use the Survival clock, independently of assault quotas. */
export function tickSurvivalElites(s,spawn){
 if(s.mode!=='survival'||s.dead||s.encounters?.active||s.overrun?.state==='active'||s.won&&!s.continued)return;
 const schedule=s.survivalElites??={nextAt:SURVIVAL_ELITE_INTERVAL,count:0};
 if(s.time<schedule.nextAt||s.time<(schedule.retryAt||0))return;
 // The coordinator finds a clear point near the player and gives the elite a
 // home territory. Do not assign wave pursuit or spend the assault's quota.
 const enemy=spawn('elite');
 if(!enemy){schedule.retryAt=s.time+1;return;}
 enemy.survivalMinuteElite=true;enemy.scheduledAt=schedule.nextAt;
 schedule.count++;schedule.retryAt=0;
 // Keep minute boundaries after a delayed placement, without a catch-up burst.
 schedule.nextAt=(Math.floor(s.time/SURVIVAL_ELITE_INTERVAL)+1)*SURVIVAL_ELITE_INTERVAL;
 return enemy;
}

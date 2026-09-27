import {MISSIONS,SURVIVAL_UNLOCKS,WEAPON_UNLOCKS} from './catalog.js';
import {ACHIEVEMENTS,journal} from './systems/achievements.js';
import {meta} from './systems/meta-progression.js';
import {survivalEscapeMass} from './systems/survival-endgame.js';

// The playtest stand uses its own save. Ordinary saves and the older all-open
// stand remain untouched.
export const playtestStorage=storage=>({
 getItem:key=>storage.getItem('bioso.completed.v1:'+key),
 setItem:(key,value)=>storage.setItem('bioso.completed.v1:'+key,value),
});

// Five mission victories, followed by one representative full 100% survival
// run: 20 minutes, level 30, 10 elites and two bosses. Mission and run kills
// also satisfy the three ordinary weapon goals. Build, exploration and
// multi-run goals depend on separate actions and remain locked.
export function completePlaytestProfile(profile){
 const survivalIds=SURVIVAL_UNLOCKS.map(a=>a.id);
 const expansionIds=['survival:level-25','survival:level-30'];
 const achievementIds=[...MISSIONS.map(m=>'mission:'+m.id),'meta:mirror',...WEAPON_UNLOCKS.map(a=>a.id),...survivalIds,...expansionIds,'survival:escape-hard'];
 profile.achievements=[...new Set([...profile.achievements,...achievementIds])];
 const rewards=[...MISSIONS.flatMap(m=>m.rewards),...WEAPON_UNLOCKS.map(a=>a.key),...SURVIVAL_UNLOCKS.flatMap(a=>a.rewards),...ACHIEVEMENTS.filter(a=>expansionIds.includes(a.id)).flatMap(a=>a.reward.keys||[])];
 profile.unlocked=[...new Set([...profile.unlocked,...rewards])];
 const progress=meta(profile);
 progress.runs=Math.max(1,progress.runs);
 progress.wins=Math.max(1,progress.wins);
 progress.rerolls=Math.max(5,progress.rerolls); // Victory grants three; level 25 and the hard ending grant one each.
 progress.biomassRecord=Math.max(survivalEscapeMass(100),progress.biomassRecord);
 progress.best['meta:mirror']=1;
 progress.shieldBearerKills=Math.max(30,progress.shieldBearerKills);
 progress.weaponKills.pistol=Math.max(30,progress.weaponKills.pistol);
 progress.weaponKills.total=Math.max(60,progress.weaponKills.total);
 progress.survivalAchievements.level20Runs=Math.max(1,progress.survivalAchievements.level20Runs);
 progress.survivalAchievements.bosses=Math.max(2,progress.survivalAchievements.bosses);
 progress.survivalAchievements.elites=Math.max(10,progress.survivalAchievements.elites);
 progress.survivalAchievements.kills=Math.max(600,progress.survivalAchievements.kills);
 const log=journal(profile),date=new Date().toISOString().slice(0,10);
 for(const achievement of ACHIEVEMENTS){
  if(!achievementIds.includes(achievement.id))continue;
  log.best[achievement.id]=achievement.conditions.map(condition=>condition.goal);
  log.dates[achievement.id]??=date;
 }
 return profile;
}

import {addXP} from '../game.js';
import {trackAchievements,journal} from '../systems/achievements.js';
import {normalizeSurvivalProgress} from '../systems/survival-achievement-progress.js';
// Dev-only isolated state on the real game route. main.js owns in-memory storage.
export function prepareAchievementsReview(s,params){
 const variant=params.get('case')||'progress';
 if(variant==='chassis-progress')s.profile.meta.chassisProgress={recycledBiomass:64320,frozenEnemies:2456,preventedShots:5381,electricKills:27312,capacity:300};
 if(variant==='chassis-earned')s.profile.meta.chassisProgress={recycledBiomass:100000,frozenEnemies:5000,preventedShots:10000,electricKills:50000,capacity:300};
 if(variant==='weapons')s.profile.meta.weaponKills={pistol:17,total:39};
 if(variant==='shield')s.profile.meta.shieldBearerKills=29;
 if(variant!=='empty'){
  Object.assign(s.profile.meta,{runs:8,wins:1,rerolls:2});s.time=340;s.elites=3;s.bosses=1;s.level=6;
  s.exploration.visited=new Set();
  for(const biome of ['forest','gardens','city']){const tile=s.world.tiles.find(t=>t.biome===biome);if(tile)s.exploration.visited.add(tile.id);}
  const node=s.encounters.nodes.find(n=>n.type==='infection');if(node)node.state='complete';
  addXP(s,0);trackAchievements(s);journal(s.profile).best['meta:spring']=[4,1];
 }
 if(variant==='earned'){s.profile.achievements.push('meta:spring');s.profile.unlocked.push('spring');journal(s.profile).dates['meta:spring']='2026-09-08';}
 if(variant==='survival-progress'||variant==='survival-earned'){
  s.profile.meta.survivalAchievements=normalizeSurvivalProgress({kills:12345,elites:327,bosses:42,level20Runs:7,recycled:168,sets:['wanderer','hunter','bastion'],setKills:{hunter:349},mutationKills:{hive:287}});
  if(variant==='survival-earned'){
   s.level=30;s.profile.meta.survivalAchievements.setKills.hunter=500;
   for(const part of [s.body,...s.arms,...s.legs,...s.organs].filter(Boolean))part.setId='hecaton';
   s.survivalAchievementRun={level20Recorded:false,setBosses:{hecaton:3}};
  }
  trackAchievements(s);
 }
 if(variant==='end'){s.dead=true;return{name:'end'};}
 const id=params.get('id');return id?{name:'meta-achievement',params:{id}}:{name:'profile'};
}

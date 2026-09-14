import {addXP} from '../game.js';
import {trackAchievements,journal} from '../systems/achievements.js';
// Dev-only isolated state on the real game route. main.js owns in-memory storage.
export function prepareAchievementsReview(s,params){
 const variant=params.get('case')||'progress';
 if(variant==='weapons')s.profile.meta.weaponKills={pistol:17,total:39};
 if(variant!=='empty'){
  Object.assign(s.profile.meta,{runs:8,wins:1,rerolls:2});s.time=340;s.elites=3;s.bosses=1;s.level=6;
  s.exploration.visited=new Set();
  for(const biome of ['forest','gardens','city']){const tile=s.world.tiles.find(t=>t.biome===biome);if(tile)s.exploration.visited.add(tile.id);}
  const node=s.encounters.nodes.find(n=>n.type==='infection');if(node)node.state='complete';
  addXP(s,0);trackAchievements(s);journal(s.profile).best['meta:spring']=[4,1];
 }
 if(variant==='earned'){s.profile.achievements.push('meta:spring');s.profile.unlocked.push('spring');journal(s.profile).dates['meta:spring']='2026-09-08';}
 if(variant==='end'){s.dead=true;return{name:'end'};}
 const id=params.get('id');return id?{name:'meta-achievement',params:{id}}:{name:'profile'};
}

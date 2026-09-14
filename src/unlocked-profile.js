import {CATALOG} from './catalog.js';
import {ACHIEVEMENTS,journal} from './systems/achievements.js';
import {META_ACHIEVEMENTS} from './systems/meta-progression.js';

// Dedicated export: only permanent discoveries change; runs use ordinary rules.
export const unlockedStorage=storage=>({
  getItem:key=>storage.getItem('bioso.unlocked.v1:'+key),
  setItem:(key,value)=>storage.setItem('bioso.unlocked.v1:'+key,value),
});
export function unlockProfile(profile){
  profile.unlocked=Object.keys(CATALOG);
  profile.achievements=[...new Set([
    ...profile.achievements,
    ...ACHIEVEMENTS.flatMap(a=>[a.id,...(a.aliases||[])]),
    ...META_ACHIEVEMENTS.map(a=>a.id),
  ])];
  const progress=journal(profile);
  for(const a of ACHIEVEMENTS)progress.best[a.id]=a.conditions.map(c=>c.goal);
  return profile;
}

// Guaranteed event rewards advance every four player levels, up to rank V.
// Keep an event's authored or already rolled reward as a minimum.
export function encounterRewardTier(s,n){
 const levelTier=1+Math.floor((Math.max(1,s.level||1)-1)/4);
 return Math.min(5,Math.max(levelTier,n.rewardTier||1,n.rewardPart?.tier||1));
}

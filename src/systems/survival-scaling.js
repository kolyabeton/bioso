export const survivalPost20Multiplier=time=>2**(Math.max(0,time-20*60)/(10*60));

// Habitat bosses exist from the start, so their damage follows the current run clock.
export function updateSurvivalBossDamage(s,e){
 if(s.mode!=='survival'||!['boss','final'].includes(e.kind))return;
 const scale=survivalPost20Multiplier(s.time||0),previous=e.survivalDamageScale??1;
 e.damage*=scale/previous;e.survivalDamageScale=scale;
}

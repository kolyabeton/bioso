import {difficultyCounterScale} from './difficulty.js';

// A matchup is a resistance, never a bonus: unlisted weapons stay at ×1.
// The values below are the full-strength penalties on Hard.
export const ENEMY_WEAPON_COUNTERS=Object.freeze({
 claws:Object.freeze({armored:.5,flying:.65}),
 hammer:Object.freeze({flying:0,ranged:.75}),
 drill:Object.freeze({flying:.7,swarm:.75}),
 whip:Object.freeze({armored:.75,flying:.65}),
 fangs:Object.freeze({armored:.5,flying:.65}),
 needle:Object.freeze({fast:.7,swarm:.75}),
 rocket:Object.freeze({shielded:.65}),
 arc:Object.freeze({shielded:.5}),
 acid:Object.freeze({flying:0,acidic:.5}),
 harpoon:Object.freeze({swarm:.7,fast:.8}),
 drone:Object.freeze({armored:.75,fast:.8}),
 shieldArm:Object.freeze({flying:0,fast:.75}),
});

export function enemyInteractionTags(e){
 const tags=new Set();
 if(e?.flying||e?.role==='flying')tags.add('flying');
 if(e?.role==='armored')tags.add('armored');
 if(e?.role==='fast')tags.add('fast');
 if(e?.role==='ranged')tags.add('ranged');
 if(e?.recipeId==='acid-spitter')tags.add('acidic');
 if(e?.specialty==='shield-bearer')tags.add('shielded');
 // Split and summoned bodies are the intended clustered/swarm targets.
 if(e?.specialty==='divider'||e?.summonOwner||e?.kind==='boss-drone')tags.add('swarm');
 return tags;
}

export function enemyWeaponMultiplier(s,e,weaponKey){
 const counters=ENEMY_WEAPON_COUNTERS[weaponKey];
 if(!counters)return 1;
 const tags=enemyInteractionTags(e),base=Math.min(...[...tags].filter(tag=>counters[tag]!=null).map(tag=>counters[tag]),1);
 if(base>=1)return 1;
 const strength=difficultyCounterScale(s?.difficulty);
 return 1-(1-base)*strength;
}

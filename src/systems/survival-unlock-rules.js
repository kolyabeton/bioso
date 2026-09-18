// Dependency-free ownership map shared by the catalog, save migration and rewards.
export const SURVIVAL_ITEM_ACHIEVEMENTS=Object.freeze({
 reflexNerve:'survival:mature-build',
 returnNerve:'survival:set-kills-hunter',
 commonNerve:'survival:set-bosses-hecaton',
 reverseHeart:'survival:level-30',
});
export const survivalItemAvailable=(profile,key)=>!SURVIVAL_ITEM_ACHIEVEMENTS[key]||!!profile?.unlocked?.includes(key)||!!profile?.achievements?.includes(SURVIVAL_ITEM_ACHIEVEMENTS[key]);

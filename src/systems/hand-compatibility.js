import {CATALOG,WEAPONS} from '../catalog.js';

const MELEE_MODES=new Set(['sector','area','contact']);
const FLYING_PROJECTILE_MODES=new Set(['projectile','rocket','acid']);
const RICOCHET_EXCLUDED_KEYS=new Set(['drone','rocket']);

export const HAND_GROUP_LABELS=Object.freeze({
 combat:'оружие',
 melee:'ближний бой',
 ranged:'снаряды',
 flyingProjectile:'снаряды',
 directProjectile:'снаряды',
 ricochetProjectile:'снаряды',
 magazine:'оружие с магазином',
 symbionts:'постоянные и временные дроны',
});

const definition=value=>value?.mode?value:CATALOG[value?.key??value];
export const isMelee=value=>MELEE_MODES.has(definition(value)?.mode);
export const isCombatHand=value=>{const d=definition(value);return!!d&&d.mode!=null&&d.mode!=='summon'&&(d.kind==='arm'||d.kind==null);};
export const isRangedHand=value=>isCombatHand(value)&&!isMelee(value);
export const isFlyingProjectileHand=value=>isCombatHand(value)&&FLYING_PROJECTILE_MODES.has(definition(value)?.mode);
export const isDirectProjectileHand=value=>isCombatHand(value)&&definition(value)?.mode==='projectile';
export const isRicochetProjectileHand=value=>{const d=definition(value);return isFlyingProjectileHand(d)&&d.mode!=='rocket'&&!RICOCHET_EXCLUDED_KEYS.has(d.key);};
export const hasMagazine=value=>isCombatHand(value)&&Number(definition(value)?.magazine)>0;

export function handMatches(value,group){
 if(group==='combat')return isCombatHand(value);
 if(group==='melee')return isCombatHand(value)&&isMelee(value);
 if(group==='ranged')return isRangedHand(value);
 if(group==='flyingProjectile')return isFlyingProjectileHand(value);
 if(group==='directProjectile')return isDirectProjectileHand(value);
 if(group==='ricochetProjectile')return isRicochetProjectileHand(value);
 if(group==='magazine')return hasMagazine(value);
 return false;
}

export const compatibleHandKeys=group=>Object.keys(WEAPONS).filter(key=>handMatches(CATALOG[key],group));
export const compatibleHandNames=group=>compatibleHandKeys(group).map(key=>CATALOG[key].name);

const one=group=>Object.freeze([{group}]);
export const ABILITY_HAND_EFFECTS=Object.freeze({
 'melee.0':one('melee'),'melee.1':one('melee'),'melee.2':one('melee'),'melee.3':one('melee'),
 'ranged.0':one('ranged'),'ranged.1':one('magazine'),'ranged.2':one('ranged'),'ranged.3':one('ranged'),
 'might.0':one('combat'),'might.1':one('combat'),'might.2':one('combat'),'might.3':one('combat'),
 'tempo.0':one('combat'),'tempo.1':one('combat'),'tempo.2':Object.freeze([{group:'flyingProjectile',label:'Скорость снарядов'},{group:'combat',label:'Сокращение ожидания после крита'}]),'tempo.3':one('combat'),
 'projectiles.0':one('flyingProjectile'),'projectiles.1':one('directProjectile'),'projectiles.2':one('directProjectile'),'projectiles.3':one('flyingProjectile'),
 'ricochet.0':one('ricochetProjectile'),'ricochet.1':one('ricochetProjectile'),'ricochet.2':one('ricochetProjectile'),'ricochet.3':one('ricochetProjectile'),
 'fire.0':one('combat'),'cold.0':one('combat'),'cold.2':one('combat'),
 'electric.0':one('combat'),'electric.3':one('combat'),
 thermal:one('combat'),plasma:one('combat'),neuralweb:one('flyingProjectile'),countershell:one('melee'),overgrowth:one('combat'),
 'motion.3':one('combat'),'minor.damage':one('combat'),'minor.rate':one('combat'),'minor.critPower':one('combat'),
});

export const abilityHandEffects=id=>ABILITY_HAND_EFFECTS[id]||[];
export function abilityCompatibilitySummary(id){
 const effects=abilityHandEffects(id);
 if(!effects.length)return'';
 return effects.map(effect=>`${effect.label?effect.label+': ':''}${HAND_GROUP_LABELS[effect.group]}`).join(' · ');
}
export function abilityCompatibilityDetails(id){
 return abilityHandEffects(id).map(effect=>({
  label:effect.label||'',category:HAND_GROUP_LABELS[effect.group],
  compatible:compatibleHandNames(effect.group),
 }));
}

export const ITEM_HAND_GROUPS=Object.freeze({
 returnNerve:['pistol','seed','shotgun','needle'],commonNerve:['seed','needle','rocket'],
 slime:'combat',stabilizer:'flyingProjectile',accelerator:'combat',mirrorGland:'combat',reverseHeart:'combat',
});
export function itemCompatibleHandKeys(key){const rule=ITEM_HAND_GROUPS[key];return Array.isArray(rule)?rule:rule?compatibleHandKeys(rule):[];}
export const itemCompatibleHandNames=key=>itemCompatibleHandKeys(key).map(hand=>CATALOG[hand]?.name).filter(Boolean);
export function itemAffectedHandNames(s,key){const allowed=new Set(itemCompatibleHandKeys(key));return(s?.arms||[]).filter(part=>part&&!part.disabled&&allowed.has(part.key)).map(part=>CATALOG[part.key]?.name).filter(Boolean);}
export const itemCompatibilityCategory=key=>Array.isArray(ITEM_HAND_GROUPS[key])?'оружие':HAND_GROUP_LABELS[ITEM_HAND_GROUPS[key]]||'';

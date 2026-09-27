import {collectBiomass} from './systems/survival-endgame.js';
import {reverseStomachHealth,autoRecycleSelected} from './systems/reverse-stomach.js';
import {ORGAN_UPGRADE_STATS,upgradeLimit,organUpgradeLevel,sensorMultiplier,resonanceBonus,stabilizerReloadReduction} from './systems/organ-upgrades.js';
import {combatTime} from './systems/mutations.js';
export {upgradeLimit,resonanceBonus} from './systems/organ-upgrades.js';
import {summonTuning} from './systems/symbionts.js';
import {droneStats,pollinatorDamage} from './systems/summon-equipment.js';
import {bodyTurnSpeed} from './body-facing.js';
import {normalizeMeta} from './systems/meta-progression.js';
import {recordSurvivalRecycle} from './systems/survival-achievement-progress.js';
import {SURVIVAL_ITEM_ACHIEVEMENTS} from './systems/survival-unlock-rules.js';
import {CHASSIS_UNLOCKS} from './systems/chassis-unlocks.js';
import {recordChassisRecycle} from './systems/chassis-progress.js';
import {seededRandom} from './simulation.js';
import {bodyFitsHere} from './body-size.js';
import {bodyTraitState,bodyBonuses,bodyDamageBonus,defensiveOrganHitCapacity,organEffect,speedRushBonus,critRampStacks,CRIT_RAMP_STEP,chassisTraitBoost,BODY_DAMAGE_BONUS_CAP} from './systems/body-traits.js';
import {initializePart,partMeta,setBonuses,affixBonus,magazineCapacity,recordReward,finalizeReceivedPart} from './systems/sets-loot.js';
import {inMire,slotCount,boundPart} from './systems/mutations.js';
import {surfaceReach,groundDistance} from './elevation.js';
import {modifiers,recordBiomassSpend} from './systems/abilities.js';
import {preserveHealth} from './systems/health.js';
import {ARMOR_REPAIR_SECONDS,REGEN_MIN_SECONDS,REGEN_UPGRADE_SECONDS,CONTINUOUS_REGEN_BASE,CONTINUOUS_REGEN_STEP} from './systems/health-tuning.js';
import {upgradeCost,ECONOMY,HEALTH} from './systems/balance.js';
import {CATALOG,BODY_BASE_BONUSES,STARTERS,INCREMENTS,MISSIONS,WEAPON_UNLOCKS} from './catalog.js';
import {heroMeleeAttackRange} from './melee-range.js';
import {markInventoryUnseen} from './inventory-notifications.js';
import {weaponFamilyBonus} from './systems/weapon-specialization.js';
import {shieldArmBaseDamage} from './systems/shield-arm.js';
import {difficultyPlayerHealthPenalty} from './systems/difficulty.js';
import {HERO_HP_PER_SEGMENT,heroHealthPoints} from './systems/health-scale.js';
export const tierFactor=p=>1+.2*(p.tier-1);
/** Weapons gain 25% of their base damage per rank above I. */
export const weaponTierFactor=p=>1+.25*(Math.max(1,Math.min(5,Math.floor(p?.tier??1)))-1);
/** The Composter starts below par: rank I returns 80% of a recycle, each later rank adds 20%. */
export const digestionTierFactor=p=>.8+.2*(Math.max(1,Math.min(5,Math.floor(p?.tier??1)))-1);
export const MAX_DODGE_CHANCE=.7;
export const MAX_CRIT_CHANCE=1;
export const returnNerveDamage=(s,p)=>(Math.max(1,Math.min(5,p.tier??1))*.1+addBonus(p,'returnDamage'))*organEffect(s);
export const parasiteLarvaDamage=(s,p)=>(3+Math.max(1,Math.min(5,p.tier??1))*3+30*addBonus(p,'larvaDamage'))*organEffect(s)+pollinatorDamage(s);
/** Slow added by each weapon hit: +1 point per rank and per paid upgrade. */
export const slimeSlowdown=()=>.1;
export const coolerDamageFraction=p=>Math.max(1,Math.min(5,p.tier??1))*.1+Math.min(10,p.upgrades?.slimeSlow||0)*.01;
export const runnerFireFraction=p=>Math.max(1,Math.min(5,p.tier??1))*.1+Math.min(10,p.upgrades?.speed||0)*.01;
export const commonNerveVolleyMultiplier=(s,p)=>1+(.5+(Math.max(1,Math.min(5,p.tier??1))-1)*.1+addBonus(p,'commonVolley'))*organEffect(s);
export const stackedCommonNerveVolleyMultiplier=s=>Math.max(1,...s.organs.filter(p=>p?.key==='commonNerve').map(p=>commonNerveVolleyMultiplier(s,p)));
export const reverseHeartDamageMultiplier=(s,p)=>(2+(Math.max(1,Math.min(5,p.tier??1))-1)*.2+addBonus(p,'heartDamage'))*organEffect(s);
export const stackedReturnNerveDamage=s=>s.organs.filter(p=>p?.key==='returnNerve').reduce((total,p)=>total+returnNerveDamage(s,p),0);
export const organPower=(s,key,excludeId=null)=>s.organs.filter(p=>p?.key===key&&p.id!==excludeId).reduce((total,p)=>total+tierFactor(p)*(1+addBonus(p,'power'))*organEffect(s,key)*(key==='reflexNerve'?sensorMultiplier(p):1),0);
export const ranks=p=>Object.values(p.upgrades).reduce((a,b)=>a+b,0);
export const def=p=>CATALOG[p.key];
export function createPart(state,key,tier=1,modifier=null){
 if(typeof key!=='string'||!Object.hasOwn(CATALOG,key))throw Error('Unknown part');
 const kind=CATALOG[key].kind;
 if(modifier==='rapid'&&kind!=='arm'||modifier==='armored'&&!['body','leg'].includes(kind))modifier=null;
 return initializePart({id:++state.serial,key,tier:Math.max(1,Math.min(5,tier)),modifier,upgrades:{},spent:0,cooldown:0,shieldCharge:0,ammo:CATALOG[key].magazine?CATALOG[key].magazine+(modifiers(state).ammoCapacity||0):null,reloadRemaining:0,reloadDuration:0,idleFor:0,recoil:0},seededRandom((state.seed??0)^Math.imul(state.serial,2654435761)));
}
export function newProfile(){return{version:1,unlocked:[...STARTERS],achievements:[],meta:normalizeMeta()};}
export function readProfile(storage){try{
 const p=JSON.parse(storage.getItem('biomecha.profile.v1'));if(p?.version!==1)return newProfile();
 const achievements=(Array.isArray(p.achievements)?p.achievements:[]).filter(k=>typeof k==='string');
 const missionRewards=[...CHASSIS_UNLOCKS.filter(a=>achievements.includes(a.id)).map(a=>a.key),...MISSIONS.filter(m=>achievements.includes('mission:'+m.id)).flatMap(m=>m.rewards),...WEAPON_UNLOCKS.filter(a=>achievements.includes(a.id)).map(a=>a.key),...Object.entries(SURVIVAL_ITEM_ACHIEVEMENTS).filter(([,id])=>achievements.includes(id)).map(([key])=>key)];
 return{version:1,unlocked:[...new Set([...STARTERS,...(Array.isArray(p.unlocked)?p.unlocked:[]).filter(k=>typeof k==='string'&&Object.hasOwn(CATALOG,k)),...missionRewards])],meta:normalizeMeta(p.meta),achievements};
 }catch{return newProfile();}}
const BODY_RARITY_HP={common:0,uncommon:1,rare:2,relic:3};
export const bodyHealth=p=>(def(p).hp??2)+.5*Math.max(0,Math.min(4,Math.floor((p.tier??1)-1)))+BODY_RARITY_HP[partMeta(p).rarity]+(p.upgrades.hp||0);
export const capacity=p=>def(p).capacity*(1+.1*(p.tier-1))*(1+addBonus(p,'capacity')+affixBonus(p,'capacity'));
export const rankWeightFactor=p=>1.15**Math.max(0,Math.min(4,Math.floor((p.tier??1)-1)));
export function weight(p){const d=def(p),base=d.kind==='body'?Math.ceil(d.capacity*.3):d.weight;return base*rankWeightFactor(p)*(1-affixBonus(p,'weight'))*(p.modifier==='light'?.8:p.modifier==='rapid'?1.1:p.modifier==='armored'?1.15:1);}
export function installed(s){return[s.body,...s.arms,...s.legs,...s.organs].filter(Boolean);}
const hasRarityMaxHp=s=>installed(s).some(p=>affixBonus(p,'maxHp')>0);
export function carried(s){return[...installed(s),...s.inventory];}
export function load(s){return [...s.arms,...s.legs,...s.organs,...s.inventory].filter(Boolean).reduce((sum,p)=>sum+weight(p),0);}
/** Full speed through 60% load; linear slowdown until capacity stops movement. */
export function weightSpeedFactor(weight,capacity){
 if(capacity<=0||weight>=capacity-1e-7)return 0;
 return 1-Math.max(0,weight/capacity-.6);
}
export const addBonus=(p,stat)=> (p.upgrades[stat]||0)*(INCREMENTS[stat]||0);
export const soulBonus=(s,stat)=>(s.soul[stat]||0)*(INCREMENTS[stat]||0)/3;
/** Item 2: continuous share for one part, as a fraction of the maximum per second. */
export function continuousRecoveryRate(p,stat){
 if(!p)return 0;
 const tier=Math.max(1,Math.min(5,Math.floor(p.tier??1))),upgrades=Math.max(0,Math.min(20,p.upgrades?.[stat]||0));
 return CONTINUOUS_REGEN_BASE+CONTINUOUS_REGEN_STEP*(tier-1+upgrades);
}
/** Plates and Rootwalker legs recover continuously. */
export const armorRegenPerSecond=s=>(s?.organs||[]).filter(p=>p?.key==='armor').reduce((sum,p)=>sum+continuousRecoveryRate(p,'plateCapacity'),0);
export const rootRegenPerSecond=s=>(s?.legs||[]).filter(p=>p?.key==='root').reduce((sum,p)=>sum+continuousRecoveryRate(p,'regen'),0);
export const legHealth=p=>{
 const d=def(p),tier=Math.max(1,Math.min(5,Math.floor(p.tier??1)));
 return d.healthByTier?.[tier-1]??(d.rankStat==='hp'?.5*(tier-1):0);
};
export const legArmor=p=>def(p).rankStat==='armor'?.5*(Math.max(1,Math.min(5,Math.floor(p.tier??1)))+Math.max(0,Math.min(10,p.upgrades.armor||0))):0;
export const armorPlateCapacity=(p,boost=1)=>p?.key==='armor'?Math.ceil((.5*(Math.max(1,Math.min(5,Math.floor(p.tier??1)))+1)*(1+addBonus(p,'armor'))*boost)*2-1e-9)/2:0;
const RUNNER_DAMAGE_KEYS=new Set(['shotgun','pistol','claws']),RUNNER_DAMAGE_BONUS=.1;
export const MAX_MOVE_SPEED=18;
export const legSpeed=(p,bonus=0)=>def(p).speed*(def(p).rankStat==='speed'?tierFactor(p):1)*(1+Math.min(.6,(p.key==='swarmLeg'?0:addBonus(p,'speed'))+affixBonus(p,'speed')+bonus));
export function stats(s){
 const list=installed(s),passiveParts=[...new Set([...list,...(s.inventory||[]).filter(p=>p?.key==='revivalCore')])],body=def(s.body),f=tierFactor(s.body),affix=stat=>passiveParts.reduce((n,p)=>n+affixBonus(p,stat),0);
 const b=modifiers(s),bodyBonus=bodyBonuses(s),baseBodyBonus=BODY_BASE_BONUSES[s.body.key]||{},organBoost=organEffect(s),sets=setBonuses(s);
 const legArmorBase=s.legs.filter(Boolean).reduce((sum,p)=>sum+legArmor(p),0),armorPlateBase=s.organs.filter(p=>p?.key==='armor').reduce((sum,p)=>sum+armorPlateCapacity(p,organBoost),0);
 const healthSegments=Math.max(1,(HEALTH.base+bodyHealth(s.body)+s.legs.filter(Boolean).reduce((sum,p)=>sum+legHealth(p),0)+s.organs.filter(p=>p?.key==='reverseStomach').reduce((sum,p)=>sum+reverseStomachHealth(p),0)+bodyBonus.hp+sets.hp+(b.hp||0)-(s.isaac?.deals.hpCost||0)-difficultyPlayerHealthPenalty(s.difficulty))*(1+affix('maxHp')));
 const hp=heroHealthPoints(healthSegments),armorBase=.5+sets.armor+list.reduce((n,p)=>n+(p.key==='armor'||def(p).kind==='leg'?0:(def(p).armor||0)/20*(1+addBonus(p,'armor')))+(p.modifier==='armored'?1:0),0)+affix('armor')+(b.armor||0),armor=Math.min(healthSegments,(armorBase+armorPlateBase+legArmorBase+(armorBase+armorPlateBase+legArmorBase>.5?(b.movingArmor||0):0)+.5*(s.isaac?.deals.armor||0))*(1+affix('armorPct')));
 const legBaseSpeed=s.legs.filter(Boolean).reduce((sum,p)=>sum+legSpeed(p,b.speed||0),0)/body.legs;
 const speed=(legBaseSpeed+(legBaseSpeed>0?(body.baseSpeedBonus||0):0))*(1+bodyBonus.speed+sets.speed);
 const carriedWeight=load(s),maxWeight=capacity(s.body)+20*(s.isaac?.deals.capacity||0),loadFactor=weightSpeedFactor(carriedWeight,maxWeight);
 const shields=s.organs.filter(p=>p?.key==='shield').reduce((sum,p)=>sum+defensiveOrganHitCapacity(s,p),0),regenerators=s.organs.filter(p=>p?.key==='regen').length,armorRepairPerSecond=armorRegenPerSecond(s)*organBoost,dodge=Math.min(MAX_DODGE_CHANCE,(b.dodge||0)+(baseBodyBonus.dodge||0)+(bodyBonus.dodge||0)+.1*organPower(s,'reflexNerve'));
 return{hp,healthDamageBasis:healthSegments,armor,dodge,turnSpeed:bodyTurnSpeed(s.body,maxWeight),capacity:maxWeight,weight:carriedWeight,loadFactor,overloaded:loadFactor===0,speed:Math.min(MAX_MOVE_SPEED,speed*(1+.15*(s.isaac?.deals.speed||0))*(1+affix('movement'))*loadFactor*(inMire(s)?1.25:1)),shieldMax:shields+(sets.barrier?1:0),setRegen:sets.tissue,regen:!!(regenerators||b.regen||sets.tissue||rootRegenPerSecond(s)||baseBodyBonus.regenPerSecond),regenPersistsThroughDamage:true,regenPerSecond:(rootRegenPerSecond(s)+s.organs.filter(p=>p?.key==='regen').reduce((sum,p)=>sum+continuousRecoveryRate(p,'regenRate'),0))*organBoost+.01*(b.regen||0)+(sets.tissue?.01:0)+(baseBodyBonus.regenPerSecond||0),armorRepairPerSecond,armorRepairAmount:armorRepairPerSecond*armor,armorRepairDelay:armorRepairPerSecond>0?1/armorRepairPerSecond:Infinity,shieldRate:organBoost/setBonuses(s).shieldDelay,projectile:1,reloadReduction:stabilizerReloadReduction(s),organEffect:organBoost,rate:affix('rate')+bodyBonus.rate+sets.rate+.15*organPower(s,'accelerator')+(inMire(s)?.25:0),bodyFactor:f,revive:b.revive||0,pickup:7*(1+(b.pickup||0)+setBonuses(s).pickup+affix('pickup'))};
}
export function weaponStats(s,p,st=stats(s),{pollinators=true}={}){
 if(p.key==='drone'){const d=def(p),base=droneStats(p),swarm=summonTuning(s,modifiers(s)),globalDamage=installed(s).reduce((sum,q)=>sum+affixBonus(q,'globalDamage'),0);return{...d,partId:p.id,damage:base.damage*swarm.damage*(1+affixBonus(p,'damage')+globalDamage),interval:base.interval/(swarm.rate*(1+st.rate+affixBonus(p,'localRate'))),range:swarm.droneSearch,crit:0,critPower:1,speed:0,extra:0};}
 const d=def(p),melee=['sector','area','contact'].includes(d.mode),b=modifiers(s),projectile=['projectile','rocket','acid'].includes(d.mode),family=weaponFamilyBonus(s,p);
 const damageBase=p.key==='shieldArm'?shieldArmBaseDamage(p):d.damage*weaponTierFactor(p);
 // The Forester scales every weapon with the assembly's health, the Runner only sharpens its own family.
 const rush=speedRushBonus(s,st.speed),ramp=Math.min(BODY_DAMAGE_BONUS_CAP,critRampStacks(s,combatTime(s))*CRIT_RAMP_STEP*(1+chassisTraitBoost(s))),partBonus=bodyDamageBonus(s,st)+(RUNNER_DAMAGE_KEYS.has(p.key)&&s.legs.some(q=>q?.key==='runner')?RUNNER_DAMAGE_BONUS:0);
 const swarm=d.mode==='rocket'?summonTuning(s,b):null;
 const reachMultiplier=1+(melee?(b.reach||0)+(b.meleeReach||0)+setBonuses(s).reach:(b.range||0)+(b.rangedReach||0)+setBonuses(s).range),range=melee?heroMeleeAttackRange(s,d.range*reachMultiplier):d.range*reachMultiplier;
 const wounded=affixBonus(p,'woundedFury')&&s.hp<st.hp*.5?affixBonus(p,'woundedFury'):0;
 const stationary=affixBonus(p,'stationaryDamage')&&s.stationaryFor>=3?affixBonus(p,'stationaryDamage'):0;
 const burst=affixBonus(p,'burst')&&p.affixBurstUntil>combatTime(s)?1:0;
 const globalDamage=installed(s).reduce((sum,q)=>sum+affixBonus(q,'globalDamage'),0);
 const scaledDamage=(swarm?.damage??1)*(damageBase+(pollinators?(swarm?.pollinatorDamage??0):0))*(p.fused?2:1)*(projectile?Math.max(.2,1+(b.projectileDamage||0)):1)*(1+addBonus(p,'damage')+affixBonus(p,'damage')+globalDamage+wounded+stationary+(!melee?affixBonus(p,'closeAssault'):0))*(1+(b.damage||0)+(melee?(b.meleeDamage||0):(b.rangedDamage||0))+(melee?setBonuses(s).meleeDamage:setBonuses(s).rangedDamage)+partBonus);
 return{...d,...(d.magazine?{magazine:magazineCapacity(p,b.ammoCapacity)}:{}),partId:p.id,summonBossDamage:swarm?.bossDamage??1,damage:p.key==='shieldArm'?0:scaledDamage,...(p.key==='shieldArm'?{auraDps:scaledDamage*.1}:{}),interval:d.interval/(1+addBonus(p,'rate')+affixBonus(p,'localRate')+wounded+burst+(b.rate||0)+st.rate+(melee&&b.meleeFrenzy&&(s.specialization?.frenzyUntil||0)>(s.time+(s.isaac?.extraTime||0))?(b.meleeFrenzyRate||.25):0)+(p.modifier==='rapid'?.12:0)+rush),crit:Math.min(MAX_CRIT_CHANCE,.05+(d.crit||0)+family.crit+addBonus(p,'crit')+(b.crit||0)+(melee?(b.meleeCrit||0):(b.rangedCrit||0))+ramp),critPower:((d.critPower??1.5)+family.critPower+addBonus(p,'critPower')+(b.critPower||0)+ramp)*(1+(BODY_BASE_BONUSES[s.body.key]?.critDamage||0)),acidDurationBonus:p.key==='acid'?BODY_BASE_BONUSES[s.body.key]?.acidDuration||0:0,speed:(d.speed||0)*st.projectile*(1+(b.velocity||0)),range:range*(1+affixBonus(p,'rangeBoost'))*(melee?1:1-.4*(affixBonus(p,'closeAssault')>0)),knockback:(d.knockback||0)*(affixBonus(p,'doubleKnockback')?2:1),doubleKnockback:!!affixBonus(p,'doubleKnockback'),homing:!!affixBonus(p,'homing')&&d.mode==='projectile',rearAttack:!!affixBonus(p,'rearAttack'),pierce:(d.pierce||1)+(d.mode==='projectile'&&b.pierce?1:0),extra:projectile?(b.extra||0):0,...(d.pelletSpread!=null?{pelletSpread:d.pelletSpread*(1-family.spread)}:{})};
}
export function upgradeOptions(p,s=null){
 if(ranks(p)>=upgradeLimit(p))return[];const d=def(p),organStat=ORGAN_UPGRADE_STATS[p.key];
 if(organStat)return p.key==='repairGland'||!s||upgradeHasEffect(s,p,organStat)?[organStat]:[];
 if(d.kind==='arm')return['damage'];
 if(d.kind==='body')return['capacity'];
 if(d.kind==='leg')return d.upgradeStat?[d.upgradeStat]:addBonus(p,'speed')<.6?['speed']:[];
 if(d.key==='reverseStomach')return['stomachHealth'];
 if(d.key==='broodNode')return['summonDamage'];
 if(d.key==='returnNerve')return['returnDamage'];
 if(d.key==='parasite')return['larvaDamage'];
 if(d.key==='slime')return['slimeSlow'];
 if(d.key==='commonNerve')return['commonVolley'];
 if(d.key==='reverseHeart')return['heartDamage'];
 if(d.key==='shield')return['shieldRecharge'];
 return ['digestion','stabilizer','accelerator'].includes(d.key)?['power']:[];
}
// Side-effect-free preview: set caches and mutable health belong to the copy.
export function upgradedRun(s,p,stat){
 const copy={...p,upgrades:{...p.upgrades,[stat]:(p.upgrades[stat]||0)+1}};
 return {...s,setsV2:s.setsV2?structuredClone(s.setsV2):undefined,abilities:structuredClone(s.abilities),health:s.health?{...s.health}:s.health,body:s.body===p?copy:s.body,arms:s.arms.map(q=>q===p?copy:q),legs:s.legs.map(q=>q===p?copy:q),organs:s.organs.map(q=>q===p?copy:q)};
}
export function upgradeHasEffect(s,p,stat){
 if(!installed(s).includes(p))return false;
 if(!ORGAN_UPGRADE_STATS[p.key])return true;
 const next=upgradedRun(s,p,stat),before=stats(s),after=stats(next);
 if(stat==='resonance')return resonanceBonus(next)-resonanceBonus(s)>1e-9;
 if(stat==='sensorDodge')return after.dodge-before.dodge>1e-9;
 if(stat==='plateCapacity')return after.armorRepairPerSecond-before.armorRepairPerSecond>1e-9;
 if(stat==='regenRate')return after.regenPerSecond-before.regenPerSecond>1e-9;
 if(stat==='traitBoost'&&s.body?.key==='broodmother')return bodyTraitState(s).active&&chassisTraitBoost(next)>chassisTraitBoost(s);
 if(stat==='traitBoost'&&s.body?.key==='hunter')return bodyTraitState(s).active&&chassisTraitBoost(next)>chassisTraitBoost(s);
 if(stat==='traitBoost')return Object.keys(bodyBonuses(next)).some(key=>Math.abs((bodyBonuses(next)[key]||0)-(bodyBonuses(s)[key]||0))>1e-9);
 return false;
}
export function upgradePrice(s,p,stat){
 const free=s.body===p&&stat==='capacity'&&s.overloadGuide&&s.overloadGuideStep==='body'&&!s.overloadBodyUpgradeClaimed;
 return free?0:upgradeCost(ranks(p));
}
export function upgrade(s,id,stat,paid=false){
 const p=installed(s).find(p=>p.id===id);if(!p||!upgradeOptions(p,s).includes(stat))return false;
 const cost=upgradePrice(s,p,stat);if(paid&&s.biomass<cost)return false;
 const old=stats(s);if(paid&&cost){s.biomass-=cost;p.spent+=cost;s.firstPaidUpgrade=true;recordBiomassSpend(s,cost);}p.upgrades[stat]=(p.upgrades[stat]||0)+1;
 if(paid&&cost===0){s.overloadBodyUpgradeClaimed=true;s.overloadGuide=false;delete s.overloadGuideStep;}
 const after=stats(s),now=combatTime(s),h=s.health;
 if(stat==='plateCapacity'&&h)h.armorSpent=(h.armorSpent||0)+Math.max(0,after.armor-old.armor);
 preserveHealth(s,old.hp,after.hp,{preserveCurrent:hasRarityMaxHp(s)});return true;
}
export function equip(s,id,slot){
 const p=s.inventory.find(p=>p.id===id);if(!p)return false;const d=def(p);if(d.kind==='body')return false;
 const group={arm:'arms',leg:'legs',organ:'organs'}[d.kind];if(!Number.isInteger(slot)||slot<0||slot>=s[group].length||slot>=slotCount(s,s.body,group))return false;
 if(boundPart(s[group][slot]))return false;
 const old=stats(s),hadRarityMaxHp=hasRarityMaxHp(s);s.inventory=s.inventory.filter(q=>q!==p);if(s[group][slot])s.inventory.push(s[group][slot]);s[group][slot]=p;preserveHealth(s,old.hp,stats(s).hp,{preserveCurrent:hadRarityMaxHp||hasRarityMaxHp(s)});return true;
}
export function unequip(s,group,slot){if(!['arms','legs','organs'].includes(group)||!s[group][slot]||boundPart(s[group][slot]))return false;const old=stats(s),hadRarityMaxHp=hasRarityMaxHp(s);s.inventory.push(s[group][slot]);s[group][slot]=null;preserveHealth(s,old.hp,stats(s).hp,{preserveCurrent:hadRarityMaxHp||hasRarityMaxHp(s)});return true;}
export function moveInstalled(s,id,group,from,to){
 if(!['arms','legs','organs'].includes(group)||![from,to].every(n=>Number.isInteger(n)&&n>=0&&n<s[group].length&&n<slotCount(s,s.body,group)))return false;
 const p=s[group][from],q=s[group][to];if(p?.id!==id||boundPart(p)||boundPart(q))return false;
 [s[group][from],s[group][to]]=[q,p];return true;
}
export const digestionMultiplier=(s,p=s.organs.find(p=>p?.key==='digestion'))=>{return p?digestionTierFactor(p)*(1+addBonus(p,'power'))*organEffect(s,'digestion')*(1+(modifiers(s).biomassYield||0)+installed(s).reduce((sum,q)=>sum+affixBonus(q,'biomassYield'),0)):0;};
export function swapBody(s,id,keep){
 const p=s.inventory.find(p=>p.id===id&&def(p).kind==='body');if(!p)return false;
 if(!bodyFitsHere(s,p))return false;
 const d=def(p),selection={};if((HEALTH.base+bodyHealth(p)+(modifiers(s).hp||0)-(s.isaac?.deals.hpCost||0))<1)return false;
 for(const group of ['arms','legs','organs']){
  const current=s[group].filter(Boolean),ids=keep?.[group]??[...current.filter(boundPart),...current.filter(p=>!boundPart(p))].slice(0,slotCount(s,p,group)).map(p=>p.id);
  if(ids.length>slotCount(s,p,group)||current.some(p=>boundPart(p)&&!ids.includes(p.id))||new Set(ids).size!==ids.length||ids.some(id=>!current.some(q=>q.id===id)))return false;
  selection[group]=ids.map(id=>current.find(q=>q.id===id));
 }
 const oldMax=stats(s).hp,hadRarityMaxHp=hasRarityMaxHp(s);s.inventory=s.inventory.filter(q=>q!==p);s.inventory.push(s.body);s.body=p;
 for(const group of ['arms','legs','organs']){s.inventory.push(...s[group].filter(q=>q&&!selection[group].includes(q)));s[group]=Array.from({length:slotCount(s,p,group)},(_,i)=>selection[group][i]||null);}
 preserveHealth(s,oldMax,stats(s).hp,{preserveCurrent:hadRarityMaxHp||hasRarityMaxHp(s)});return true;
}
/** Item 24: the last installed leg is protected by default, so neither the drop
 * nor the recycle action is offered for it and the hero cannot be left legless. */
export const isLastInstalledLeg=(s,p)=>def(p).kind==='leg'&&(s?.legs||[]).includes(p)&&(s?.legs||[]).filter(Boolean).length<=1;
export function canDrop(s,p,{allowLastLeg=false}={}){return !!p&&p!==s.body&&!boundPart(p)&&carried(s).includes(p)&&(allowLastLeg||!isLastInstalledLeg(s,p));}
export function drop(s,id,options){
 const p=carried(s).find(p=>p.id===id);if(!canDrop(s,p,options))return false;
 p.setAssignmentComplete=true;delete p.setCandidateId;
 const oldHp=stats(s).hp,hadRarityMaxHp=hasRarityMaxHp(s);
 s.inventory=s.inventory.filter(q=>q!==p);
 for(const group of ['arms','legs','organs'])s[group]=s[group].map(q=>q===p?null:q);
 preserveHealth(s,oldHp,stats(s).hp,{preserveCurrent:hadRarityMaxHp||hasRarityMaxHp(s)});
 let position={x:s.player.x,y:s.player.y??0,z:s.player.z};
 for(let i=0;i<8;i++){const angle=i*Math.PI/4,x=s.player.x+Math.cos(angle)*2,z=s.player.z+Math.sin(angle)*2,y=s.world.heightAt?.(x,z)??position.y;if(s.world.walkable&&!s.world.walkable(x,z,.4)||Math.abs(y-position.y)>.4)continue;position={x,y,z};break;}
 s.ground.push({id:++s.entityId,part:p,...position,autoPickupBlocked:true});return true;
}
function discoverPart(s,p){if(!s.profile||s.profile.unlocked.includes(p.key))return;s.profile.unlocked.push(p.key);s.events.push({type:'unlock',text:'Открыто: '+def(p).name});}
function discoverLore(s,q){if(!q.lore)return false;s.storyEvidence??=[];if(!s.storyEvidence.some(item=>item.id===q.lore.id))s.storyEvidence.push(q.lore);const saved=(s.profile.meta??={}).storyEvidence??=[];(s.events??=[]);if(!saved.includes(q.lore.id)){saved.push(q.lore.id);s.events.push({type:'profile-progress'});}s.ground=s.ground.filter(item=>item!==q);s.events.push({type:'lore-found',evidence:q.lore});return true;}
export function pickup(s,id){const q=s.ground.find(q=>q.id===id);if(!q||!surfaceReach(s,q,s.player)||groundDistance(s,q,s.player)>3)return false;if(q.lore)return discoverLore(s,q);if(!q.part)return false;finalizeReceivedPart(s,q.part);if(q.part.lootSource&&!q.part.lootRecorded){recordReward(s,q.part,q.part.lootSource);q.part.lootRecorded=true;}s.inventory.push(q.part);markInventoryUnseen(s,q.part);s.ground=s.ground.filter(d=>d!==q);discoverPart(s,q.part);return true;}
/** Auto-transfer nearby rewards once; discarded equipment requires leaving its radius first. */
export function autoPickup(s){
 const collected=[],remaining=[];let recycled=0,biomass=0;
 for(const q of s.ground){
  const distance=groundDistance(s,q,s.player);
  if(q.autoPickupBlocked){if(distance>3)delete q.autoPickupBlocked;remaining.push(q);continue;}
  if(distance>3||!surfaceReach(s,q,s.player)){remaining.push(q);continue;}
  if(q.lore){discoverLore(s,q);continue;}
  if(!q.part){remaining.push(q);continue;}
  finalizeReceivedPart(s,q.part);if(q.part.lootSource&&!q.part.lootRecorded){recordReward(s,q.part,q.part.lootSource);q.part.lootRecorded=true;}
  if(autoRecycleSelected(s,q.part)){const organ=s.organs.find(p=>p?.key==='digestion');if(organ){const amount=partDigestionYield(s,q.part,organ);awardDigestion(s,amount,q.part);discoverPart(s,q.part);recycled++;biomass+=amount;continue;}}
  s.inventory.push(q.part);const group={arm:'arms',leg:'legs',organ:'organs'}[def(q.part).kind],slot=group?s[group].findIndex((part,index)=>!part&&index<slotCount(s,s.body,group)):-1;
  if(slot>=0)equip(s,q.part.id,slot);else markInventoryUnseen(s,q.part);discoverPart(s,q.part);collected.push(q.part);
 }
 s.ground=remaining;
 if(recycled)s.events.push({type:'notice',text:`Переработано: ${recycled} · +${biomass} биомассы`});
 return collected;
}
export function preferredSlot(s,p){const group={arm:'arms',leg:'legs',organ:'organs'}[def(p).kind];if(!group)return null;const free=s[group].findIndex(q=>!q);return free>=0?free:0;}
/** One atomic ground action, reusing equip validation, never duplicating a part. */
export function equipGround(s,id,slot){
 const q=s.ground.find(q=>q.id===id);if(!q?.part||groundDistance(s,q,s.player)>3||!surfaceReach(s,q,s.player)||def(q.part).kind==='body')return false;
 s.inventory.push(q.part);if(!equip(s,q.part.id,slot)){s.inventory=s.inventory.filter(p=>p!==q.part);return false;}finalizeReceivedPart(s,q.part);if(q.part.lootSource&&!q.part.lootRecorded){recordReward(s,q.part,q.part.lootSource);q.part.lootRecorded=true;}s.ground=s.ground.filter(g=>g!==q);discoverPart(s,q.part);return true;
}
export function digestionYield(s,id){
 const organ=s.organs.find(p=>p?.key==='digestion'&&p.id!==id);
 const p=carried(s).find(p=>p.id===id);
 if(!organ||!canDrop(s,p))return false;
 return partDigestionYield(s,p,organ);
}
// Ground automation and manual recycling share the exact same economy.
function partDigestionYield(s,p,organ){
 const base=ECONOMY.digest[p.tier]+ECONOMY.digestRarityBonus[partMeta(p).rarity];
 const power=digestionTierFactor(organ)*(1+addBonus(organ,'power'))*organEffect(s,'digestion');
 return Math.floor(base*power*(1+(modifiers(s).biomassYield||0)+installed(s).filter(q=>q!==p).reduce((sum,q)=>sum+affixBonus(q,'biomassYield'),0))+(p.spent||0)*ECONOMY.digestRefund);
}
/** Recycle only carried equipment; ground loot is never a digestion source. */
export function digest(s,id){
 const amount=digestionYield(s,id);if(amount===false)return false;
 const p=carried(s).find(p=>p.id===id),oldHp=stats(s).hp,hadRarityMaxHp=hasRarityMaxHp(s),recycleMultiplier=digestionMultiplier(s,s.organs.find(q=>q?.key==='digestion'&&q.id!==id));
 s.inventory=s.inventory.filter(q=>q!==p);
 for(const group of ['arms','legs','organs'])s[group]=s[group].map(q=>q===p?null:q);
 preserveHealth(s,oldHp,stats(s).hp,{preserveCurrent:hadRarityMaxHp||hasRarityMaxHp(s)});
 awardDigestion(s,amount,p,recycleMultiplier);return amount;
}
function awardDigestion(s,amount,p,multiplier=digestionMultiplier(s)){
 if(p){const base=ECONOMY.digest[p.tier]+ECONOMY.digestRarityBonus[partMeta(p).rarity];recordChassisRecycle(s,Math.floor(base*multiplier),multiplier);}
 collectBiomass(s,amount);(s.achievementCounters??={}).recycled=(s.achievementCounters.recycled||0)+1;recordSurvivalRecycle(s);
}
export function lootTier(level,rng){const base=ECONOMY.tierLevels.filter(n=>level>=n).length,r=rng();return Math.max(1,Math.min(5,base+(r<.2?-1:r>=.9?1:0)));}

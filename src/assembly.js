import {ORGAN_UPGRADE_STATS,upgradeLimit,organUpgradeLevel,recoveryMultiplier,sensorMultiplier,resonanceBonus,rescaleRecovery} from './systems/organ-upgrades.js';
import {combatTime} from './systems/mutations.js';
export {upgradeLimit,resonanceBonus} from './systems/organ-upgrades.js';
import {summonTuning} from './systems/symbionts.js';
import {droneStats} from './systems/summon-equipment.js';
import {bodyTurnSpeed} from './body-facing.js';
import {normalizeMeta} from './systems/meta-progression.js';
import {recordSurvivalRecycle} from './systems/survival-achievement-progress.js';
import {SURVIVAL_ITEM_ACHIEVEMENTS} from './systems/survival-unlock-rules.js';
import {seededRandom} from './simulation.js';
import {bodyFitsHere} from './body-size.js';
import {bodyBonuses,defensiveOrganHitCapacity,organEffect,speedRushBonus,critRampStacks,CRIT_RAMP_STEP,chassisTraitBoost} from './systems/body-traits.js';
import {initializePart,partMeta,setBonuses,affixBonus,magazineCapacity,recordReward,finalizeReceivedPart} from './systems/sets-loot.js';
import {inMire,slotCount,boundPart} from './systems/mutations.js';
import {surfaceReach,groundDistance} from './elevation.js';
import {modifiers,recordBiomassSpend} from './systems/abilities.js';
import {preserveHealth} from './systems/health.js';
import {ARMOR_REPAIR_SECONDS,REGEN_MIN_SECONDS,REGEN_UPGRADE_SECONDS,CONTINUOUS_REGEN_BASE,CONTINUOUS_REGEN_STEP} from './systems/health-tuning.js';
import {upgradeCost,ECONOMY,HEALTH} from './systems/balance.js';
import {CATALOG,STARTERS,INCREMENTS,MISSIONS,WEAPON_UNLOCKS} from './catalog.js';
import {heroMeleeAttackRange} from './melee-range.js';
import {markInventoryUnseen} from './inventory-notifications.js';
import {weaponFamilyBonus} from './systems/weapon-specialization.js';
export const tierFactor=p=>1+.2*(p.tier-1);
/** The Composter starts below par: rank I returns 80% of a recycle, each later rank adds 20%. */
export const digestionTierFactor=p=>.8+.2*(Math.max(1,Math.min(5,Math.floor(p?.tier??1)))-1);
export const MAX_DODGE_CHANCE=.7;
export const MAX_CRIT_CHANCE=.75;
export const returnNerveDamage=(s,p)=>(Math.max(1,Math.min(5,p.tier??1))*.1+addBonus(p,'returnDamage'))*organEffect(s);
export const parasiteLarvaDamage=(s,p)=>(3+Math.max(1,Math.min(5,p.tier??1))*3+30*addBonus(p,'larvaDamage'))*organEffect(s);
export const slimeSlowdown=p=>.05+Math.max(1,Math.min(5,p.tier??1))*.05+addBonus(p,'slimeSlow');
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
 return initializePart({id:++state.serial,key,tier:Math.max(1,Math.min(5,tier)),modifier,upgrades:{},spent:0,cooldown:0,shieldCharge:0,ammo:CATALOG[key].magazine??null,reloadRemaining:0,reloadDuration:0,idleFor:0,recoil:0},seededRandom((state.seed??0)^Math.imul(state.serial,2654435761)));
}
export function newProfile(){return{version:1,unlocked:[...STARTERS],achievements:[],meta:normalizeMeta()};}
export function readProfile(storage){try{
 const p=JSON.parse(storage.getItem('biomecha.profile.v1'));if(p?.version!==1)return newProfile();
 const achievements=(Array.isArray(p.achievements)?p.achievements:[]).filter(k=>typeof k==='string');
 const missionRewards=[...MISSIONS.filter(m=>achievements.includes('mission:'+m.id)).flatMap(m=>m.rewards),...WEAPON_UNLOCKS.filter(a=>achievements.includes(a.id)).map(a=>a.key),...Object.entries(SURVIVAL_ITEM_ACHIEVEMENTS).filter(([,id])=>achievements.includes(id)).map(([key])=>key)];
 return{version:1,unlocked:[...new Set([...STARTERS,...(Array.isArray(p.unlocked)?p.unlocked:[]).filter(k=>typeof k==='string'&&Object.hasOwn(CATALOG,k)),...missionRewards])],meta:normalizeMeta(p.meta),achievements};
 }catch{return newProfile();}}
const BODY_RARITY_HP={common:0,uncommon:1,rare:2,relic:3};
export const bodyHealth=p=>(def(p).hp??2)+Math.max(0,Math.min(4,Math.floor((p.tier??1)-1)))+BODY_RARITY_HP[partMeta(p).rarity]+(p.upgrades.hp||0);
export const capacity=p=>def(p).capacity*(1+.1*(p.tier-1))*(1+addBonus(p,'capacity')+affixBonus(p,'capacity'));
export const rankWeightFactor=p=>1.15**Math.max(0,Math.min(4,Math.floor((p.tier??1)-1)));
export function weight(p){const d=def(p),base=d.kind==='body'?Math.ceil(d.capacity*.3):d.weight;return base*rankWeightFactor(p)*(1-affixBonus(p,'weight'))*(p.modifier==='light'?.8:p.modifier==='rapid'?1.1:p.modifier==='armored'?1.15:1);}
export function installed(s){return[s.body,...s.arms,...s.legs,...s.organs].filter(Boolean);}
export function carried(s){return[...installed(s),...s.inventory];}
export function load(s){return [...s.arms,...s.legs,...s.organs,...s.inventory].filter(Boolean).reduce((sum,p)=>sum+weight(p),0);}
/** Full speed through 60% load; linear slowdown until capacity stops movement. */
export function weightSpeedFactor(weight,capacity){
 if(capacity<=0||weight>=capacity-1e-7)return 0;
 return 1-Math.max(0,weight/capacity-.6);
}
export const addBonus=(p,stat)=> (p.upgrades[stat]||0)*(INCREMENTS[stat]||0);
export const soulBonus=(s,stat)=>(s.soul[stat]||0)*(INCREMENTS[stat]||0)/3;
// Installed root upgrades subtract seconds from the shared recovery timer.
export const legRecovery=p=>0;
export function regenerationDelay(s,part=null){
 const legs=s.legs.filter(Boolean);
 if(part&&def(part).kind==='leg'&&!legs.includes(part))legs.push(part);
 const organs=s.organs.filter(p=>p?.key==='regen');if(part?.key==='regen'&&!organs.includes(part))organs.push(part);
 const regenerators=organs.reduce((sum,p)=>sum+tierFactor(p),0),boost=regenerators?organs.reduce((sum,p)=>sum+tierFactor(p)*recoveryMultiplier(p,'regenRate'),0)/regenerators:1;
 const base=Math.max(REGEN_MIN_SECONDS,setBonuses(s).regenDelay/(regenerators?organEffect(s)*regenerators:1)-legs.reduce((n,p)=>n+legRecovery(p),0));
 return Math.max(REGEN_MIN_SECONDS,base/boost);
}
/** Item 2: continuous share for one part, as a fraction of the maximum per second. */
export function continuousRecoveryRate(p,stat){
 if(!p)return 0;
 const tier=Math.max(1,Math.min(5,Math.floor(p.tier??1))),upgrades=Math.max(0,Math.min(20,p.upgrades?.[stat]||0));
 return CONTINUOUS_REGEN_BASE+CONTINUOUS_REGEN_STEP*(tier-1+upgrades);
}
/** Rootwalker legs heal continuously; armour parts still use their repair cycle. */
export const rootRegenPerSecond=s=>(s?.legs||[]).filter(p=>p?.key==='root').reduce((sum,p)=>sum+continuousRecoveryRate(p,'regen'),0);
export const legHealth=p=>{
 const d=def(p),tier=Math.max(1,Math.min(5,Math.floor(p.tier??1)));
 return d.healthByTier?.[tier-1]??(d.rankStat==='hp'?.5*(tier-1):0);
};
export const legArmor=p=>def(p).rankStat==='armor'?.5*(Math.max(1,Math.min(5,Math.floor(p.tier??1)))+Math.max(0,Math.min(10,p.upgrades.armor||0))):0;
export const armorPlateCapacity=(p,boost=1)=>p?.key==='armor'?Math.ceil((.5*(Math.max(1,Math.min(5,Math.floor(p.tier??1)))+1)*(1+addBonus(p,'armor'))*boost)*2-1e-9)/2+.5*organUpgradeLevel(p,'plateCapacity'):0;
const RUNNER_DAMAGE_KEYS=new Set(['shotgun','pistol','claws']),RUNNER_DAMAGE_BONUS=.1;
export const legSpeed=(p,bonus=0)=>def(p).speed*(def(p).rankStat==='speed'?tierFactor(p):1)*(1+Math.min(.6,(p.key==='swarmLeg'?0:addBonus(p,'speed'))+affixBonus(p,'speed')+bonus));
export function stats(s){
 const list=installed(s),body=def(s.body),f=tierFactor(s.body),affix=stat=>list.reduce((n,p)=>n+affixBonus(p,stat),0);
 const b=modifiers(s),bodyBonus=bodyBonuses(s),organBoost=organEffect(s),sets=setBonuses(s);
 const legArmorBase=s.legs.filter(Boolean).reduce((sum,p)=>sum+legArmor(p),0),armorPlateBase=s.organs.filter(p=>p?.key==='armor').reduce((sum,p)=>sum+armorPlateCapacity(p,organBoost),0);
 const hp=HEALTH.base+bodyHealth(s.body)+s.legs.filter(Boolean).reduce((sum,p)=>sum+legHealth(p),0)+bodyBonus.hp+sets.hp+(b.hp||0)-(s.isaac?.deals.hpCost||0),armorBase=.5+sets.armor+list.reduce((n,p)=>n+(p.key==='armor'||def(p).kind==='leg'?0:(def(p).armor||0)/20*(1+addBonus(p,'armor')))+(p.modifier==='armored'?1:0)+affixBonus(p,'armor'),0)+(b.armor||0),armor=Math.min(hp,armorBase+armorPlateBase+legArmorBase+(armorBase+armorPlateBase+legArmorBase>.5?(b.movingArmor||0):0)+.5*(s.isaac?.deals.armor||0));
 const speed=s.legs.filter(Boolean).reduce((sum,p)=>sum+legSpeed(p,b.speed||0),0)/body.legs*(1+bodyBonus.speed+sets.speed);
 const carriedWeight=load(s),maxWeight=capacity(s.body)+20*(s.isaac?.deals.capacity||0),loadFactor=weightSpeedFactor(carriedWeight,maxWeight);
 const shields=s.organs.filter(p=>p?.key==='shield').reduce((sum,p)=>sum+defensiveOrganHitCapacity(s,p),0),regenerators=s.organs.filter(p=>p?.key==='regen').length,regenPersistsThroughDamage=s.legs.some(p=>p?.key==='root'),plates=s.organs.filter(p=>p?.key==='armor'),armorRepairAmount=.5*plates.length,armorRepairRate=.5*plates.length,armorRepairDelay=armorRepairAmount?ARMOR_REPAIR_SECONDS*armorRepairAmount/armorRepairRate/organBoost:ARMOR_REPAIR_SECONDS/organBoost,dodge=Math.min(MAX_DODGE_CHANCE,(b.dodge||0)+(bodyBonus.dodge||0)+.1*organPower(s,'reflexNerve'));
 return{hp,armor,dodge,turnSpeed:bodyTurnSpeed(s.body,maxWeight),capacity:maxWeight,weight:carriedWeight,loadFactor,overloaded:loadFactor===0,speed:speed*(1+.15*(s.isaac?.deals.speed||0))*(1+affix('movement'))*loadFactor*(inMire(s)?1.25:1),shieldMax:shields+(sets.barrier?1:0),setRegen:sets.tissue,regen:!!(regenerators||b.regen),regenPersistsThroughDamage,regenPerSecond:rootRegenPerSecond(s)*organBoost,regenAmount:Math.max(1,b.regen||0),regenDelay:regenerationDelay(s),armorRepairAmount,armorRepairDelay,shieldRate:organBoost/setBonuses(s).shieldDelay,projectile:1+.3*organPower(s,'stabilizer'),organEffect:organBoost,rate:affix('rate')+bodyBonus.rate+sets.rate+.15*organPower(s,'accelerator')+(inMire(s)?.25:0),bodyFactor:f,revive:b.revive||0,pickup:7*(1+(b.pickup||0)+setBonuses(s).pickup+affix('pickup'))};
}
export function weaponStats(s,p,st=stats(s)){
 if(p.key==='drone'){const d=def(p),base=droneStats(p),swarm=summonTuning(s,modifiers(s));return{...d,partId:p.id,damage:base.damage*swarm.damage,interval:base.interval/swarm.rate,range:swarm.droneSearch,crit:0,critPower:1,speed:0,extra:0};}
 const d=def(p),melee=['sector','area','contact'].includes(d.mode),b=modifiers(s),bodyBonus=bodyBonuses(s),projectile=['projectile','rocket','acid'].includes(d.mode),family=weaponFamilyBonus(s,p);
 // The Forester scales every weapon with the assembly's health, the Runner only sharpens its own family.
 const rush=speedRushBonus(s,st.speed),ramp=critRampStacks(s,combatTime(s))*CRIT_RAMP_STEP*(1+chassisTraitBoost(s));
 const partBonus=bodyBonus.healthDamage*Math.max(0,st.hp)+rush+(RUNNER_DAMAGE_KEYS.has(p.key)&&s.legs.some(q=>q?.key==='runner')?RUNNER_DAMAGE_BONUS:0);
 const swarm=d.mode==='rocket'?summonTuning(s,b):null;
 const reachMultiplier=1+(melee?(b.reach||0)+(b.meleeReach||0)+setBonuses(s).reach:(b.range||0)+(b.rangedReach||0)+setBonuses(s).range),range=melee?heroMeleeAttackRange(s,d.range*reachMultiplier):d.range*reachMultiplier;
 return{...d,...(d.magazine?{magazine:magazineCapacity(p)}:{}),partId:p.id,summonBossDamage:swarm?.bossDamage??1,damage:(swarm?.damage??1)*d.damage*(p.fused?2:1)*tierFactor(p)*(projectile?Math.max(.2,1+(b.projectileDamage||0)):1)*(1+addBonus(p,'damage')+affixBonus(p,'damage'))*(1+(b.damage||0)+bodyBonus.damage+(melee?(b.meleeDamage||0):(b.rangedDamage||0)+bodyBonus.rangedDamage)+(melee?setBonuses(s).meleeDamage:setBonuses(s).rangedDamage)+partBonus),interval:d.interval/(1+addBonus(p,'rate')+(b.rate||0)+st.rate+(melee&&b.meleeFrenzy&&(s.specialization?.frenzyUntil||0)>(s.time+(s.isaac?.extraTime||0))?(b.meleeFrenzyRate||.25):0)+(p.modifier==='rapid'?.12:0)+rush),crit:Math.min(MAX_CRIT_CHANCE,.05+(d.crit||0)+family.crit+addBonus(p,'crit')+(b.crit||0)+(melee?(b.meleeCrit||0):(b.rangedCrit||0))+ramp),critPower:(d.critPower??1.5)+family.critPower+addBonus(p,'critPower')+(b.critPower||0)+ramp,speed:(d.speed||0)*st.projectile*(1+(b.velocity||0)),range,pierce:(d.pierce||1)+(d.mode==='projectile'&&b.pierce?1:0),extra:projectile?(b.extra||0):0,...(d.pelletSpread!=null?{pelletSpread:d.pelletSpread*(1-family.spread)}:{})};
}
export function upgradeOptions(p,s=null){
 if(ranks(p)>=upgradeLimit(p))return[];const d=def(p),organStat=ORGAN_UPGRADE_STATS[p.key];
 if(organStat)return !s||upgradeHasEffect(s,p,organStat)?[organStat]:[];
 if(d.kind==='arm')return['damage'];
 if(d.kind==='body')return['capacity'];
 if(d.kind==='leg')return d.upgradeStat?[d.upgradeStat]:addBonus(p,'speed')<.6?['speed']:[];
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
 if(stat==='plateCapacity')return after.armor-before.armor>1e-9;
 if(stat==='regenRate')return before.regenDelay-after.regenDelay>1e-9;
 if(stat==='repairRate')return Math.max(.5,before.armorRepairDelay)-Math.max(.5,after.armorRepairDelay)>1e-9;
 if(stat==='traitBoost')return Object.keys(bodyBonuses(next)).some(key=>Math.abs((bodyBonuses(next)[key]||0)-(bodyBonuses(s)[key]||0))>1e-9);
 return false;
}
export function upgrade(s,id,stat,paid=false){
 const p=installed(s).find(p=>p.id===id);if(!p||!upgradeOptions(p,s).includes(stat))return false;
 const cost=upgradeCost(ranks(p));if(paid&&s.biomass<cost)return false;
 const old=stats(s);if(paid){s.biomass-=cost;p.spent+=cost;s.firstPaidUpgrade=true;recordBiomassSpend(s,cost);}p.upgrades[stat]=(p.upgrades[stat]||0)+1;
 const after=stats(s),now=combatTime(s),h=s.health;
 if(stat==='plateCapacity'&&h)h.armorSpent=(h.armorSpent||0)+Math.max(0,after.armor-old.armor);
 if(stat==='regenRate'&&h){if(h.regenAt!=null)h.regenAt=rescaleRecovery(h.regenAt,h.regenDelay??old.regenDelay,after.regenDelay,now);h.regenDelay=after.regenDelay;}
 if(stat==='repairRate'&&h){const delay=Math.max(.5,after.armorRepairDelay);if(h.armorRepairAt!=null)h.armorRepairAt=rescaleRecovery(h.armorRepairAt,h.armorRepairDelay??old.armorRepairDelay,delay,now);h.armorRepairDelay=delay;}
 preserveHealth(s,old.hp,after.hp);return true;
}
export function equip(s,id,slot){
 const p=s.inventory.find(p=>p.id===id);if(!p)return false;const d=def(p);if(d.kind==='body')return false;
 const group={arm:'arms',leg:'legs',organ:'organs'}[d.kind];if(!Number.isInteger(slot)||slot<0||slot>=s[group].length||slot>=slotCount(s,s.body,group))return false;
 if(boundPart(s[group][slot]))return false;
 const old=stats(s);s.inventory=s.inventory.filter(q=>q!==p);if(s[group][slot])s.inventory.push(s[group][slot]);s[group][slot]=p;preserveHealth(s,old.hp,stats(s).hp);return true;
}
export function unequip(s,group,slot){if(!['arms','legs','organs'].includes(group)||!s[group][slot]||boundPart(s[group][slot]))return false;const old=stats(s);s.inventory.push(s[group][slot]);s[group][slot]=null;preserveHealth(s,old.hp,stats(s).hp);return true;}
export function swapBody(s,id,keep){
 const p=s.inventory.find(p=>p.id===id&&def(p).kind==='body');if(!p)return false;
 if(!bodyFitsHere(s,p))return false;
 const d=def(p),selection={};if((HEALTH.base+bodyHealth(p)+(modifiers(s).hp||0)-(s.isaac?.deals.hpCost||0))<1)return false;
 for(const group of ['arms','legs','organs']){
  const current=s[group].filter(Boolean),ids=keep?.[group]??[...current.filter(boundPart),...current.filter(p=>!boundPart(p))].slice(0,slotCount(s,p,group)).map(p=>p.id);
  if(ids.length>slotCount(s,p,group)||current.some(p=>boundPart(p)&&!ids.includes(p.id))||new Set(ids).size!==ids.length||ids.some(id=>!current.some(q=>q.id===id)))return false;
  selection[group]=ids.map(id=>current.find(q=>q.id===id));
 }
 const oldMax=stats(s).hp;s.inventory=s.inventory.filter(q=>q!==p);s.inventory.push(s.body);s.body=p;
 for(const group of ['arms','legs','organs']){s.inventory.push(...s[group].filter(q=>q&&!selection[group].includes(q)));s[group]=Array.from({length:slotCount(s,p,group)},(_,i)=>selection[group][i]||null);}
 preserveHealth(s,oldMax,stats(s).hp);return true;
}
/** Item 24: the last installed leg is protected by default, so neither the drop
 * nor the recycle action is offered for it and the hero cannot be left legless. */
export const isLastInstalledLeg=(s,p)=>def(p).kind==='leg'&&(s?.legs||[]).includes(p)&&(s?.legs||[]).filter(Boolean).length<=1;
export function canDrop(s,p,{allowLastLeg=false}={}){return !!p&&p!==s.body&&!boundPart(p)&&carried(s).includes(p)&&(allowLastLeg||!isLastInstalledLeg(s,p));}
export function drop(s,id,options){
 const p=carried(s).find(p=>p.id===id);if(!canDrop(s,p,options))return false;
 p.setAssignmentComplete=true;delete p.setCandidateId;
 const oldHp=stats(s).hp;
 s.inventory=s.inventory.filter(q=>q!==p);
 for(const group of ['arms','legs','organs'])s[group]=s[group].map(q=>q===p?null:q);
 preserveHealth(s,oldHp,stats(s).hp);
 let position={x:s.player.x,y:s.player.y??0,z:s.player.z};
 for(let i=0;i<8;i++){const angle=i*Math.PI/4,x=s.player.x+Math.cos(angle)*2,z=s.player.z+Math.sin(angle)*2,y=s.world.heightAt?.(x,z)??position.y;if(s.world.walkable&&!s.world.walkable(x,z,.4)||Math.abs(y-position.y)>.4)continue;position={x,y,z};break;}
 s.ground.push({id:++s.entityId,part:p,...position,autoPickupBlocked:true});return true;
}
function discoverPart(s,p){if(!s.profile||s.profile.unlocked.includes(p.key))return;s.profile.unlocked.push(p.key);s.events.push({type:'unlock',text:'Открыто: '+def(p).name});}
function discoverLore(s,q){if(!q.lore)return false;s.storyEvidence??=[];if(!s.storyEvidence.some(item=>item.id===q.lore.id))s.storyEvidence.push(q.lore);const saved=(s.profile.meta??={}).storyEvidence??=[];(s.events??=[]);if(!saved.includes(q.lore.id)){saved.push(q.lore.id);s.events.push({type:'profile-progress'});}s.ground=s.ground.filter(item=>item!==q);s.events.push({type:'lore-found',evidence:q.lore});return true;}
export function pickup(s,id){const q=s.ground.find(q=>q.id===id);if(!q||!surfaceReach(s,q,s.player)||groundDistance(s,q,s.player)>3)return false;if(q.lore)return discoverLore(s,q);if(!q.part)return false;finalizeReceivedPart(s,q.part);if(q.part.lootSource&&!q.part.lootRecorded){recordReward(s,q.part,q.part.lootSource);q.part.lootRecorded=true;}s.inventory.push(q.part);markInventoryUnseen(s,q.part);s.ground=s.ground.filter(d=>d!==q);discoverPart(s,q.part);return true;}
/** Auto-transfer nearby rewards once; discarded equipment requires leaving its radius first. */
export function autoPickup(s){
 const collected=[],remaining=[];
 for(const q of s.ground){
  const distance=groundDistance(s,q,s.player);
  if(q.autoPickupBlocked){if(distance>3)delete q.autoPickupBlocked;remaining.push(q);continue;}
  if(distance>3||!surfaceReach(s,q,s.player)){remaining.push(q);continue;}
  if(q.lore){discoverLore(s,q);continue;}
  if(!q.part){remaining.push(q);continue;}
  finalizeReceivedPart(s,q.part);if(q.part.lootSource&&!q.part.lootRecorded){recordReward(s,q.part,q.part.lootSource);q.part.lootRecorded=true;}
  s.inventory.push(q.part);const group={arm:'arms',leg:'legs',organ:'organs'}[def(q.part).kind],slot=group?s[group].findIndex((part,index)=>!part&&index<slotCount(s,s.body,group)):-1;
  if(slot>=0)equip(s,q.part.id,slot);else markInventoryUnseen(s,q.part);discoverPart(s,q.part);collected.push(q.part);
 }
 s.ground=remaining;
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
 const base=ECONOMY.digest[p.tier]+ECONOMY.digestRarityBonus[partMeta(p).rarity];
 const power=digestionTierFactor(organ)*(1+addBonus(organ,'power'))*organEffect(s,'digestion');
 return Math.floor(base*power*(1+(modifiers(s).biomassYield||0))+(p.spent||0)*ECONOMY.digestRefund);
}
/** Recycle only carried equipment; ground loot is never a digestion source. */
export function digest(s,id){
 const amount=digestionYield(s,id);if(amount===false)return false;
 const p=carried(s).find(p=>p.id===id),oldHp=stats(s).hp;
 s.inventory=s.inventory.filter(q=>q!==p);
 for(const group of ['arms','legs','organs'])s[group]=s[group].map(q=>q===p?null:q);
 preserveHealth(s,oldHp,stats(s).hp);
 s.biomass+=amount;(s.achievementCounters??={}).recycled=(s.achievementCounters.recycled||0)+1;recordSurvivalRecycle(s);return amount;
}
export function lootTier(level,rng){const base=ECONOMY.tierLevels.filter(n=>level>=n).length,r=rng();return Math.max(1,Math.min(5,base+(r<.2?-1:r>=.9?1:0)));}

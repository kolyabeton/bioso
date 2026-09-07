import {bodyTurnSpeed} from './body-facing.js';
import {normalizeMeta} from './systems/meta-progression.js';
import {seededRandom} from './simulation.js';
import {bodyFitsHere} from './body-size.js';
import {bodyBonuses,organEffect} from './systems/body-traits.js';
import {initializePart,partMeta,setBonuses,affixBonus,recordReward} from './systems/sets-loot.js';
import {inMire,slotCount,boundPart} from './systems/mutations.js';
import {surfaceReach,spatialDistance} from './elevation.js';
import {modifiers} from './systems/abilities.js';
import {preserveHealth} from './systems/health.js';
import {REGEN_MIN_SECONDS,REGEN_UPGRADE_SECONDS} from './systems/health-tuning.js';
import {upgradeCost,ECONOMY} from './systems/balance.js';
import {CATALOG,STARTERS,INCREMENTS} from './catalog.js';
export const tierFactor=p=>1+.2*(p.tier-1);
export const ranks=p=>Object.values(p.upgrades).reduce((a,b)=>a+b,0);
export const def=p=>CATALOG[p.key];
export function createPart(state,key,tier=1,modifier=null){
 if(typeof key!=='string'||!Object.hasOwn(CATALOG,key))throw Error('Unknown part');
 const kind=CATALOG[key].kind;
 if(modifier==='rapid'&&kind!=='arm'||modifier==='armored'&&!['body','leg'].includes(kind))modifier=null;
 return initializePart({id:++state.serial,key,tier:Math.max(1,Math.min(5,tier)),modifier,upgrades:{},spent:0,cooldown:0,shieldCharge:0,ammo:CATALOG[key].magazine??null,reloadRemaining:0,reloadDuration:0,idleFor:0,recoil:0},seededRandom((state.seed??0)^Math.imul(state.serial,2654435761)));
}
export function newProfile(){return{version:1,unlocked:[...STARTERS],achievements:[],meta:normalizeMeta()};}
export function readProfile(storage){try{const p=JSON.parse(storage.getItem('biomecha.profile.v1'));if(p?.version!==1)return newProfile();return{version:1,unlocked:[...new Set([...STARTERS,...(Array.isArray(p.unlocked)?p.unlocked:[]).filter(k=>typeof k==='string'&&Object.hasOwn(CATALOG,k))])],meta:normalizeMeta(p.meta),achievements:(Array.isArray(p.achievements)?p.achievements:[]).filter(k=>typeof k==='string')};}catch{return newProfile();}}
const BODY_RARITY_HP={common:0,uncommon:1,rare:2,relic:3};
export const bodyHealth=p=>(def(p).hp??2)+Math.max(0,Math.min(4,Math.floor((p.tier??1)-1)))+BODY_RARITY_HP[partMeta(p).rarity]+(p.upgrades.hp||0);
export const capacity=p=>def(p).capacity*(1+.1*(p.tier-1))*(1+addBonus(p,'capacity')+affixBonus(p,'capacity'));
export function weight(p){const d=def(p),base=d.kind==='body'?Math.ceil(def(p).capacity*(1+.1*(p.tier-1))*.3):d.weight;return base*(1-affixBonus(p,'weight'))*(p.modifier==='light'?.8:p.modifier==='rapid'?1.1:p.modifier==='armored'?1.15:1);}
export function installed(s){return[s.body,...s.arms,...s.legs,...s.organs].filter(Boolean);}
export function carried(s){return[...installed(s),...s.inventory];}
export function load(s){return [...s.arms,...s.legs,...s.organs,...s.inventory].filter(Boolean).reduce((sum,p)=>sum+weight(p)*(s.legs.includes(p)?setBonuses(s).legWeight:s.organs.includes(p)?setBonuses(s).organWeight:1)*(s.body.key==='hecaton'&&s.arms.includes(p)&&def(p).weight<=10?.8:1),0);}
/** Full speed through 60% load; linear slowdown until capacity stops movement. */
export function weightSpeedFactor(weight,capacity){
 if(capacity<=0||weight>=capacity-1e-7)return 0;
 return 1-Math.max(0,weight/capacity-.6);
}
export const addBonus=(p,stat)=> (p.upgrades[stat]||0)*(INCREMENTS[stat]||0);
export const soulBonus=(s,stat)=>(s.soul[stat]||0)*(INCREMENTS[stat]||0)/3;
// Seconds removed from the shared interval by this installed root's upgrades.
export const legRecovery=p=>def(p).regen?Math.max(0,Math.min(10,p.upgrades.regen||0))*REGEN_UPGRADE_SECONDS:0;
export function regenerationDelay(s,part=null){
 const legs=s.legs.filter(Boolean);
 if(part&&def(part).kind==='leg'&&!legs.includes(part))legs.push(part);
 const organ=s.organs.some(p=>p?.key==='regen')||part?.key==='regen';
 // Apply chassis/set effects first so every root upgrade removes exactly one second.
 return Math.max(REGEN_MIN_SECONDS,setBonuses(s).regenDelay/(organ?organEffect(s):1)-legs.reduce((n,p)=>n+legRecovery(p),0));
}
export const legArmor=p=>((def(p).armor||0)/20)*(1+addBonus(p,'armor'));
export function stats(s){
 const list=installed(s),body=def(s.body),f=tierFactor(s.body),affix=stat=>list.reduce((n,p)=>n+affixBonus(p,stat),0);
 const b=modifiers(s),bodyBonus=bodyBonuses(s),organBoost=organEffect(s);
 const hp=bodyHealth(s.body)+(b.hp||0)-(s.isaac?.deals.hpCost||0),armorBase=list.reduce((n,p)=>n+(def(p).armor||0)/20*(1+addBonus(p,'armor'))*(p.key==='armor'?organBoost:1)+(p.modifier==='armored'?1:0)+affixBonus(p,'armor'),0)+(b.armor?1:0),armor=Math.min(hp,Math.ceil(armorBase)+(armorBase>0&&b.movingArmor?1:0)+.5*(s.isaac?.deals.armor||0));
 const speed=s.legs.filter(Boolean).reduce((sum,p)=>sum+def(p).speed*(1+Math.min(.6,addBonus(p,'speed')+affixBonus(p,'speed')+(b.speed||0))),0)/body.legs*(s.body.key==='wanderer'?1.1:1)*(1+bodyBonus.speed);
 const hasRoots=s.legs.some(p=>p&&def(p).regen);
 const carriedWeight=load(s),maxWeight=capacity(s.body)+20*(s.isaac?.deals.capacity||0),loadFactor=weightSpeedFactor(carriedWeight,maxWeight);
 const shield=s.organs.find(p=>p?.key==='shield');
 const power=key=>{const p=s.organs.find(p=>p?.key===key);return p?tierFactor(p)*(1+addBonus(p,'power'))*organBoost:0;};
 return{hp,armor,turnSpeed:bodyTurnSpeed(s.body,maxWeight),capacity:maxWeight,weight:carriedWeight,loadFactor,overloaded:loadFactor===0,speed:speed*(1+.15*(s.isaac?.deals.speed||0))*(s.legs.some(p=>p?.key==='spring')&&(s.extraParts?.springUntil||0)>(s.time+(s.isaac?.extraTime||0))?1.35:1)*(1+affix('movement'))*loadFactor*(inMire(s)?1.25:1),shieldMax:shield?1:0,regen:!!(power('regen')||b.regen||hasRoots),regenDelay:regenerationDelay(s),shieldRate:organBoost/setBonuses(s).shieldDelay,projectile:1+.3*power('stabilizer')+(s.body.key==='chimera'?.15:0),organEffect:organBoost,rate:(s.body.key==='reactor'&&(s.extraParts?.reactorUntil||0)>(s.time+(s.isaac?.extraTime||0))?.3:0)+affix('rate')+bodyBonus.rate+.15*power('accelerator')+(inMire(s)?.25:0),bodyFactor:f,revive:!!b.revive,pickup:7*(1+(b.pickup||0)+setBonuses(s).pickup+affix('pickup')),movingArmor:!!b.movingArmor};
}
export function weaponStats(s,p,st=stats(s)){
 const d=def(p),melee=['sector','area','contact'].includes(d.mode),b=modifiers(s),projectile=['projectile','rocket','acid'].includes(d.mode);
 return{...d,partId:p.id,damage:d.damage*(p.fused?2:1)*tierFactor(p)*(projectile?Math.max(.2,1+(b.projectileDamage||0)):1)*(1+addBonus(p,'damage')+affixBonus(p,'damage'))*(1+(b.damage||0)+(melee?(b.meleeDamage||0):(b.rangedDamage||0)))*(s.body.key==='chimera'&&melee?1.1:1),interval:d.interval/(1+addBonus(p,'rate')+(b.rate||0)+st.rate+(melee&&b.meleeFrenzy&&(s.specialization?.frenzyUntil||0)>(s.time+(s.isaac?.extraTime||0))?.25:0)+(p.modifier==='rapid'?.12:0)+(s.body.key==='hunter'&&d.weight<=10?.15:0)),crit:Math.min(.6,.05+(d.crit||0)+addBonus(p,'crit')+(b.crit||0)+(melee?(b.meleeCrit||0):(b.rangedCrit||0))),critPower:1.5+addBonus(p,'critPower')+(b.critPower||0),speed:(d.speed||0)*st.projectile*(1+(b.velocity||0)),range:d.range*(1+(melee?(b.reach||0)+(b.meleeReach||0)+setBonuses(s).reach:(b.range||0)+(b.rangedReach||0)+setBonuses(s).range)),pierce:(d.pierce||1)+(d.mode==='projectile'?(b.pierce||0):0),extra:projectile?(b.extra||0):0};
}
export function upgradeOptions(p){
 if(ranks(p)>=10)return[];const d=def(p);
 if(d.kind==='arm')return['damage'];
 if(d.kind==='body')return['capacity'];
 if(d.kind==='leg')return d.upgradeStat?[d.upgradeStat]:addBonus(p,'speed')<.6?['speed']:[];
 return ['digestion','stabilizer','accelerator'].includes(d.key)?['power']:[];
}
export function upgrade(s,id,stat,paid=false){
 const p=installed(s).find(p=>p.id===id);if(!p||!upgradeOptions(p).includes(stat))return false;
 const cost=upgradeCost(ranks(p));if(paid&&s.biomass<cost)return false;
 const old=stats(s);if(paid){s.biomass-=cost;p.spent+=cost;s.firstPaidUpgrade=true;}p.upgrades[stat]=(p.upgrades[stat]||0)+1;
 preserveHealth(s,old.hp,stats(s).hp);return true;
}
export function equip(s,id,slot){
 const p=s.inventory.find(p=>p.id===id);if(!p)return false;const d=def(p);if(d.kind==='body')return false;
 const group={arm:'arms',leg:'legs',organ:'organs'}[d.kind];if(!Number.isInteger(slot)||slot<0||slot>=s[group].length||slot>=slotCount(s,s.body,group))return false;
 if(boundPart(s[group][slot]))return false;
 if(d.kind==='organ'&&s.organs.some((q,i)=>i!==slot&&q?.key===p.key))return false;
 const old=stats(s);s.inventory=s.inventory.filter(q=>q!==p);if(s[group][slot])s.inventory.push(s[group][slot]);s[group][slot]=p;preserveHealth(s,old.hp,stats(s).hp);return true;
}
export function unequip(s,group,slot){if(!['arms','legs','organs'].includes(group)||!s[group][slot]||boundPart(s[group][slot]))return false;const old=stats(s);s.inventory.push(s[group][slot]);s[group][slot]=null;preserveHealth(s,old.hp,stats(s).hp);return true;}
export function swapBody(s,id,keep){
 const p=s.inventory.find(p=>p.id===id&&def(p).kind==='body');if(!p)return false;
 if(!bodyFitsHere(s,p))return false;
 const d=def(p),selection={};if((bodyHealth(p)+(modifiers(s).hp||0)-(s.isaac?.deals.hpCost||0))<1)return false;
 for(const group of ['arms','legs','organs']){
  const current=s[group].filter(Boolean),ids=keep?.[group]??[...current.filter(boundPart),...current.filter(p=>!boundPart(p))].slice(0,slotCount(s,p,group)).map(p=>p.id);
  if(ids.length>slotCount(s,p,group)||current.some(p=>boundPart(p)&&!ids.includes(p.id))||new Set(ids).size!==ids.length||ids.some(id=>!current.some(q=>q.id===id)))return false;
  selection[group]=ids.map(id=>current.find(q=>q.id===id));
 }
 const oldMax=stats(s).hp;s.inventory=s.inventory.filter(q=>q!==p);s.inventory.push(s.body);s.body=p;
 for(const group of ['arms','legs','organs']){s.inventory.push(...s[group].filter(q=>q&&!selection[group].includes(q)));s[group]=Array.from({length:slotCount(s,p,group)},(_,i)=>selection[group][i]||null);}
 preserveHealth(s,oldMax,stats(s).hp);return true;
}
export function canDrop(s,p){return !!p&&p!==s.body&&!boundPart(p)&&carried(s).includes(p);}
export function drop(s,id){
 const p=carried(s).find(p=>p.id===id);if(!canDrop(s,p))return false;
 const oldHp=stats(s).hp;
 s.inventory=s.inventory.filter(q=>q!==p);
 for(const group of ['arms','legs','organs'])s[group]=s[group].map(q=>q===p?null:q);
 preserveHealth(s,oldHp,stats(s).hp);
 let position={x:s.player.x,y:s.player.y??0,z:s.player.z};
 for(let i=0;i<8;i++){const angle=i*Math.PI/4,x=s.player.x+Math.cos(angle)*2,z=s.player.z+Math.sin(angle)*2,y=s.world.heightAt?.(x,z)??position.y;if(s.world.walkable&&!s.world.walkable(x,z,.4)||Math.abs(y-position.y)>.4)continue;position={x,y,z};break;}
 s.ground.push({id:++s.entityId,part:p,...position,autoPickupBlocked:true});return true;
}
function discoverPart(s,p){if(!s.profile||s.profile.unlocked.includes(p.key))return;s.profile.unlocked.push(p.key);s.events.push({type:'unlock',text:'Открыто: '+def(p).name});}
export function pickup(s,id){const q=s.ground.find(q=>q.id===id);if(!q||!surfaceReach(s,q,s.player)||spatialDistance(q,s.player)>3)return false;if(q.part.lootSource&&!q.part.lootRecorded){recordReward(s,q.part,q.part.lootSource);q.part.lootRecorded=true;}s.inventory.push(q.part);s.ground=s.ground.filter(d=>d!==q);discoverPart(s,q.part);return true;}
/** Auto-transfer nearby rewards once; discarded equipment requires leaving its radius first. */
export function autoPickup(s){
 const collected=[];
 for(const q of [...s.ground]){
  if(q.autoPickupBlocked){if(spatialDistance(q,s.player)>3)delete q.autoPickupBlocked;continue;}
  if(pickup(s,q.id))collected.push(q.part);
 }
 return collected;
}
export function preferredSlot(s,p){const group={arm:'arms',leg:'legs',organ:'organs'}[def(p).kind];if(!group)return null;const free=s[group].findIndex(q=>!q);return free>=0?free:0;}
/** One atomic ground action, reusing equip validation, never duplicating a part. */
export function equipGround(s,id,slot){
 const q=s.ground.find(q=>q.id===id);if(!q||Math.hypot(q.x-s.player.x,q.z-s.player.z)>3||def(q.part).kind==='body')return false;
 s.inventory.push(q.part);if(!equip(s,q.part.id,slot)){s.inventory=s.inventory.filter(p=>p!==q.part);return false;}if(q.part.lootSource&&!q.part.lootRecorded){recordReward(s,q.part,q.part.lootSource);q.part.lootRecorded=true;}s.ground=s.ground.filter(g=>g!==q);discoverPart(s,q.part);return true;
}
export function digestionYield(s,id){
 const organ=s.organs.find(p=>p?.key==='digestion'&&p.id!==id)||s.organs.find(p=>p?.key==='outerStomach'&&p.id!==id);
 const p=carried(s).find(p=>p.id===id);
 if(!organ||!canDrop(s,p))return false;
 const base=ECONOMY.digest[p.tier]*ECONOMY.digestRarity[partMeta(p).rarity];
 return Math.floor(base*tierFactor(organ)*(1+addBonus(organ,'power'))*organEffect(s)*(1+(modifiers(s).biomassYield||0))+(p.spent||0)*ECONOMY.digestRefund);
}
/** Recycle only carried equipment; ground loot is never a digestion source. */
export function digest(s,id){
 const amount=digestionYield(s,id);if(amount===false)return false;
 const p=carried(s).find(p=>p.id===id),oldHp=stats(s).hp;
 s.inventory=s.inventory.filter(q=>q!==p);
 for(const group of ['arms','legs','organs'])s[group]=s[group].map(q=>q===p?null:q);
 preserveHealth(s,oldHp,stats(s).hp);
 s.biomass+=amount;return amount;
}
export function lootTier(level,rng){const base=ECONOMY.tierLevels.filter(n=>level>=n).length,r=rng();return Math.max(1,Math.min(5,base+(r<.2?-1:r>=.9?1:0)));}

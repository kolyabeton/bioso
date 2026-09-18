import {defensiveOrganHitCapacity,organEffect} from './body-traits.js';
import {soulProc} from './soul-procs.js';
import {setBonuses} from './sets-loot.js';
import {syncSetState,setBarrierView,SET_TIMING} from './sets/bonuses.js';
import {combatTime,isaacState,healingSuppressed} from './mutations.js';
import {HEALTH} from './balance.js';
import {ARMOR_REPAIR_SECONDS,REGEN_MIN_SECONDS,SHIELD_RECHARGE_SECONDS} from './health-tuning.js';
import {resolveCounterShellHit} from './ability-combat.js';
export function createHealth(){return{invulnerableUntil:0,armorSpent:0,continuousAt:null,continuousHealed:0,armorRepairAt:ARMOR_REPAIR_SECONDS,armorRepairDelay:ARMOR_REPAIR_SECONDS,regenAt:HEALTH.regenDelay,vampireHits:0,vampireAt:0,revived:false,abilityRevivesUsed:0,missing:0,hits:0,blocked:0,dodged:0,lastCause:null};}
const state=s=>s.health??=createHealth();
export const armorRemaining=(s,capacity)=>Math.min(s.hp,Math.max(0,capacity-(s.health?.armorSpent||0)));
export const shieldRechargeDelay=(s,p)=>Math.max(REGEN_MIN_SECONDS,(SHIELD_RECHARGE_SECONDS-Math.max(0,Math.min(4,(p?.tier??1)-1))-Math.max(0,Math.min(10,p?.upgrades?.shieldRecharge||0)))*(setBonuses(s).shieldDelay/SHIELD_RECHARGE_SECONDS)/organEffect(s));
function syncShieldCharge(s,shield){
 const capacity=defensiveOrganHitCapacity(s,shield),previous=shield.shieldCapacity??1,wasFull=shield.shieldCharge>=previous;
 shield.shieldCapacity=capacity;shield.shieldCharge=Math.max(0,Math.min(capacity,wasFull?capacity:Number(shield.shieldCharge)||0));
 if(shield.shieldCharge<capacity&&shield.shieldReadyAt==null&&shield.shieldCharge===0){shield.shieldDuration=shieldRechargeDelay(s,shield);shield.shieldReadyAt=combatTime(s)+shield.shieldDuration;}
 if(shield.shieldReadyAt!=null&&combatTime(s)>=shield.shieldReadyAt){shield.shieldCharge=capacity;shield.shieldReadyAt=null;}
 return capacity;
}
/** Preserve missing segments, including overflow when a smaller body is fitted. */
export function preserveHealth(s,oldMax,newMax){const h=state(s);h.missing=Math.max(h.missing,oldMax-s.hp);s.hp=Math.max(0,newMax-h.missing);syncSetState(s);}
export function heal(s,max,amount=1){if(s.dead||s.hp<=0||healingSuppressed(s))return;const a=isaacState(s),hearts=s.organs.filter(p=>p?.key==='reverseHeart');if(amount>0&&s.hp>=max&&hearts.length&&combatTime(s)>=a.heartAt){a.heartAt=combatTime(s)+5;a.pulses=hearts.length;a.pulseDamage=hearts.reduce((total,p)=>total+2+Math.max(0,Math.min(4,(p.tier??1)-1))*.2+(p.upgrades.heartDamage||0)*.2,0);}const h=state(s);h.missing=Math.max(h.missing,max-s.hp);h.missing=Math.max(0,h.missing-amount);s.hp=Math.max(0,max-h.missing);}
/** @returns {'ignored'|'dodged'|'shield'|'armor'|'hurt'|'revived'} */
export function receiveHit(s,st,{damage=1,cause='contact',source=null,dx=0,dz=0,fractional=false}={}){
 const sets=syncSetState(s),h=state(s),resolve=result=>resolveCounterShellHit(s,result),now=combatTime(s);if(s.dead||s.hp<=0||damage<=0||now<h.invulnerableUntil)return'ignored';
 const dodgeDx=source&&Number.isFinite(source.x)?s.player.x-source.x:dx,dodgeDz=source&&Number.isFinite(source.z)?s.player.z-source.z:dz,dodgeDirection=Math.hypot(dodgeDx,dodgeDz)||1;
 if(now<(s.extraParts?.springDodgeUntil||0)){h.dodged=(h.dodged||0)+1;s.events.push({type:'dodge',kind:'spring',x:s.player.x,y:s.player.y??0,z:s.player.z,dx:dodgeDx/dodgeDirection,dz:dodgeDz/dodgeDirection});return'dodged';}
 if(st.dodge>0&&typeof s.rng==='function'&&s.rng()<st.dodge){h.dodged=(h.dodged||0)+1;s.events.push({type:'dodge',x:s.player.x,y:s.player.y??0,z:s.player.z,dx:dodgeDx/dodgeDirection,dz:dodgeDz/dodgeDirection});return'dodged';}
 if(setBarrierView(s).ready){sets.barrierAt=now+SET_TIMING.barrier;h.blocked++;s.events.push({type:'shield',kind:'set-bastion',x:s.player.x,y:s.player.y??0,z:s.player.z});soulProc(s,'set-bastion',s.player);return resolve('shield');}
 if(s.consumables?.shieldCharges>0&&s.consumables.shieldUntil>combatTime(s)){s.consumables.shieldCharges--;h.blocked++;s.events.push({type:'shield',kind:'consumable',dx:-dodgeDx/dodgeDirection,dz:-dodgeDz/dodgeDirection,x:s.player.x,y:s.player.y??0,z:s.player.z});return resolve('shield');}
 const shield=s.organs.find(p=>p?.key==='shield'&&syncShieldCharge(s,p)&&p.shieldCharge>=1);
 if(shield?.shieldCharge>=1){shield.shieldCharge--;if(shield.shieldCharge<=0){shield.shieldDuration=shieldRechargeDelay(s,shield);shield.shieldReadyAt=combatTime(s)+shield.shieldDuration;}else shield.shieldReadyAt=null;h.blocked++;s.events.push({type:'shield',kind:'organ-shield',x:s.player.x,y:s.player.y??0,z:s.player.z});return resolve('shield');}
 if(armorRemaining(s,st.armor)>0){h.armorSpent=(h.armorSpent||0)+.5;h.blocked++;soulProc(s,'armor',s.player);return resolve('armor');}
 const before=s.hp;s.hp=Math.max(0,s.hp-damage);const lost=before-s.hp;h.invulnerableUntil=combatTime(s)+HEALTH.invulnerability;h.missing=Math.max(h.missing,st.hp-s.hp);h.hits++;h.lastCause=cause;s.hitAgo=0;const regenDelay=st.regenDelay??setBonuses(s).regenDelay;if(st.regenPersistsThroughDamage)h.regenAt+=regenDelay-(h.regenDelay??HEALTH.regenDelay);else h.regenAt=combatTime(s)+regenDelay;h.regenDelay=regenDelay;

 if(source&&Number.isFinite(source.x)&&Number.isFinite(source.z)){dx=s.player.x-source.x;dz=s.player.z-source.z;}
 const direction=Math.hypot(dx,dz)||1,hitEvent={hp:s.hp,amount:lost,cause,dx:dx/direction,dz:dz/direction,x:s.player.x,y:s.player.y??0,z:s.player.z};s.events.push({type:'player-health-hit',...hitEvent});s.events.push({type:'player-hit',...hitEvent});s.events.push({type:'shield',kind:'health-invulnerability',duration:HEALTH.invulnerability,x:s.player.x,y:s.player.y??0,z:s.player.z});
 if(s.hp<=0&&(s.consumables?.revivalCharges||0)>0){s.consumables.revivalCharges--;s.hp=1;h.missing=st.hp-1;h.invulnerableUntil=combatTime(s)+2;soulProc(s,'revive',s.player);s.events.push({type:'notice',text:`Возрождение · осталось ${s.consumables.revivalCharges}`});return resolve('revived');}
 const reviveLimit=Math.max(0,Math.floor(Number(st.revive)||0));
 if(s.hp<=0&&(h.abilityRevivesUsed||0)<reviveLimit){h.abilityRevivesUsed=(h.abilityRevivesUsed||0)+1;h.revived=h.abilityRevivesUsed>=reviveLimit;s.hp=1;h.missing=st.hp-1;h.invulnerableUntil=combatTime(s)+2;soulProc(s,'revive',s.player);return resolve('revived');}
 return resolve('hurt');
}
export function vampireHit(s,st){if(s.dead||s.hp<=0||healingSuppressed(s))return;const h=state(s),tier=Math.max(1,...s.arms.filter(p=>p?.key==='fangs').map(p=>Math.min(5,p.tier||1))),needed=11-tier;h.vampireHits=Math.min(needed,h.vampireHits+1);if(h.vampireHits>=needed){heal(s,st.hp);h.vampireHits=0;}}
function tickContinuousRecovery(s,st){
 const h=state(s),now=combatTime(s),last=h.continuousAt??now;h.continuousAt=now;
 const dt=Math.max(0,Math.min(1,now-last));if(!dt)return;
 const healthRate=Math.max(0,Number(st.regenPerSecond)||0);
 if(healthRate>0&&s.hp<st.hp&&!healingSuppressed(s)){
  const before=s.hp;heal(s,st.hp,healthRate*st.hp*dt);
  if(s.hp>before)h.continuousHealed=(h.continuousHealed||0)+(s.hp-before);
 }
}
export function tickHealth(s,st){
 if(s.hp<=0)return;
 tickContinuousRecovery(s,st);const sets=syncSetState(s),h=state(s),shields=s.organs.filter(p=>p?.key==='shield');
 for(const shield of shields)syncShieldCharge(s,shield);
 const armorRepairAmount=Math.max(0,Number(st.armorRepairAmount)||0),armorRepairDelay=Math.max(REGEN_MIN_SECONDS,Number(st.armorRepairDelay)||ARMOR_REPAIR_SECONDS);
 const previousArmorRepairDelay=h.armorRepairDelay??ARMOR_REPAIR_SECONDS;if(h.armorRepairAt==null)h.armorRepairAt=combatTime(s)+armorRepairDelay;else if(armorRepairDelay!==previousArmorRepairDelay){const remaining=Math.max(0,Math.min(1,(h.armorRepairAt-combatTime(s))/previousArmorRepairDelay));h.armorRepairAt=combatTime(s)+armorRepairDelay*remaining;}h.armorRepairDelay=armorRepairDelay;
 if(armorRepairAmount<=0)h.armorRepairAt=combatTime(s)+armorRepairDelay;
 else if(combatTime(s)>=h.armorRepairAt){const before=armorRemaining(s,st.armor);h.armorSpent=Math.max(0,(h.armorSpent||0)-armorRepairAmount);const repaired=armorRemaining(s,st.armor)-before;if(repaired>0)soulProc(s,'armorRepair',s.player,{amount:repaired});h.armorRepairAt=combatTime(s)+armorRepairDelay;}
 if(sets.active.rootwalker&&combatTime(s)>=sets.tissueAt){const before=s.hp;if(s.hp<st.hp)heal(s,st.hp,1);if(s.hp>before)soulProc(s,'regen',s.player,{amount:s.hp-before});sets.tissueAt=combatTime(s)+SET_TIMING.tissue;}
 const delay=st.regenDelay??HEALTH.regenDelay;
 h.regenAt+=delay-(h.regenDelay??HEALTH.regenDelay);h.regenDelay=delay;
 if(st.regen&&combatTime(s)>=h.regenAt){const before=s.hp;heal(s,st.hp,st.regenAmount||1);if(s.hp>before)soulProc(s,'regen',s.player);h.regenAt=combatTime(s)+delay;}
}
export function healthView(s,max,armorMax=0,regeneration=null){
 const barrier=setBarrierView(s);
 const now=combatTime(s),shields=s.organs.filter(p=>p?.key==='shield'),pickupCharges=s.consumables?.shieldUntil>now?s.consumables?.shieldCharges||0:0,ready=shields.reduce((sum,p)=>sum+Math.max(0,Math.min(defensiveOrganHitCapacity(s,p),Number(p.shieldCharge)||0)),0)+(barrier.ready?1:0),pending=shields.filter(p=>p.shieldCharge<defensiveOrganHitCapacity(s,p)),progress=ready||pickupCharges?1:Math.max(0,barrier.progress,...pending.map(shield=>shield.shieldReadyAt!=null?Math.max(0,Math.min(1,1-(shield.shieldReadyAt-now)/(shield.shieldDuration||shieldRechargeDelay(s,shield)))):0));
 const ordinaryAt=regeneration?.regen?s.health?.regenAt:Infinity,tissueAt=setBonuses(s).tissue?s.setsV2?.tissueAt:Infinity,useTissue=Number.isFinite(tissueAt)&&tissueAt<=ordinaryAt;
 const regenDelay=useTissue?SET_TIMING.tissue:Math.max(REGEN_MIN_SECONDS,Number(regeneration?.regenDelay)||HEALTH.regenDelay),regenAmount=useTissue?1:Math.max(1,Number(regeneration?.regenAmount)||1),regenAt=useTissue?tissueAt:ordinaryAt;
 const regenActive=!!((regeneration?.regen||useTissue)&&s.hp>0&&s.hp<max&&!healingSuppressed(s)&&Number.isFinite(regenAt));
 const regenProgress=regenActive?Math.max(0,Math.min(1,1-(regenAt-now)/regenDelay)):0,regenValue=Math.min(max,s.hp+regenAmount*regenProgress);
 const segments=Array.from({length:Math.ceil(max)},(_,i)=>i<s.hp),regenCells=segments.map((_,i)=>{const start=Math.max(0,Math.min(1,s.hp-i)),fill=regenActive?Math.max(0,Math.min(1,regenValue-i)-start):0;return{start,fill};});
 const armor=armorRemaining(s,armorMax),repairAt=s.health?.armorRepairAt,repairDelay=s.health?.armorRepairDelay||ARMOR_REPAIR_SECONDS,armorRepairActive=armor<armorMax&&Number.isFinite(repairAt),armorRepairProgress=armorRepairActive?Math.max(0,Math.min(1,1-(repairAt-now)/repairDelay)):0;
 const shieldMax=pickupCharges+shields.reduce((sum,p)=>sum+defensiveOrganHitCapacity(s,p),0)+(barrier.active?1:0);
 return{current:s.hp,max,segments,armor,armorMax,armorRepairActive,armorRepairProgress,armorRepairSecondsLeft:armorRepairActive?Math.max(0,repairAt-now):0,shield:pickupCharges+ready>0,shieldCharges:pickupCharges+ready,shieldMax,shieldEquipped:shieldMax>0,shieldProgress:progress,setBarrier:barrier,invulnerable:now<(s.health?.invulnerableUntil||0),regenActive,regenProgress,regenSecondsLeft:regenActive?Math.max(0,regenAt-now):0,regenAmount,regenCells};
}

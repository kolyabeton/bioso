import {defensiveOrganHitCapacity,organEffect} from './body-traits.js';
import {soulProc} from './soul-procs.js';
import {setBonuses} from './sets-loot.js';
import {syncSetState,setBarrierView,SET_TIMING} from './sets/bonuses.js';
import {combatTime,isaacState,healingSuppressed} from './mutations.js';
import {HEALTH} from './balance.js';
import {ARMOR_REPAIR_SECONDS,REGEN_MIN_SECONDS,SHIELD_RECHARGE_SECONDS} from './health-tuning.js';
import {BODY_BASE_BONUSES} from '../catalog.js';
import {resolveCounterShellHit} from './ability-combat.js';
import {frontalShieldReduction} from './shield-arm.js';
import {recordChassisDefense} from './chassis-progress.js';
import {HERO_HP_PER_SEGMENT,heroHealthPoints} from './health-scale.js';
export function createHealth(){return{invulnerableUntil:0,armorSpent:0,continuousAt:0,continuousHealed:0,healRemainder:0,revived:false,abilityRevivesUsed:0,missing:0,hits:0,blocked:0,dodged:0,lastCause:null};}
const state=s=>s.health??=createHealth();
export const armorRemaining=(s,capacity)=>Math.min(s.hp/HERO_HP_PER_SEGMENT,Math.max(0,capacity-(s.health?.armorSpent||0)));
export const shieldRechargeDelay=(s,p)=>Math.max(REGEN_MIN_SECONDS,(SHIELD_RECHARGE_SECONDS-Math.max(0,Math.min(4,(p?.tier??1)-1))-Math.max(0,Math.min(10,p?.upgrades?.shieldRecharge||0)))*(setBonuses(s).shieldDelay/SHIELD_RECHARGE_SECONDS)/organEffect(s)/(1+(BODY_BASE_BONUSES[s.body?.key]?.shieldRechargeRate||0)));
function syncShieldCharge(s,shield){
 const capacity=defensiveOrganHitCapacity(s,shield),previous=shield.shieldCapacity??1,wasFull=shield.shieldCharge>=previous;
 shield.shieldCapacity=capacity;shield.shieldCharge=Math.max(0,Math.min(capacity,wasFull?capacity:Number(shield.shieldCharge)||0));
 if(shield.shieldCharge<capacity&&shield.shieldReadyAt==null&&shield.shieldCharge===0){shield.shieldDuration=shieldRechargeDelay(s,shield);shield.shieldReadyAt=combatTime(s)+shield.shieldDuration;}
 if(shield.shieldReadyAt!=null&&combatTime(s)>=shield.shieldReadyAt){shield.shieldCharge=capacity;shield.shieldReadyAt=null;}
 return capacity;
}
/** Preserve wounds; rarity max-HP equipment keeps current HP when changed. */
export function preserveHealth(s,oldMax,newMax,{preserveCurrent=false}={}){const h=state(s),before=s.hp,minimum=s.hp>0?Math.min(s.hp,heroHealthPoints(.5)):0;if(preserveCurrent){s.hp=Math.max(minimum,Math.min(before,newMax));h.missing=Math.max(0,newMax-s.hp);}else{h.missing=Math.max(h.missing,oldMax-s.hp);s.hp=Math.max(minimum,newMax-h.missing);}syncSetState(s);}
export function heal(s,max,amount=HERO_HP_PER_SEGMENT){if(s.dead||s.hp<=0||healingSuppressed(s))return;const a=isaacState(s),hearts=s.organs.filter(p=>p?.key==='reverseHeart');if(amount>0&&s.hp>=max&&hearts.length&&combatTime(s)>=a.heartAt){a.heartAt=combatTime(s)+5;a.pulses=hearts.length;a.pulseDamage=hearts.reduce((total,p)=>total+2+Math.max(0,Math.min(4,(p.tier??1)-1))*.2+(p.upgrades.heartDamage||0)*.2,0);}const h=state(s);h.missing=Math.max(h.missing,max-s.hp);const available=Math.max(0,amount)+(h.healRemainder||0),whole=Math.floor(available+1e-9);h.healRemainder=available-whole;h.missing=Math.max(0,h.missing-whole);s.hp=Math.max(0,max-h.missing);if(s.hp>=max)h.healRemainder=0;}
/** @returns {'ignored'|'dodged'|'shield'|'armor'|'hurt'|'revived'} */
export function receiveHit(s,st,{damage=1,cause='contact',source=null,projectile=null,dx=0,dz=0,fractional=false}={}){
 const sets=syncSetState(s),h=state(s),resolve=result=>{recordChassisDefense(s,projectile,result);return resolveCounterShellHit(s,result);},now=combatTime(s);if(s.dead||s.hp<=0||damage<=0||now<h.invulnerableUntil)return'ignored';
 const dodgeDx=source&&Number.isFinite(source.x)?s.player.x-source.x:dx,dodgeDz=source&&Number.isFinite(source.z)?s.player.z-source.z:dz,dodgeDirection=Math.hypot(dodgeDx,dodgeDz)||1;
 if(now<(s.extraParts?.springDodgeUntil||0)){h.dodged=(h.dodged||0)+1;s.events.push({type:'dodge',kind:'spring',x:s.player.x,y:s.player.y??0,z:s.player.z,dx:dodgeDx/dodgeDirection,dz:dodgeDz/dodgeDirection});return resolve('dodged');}
 if(st.dodge>0&&typeof s.rng==='function'&&s.rng()<st.dodge){h.dodged=(h.dodged||0)+1;s.events.push({type:'dodge',x:s.player.x,y:s.player.y??0,z:s.player.z,dx:dodgeDx/dodgeDirection,dz:dodgeDz/dodgeDirection});return resolve('dodged');}
 if(setBarrierView(s).ready){sets.barrierAt=now+SET_TIMING.barrier;h.blocked++;s.events.push({type:'shield',kind:'set-bastion',x:s.player.x,y:s.player.y??0,z:s.player.z});soulProc(s,'set-bastion',s.player);return resolve('shield');}
 if(s.consumables?.shieldCharges>0&&s.consumables.shieldUntil>combatTime(s)){s.consumables.shieldCharges--;h.blocked++;s.events.push({type:'shield',kind:'consumable',dx:-dodgeDx/dodgeDirection,dz:-dodgeDz/dodgeDirection,x:s.player.x,y:s.player.y??0,z:s.player.z});return resolve('shield');}
 const shield=s.organs.find(p=>p?.key==='shield'&&syncShieldCharge(s,p)&&p.shieldCharge>=1);
 if(shield?.shieldCharge>=1){shield.shieldCharge--;if(shield.shieldCharge<=0){shield.shieldDuration=shieldRechargeDelay(s,shield);shield.shieldReadyAt=combatTime(s)+shield.shieldDuration;}else shield.shieldReadyAt=null;h.blocked++;s.events.push({type:'shield',kind:'organ-shield',x:s.player.x,y:s.player.y??0,z:s.player.z});return resolve('shield');}
 const reduction=frontalShieldReduction(s,{cause,projectile,dx,dz}),damageScale=1-reduction;
 if(reduction>0)s.events.push({type:'shield-reduction',kind:'arm-shield',reduction,amount:heroHealthPoints(damage*reduction),x:s.player.x,y:s.player.y??0,z:s.player.z,dx,dz});
 if(armorRemaining(s,st.armor)>0){h.armorSpent=(h.armorSpent||0)+.5*damageScale;h.blocked++;soulProc(s,'armor',s.player);return resolve('armor');}
 damage=Math.max(1,heroHealthPoints(damage*damageScale));
 const before=s.hp;s.hp=Math.max(0,s.hp-damage);const lost=before-s.hp;h.invulnerableUntil=combatTime(s)+HEALTH.invulnerability;h.missing=Math.max(h.missing,st.hp-s.hp);h.hits++;h.lastCause=cause;s.hitAgo=0;

 if(source&&Number.isFinite(source.x)&&Number.isFinite(source.z)){dx=s.player.x-source.x;dz=s.player.z-source.z;}
 const direction=Math.hypot(dx,dz)||1,hitEvent={hp:s.hp,amount:lost,cause,dx:dx/direction,dz:dz/direction,x:s.player.x,y:s.player.y??0,z:s.player.z};s.events.push({type:'player-health-hit',...hitEvent});s.events.push({type:'player-hit',...hitEvent});s.events.push({type:'shield',kind:'health-invulnerability',duration:HEALTH.invulnerability,x:s.player.x,y:s.player.y??0,z:s.player.z});
 if(s.hp<=0&&(s.consumables?.revivalCharges||0)>0){s.consumables.revivalCharges--;s.hp=HERO_HP_PER_SEGMENT;h.missing=st.hp-s.hp;h.invulnerableUntil=combatTime(s)+2;soulProc(s,'revive',s.player);s.events.push({type:'notice',text:`Возрождение · осталось ${s.consumables.revivalCharges}`});return resolve('revived');}
 const core=(s.organs||[]).find(p=>p?.key==='revivalCore')||(s.inventory||[]).find(p=>p?.key==='revivalCore');
 if(s.hp<=0&&core){
  s.organs=s.organs.map(p=>p===core?null:p);
  s.inventory=(s.inventory||[]).filter(p=>p!==core);
  s.hp=HERO_HP_PER_SEGMENT;h.missing=st.hp-s.hp;h.invulnerableUntil=combatTime(s)+2;
  soulProc(s,'revive',s.player);
  s.events.push({type:'notice',text:'Реаниматор сработал и разрушился'});
  return resolve('revived');
 }
 const reviveLimit=Math.max(0,Math.floor(Number(st.revive)||0));
 if(s.hp<=0&&(h.abilityRevivesUsed||0)<reviveLimit){h.abilityRevivesUsed=(h.abilityRevivesUsed||0)+1;h.revived=h.abilityRevivesUsed>=reviveLimit;s.hp=HERO_HP_PER_SEGMENT;h.missing=st.hp-s.hp;h.invulnerableUntil=combatTime(s)+2;soulProc(s,'revive',s.player);return resolve('revived');}
 return resolve('hurt');
}
export const fangsHealingPercent=p=>4+Math.max(1,Math.min(5,Math.floor(Number(p?.tier)||1)));
export function healFromFangsAttack(s,st,p){heal(s,st.hp,st.hp*fangsHealingPercent(p)/100);}
function tickContinuousRecovery(s,st){
 const h=state(s),now=combatTime(s),last=h.continuousAt??now;h.continuousAt=now;
 const dt=Math.max(0,Math.min(1,now-last));if(!dt)return;
 const armorRate=Math.max(0,Number(st.armorRepairPerSecond)||0);
 if(armorRate>0&&(h.armorSpent||0)>0){
  const before=armorRemaining(s,st.armor);
  h.armorSpent=Math.max(0,(h.armorSpent||0)-armorRate*st.armor*dt);
  const repaired=armorRemaining(s,st.armor)-before;
  if(repaired>0)soulProc(s,'armorRepair',s.player,{amount:repaired});
 }
 const healthRate=Math.max(0,Number(st.regenPerSecond)||0);
 if(healthRate>0&&s.hp<st.hp&&!healingSuppressed(s)){
  const before=s.hp;heal(s,st.hp,healthRate*st.hp*dt);
  if(s.hp>before)h.continuousHealed=(h.continuousHealed||0)+(s.hp-before);
 }
}
export function tickHealth(s,st){
 if(s.hp<=0)return;
 tickContinuousRecovery(s,st);syncSetState(s);const shields=s.organs.filter(p=>p?.key==='shield');
 for(const shield of shields)syncShieldCharge(s,shield);

}
export function healthView(s,max,armorMax=0,regeneration=null){
 const barrier=setBarrierView(s);
 const now=combatTime(s),shields=s.organs.filter(p=>p?.key==='shield'),pickupCharges=s.consumables?.shieldUntil>now?s.consumables?.shieldCharges||0:0,ready=shields.reduce((sum,p)=>sum+Math.max(0,Math.min(defensiveOrganHitCapacity(s,p),Number(p.shieldCharge)||0)),0)+(barrier.ready?1:0),pending=shields.filter(p=>p.shieldCharge<defensiveOrganHitCapacity(s,p)),progress=ready||pickupCharges?1:Math.max(0,barrier.progress,...pending.map(shield=>shield.shieldReadyAt!=null?Math.max(0,Math.min(1,1-(shield.shieldReadyAt-now)/(shield.shieldDuration||shieldRechargeDelay(s,shield)))):0));
 const healthRate=Math.max(0,Number(regeneration?.regenPerSecond)||0),regenAmount=healthRate*max;
 const regenActive=healthRate>0&&s.hp>0&&s.hp<max&&!healingSuppressed(s);
 const regenProgress=0,regenValue=s.hp;
 const segments=max<=12?Array.from({length:Math.ceil(max)},(_,i)=>i<s.hp):[],regenCells=segments.map((_,i)=>{const start=Math.max(0,Math.min(1,s.hp-i)),fill=regenActive?Math.max(0,Math.min(1,regenValue-i)-start):0;return{start,fill};});
 const armor=armorRemaining(s,armorMax),armorRate=Math.max(0,Number(regeneration?.armorRepairPerSecond)||0),spent=Math.max(0,s.health?.armorSpent||0);
 const armorRepairActive=armor<armorMax&&armorRate>0&&spent>0;
 // Continuous repair has no cycle, so the bar fills the half plate being restored.
 const armorRepairProgress=armorRepairActive?Math.max(0,Math.min(1,((.5-(spent%.5))%.5)/.5)):0;
 const armorRepairSecondsLeft=armorRepairActive&&armorMax>0?spent/(armorRate*armorMax):0;
 const shieldMax=pickupCharges+shields.reduce((sum,p)=>sum+defensiveOrganHitCapacity(s,p),0)+(barrier.active?1:0);
 return{current:s.hp,max,segments,armor,armorMax,armorOverlay:armor*HERO_HP_PER_SEGMENT,armorMaxOverlay:armorMax*HERO_HP_PER_SEGMENT,armorRepairActive,armorRepairProgress,armorRepairSecondsLeft,shield:pickupCharges+ready>0,shieldCharges:pickupCharges+ready,shieldMax,shieldEquipped:shieldMax>0,shieldProgress:progress,setBarrier:barrier,invulnerable:now<(s.health?.invulnerableUntil||0),regenActive,regenProgress,regenSecondsLeft:0,regenAmount,regenCells};
}

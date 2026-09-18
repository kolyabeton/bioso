import {setCounts} from './definitions.js';
import {SHIELD_RECHARGE_SECONDS,REGEN_INTERVAL_SECONDS} from '../health-tuning.js';
import {isMelee} from '../hand-compatibility.js';

export const SET_TIMING=Object.freeze({collector:12,barrier:12,tissue:12,reactor:12,hecaton:8,handWindow:4,cross:3,brood:4});
export const setClock=s=>(s.time||0)+(s.isaac?.extraTime||0);
export const setMelee=isMelee;

/** Pure stat lookup: inspecting an item or rendering a menu never starts a timer. */
export function setBonuses(s){
 const c=setCounts(s),on=(id,n)=>c[id]>=n;
 return {speed:on('wanderer',2)?.1:0,pickup:on('wanderer',2)?.5:0,
  rangedDamage:on('hunter',2)?.2:0,range:on('hunter',2)?.2:0,
  meleeDamage:on('chimera',2)?.2:0,reach:on('chimera',2)?.25:0,
  armor:on('bastion',2)?1:0,barrier:on('bastion',3),hp:on('rootwalker',2)?1:0,tissue:on('rootwalker',3),
  reload:on('hecaton',2)?.25:0,rate:on('reactor',2)?.15:0,summons:on('broodmother',2)?1:0,
  summonRate:on('broodmother',3)&&(s.setsV2?.broodUntil||0)>setClock(s)?.4:0,
  // Compatibility fields: these v1 effects have been retired.
  legWeight:1,organWeight:1,shieldDelay:SHIELD_RECHARGE_SECONDS,regenDelay:REGEN_INTERVAL_SECONDS};
}

/** Run-owned state, separate from v1 saves. Call at equipment and simulation boundaries. */
export function syncSetState(s){
 const now=setClock(s),counts=setCounts(s),a=s.setsV2??={active:{},hunterShots:0,hands:{},hecatonAt:0};
 a.active??={};a.hands??={};a.hunterShots??=0;a.hecatonAt??=0;
 for(const [id,field,interval] of [['wanderer','collectorAt',12],['bastion','barrierAt',12],['rootwalker','tissueAt',12],['reactor','reactorAt',12]]){
  const active=counts[id]>=3;
  if(active&&!Number.isFinite(a[field]))a[field]=now+interval;
  // Neither a periodic heal nor an XP pulse can be banked while the set is absent.
  if(active&&!a.active[id]&&['wanderer','rootwalker'].includes(id)&&a[field]<=now)a[field]=now+interval;
 }
 if(a.active.wanderer&&!(counts.wanderer>=3))for(const drop of s.xpDrops||[])delete drop.setAttracted;
 if(!(counts.chimera>=3)){a.meleeUntil=0;a.rangedUntil=0;}
 if(!(counts.hecaton>=3))a.hands={};
 if(!(counts.broodmother>=3))a.broodUntil=0;
 const broodPresent=counts.broodmother>=2;
 if(a.broodPresent&&!broodPresent&&s.abilities){
  const abilities=s.abilities;
  // Keep this source's replacement deadline even when it leaves the loadout.
  if(abilities.companions?.some(c=>(c.sourceKey??c.id)==='set-broodmother')){
   (abilities.companionSummonReadyAt??={})['set-broodmother']=now+1.2/(abilities.companionRate||1);
   abilities.companions=abilities.companions.filter(c=>(c.sourceKey??c.id)!=='set-broodmother');
  }
 }
 a.broodPresent=broodPresent;
 a.active=Object.fromEntries(Object.entries(counts).map(([id,count])=>[id,count>=3]));
 return a;
}

export function setBarrierView(s){
 const active=setCounts(s).bastion>=3,now=setClock(s),at=s.setsV2?.barrierAt;
 const remaining=active?(Number.isFinite(at)?Math.max(0,at-now):SET_TIMING.barrier):0;
 return {active,ready:active&&remaining===0,remaining,progress:active?1-remaining/SET_TIMING.barrier:0};
}

export function hitSetMultiplier(s,e,w){
 if(w.secondary||w.key==='drone')return 1;
 const a=syncSetState(s),now=setClock(s),melee=setMelee(w);
 const hunter=a.active.hunter&&!melee?(w.setHunterMultiplier||1):1;
 if(!a.active.chimera)return hunter;
 const bonus=(melee?a.meleeUntil:a.rangedUntil)>now?.3:0;
 // Compute this hit first; only then prime the other attack type.
 if(melee)a.rangedUntil=now+SET_TIMING.cross;else a.meleeUntil=now+SET_TIMING.cross;
 return hunter*(1+bonus);
}

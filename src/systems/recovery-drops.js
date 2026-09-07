import {spatialDistance,surfaceReach} from '../elevation.js';
import {armorRemaining,heal} from './health.js';
import {combatTime} from './mutations.js';

export const RECOVERY_DROPS=Object.freeze({armorChance:.025,healthChance:.04,amount:1,radius:1.25,lifetime:120});
export function spawnRecoveryDrop(s,enemy){
 const roll=s.rng(),kind=roll<RECOVERY_DROPS.armorChance?'armor':roll<RECOVERY_DROPS.armorChance+RECOVERY_DROPS.healthChance?'health':null;
 if(!kind)return null;
 let {x,z}=enemy,y=s.world.heightAt?.(x,z)??enemy.y??0;
 if(s.world.heightAt?.(x,z)===null){
  const safe=s.world.tiles?.flatMap(t=>t.safe??[]).sort((a,b)=>Math.hypot(a.x-x,a.z-z)-Math.hypot(b.x-x,b.z-z))[0];
  if(!safe)return null;({x,z}=safe);y=s.world.heightAt(x,z)??0;
 }
 const drop={id:++s.entityId,kind,x,y,z,expiresAt:combatTime(s)+RECOVERY_DROPS.lifetime};
 (s.recoveryDrops??=[]).push(drop);return drop;
}
export function tickRecoveryDrops(s,st){
 s.recoveryDrops=(s.recoveryDrops??[]).filter(q=>{
  if(combatTime(s)>=q.expiresAt)return false;
  if(s.dead||s.hp<=0||spatialDistance(q,s.player)>RECOVERY_DROPS.radius||!surfaceReach(s,q,s.player))return true;
  let amount=0;
  if(q.kind==='health'){
   const before=s.hp;if(before>=st.hp)return true;
   heal(s,st.hp,RECOVERY_DROPS.amount);amount=s.hp-before;
  }else if(q.kind==='armor'){
   const before=armorRemaining(s,st.armor),max=Math.min(s.hp,st.armor);
   if(before>=max)return true;
   amount=Math.min(RECOVERY_DROPS.amount,max-before);
   // Discard hidden spent-armor overflow from a previous, larger loadout.
   s.health.armorSpent=Math.max(0,st.armor-before-amount);
  }
  if(amount<=0)return true;
  s.events.push({type:'pickup',kind:q.kind,x:q.x,y:q.y,z:q.z});
  s.events.push({type:'notice',text:q.kind==='armor'?`Броня +${amount}`:`Здоровье +${amount}`});
  return false;
 });
}

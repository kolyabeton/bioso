import {collectBiomass} from './survival-endgame.js';
import {RELOAD_BONUS} from './reload-bonus.js';
import {seededRandom} from '../simulation.js';
import {spatialDistance,groundDistance,surfaceReach,visibleBetween} from '../elevation.js';
import {combatTime} from './mutations.js';
import {cancelEnemyAttack} from './enemy-combat.js';
import {enemyTargetable} from './enemy-locomotion.js';

export const CONSUMABLES=Object.freeze([
 {kind:'biomass_5',name:'Биомасса',color:'#44f5a1',weight:55,description:'+5 биомассы'},
 {kind:'shield',name:'Щит',color:'#18caff',weight:7,description:'Блокирует один удар · 12 с'},
 {kind:'phase',name:'Линька',color:'#c37bff',weight:6,description:'Неуязвимость · 2 с'},
 {kind:'attraction',name:'Притяжение',color:'#00f1d1',weight:5,description:'Собирает весь опыт и расходники на карте'},
 {kind:'recharge',name:'Перезарядка',color:'#ff8308',weight:6,description:'Время перезарядки оружия −33% · 8 с'},
 {kind:'sleep',name:'Сон',color:'#6540ff',weight:5,description:'Усыпляет обычных врагов в радиусе 16 м · 5 с, до урона'},
 {kind:'impulse',name:'Импульс',color:'#1260ff',weight:5,description:'30 урона всем видимым врагам в радиусе 12 м; обычных отбрасывает'},
 {kind:'parasite',name:'Паразиты',color:'#ff1973',weight:4,description:'Три спутника атакуют по 8 урона · 8 с'},
 {kind:'hunter',name:'Метка',color:'#ff2410',weight:3,description:'Сильнейшая цель в радиусе 15 м получает +50% урона · 8 с'},
 {kind:'beacon',name:'Маяк',color:'#95ff06',weight:3,description:'Отвлекает обычных преследователей · 6 с'},
 {kind:'revival',name:'Возрождение',color:'#ffc324',weight:1,description:'Один запасной шанс · возвращает 25 HP'}
].map(Object.freeze));
export const CONSUMABLE_BY_KIND=Object.freeze(Object.fromEntries(CONSUMABLES.map(q=>[q.kind,q])));
// Full descriptions belong to item details, not the transient pickup toast.
export const CONSUMABLE_NOTICES=Object.freeze({
 biomass_5:'+5 биомассы',shield:'Щит · 1 удар · 12 с',phase:'Неуязвимость · 2 с',
 attraction:'Притяжение · сбор бонусов',recharge:'Время перезарядки −33% · 8 с',
 sleep:'Сон · до 5 с',impulse:'Импульс · 30 урона',parasite:'Паразиты · 8 с',
 hunter:'Метка · +50% урона на 8 с',beacon:'Маяк · 6 с',revival:'Возрождение · +1 шанс'
});
export const CONSUMABLE_RULES=Object.freeze({chance:.01,radius:1.35,lifetime:90,groundLimit:6,minInterval:12,capacity:64,markRadius:15,rechargeDuration:RELOAD_BONUS.duration});
export const consumableState=s=>{const a=s.consumables??={shieldUntil:0,shieldCharges:0,phaseUntil:0,revivalCharges:0,parasitesUntil:0,parasiteAt:0,beacon:null};if(!Number.isFinite(a.revivalCharges))a.revivalCharges=a.revival?1:0;delete a.revival;return a;};

// Shared orbit keeps the rendered satellite and its attack origin identical.
export function consumableSatellite(player,index,time=0){
 const angle=time*1.7+index*Math.PI*2/3;
 return{x:player.x+Math.cos(angle)*1.7,y:(player.y??0)+1.27,z:player.z+Math.sin(angle)*1.7};
}

export function placeConsumable(s,kind,position){
 if(!CONSUMABLE_BY_KIND[kind])return null;
 const y=s.world.heightAt?s.world.heightAt(position.x,position.z):position.y??0;
 if(y===null||!Number.isFinite(y))return null;
 const list=s.consumableDrops??=[];
 if(list.length>=CONSUMABLE_RULES.capacity)return null;
 const q={id:++s.entityId,kind,x:position.x,y,z:position.z,expiresAt:combatTime(s)+CONSUMABLE_RULES.lifetime};
 list.push(q);return q;
}
export function spawnConsumableDrop(s,enemy){
 if(enemy.kind!=='normal')return null;
 const now=combatTime(s),active=(s.consumableDrops??[]).filter(q=>!q.consumed&&q.expiresAt>now).length;
 // Natural drops stay sparse even when many enemies die in the same frame.
 // The larger storage/render capacity also serves the explicit 11-orb art fixture.
 if(now<(s.nextConsumableDropAt??0)||active>=CONSUMABLE_RULES.groundLimit)return null;
 // A separate deterministic stream preserves enemy/combat/loot RNG sequences.
 const rng=s.consumableRng??=seededRandom((s.seed^0x6c8e9cf5)>>>0);
 if(rng()>=CONSUMABLE_RULES.chance)return null;
 let roll=rng()*CONSUMABLES.reduce((sum,q)=>sum+q.weight,0);
 for(const q of CONSUMABLES){roll-=q.weight;if(roll<0){const drop=placeConsumable(s,q.kind,enemy);if(drop)s.nextConsumableDropAt=now+CONSUMABLE_RULES.minInterval;return drop;}}
 return null;
}
const nearby=(s,radius)=>s.enemies.filter(e=>enemyTargetable(e)&&e.kind!=='objective'&&spatialDistance(e,s.player)<=radius&&visibleBetween(s,s.player,e));
export function applyConsumable(s,kind,st,damage){
 if(s.dead||s.hp<=0||!CONSUMABLE_BY_KIND[kind])return false;
 const a=consumableState(s),now=combatTime(s);
 switch(kind){
  case'biomass_5':collectBiomass(s,5);break;
  case'shield':if(a.shieldCharges&&a.shieldUntil>now)return false;a.shieldCharges=1;a.shieldUntil=now+12;break;
  case'phase':a.phaseUntil=Math.max(a.phaseUntil,now+2);s.health.invulnerableUntil=Math.max(s.health.invulnerableUntil,now+2);break;
  case'attraction':{
   const origins=[...s.xpDrops,...(s.recoveryDrops??[]),...(s.consumableDrops??[])].filter(q=>spatialDistance(q,s.player)>1.35).sort((a,b)=>spatialDistance(a,s.player)-spatialDistance(b,s.player)).slice(0,32).map(q=>({x:q.x,y:q.y??0,z:q.z}));
   if(origins.length)s.events.push({type:'consumable-attract',origins,x:s.player.x,y:s.player.y??0,z:s.player.z});
   // Global collection deliberately crosses terrain; equipment stays in place.
   for(const q of [...s.xpDrops,...(s.recoveryDrops??[]),...(s.consumableDrops??[])])Object.assign(q,{x:s.player.x,y:s.player.y??0,z:s.player.z});
   break;}
  case'recharge':
   if(!(a.rechargeUntil>now))a.rechargeStartedAt=now;
   a.rechargeUntil=now+CONSUMABLE_RULES.rechargeDuration;
   for(const p of s.arms.filter(Boolean))s.events.push({type:'consumable-recharge',source:p.id,x:s.player.x,y:s.player.y??0,z:s.player.z});
   break;
  case'sleep':for(const e of nearby(s,16))if(e.kind==='normal'){e.pickupSleepUntil=now+5;cancelEnemyAttack(e,now);e.windup=null;}s.events.push({type:'consumable-burst',kind:'sleep',radius:16,x:s.player.x,y:s.player.y??0,z:s.player.z});break;
  case'impulse':for(const e of nearby(s,12)){damage?.(e,30,0,'consumable');if(e.kind==='normal'){const d=spatialDistance(e,s.player)||1;e.kickX=(e.x-s.player.x)/d*14;e.kickZ=(e.z-s.player.z)/d*14;}}s.events.push({type:'consumable-burst',kind:'impulse',radius:12,x:s.player.x,y:s.player.y??0,z:s.player.z});break;
  case'parasite':a.parasitesUntil=now+8;a.parasiteAt=now+.2;break;
  case'hunter':{const e=nearby(s,CONSUMABLE_RULES.markRadius).filter(e=>!e.dungeonDormant&&!(e.summonAssembly?.until>now)).sort((a,b)=>(b.maxHp??b.hp)-(a.maxHp??a.hp)||spatialDistance(a,s.player)-spatialDistance(b,s.player)||a.id-b.id)[0];if(!e)return false;for(const q of s.enemies)q.pickupMarkUntil=0;e.pickupMarkUntil=now+8;s.events.push({type:'consumable-mark',x:s.player.x,y:s.player.y??0,z:s.player.z,tx:e.x,ty:e.y??0,tz:e.z,target:e.id});break;}
  case'beacon':a.beacon={...s.player,until:now+6};break;
  case'revival':a.revivalCharges=(a.revivalCharges||0)+1;break;
 }
 const q=CONSUMABLE_BY_KIND[kind];
 s.events.push({type:'pickup',kind,color:q.color,x:s.player.x,y:s.player.y??0,z:s.player.z});
 s.events.push({type:'notice',text:CONSUMABLE_NOTICES[kind]});
 return true;
}
export function tickConsumableDrops(s,st,damage){
 if(s.dead||s.hp<=0)return;
 const now=combatTime(s),a=consumableState(s);
 if(a.shieldUntil<=now)a.shieldCharges=0;
 if(a.beacon?.until<=now)a.beacon=null;
 // Snapshot iteration plus consumed flags retains drops spawned by an impulse.
 for(const q of [...(s.consumableDrops??[])]){
  if(q.expiresAt<=now||q.consumed)continue;
  if(groundDistance(s,q,s.player)>(st.pickup??CONSUMABLE_RULES.radius)||!surfaceReach(s,q,s.player))continue;
  if(applyConsumable(s,q.kind,st,damage))q.consumed=true;
 }
 s.consumableDrops=(s.consumableDrops??[]).filter(q=>!q.consumed&&q.expiresAt>now);
 if(a.parasitesUntil>now&&a.parasiteAt<=now){
  a.parasiteAt=now+.8;
  for(let i=0;i<3;i++){
   const e=nearby(s,10).sort((a,b)=>spatialDistance(a,s.player)-spatialDistance(b,s.player))[0];if(!e)break;
   damage?.(e,8,0,'consumable');
   s.events.push({type:'arc',kind:'consumable-parasite',satellite:i,...consumableSatellite(s.player,i,now),tx:e.x,ty:(e.y??0)+.8,tz:e.z,target:e.id});
  }
 }
}
export function consumableTarget(s,e,target){
 const beacon=s.consumables?.beacon;
 const lured=target===s.player&&e.kind==='normal'&&beacon?.until>combatTime(s)&&spatialDistance(e,beacon)<12&&surfaceReach(s,e,beacon);
 if(lured&&e.pickupBeaconUntil!==beacon.until)s.events.push({type:'consumable-lured',kind:'beacon',target:e.id,x:e.x,y:e.y??0,z:e.z});
 e.pickupBeaconUntil=lured?beacon.until:0;
 return lured?beacon:target;
}

import {seededRandom} from '../simulation.js';
import {spatialDistance,surfaceReach,visibleBetween} from '../elevation.js';
import {combatTime} from './mutations.js';
import {CATALOG} from '../catalog.js';
import {cancelEnemyAttack} from './enemy-combat.js';

export const CONSUMABLES=Object.freeze([
 {kind:'biomass_5',name:'Биомасса',color:'#44f5a1',weight:55,description:'+5 биомассы'},
 {kind:'shield',name:'Щит',color:'#18caff',weight:7,description:'Блокирует один удар · 12 с'},
 {kind:'phase',name:'Линька',color:'#c37bff',weight:6,description:'Неуязвимость · 2 с'},
 {kind:'attraction',name:'Притяжение',color:'#00f1d1',weight:5,description:'Собирает весь опыт и расходники на карте'},
 {kind:'recharge',name:'Перезарядка',color:'#ff8308',weight:6,description:'Восстанавливает магазины и готовность рук'},
 {kind:'sleep',name:'Сон',color:'#6540ff',weight:5,description:'Усыпляет обычных врагов в радиусе 16 м · 5 с, до урона'},
 {kind:'impulse',name:'Импульс',color:'#1260ff',weight:5,description:'30 урона всем видимым врагам в радиусе 12 м; обычных отбрасывает'},
 {kind:'parasite',name:'Паразиты',color:'#ff1973',weight:4,description:'Три спутника атакуют по 8 урона · 8 с'},
 {kind:'hunter',name:'Метка',color:'#ff2410',weight:3,description:'Ближайшая цель получает +50% урона · 8 с'},
 {kind:'beacon',name:'Маяк',color:'#95ff06',weight:3,description:'Отвлекает обычных преследователей · 6 с'},
 {kind:'revival',name:'Возрождение',color:'#ffc324',weight:1,description:'Один запасной шанс · возвращает 1 HP'}
].map(Object.freeze));
export const CONSUMABLE_BY_KIND=Object.freeze(Object.fromEntries(CONSUMABLES.map(q=>[q.kind,q])));
// Full descriptions belong to item details, not the transient pickup toast.
export const CONSUMABLE_NOTICES=Object.freeze({
 biomass_5:'+5 биомассы',shield:'Щит · 1 удар / 12 с',phase:'Неуязвимость · 2 с',
 attraction:'Притяжение · сбор бонусов',recharge:'Перезарядка · оружие готово',
 sleep:'Сон · до 5 с',impulse:'Импульс · 30 урона',parasite:'Паразиты · 8 с',
 hunter:'Метка · +50% урона / 8 с',beacon:'Маяк · 6 с',revival:'Возрождение · +1 шанс'
});
export const CONSUMABLE_RULES=Object.freeze({chance:.01,radius:1.35,lifetime:90,groundLimit:6,minInterval:12,capacity:64});
export const consumableState=s=>{const a=s.consumables??={shieldUntil:0,shieldCharges:0,phaseUntil:0,revivalCharges:0,parasitesUntil:0,parasiteAt:0,beacon:null};if(!Number.isFinite(a.revivalCharges))a.revivalCharges=a.revival?1:0;delete a.revival;return a;};

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
const nearby=(s,radius)=>s.enemies.filter(e=>e.hp>0&&e.kind!=='objective'&&spatialDistance(e,s.player)<=radius&&visibleBetween(s,s.player,e));
export function applyConsumable(s,kind,st,damage){
 if(s.dead||s.hp<=0||!CONSUMABLE_BY_KIND[kind])return false;
 const a=consumableState(s),now=combatTime(s);
 switch(kind){
  case'biomass_5':s.biomass+=5;break;
  case'shield':if(a.shieldCharges&&a.shieldUntil>now)return false;a.shieldCharges=1;a.shieldUntil=now+12;break;
  case'phase':a.phaseUntil=Math.max(a.phaseUntil,now+2);s.health.invulnerableUntil=Math.max(s.health.invulnerableUntil,now+2);break;
  case'attraction':
   // Global collection deliberately crosses terrain; equipment stays in place.
   for(const q of [...s.xpDrops,...(s.recoveryDrops??[]),...(s.consumableDrops??[])])Object.assign(q,{x:s.player.x,y:s.player.y??0,z:s.player.z});
   break;
  case'recharge':for(const p of s.arms.filter(Boolean)){const magazine=CATALOG[p.key]?.magazine;p.cooldown=0;p.reloadRemaining=0;p.idleFor=0;if(magazine){p.ammo=magazine;s.events.push({type:'reload-end',source:p.id,key:p.key});}}break;
  case'sleep':for(const e of nearby(s,16))if(e.kind==='normal'){e.pickupSleepUntil=now+5;cancelEnemyAttack(e,now);e.windup=null;}s.events.push({type:'consumable-burst',kind:'sleep',radius:16,x:s.player.x,y:s.player.y??0,z:s.player.z});break;
  case'impulse':for(const e of nearby(s,12)){damage?.(e,30,0,'consumable');if(e.kind==='normal'){const d=spatialDistance(e,s.player)||1;e.kickX=(e.x-s.player.x)/d*14;e.kickZ=(e.z-s.player.z)/d*14;}}s.events.push({type:'consumable-burst',kind:'impulse',radius:12,x:s.player.x,y:s.player.y??0,z:s.player.z});break;
  case'parasite':a.parasitesUntil=now+8;a.parasiteAt=now+.2;break;
  case'hunter':{const e=nearby(s,18).sort((a,b)=>spatialDistance(a,s.player)-spatialDistance(b,s.player))[0];if(!e)return false;for(const q of s.enemies)q.pickupMarkUntil=0;e.pickupMarkUntil=now+8;break;}
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
  if(spatialDistance(q,s.player)>CONSUMABLE_RULES.radius||!surfaceReach(s,q,s.player))continue;
  if(applyConsumable(s,q.kind,st,damage))q.consumed=true;
 }
 s.consumableDrops=(s.consumableDrops??[]).filter(q=>!q.consumed&&q.expiresAt>now);
 if(a.parasitesUntil>now&&a.parasiteAt<=now){
  a.parasiteAt=now+.8;
  for(let i=0;i<3;i++){
   const e=nearby(s,10).sort((a,b)=>spatialDistance(a,s.player)-spatialDistance(b,s.player))[0];if(!e)break;
   damage?.(e,8,0,'consumable');
   s.events.push({type:'arc',color:CONSUMABLE_BY_KIND.parasite.color,x:s.player.x,y:s.player.y??0,z:s.player.z,tx:e.x,ty:e.y??0,tz:e.z});
  }
 }
}
export function consumableTarget(s,e,target){
 const beacon=s.consumables?.beacon;
 return target===s.player&&e.kind==='normal'&&beacon?.until>combatTime(s)&&spatialDistance(e,beacon)<12&&surfaceReach(s,e,beacon)?beacon:target;
}

import {organEffect} from './body-traits.js';
import {combatTime} from './mutations.js';
import {weaponStats} from '../assembly.js';
import {visibleBetween,spatialDistance} from '../elevation.js';
import {move} from '../terrain.js';
const state=s=>s.extraParts??={reactorCharge:0,reactorUntil:0,reactorReadyAt:0,springCharge:0,springUntil:0,hits:0,mirrorAt:0};
export function reactorKill(s){const a=state(s),t=combatTime(s);if(s.body.key!=='reactor'||t<a.reactorReadyAt)return;if(++a.reactorCharge>=15){a.reactorCharge=0;a.reactorUntil=t+6;a.reactorReadyAt=t+21;s.events.push({type:'notice',text:'Реактор: перегрузка на 6 секунд'});s.events.push({type:'blast',x:s.player.x,z:s.player.z});}}
export function pullHarpoon(s,e){if(e.kind!=='normal'||e.hp<=0)return;const d=spatialDistance(e,s.player)||1,amount=Math.min(3,Math.max(0,d-e.radius-1.5));if(!visibleBetween(s,e,s.player))return;move(s.world,e,(s.player.x-e.x)/d*amount,(s.player.z-e.z)/d*amount,e.radius);}
export function tickExtraParts(s,dt,hurt){
 const a=state(s),t=combatTime(s),hits=(s.health?.hits||0)+(s.health?.blocked||0),newHit=hits>a.hits;a.hits=hits;
 if(s.body.key!=='reactor'){a.reactorCharge=0;a.reactorUntil=0;}
 if(newHit&&s.hp>0&&s.organs.some(p=>p?.key==='mirrorGland')&&t>=a.mirrorAt){
  const e=s.enemies.filter(e=>e.hp>0&&spatialDistance(e,s.player)<=16&&visibleBetween(s,s.player,e)).sort((a,b)=>spatialDistance(a,s.player)-spatialDistance(b,s.player))[0];
  const damage=Math.max(0,...s.arms.filter(Boolean).map(p=>weaponStats(s,p).damage));
  if(e&&damage>0){a.mirrorAt=t+2;hurt(e,damage*organEffect(s),'reflection');s.events.push({type:'arc',x:s.player.x,y:s.player.y,z:s.player.z,tx:e.x,ty:e.y,tz:e.z});}
 }
 const m=s.motion||{},length=Math.hypot(m.x||0,m.z||0),spring=s.legs.some(p=>p?.key==='spring');
 if(!spring||length<.1){a.springCharge=0;a.direction=null;if(!spring)a.springUntil=0;return;}
 const dir={x:m.x/length,z:m.z/length};
 if(a.springCharge>=3&&a.direction&&dir.x*a.direction.x+dir.z*a.direction.z<.3){a.springUntil=t+1;a.springCharge=0;s.events.push({type:'notice',text:'Пружинная опора: ускорение'});}
 else if(t>=a.springUntil)a.springCharge=Math.min(3,a.springCharge+dt);
 a.direction=dir;
}

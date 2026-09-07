import {visibleBetween} from '../elevation.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const isBoss=e=>['boss','final'].includes(e.kind);
export const bossEngaged=e=>e.hp>0&&isBoss(e)&&(!e.territory||e.territory.state==='engaged');
export function assignTerritory(s,e){
 if(s.mode!=='survival'||!s.world.flat||!['elite','boss','final'].includes(e.kind))return e;
 e.territory={home:{x:e.x,y:e.y??0,z:e.z},aggro:isBoss(e)?18:14,leash:isBoss(e)?30:24,state:'idle'};
 return e;
}
export function territoryTarget(s,e,fallback){
 const t=e.territory;if(!t||e.challengeId&&s.encounters?.active?.id===e.challengeId)return fallback;
 const atHome=distance(e,t.home)<=e.radius+.7,playerHome=distance(s.player,t.home);
 if(t.state==='engaged'&&(playerHome>t.leash||distance(e,t.home)>t.leash)){
  t.state='returning';e.windup=null;e.path=null;
 }
 if(t.state==='returning'){
  if(!atHome)return t.home;
  t.state='idle';e.path=null;
 }
 if(t.state==='idle'&&distance(e,s.player)<=t.aggro&&playerHome<=t.leash&&visibleBetween(s,e,s.player))t.state='engaged';
 return t.state==='engaged'?s.player:t.home;
}
/** Fixed boss habitats, separate from the seeded combat loot stream. */
export function prepareTerritories(s,spawn){
 if(s.mode!=='survival'||!s.world.flat)return s;
 const candidates=s.world.tiles.filter(t=>t.index!==0&&!s.encounters.nodes.some(n=>s.world.tileAt(n.x,n.z)===t))
  .sort((a,b)=>distance(a,s.player)-distance(b,s.player));
 s.bossHabitats=[];
 for(let i=0;i<5;i++){
  const tile=candidates[Math.floor((i+1)*candidates.length/6)];
  const p=tile?.safe.find(p=>s.world.walkable(p.x,p.z,2.4));if(!p)continue;
  const e=spawn(i===4?'final':'boss',p,'mass',(i+1)*480);if(!e)continue;
  e.habitat=true;s.bossHabitats.push({id:e.id,...p,kind:e.kind});
 }
 return s;
}

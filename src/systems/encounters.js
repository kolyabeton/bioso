import {createPart} from '../assembly.js';
import {FAMILIES,NEW_ORGANS,RARE_ORGANS,mutationView} from './mutations.js';
import {CATALOG} from '../catalog.js';
import {seededRandom} from '../simulation.js';
import {visibleBetween} from '../elevation.js';
import {SECRETS} from './secrets/definitions.js';
import {EVENTS,DEALS} from './events/definitions.js';
export {DEALS};
export const ENCOUNTERS={...SECRETS,...EVENTS};
import {nearEncounter as near,availableEncounter} from './events/proximity.js';
export {availableEncounter};
function shuffle(r,arr){return [...arr].map(v=>({v,r:r()})).sort((a,b)=>a.r-b.r).map(x=>x.v);}
function rewards(r,type){const regular=Object.keys(CATALOG).filter(k=>!CATALOG[k].rare&&CATALOG[k].kind!=='body');if(type==='membrane')return shuffle(r,[...NEW_ORGANS,'regen','shield','stabilizer','digestion']).slice(0,2);if(type==='slab')return shuffle(r,regular).slice(0,1);if(type==='nursery')return shuffle(r,FAMILIES[shuffle(r,Object.keys(FAMILIES))[0]].keys).slice(0,3);const rare=r()<.3;return shuffle(r,regular).slice(0,rare?2:3).concat(rare?[shuffle(r,RARE_ORGANS)[0]]:[]);}
/** Separate RNG: UI reads and encounter placement never consume combat randomness. */
export function prepareEncounters(s){
 const r=seededRandom(s.seed^0x15aac),painted=s.world.presentation==='painterly';
 const anchors=painted?[[-2,17],[4,-18],[8,-4],[-3,6],[1.5,3],[4,-10],[4,22]]:null;
 const origin=s.world.tiles?.[0]?.safe?.[2]||s.player;
 const nodes=[],usedTiles=new Map(),spread=s.world.flat&&s.world.tiles,placement=seededRandom(s.seed^0x6e624eb7);
 const extraSecrets=s.world.flat?new Set(shuffle(r,Object.keys(SECRETS)).slice(0,2)):new Set();
 const plan=Object.keys(ENCOUNTERS).filter(type=>s.world.flat||!type.startsWith('altar_')).flatMap(type=>Array.from({length:s.world.flat&&EVENTS[type]?.kind==='challenge'?3:extraSecrets.has(type)?2:1},(_,copy)=>({type,copy})));
 for(const [i,{type,copy}]of plan.entries()){
  const d=ENCOUNTERS[type];let position=null,placedTile=null;
  // Flat survival spreads encounters across tiles with at most two objects per tile; legacy maps retain their placement.
  for(let attempt=0;attempt<2000;attempt++){
   const angle=i*Math.PI*2/plan.length+attempt*.47,rad=painted?0:12+Math.floor(attempt/12)*2;
   const tile=spread?spread[Math.floor(placement()*spread.length)]:null;
   if(tile&&(tile.index===0||(usedTiles.get(tile.id)||0)>=(attempt<500?1:2)))continue;
   const x=tile?tile.x+(placement()-.5)*40:anchors?.[i]?anchors[i][0]+(attempt?Math.cos(angle)*attempt*.1:0):origin.x+Math.cos(angle)*rad,z=tile?tile.z+(placement()-.5)*40:anchors?.[i]?anchors[i][1]+(attempt?Math.sin(angle)*attempt*.1:0):origin.z+Math.sin(angle)*rad;
   // Infection is an open survival zone: retain its clear starting area while
   // allowing the larger scoring circle to include the surrounding terrain.
   // Only the sealed arena needs its entire boundary to be unobstructed.
   const y=s.world.heightAt?.(x,z)??0,radius=type==='infection'?Math.min(d.radius,7):type==='sealed'?d.radius:1;
   if(!Number.isFinite(y)||!s.world.walkable(x,z,tile?2.4:1)||(!tile&&!visibleBetween(s,origin,{x,y,z})))continue;
   if(tile&&(Math.hypot(x-origin.x,z-origin.z)<48||nodes.some(n=>Math.hypot(n.x-x,n.z-z)<32)))continue;
   // Public 3D landmarks need a clear silhouette as well as a walkable centre.
   if(tile&&d.kind!=='secret'&&((s.world.obstacles?.(x,z)||[]).some(o=>Math.hypot(o.x-x,o.z-z)<(o.radius||2)+6)||!s.world.walkable(x,z+3,1)))continue;
   if(nodes.some(n=>Math.hypot(n.x-x,n.z-z)<(d.kind==='challenge'?8:4))||(s.mission?.nodes||[]).some(n=>Math.hypot(n.x-x,n.z-z)<6))continue;
   if(d.kind==='challenge'&&!Array.from({length:16},(_,j)=>j*Math.PI/8).every(a=>s.world.walkable(x+Math.cos(a)*radius,z+Math.sin(a)*radius,.7)&&Math.abs((s.world.heightAt?.(x+Math.cos(a)*radius,z+Math.sin(a)*radius)??y)-y)<.5))continue;
   if(tile&&!s.world.findPath(tile.safe[2],{x,z},2.4).length)continue;
   position={x,y,z};placedTile=tile;break;
  }
  if(!position)continue;
  if(placedTile)usedTiles.set(placedTile.id,(usedTiles.get(placedTile.id)||0)+1);
  nodes.push({id:'encounter-'+type+(copy?'-'+(copy+1):''),type,recommended:s.world.flat&&d.kind==='challenge'?5+copy*10:d.recommended||0,unlockLevel:s.world.flat&&d.kind==='challenge'?5+copy*10:0,challengeTier:s.world.flat&&d.kind==='challenge'?copy+1:1,rewardTier:s.world.flat&&d.kind==='challenge'?copy+1:1,...position,radius:d.radius||1.4,state:'ready',discovered:false,rewards:rewards(r,type),deals:d.deal?[d.deal]:[],progress:0,claimed:false,adapted:false});
 }
 s.encounters={nodes,active:null};return s;
}
export function nearbyEncounters(s){return(s.encounters?.nodes||[]).filter(n=>(!SECRETS[n.type]||n.state==='reward')&&availableEncounter(s,n)&&near(s,n,4));}
export function discoverEncounters(s){
 const revealed=(s.encounters?.nodes||[]).filter(n=>s.world.flat&&ENCOUNTERS[n.type].kind!=='secret'&&availableEncounter(s,n)&&!n.announced);
 for(const n of revealed){n.announced=true;n.discovered=true;}
 if(revealed.length)s.events.push({type:'notice',text:revealed.length===1?'Событие: '+ENCOUNTERS[revealed[0].type].name+' · отмечено на карте':`Новые события: ${revealed.length} · откройте карту`});
 for(const n of s.encounters?.nodes||[])if(!SECRETS[n.type]&&availableEncounter(s,n)&&near(s,n,16)){n.discovered=true;if(!n.adapted&&ENCOUNTERS[n.type].kind==='challenge'){
  n.adapted=true;const f=mutationView(s).filter(f=>f.count>0&&!f.active).sort((a,b)=>b.count-a.count)[0];if(f){const installed=new Set([...s.arms,...s.legs,...s.organs].filter(Boolean).map(p=>p.key));const key=f.keys.find(k=>!installed.has(k)&&!n.rewards.includes(k));if(key)n.rewards[0]=key;}
 }}}
export {openSecret,secretTarget} from './secrets/index.js';
export function claimEncounter(s,id,index){const n=s.encounters?.nodes.find(n=>n.id===id);if(!n||n.state!=='reward'||n.claimed||!near(s,n,4)||!Number.isInteger(index)||!n.rewards[index])return false;
 n.claimed=true;n.state='complete';const key=n.rewards[index];s.ground.push({id:++s.entityId,x:n.x,y:n.y,z:n.z,part:createPart(s,key,n.rewardTier||1)});if(n.type==='slab')s.biomass+=30;
 if(!s.profile.unlocked.includes(key)){s.profile.unlocked.push(key);s.events.push({type:'unlock',text:'Открыто: '+CATALOG[key].name});}return true;
}
export {dealAllowed,takeDeal} from './events/altar.js';
export {challengeAllowed,startChallenge,containChallenge,tickChallenge,encounterStatus} from './events/challenges.js';

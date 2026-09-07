import {warningHits} from './systems/enemy-combat.js';
// Acceptance controller. Only directions and ordinary assembly/ability commands.
// No health, experience, equipment grants, time skips or changed combat coefficients.
import {stats,weaponStats,pickup,equip,drop,digest,def,swapBody,upgrade,upgradeOptions,ranks} from './assembly.js';
import {movementFactor} from './combat-feel.js';
import {findPath,clearSegment} from './world-navigation.js';
import {DEPOT,CAMP} from './world-layout.js';
import {upgradeCost} from './systems/balance.js';
import {bodyRadius,visibleBetween} from './elevation.js';
import {VOLATILE} from './living-combat.js';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const STYLE_BRANCHES={melee:['melee','might','tempo','cold','motion'],ranged:['ranged','projectiles','tempo','might','motion'],elements:['fire','electric','cold','tempo'],summons:['summons','tempo','fire','cold'],mixed:['might','electric','projectiles','tempo']};
export function pickAbility(s,style='ranged'){return s.choices.map((c,i)=>{const branch=c.id.split('.')[0],rank=STYLE_BRANCHES[style].indexOf(branch);return{i,score:(rank<0?0:20-rank*2)+(c.id.endsWith('.3')?5:0)+(c.id==='vitality.0'?40:c.id==='vitality.2'?35:0)};}).sort((a,b)=>b.score-a.score)[0]?.i;}
function scorePart(s,p,style){const d=def(p);if(d.kind==='arm'){const w=weaponStats(s,p),melee=['sector','area','contact'].includes(w.mode);return w.damage/(w.interval+(w.reload||0)/(w.magazine||1))*(melee?style==='melee'?1.6:.12:style==='melee'?.2:1)*(1+(w.pierce||1)*.1)*(w.mode==='area'?3:w.mode==='sector'?2:1);}if(d.kind==='body')return d.arms*30+d.hp*8+d.capacity*.1;if(d.kind==='leg')return d.speed*10;return ['regen','shield'].includes(p.key)?120:p.key==='digestion'?80:30;}
export function assembleEarned(s,style='ranged',discarded=new Set()){
 for(const q of [...s.ground])if(dist(q,s.player)<=3&&!discarded.has(q.part.id))pickup(s,q.id);
 for(const p of [...s.inventory]){const d=def(p);if(d.kind==='body'){if(scorePart(s,p,style)>scorePart(s,s.body,style)&&d.legs<=s.legs.filter(Boolean).length+s.inventory.filter(p=>def(p).kind==='leg').length)swapBody(s,p.id);continue;}const group={arm:'arms',leg:'legs',organ:'organs'}[d.kind];let i=s[group].findIndex(p=>!p);if(i<0){i=s[group].map((p,i)=>({i,v:scorePart(s,p,style)})).sort((a,b)=>a.v-b.v)[0]?.i;if(i==null||scorePart(s,p,style)<=scorePart(s,s[group][i],style))continue;}equip(s,p.id,i);}
 const digester=s.inventory.find(p=>p.key==='digestion');let restore=null;if(digester&&!s.organs.some(p=>p?.key==='digestion')){restore=s.organs[0];equip(s,digester.id,0);}let spare=0;
 for(const p of [...s.inventory]){if(p===restore||p.key==='digestion'||def(p).kind==='leg'&&spare++<2)continue;if(digest(s,p.id)===false){discarded.add(p.id);drop(s,p.id);}}if(restore)equip(s,restore.id,0);
 while(stats(s).weight>stats(s).capacity&&s.inventory.length){const p=s.inventory.at(-1);discarded.add(p.id);drop(s,p.id);}
 for(const p of [...s.arms.filter(Boolean),s.body]){const opts=upgradeOptions(p),stat=opts.includes('damage')?'damage':opts.includes('hp')?'hp':null;if(stat&&s.biomass>=upgradeCost(ranks(p)))upgrade(s,p.id,stat,true);}
}
export function createPilot({style='ranged',approach='gate',exit='far'}={}){
 const state={discarded:new Set(),waypoint:0,heading:null,path:[],nextPath:0};
 const routes={gate:[[0,315],[0,150],[0,-98],[0,-420],[0,-440],[0,-480]],relays:[[0,315],[0,150],[190,150],[190,30],[190,-190],[190,-560],[0,-560],[0,-480]]};
 let returnRoute=null;
 function direction(s){
  const movementStyle=s.arms.filter(Boolean).every(p=>['sector','area','contact'].includes(weaponStats(s,p).mode))?'melee':style;
  const nearby=s.enemies.filter(e=>e.hp>0&&e.kind!=='objective'&&dist(e,s.player)<26),resources=[...s.xpDrops,...s.ground.filter(q=>!state.discarded.has(q.part.id))].filter(q=>dist(q,s.player)<18).sort((a,b)=>dist(a,s.player)-dist(b,s.player));let target;
  if(s.mode==='core'){
   if(s.mission.carrying&&!returnRoute){returnRoute=exit==='near'?[[45,-480],[290,-480],[330,-480]]:approach==='relays'?[[0,-560],[190,-560],[190,-190],[190,30],[190,150],[0,150],[0,480]]:[[0,-420],[0,-98],[0,150],[0,480]];state.waypoint=0;state.path=[];}
   const route=returnRoute||routes[approach];let waypoint=route[Math.min(state.waypoint,route.length-1)];if(dist(s.player,{x:waypoint[0],z:waypoint[1]})<3.2&&state.waypoint<route.length-1){state.waypoint++;waypoint=route[state.waypoint];state.path=[];}target={x:waypoint[0],z:waypoint[1]};
   const engaged=nearby.filter(e=>dist(e,s.player)<18&&!e.pursuit).sort((a,b)=>dist(a,s.player)-dist(b,s.player));
   if(engaged.length)target=engaged[0];else if(resources.length&&!s.mission.carrying)target=resources[0];
   if(approach==='gate'&&!s.mission.open&&s.player.z< -395&&s.player.x<40&&!engaged.length)target=s.mission.nodes[5];
  }else {
   const needsRanged=style!=='melee'&&!s.arms.some(p=>p&&!['sector','area','contact'].includes(weaponStats(s,p).mode)),missingHand=s.arms.some(p=>!p);
   const scout=needsRanged||missingHand?s.ground.filter(q=>def(q.part).kind==='arm'&&!state.discarded.has(q.part.id)&&(!needsRanged||!['sector','area','contact'].includes(def(q.part).mode))).sort((a,b)=>dist(a,s.player)-dist(b,s.player))[0]:null;
   target=scout||resources[0]||nearby.sort((a,b)=>dist(a,s.player)-dist(b,s.player))[0]||s.world.tiles?.[0]?.safe?.[2]||CAMP;
  }
  const boss=s.enemies.find(e=>e.hp>0&&['boss','final'].includes(e.kind)&&dist(e,s.player)<60);if(boss&&s.time%12<8)target=boss;
  let targetEnemy=!!target.kind;const radius=bodyRadius(s);
  if((!targetEnemy||!visibleBetween(s,s.player,target))&&!clearSegment(s.world,s.player,target,radius)){
   if(s.time>=state.nextPath){state.path=s.world.findPath?s.world.findPath(s.player,target,radius):findPath(s.world,s.player,target,radius);state.nextPath=s.time+2;}
   while(state.path.length&&dist(s.player,state.path[0])<1.5)state.path.shift();if(state.path.length){target=state.path[0];targetEnemy=false;}
  }
  const weapons=s.arms.filter(Boolean).map(p=>weaponStats(s,p)),range=Math.max(...weapons.map(w=>w.range),2),desired=targetEnemy?movementStyle==='melee'?(target.radius||1)+1.8:Math.min(range-1,movementStyle==='summons'?7:8):0,speed=stats(s).speed*movementFactor(s),horizon=movementStyle==='melee'?.15:.35;
  let best={x:0,z:0},value=-Infinity;
  for(let i=0;i<33;i++){const a=i*Math.PI/16,x=i===32?0:Math.cos(a),z=i===32?0:Math.sin(a),p={x:s.player.x+x*speed*horizon,z:s.player.z+z*speed*horizon};if(!clearSegment(s.world,s.player,p,radius))continue;
   let score=-Math.abs(dist(p,target)-desired)*.8+(state.heading?x*state.heading.x+z*state.heading.z:0)*.1;
   for(const e of nearby){const d0=dist(e,s.player)||1,pace=e.fuseRemaining!=null?0:e.speed,f={x:e.x+(s.player.x-e.x)/d0*pace*horizon,z:e.z+(s.player.z-e.z)/d0*pace*horizon},d=dist(p,f),safe=e.volatile?(e.fuseRemaining==null&&movementStyle==='melee'?VOLATILE.trigger-.7:VOLATILE.radius+.8):e.radius+1.4;score-=Math.max(0,(movementStyle==='melee'?safe+.2:safe+1.5)-d)**2*(movementStyle==='melee'?2:4);if(d<safe)score-=80;if(e.enemyAttack?.warning){const w=e.enemyAttack.warning;if(w.mode==='shot'){const dx=p.x-w.x,dz=p.z-w.z,along=dx*w.dx+dz*w.dz;if(along>0&&along<w.range&&Math.abs(dx*w.dz-dz*w.dx)<1)score-=120;}else if(warningHits(w,{...p,y:s.player.y??0}))score-=120;}if(e.windup){const dx=p.x-e.x,dz=p.z-e.z,along=dx*e.windup.dx+dz*e.windup.dz,across=Math.abs(dx*e.windup.dz-dz*e.windup.dx);if(along>0&&along<18&&across<1.5)score-=20;}}
   for(const q of s.hostileShots){const dx=p.x-q.x,dz=p.z-q.z,along=dx*q.dx+dz*q.dz,across=Math.abs(dx*q.dz-dz*q.dx);if(along> -1&&along<7&&across<1.2)score-=35;}
   if(score>value){value=score;best={x,z};}
  }state.heading=best;return best;
 }
 return{direction,assemble:s=>assembleEarned(s,style,state.discarded),choice:s=>pickAbility(s,style),state};
}

import {stats} from '../../assembly.js';
import {startRace,tickRace} from './race.js';
import {EVENTS as ENCOUNTERS} from './definitions.js';
import {spatialDistance} from '../../elevation.js';
import {nearEncounter as near,availableEncounter} from './proximity.js';
import {spawnSealedEnemies,tickSealedPressure} from './sealed-pressure.js';
import {createDungeonLayout,dungeonAggroZones,insideDungeonLayout,DUNGEON_SCALE} from '../../dungeon-layout.js';
import {createMissionWorld} from '../../mission-run.js';
import {MISSIONS} from '../../catalog.js';
import {DUNGEON_ELITE_HP_MULTIPLIER} from '../balance.js';
const dungeonEvent=n=>!!ENCOUNTERS[n?.type]?.dungeon;
const DUNGEON_LAYER_KEYS=['world','enemies','ground','xpDrops','shots','puddles','recoveryDrops','hostileShots','enemyAcidPools'];
const captureDungeonLayer=s=>Object.fromEntries(DUNGEON_LAYER_KEYS.map(key=>[key,s[key]]));
const restoreDungeonLayer=(s,layer)=>{for(const key of DUNGEON_LAYER_KEYS)s[key]=layer[key];};
function dungeonMission(type){return MISSIONS.find(m=>m.id===(type==='dungeon_roots'?'core':'quarantine'));}
function dungeonWorld(s,type){
 const world=createMissionWorld(s.seed+9137,{...dungeonMission(type),floors:1},{halfWidth:32*DUNGEON_SCALE,gates:false,decorations:false});
 const sample=world.heightAt.bind(world),originZ=26,tile=world.tiles[0];
 world.bounds={minX:-32*DUNGEON_SCALE,maxX:32*DUNGEON_SCALE,minZ:originZ+(-32-originZ)*DUNGEON_SCALE,maxZ:originZ+(32-originZ)*DUNGEON_SCALE};
 world.heightAt=(x,z)=>sample(x/DUNGEON_SCALE,originZ+(z-originZ)/DUNGEON_SCALE)==null?null:0;
 world.tileAt=(x,z)=>world.heightAt(x,z)==null?undefined:tile;
 world.dungeonVoid=true;return world;
}
export function challengeAllowed(s,n){return !!n&&ENCOUNTERS[n.type]?.kind==='challenge'&&['ready','paused'].includes(n.state)&&availableEncounter(s,n)&&near(s,n,4)&&!s.dead;}
export function startChallenge(s,id,spawn){
 const previous=s.encounters?.active;
 const started=startChallengeNow(s,id,spawn);
 if(started)s.encounters.active.previousChallenge=previous||null;
 return started;
}
function resumePreviousChallenge(s,n){s.encounters.active=n.previousChallenge||null;n.previousChallenge=null;}
function startChallengeNow(s,id,spawn){const n=s.encounters?.nodes.find(n=>n.id===id);if(!challengeAllowed(s,n))return false;
 if(dungeonEvent(n)&&n.state==='paused'){n.overworldLayer=captureDungeonLayer(s);restoreDungeonLayer(s,n.dungeonLayer);n.state='active';n.x=n.exit.x;n.y=n.exit.y;n.z=n.exit.z;Object.assign(s.player,n.exit);s.encounters.active=n;return true;}
 if(n.type==='race')return startRace(s,n);
 if(dungeonEvent(n)){
  n.entrance={x:n.x,y:n.y,z:n.z};n.overworldLayer=captureDungeonLayer(s);const world=dungeonWorld(s,n.type);restoreDungeonLayer(s,{world,enemies:[],ground:[],xpDrops:[],shots:[],puddles:[],recoveryDrops:[],hostileShots:[],enemyAcidPools:[]});
  const dungeonEntrance={x:0,z:26,y:world.heightAt(0,26)??0};n.exit={...dungeonEntrance};n.tunnelGraph=createDungeonLayout(s,dungeonEntrance,n.type);
  const walkable=world.walkable.bind(world);world.walkable=(x,z,r=2.4)=>insideDungeonLayout(n.tunnelGraph,{x,z},r)&&walkable(x,z,r);
  for(const altar of s.encounters.nodes.filter(node=>node.dungeonId===n.id)){
   const anchor=n.tunnelGraph.nodes[n.type==='dungeon_roots'?14:16];
   const edge=n.tunnelGraph.edges.find(edge=>edge.from===anchor.id||edge.to===anchor.id),previous=n.tunnelGraph.nodes[edge.from===anchor.id?edge.to:edge.from];
   const length=Math.hypot(anchor.x-previous.x,anchor.z-previous.z),dx=(anchor.x-previous.x)/length,dz=(anchor.z-previous.z)/length;
   Object.assign(altar,{x:anchor.x+dx*6.5,y:anchor.y,z:anchor.z+dz*6.5,discovered:true,announced:true});
   altar.approach={x:anchor.x+dx*3.2,y:anchor.y,z:anchor.z+dz*3.2};
   n.tunnelGraph.platforms.push({x:altar.x,z:altar.z,radius:4.2,anchor:{x:anchor.x,z:anchor.z}});
  }
  n.aggroZones=dungeonAggroZones(n.tunnelGraph,n.type==='dungeon_roots'?12:18,world);n.tunnels=n.aggroZones.flatMap(zone=>zone.points);n.members=[];
  for(const zone of n.aggroZones)for(const p of zone.points){const e=spawn('elite',{...p},'mass',s.time,{introductory:false,promote:false});if(!e)continue;e.challengeId=n.id;e.dungeonElite=true;e.dungeonDormant=true;e.dungeonAggroZoneId=zone.id;e.hp*=DUNGEON_ELITE_HP_MULTIPLIER;e.maxHp=e.hp;e.speed*=1.1;e.attackRecoveryScale=(e.attackRecoveryScale||1)/3;e.contactInterval=(e.contactInterval||1)/3;e.damage=1;if(e.territory){e.territory.home={x:e.x,y:e.y,z:e.z};e.territory.state='idle';e.territory.pursuit=false;}zone.members.push(e.id);n.members.push(e.id);}
  // Item 35: one elite per pack is the guaranteed legendary carrier.
  for(const zone of n.aggroZones){
   const pack=s.enemies.filter(e=>e.dungeonAggroZoneId===zone.id&&e.dungeonElite);
   if(pack.length)pack[Math.floor(s.rng()*pack.length)].dungeonRelicDrop=true;
  }
  if(!n.members.length)return false;n.exit={...n.tunnelGraph.nodes[n.tunnelGraph.entrance]};n.x=n.exit.x;n.y=n.exit.y;n.z=n.exit.z;Object.assign(s.player,n.exit);n.state='active';n.progress=0;s.encounters.active=n;s.events.push({type:'notice',text:`${ENCOUNTERS[n.type].name} · элит осталось: ${n.members.length}`});return true;
 }
 const tier=n.challengeTier||1,count=n.type==='infection'?2+tier:n.type==='hunt'?1:6+tier*2,members=n.type==='sealed'?spawnSealedEnemies(s,n,count,spawn):[];for(let i=0;n.type!=='sealed'&&i<count;i++){const a=i*Math.PI*2/count,p={x:n.x+Math.cos(a)*5,y:n.y,z:n.z+Math.sin(a)*5},e=spawn(['hunt','infection'].includes(n.type)?'elite':'normal',p,n.type==='infection'?'mass':i%3===0?'ranged':'mass',s.mode==='survival'?s.time:300);if(e){e.challengeId=n.id;e.hp*=1+(tier-1)*1.5;e.maxHp=e.hp;if(n.type==='infection'){e.hp*=8;e.maxHp=e.hp;e.speed=Math.min(e.speed,Math.max(1,stats(s).speed*.7));}members.push(e.id);}}
 if(!members.length)return false;
 n.state='active';n.members=members;n.elapsed=0;n.progress=0;s.encounters.active=n;if(n.type==='sealed')Object.assign(s.player,{x:n.x,y:n.y,z:n.z});return true;
}
export function leaveDungeon(s,id){const n=s.encounters?.nodes.find(n=>n.id===id);if(!n||!dungeonEvent(n)||s.encounters?.active!==n||!near(s,n,4))return false;n.dungeonLayer=captureDungeonLayer(s);restoreDungeonLayer(s,n.overworldLayer);Object.assign(s.player,n.entrance);n.x=n.entrance.x;n.y=n.entrance.y;n.z=n.entrance.z;n.state=n.cleared?'complete':'paused';resumePreviousChallenge(s,n);s.events.push({type:'notice',text:n.cleared?'Логово зачищено':'Логово покинуто · прогресс сохранён'});if(n.cleared)s.events.push({type:'challenge-result',result:'success',challenge:n.type});return true;}
export function containChallenge(s,old){const a=s.encounters?.active;if(a?.dungeon&&a.tunnelGraph&&!insideDungeonLayout(a.tunnelGraph,s.player,.55)){Object.assign(s.player,old);return;}if(a?.type!=='sealed')return;if(spatialDistance(s.player,a)>a.radius-.7)Object.assign(s.player,old);
 for(const e of s.enemies)if(e.hp>0&&e.challengeId===a.id){const d=Math.hypot(e.x-a.x,e.z-a.z),r=a.radius-e.radius;if(d>r){e.x=a.x+(e.x-a.x)/d*r;e.z=a.z+(e.z-a.z)/d*r;}}
}
export function tickChallenge(s,dt,spawn){const a=s.encounters?.active;if(!a)return;if(a.type==='race'){tickRace(s,a,dt,spawn);if(s.encounters.active!==a)resumePreviousChallenge(s,a);return;}a.elapsed+=dt;if(a.type==='sealed')tickSealedPressure(s,a,dt,spawn);const alive=a.members.some(id=>s.enemies.some(e=>e.id===id&&e.hp>0));
 if(dungeonEvent(a)){for(const zone of a.aggroZones||[]){
   if(zone.state==='idle'&&spatialDistance(s.player,zone)<=zone.radius){zone.state='engaged';for(const id of zone.members){const e=s.enemies.find(e=>e.id===id);if(e){e.dungeonDormant=false;if(e.territory)e.territory.state='engaged';}}s.events.push({type:'notice',text:`Зона активирована · элит: ${zone.members.length}`});}
   if(zone.state!=='cleared'&&zone.members.every(id=>!s.enemies.some(e=>e.id===id&&e.hp>0)))zone.state='cleared';
  }const remaining=a.members.filter(id=>s.enemies.some(e=>e.id===id&&e.hp>0)).length;a.progress=a.members.length-remaining;if(!remaining&&!a.cleared){a.cleared=true;s.events.push({type:'notice',text:'Все элиты уничтожены · выход открыт'});}return;}
 if(a.type==='infection'&&spatialDistance(s.player,a)<=a.radius)a.progress=Math.min(30,a.progress+dt);
 const complete=a.type==='infection'?a.progress>=30:a.type==='sealed'?a.elapsed+1e-8>=45&&!alive:!alive&&a.elapsed<=60+1e-8;
 const failed=a.type==='hunt'&&!complete&&a.elapsed>=60;
 if(complete||failed){if(a.type==='infection')s.enemies=s.enemies.filter(e=>e.challengeId!==a.id);a.state=complete?'reward':'failed';resumePreviousChallenge(s,a);s.events.push({type:'notice',text:complete?'Испытание пройдено · выберите награду':'Носитель уцелел · награда потеряна'},{type:'challenge-result',result:complete?'success':'failed',challenge:a.type});}
}
export function encounterStatus(s){
 const a=s.encounters?.active;if(!a)return '';
 if(a.type==='race')return `Дальний рывок · ${Math.max(0,Math.ceil(a.race.limit-a.elapsed))} с · ${Math.ceil(Math.hypot(a.x-s.player.x,a.z-s.player.z))} м`;
 const alive=(a.members||[]).filter(id=>s.enemies.some(e=>e.id===id&&e.hp>0)).length;
 if(dungeonEvent(a)){const engaged=(a.aggroZones||[]).filter(zone=>zone.state==='engaged').length;return `${ENCOUNTERS[a.type].name} · элит осталось: ${alive} · активные зоны: ${engaged} из ${a.aggroZones?.length||0}${a.cleared?' · выход открыт':''}`;}
 const detail=a.type==='infection'?`${Math.floor(a.progress)} из 30 с${spatialDistance(s.player,a)>a.radius?' · пауза: вернитесь в круг':''}`:a.type==='hunt'?`${Math.max(0,Math.ceil(60-a.elapsed))} с осталось · цель ${alive?'жива':'побеждена'}`:`${Math.min(45,Math.floor(a.elapsed))} из 45 с · врагов: ${alive}`;
 return `${ENCOUNTERS[a.type].name} · ${detail}`;
}

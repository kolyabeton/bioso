import {terrain} from './terrain.js';
import {LANDMARKS,ROADS,GROUPS,MISSION_PLACEMENTS,onRoad,DEPOT,CAMP,LANDMARK_COLLIDERS} from './world-layout.js';
import {createPart} from './assembly.js';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function prepareWorld(s){
 const base=terrain(s.seed),chunks=new Map();
 s.exploration={visited:new Set(['camp']),cells:new Set(),cleared:new Set(),groups:GROUPS.map(g=>({...g,roles:[...g.roles],state:g.dormant?'dormant':'unseen',members:[]})),lootNotice:false};
 s.player={...CAMP};s.enemies=[];
 const wall=[];for(let i=0;i<48;i++){const a=i*Math.PI*2/48,x=Math.sin(a)*32,z=DEPOT.z+Math.cos(a)*32;if(Math.abs(z-DEPOT.z)>29&&Math.abs(x)<11||x>29&&Math.abs(z-DEPOT.z)<11)continue;wall.push({x,z,radius:3,height:6,depot:true});}
 s.world={...base,landmarks:LANDMARKS,roads:ROADS,chunk(cx,cz){const key=cx+','+cz;if(!chunks.has(key)){const c=base.chunk(cx,cz);chunks.set(key,{...c,obstacles:[...c.obstacles.filter(o=>!onRoad(o.x,o.z,o.radius+10)&&!LANDMARKS.some(p=>dist(p,o)<25+o.radius)),...[...wall,...LANDMARK_COLLIDERS].filter(o=>Math.floor(o.x/64)===cx&&Math.floor(o.z/64)===cz)]});}return chunks.get(key);},walkable(x,z,r=2.4){if(!base.walkable.call(this,x,z,r))return false;return !(s.mode==='core'&&!s.mission.open&&((Math.abs(x)<11+r&&Math.abs(z-(DEPOT.z+32))<3+r)||(Math.abs(x-32)<3+r&&Math.abs(z-DEPOT.z)<11+r)||(Math.abs(x)<11+r&&Math.abs(z-(DEPOT.z-32))<3+r)));}};
 if(s.mission){
  const m=s.mission;Object.assign(m,{open:false,stage:'approach',relays:0,pursuitSpawned:false,extraction:null});
  m.nodes=MISSION_PLACEMENTS[s.mode].map(([x,z],i)=>{const n={id:++s.entityId,x,z,active:false};if(['quarantine','mother'].includes(s.mode)||s.mode==='core'&&i===5)Object.assign(n,{kind:'objective',hp:s.mode==='core'?700:500,maxHp:s.mode==='core'?700:500,armor:10,radius:s.mode==='core'?3.5:2,damage:0});if(s.mode==='core')n.label=['Ядро','Старая лестница','Северный шлюз','Питание I','Питание II','Ворота'][i];if(n.kind)s.enemies.push(n);return n;});
 } 
 if(['garden','nursery'].includes(s.mode)){const n=s.mission.nodes.at(-1);if(s.mode==='nursery')s.player={x:n.x,z:n.z+8};for(let i=0;i<4;i++){const a=i*Math.PI/2;s.exploration.groups.push({id:'siege-'+i,x:n.x+Math.cos(a)*48,z:n.z+Math.sin(a)*48,roles:['mass','armored','fast','ranged','mass'],threat:240,state:'unseen',members:[],defense:true});}}reveal(s);return s;
}
function reveal(s){const ex=s.exploration,cx=Math.floor(s.player.x/32),cz=Math.floor(s.player.z/32);if(ex.lastCell===cx+','+cz)return;ex.lastCell=cx+','+cz;for(let x=-2;x<=2;x++)for(let z=-2;z<=2;z++)if(x*x+z*z<=5)ex.cells.add((cx+x)+','+(cz+z));}
function clearSpawn(world,p,anchor){if(world.walkable(p.x,p.z,1))return p;if(world.walkable(anchor.x,anchor.z,1))return{x:anchor.x,z:anchor.z};for(let radius=2;radius<=32;radius+=2)for(let i=0;i<16;i++){const a=i*Math.PI/8,q={x:anchor.x+Math.cos(a)*radius,z:anchor.z+Math.sin(a)*radius};if(world.walkable(q.x,q.z,1))return q;}return null;}
export function tickExploration(s,dt,{spawn,loot}){
 const ex=s.exploration;if(!ex)return;reveal(s);
 for(const p of s.world.landmarks)if(dist(p,s.player)<30&&!ex.visited.has(p.id)){ex.visited.add(p.id);s.events.push({type:'notice',category:'landmark',text:p.name});}
 for(const g of ex.groups){
  if(g.state==='unseen'&&dist(g,s.player)<62){g.state='active';g.spawnedAt=s.time;for(let i=0;i<g.roles.length;i++){const a=i*Math.PI*2/g.roles.length,p=clearSpawn(s.world,{x:g.x+Math.cos(a)*8,z:g.z+Math.sin(a)*8},g);if(!p)continue;const e=spawn(i<(g.elites||0)?'elite':'normal',p,g.roles[i]==='volatile'?'mass':g.roles[i],g.threat);if(e){if(g.roles[i]==='volatile')e.volatile=true;e.groupId=g.id;e.anchor={x:g.x,z:g.z};e.pursuit=!!g.pursuit;g.members.push(e.id);}}}
  if(g.state==='active'&&g.members.length&&g.members.every(id=>!s.enemies.some(e=>e.id===id&&e.hp>0))){g.state='cleared';ex.cleared.add(g.id);ex.lootNotice=true;const part=g.stash?createPart(s,'needle'):loot();s.ground.push({id:++s.entityId,x:g.x,z:g.z,part,groupId:g.id});s.events.push({type:'group-cleared',id:g.id,text:'Участок зачищен · добыча отмечена на карте'});}
 }
}
export function missionEnemyTarget(s,e,fallback){
 if(!e.groupId||s.mode==='survival'||e.pursuit)return fallback;
 const g=s.exploration.groups.find(g=>g.id===e.groupId);if(g.defense&&fallback!==s.player)return fallback;
 if(e.missionArrival){
  if(dist(e,s.player)<26)delete e.missionArrival;
  else return fallback;
 }
 if(dist(e,s.player)<26||e.hp<e.maxHp&&dist(e,e.anchor)<45)return s.player;
 const a=s.time*.12+e.id;return{x:g.x+Math.cos(a)*(g.patrol||4),z:g.z+Math.sin(a)*(g.patrol||4)};
}
export function tickDelivery(s){
 const m=s.mission;if(!s.exploration||s.mode!=='core')return null;
 const [core,far,near,a,b,gate]=m.nodes;
 for(const relay of [a,b])if(!relay.active&&dist(relay,s.player)<4){relay.active=true;m.relays++;s.events.push({type:'notice',text:`Питание отключено: ${m.relays}/2`});}
 if(!m.open&&(gate.hp<=0||m.relays===2)){m.open=true;gate.hp=0;m.stage='depot';s.events.push({type:'notice',text:'Хранилище открыто'});}
 if(m.open&&!m.carrying&&dist(core,s.player)<4){m.carrying=true;core.active=true;m.stage='extraction';if(!m.pursuitSpawned){m.pursuitSpawned=true;const g=s.exploration.groups.find(g=>g.id==='pursuit');g.state='unseen';}s.events.push({type:'notice',text:'Ядро с вами · из хранилища вышло преследование'});}
 const exit=[far,near].find(n=>dist(n,s.player)<4);if(m.carrying&&exit){const guard=s.exploration.groups.find(g=>g.id==='near-exit');if(exit===near&&guard.state!=='cleared')return false;m.extraction=exit===far?'far':'near';m.stage='complete';return true;}return false;
}
export function deliveryStatus(s){const m=s.mission;return m.carrying?'◈ Ядро с вами · выберите выход':m.open?'Хранилище открыто · заберите ядро':`Откройте ворота или отключите питание ${m.relays}/2`;}

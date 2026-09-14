import {setupMissionBoss,missionBossStatus} from './systems/mission-bosses.js';
import {obstacleContains,obstacleHeight} from './architecture-collision.js';
import {BIOMES,MODULES,TILE,localHeight} from './biome-world.js';
import {findPath} from './world-navigation.js';
import {missionRosters} from './mission-rosters.js';
import {assignEnemyAssembly} from './systems/enemy-assembly.js';
import {combatTime} from './systems/mutations.js';
import {EVENTS} from './systems/events/definitions.js';
import {MISSION_HALF_WIDTH,MISSION_GATE,missionBarrierAt,missionDecorations,missionEnvironment} from './mission-environment.js';
import {spawnMissionEvidence} from './story-evidence.js';
export {MISSION_HALF_WIDTH} from './mission-environment.js';

export const missionRoomThreat=(mission,index)=>mission.difficulty*60+index*50;
export const MISSION_EVENT_INTERVAL=3;
export const MISSION_ENEMY_MULTIPLIER=2;
export const MISSION_BOSS_WAVE_SIZE=3;
export const MISSION_BOSS_WAVE_INTERVAL=10;
export const MISSION_BOSS_REINFORCEMENT_CAP=12;
export const MISSION_ENTRY_MIN_Z_OFFSET=-24;
export const MISSION_ENTRY_MAX_Z_OFFSET=-16;
export const MISSION_ROOM_STRENGTH_STEP=.07;
export const missionRoomStrength=index=>Math.pow(1+MISSION_ROOM_STRENGTH_STEP,Math.max(0,index));
export function strengthenMissionEnemy(enemy,index){
 if(!enemy||enemy.missionRoomStrength!=null)return enemy;
 const strength=missionRoomStrength(index);
 enemy.hp*=strength;enemy.maxHp=enemy.hp;enemy.missionRoomStrength=strength;
 return enemy;
}
export const MISSION_EVENT_PLAN=[
 {type:'altar_speed',kind:'altar',deal:'speed'},
 {type:'infection',kind:'challenge'},
 {type:'sealed',kind:'challenge'},
 {type:'hunt',kind:'challenge'},
 {type:'altar_armor',kind:'altar',deal:'armor'},
 {type:'infection',kind:'challenge'},
 {type:'sealed',kind:'challenge'},
 {type:'hunt',kind:'challenge'},
];

export function createMissionWorld(seed,mission,{halfWidth=MISSION_HALF_WIDTH,gates=true,decorations=true}={}){
 const count=mission.floors||5,environment=missionEnvironment(mission),biome=BIOMES.find(b=>b.id===environment.biome)?.id||'gardens';
 const tiles=Array.from({length:count},(_,index)=>{
  const z=index?-index*TILE:0,module=MODULES.find(m=>m.biome===biome&&m.kind===['clearing','grove','meadow'][index%3]);
  // Keep both authored directions even at the end caps: the terrain shader
  // uses the second port as its stable grain/blend axis.
  const ports=[{dx:0,dz:1,x:0,z:z+32,y:0,width:24},{dx:0,dz:-1,x:0,z:z-32,y:0,width:24}];
  const floorDecorations=decorations?missionDecorations(seed,environment,index,z,index===count-1):[];
  return{...module,...(environment.groundBlend?{nextBiome:environment.groundBlend,groundBlendDirection:[...environment.groundBlendDirection]}:{}),flat:true,environmentId:environment.id,environmentName:environment.name,groundStyle:environment.groundStyle,perimeterStyle:environment.perimeterStyle,ambientVegetation:decorations?[...environment.ambientVegetation]:[],ambientDensity:decorations?environment.ambientDensity:0,edgeVegetation:decorations?[...environment.edgeVegetation]:[],id:`mission-floor-${index+1}`,moduleId:`${environment.id}-${index+1}`,index,x:0,z,cx:0,cz:-index,ports,decorations:floorDecorations,safe:[{x:-14,z},{x:14,z},{x:0,z:z+22},{x:0,z:z-22}],loot:{x:0,z},jumps:[]};
 });
 const byCell=new Map(tiles.map(t=>[`${t.cx},${t.cz}`,t])),at=(x,z)=>byCell.get(`${Math.floor((x+32)/TILE)},${Math.floor((z+32)/TILE)}`);
 const blockedByGate=(x,z,r=0)=>gates&&missionBarrierAt(mission,x,z,r);
	 const world={seed,flat:true,presentation:'biomes',missionLine:true,environmentId:environment.id,environmentName:environment.name,playBounds:{minX:-halfWidth,maxX:halfWidth},tiles,bounds:{minX:-32,minZ:-(count-1)*TILE-32,maxX:32,maxZ:32},landmarks:tiles.map((t,index)=>({id:t.id,x:0,z:t.z+20,name:index===count-1?mission.bossName:`Комната ${index+1}`})),roads:[tiles.map(t=>[0,t.z])],
  tileAt:at,neighbors(t){return tiles.filter(q=>Math.abs(q.index-t.index)===1);},
  heightAt(x,z){const t=at(x,z);return t?localHeight(t,x-t.x,z-t.z):null;},
  obstacles(x,z){const t=at(x,z);return t?(t.collisionDecorations??=[t,...this.neighbors(t)].flatMap(q=>q.decorations)):[];},
  solidAt(x,y,z,r=0){return y<MISSION_GATE.height&&blockedByGate(x,z,r)||this.obstacles(x,z).some(o=>obstacleContains(o,x,z,r)&&y<(this.heightAt(o.x,o.z)??0)+obstacleHeight(o));},
	  flyable(x,z,r=.4){const h=this.heightAt(x,z);if(Math.abs(x)+r>halfWidth||h===null||blockedByGate(x,z,r)||this.obstacles(x,z).some(o=>o.feature!=='thicket'&&obstacleContains(o,x,z,r)))return false;for(let i=0;i<8;i++){const a=i*Math.PI/4;if(this.heightAt(x+Math.cos(a)*r,z+Math.sin(a)*r)===null)return false;}return true;},
	  walkable(x,z,r=2.4){const h=this.heightAt(x,z);if(Math.abs(x)+r>halfWidth||h===null||blockedByGate(x,z,r)||this.solidAt(x,h+.1,z,r))return false;for(let i=0;i<8;i++){const a=i*Math.PI/4,q=this.heightAt(x+Math.cos(a)*r,z+Math.sin(a)*r);if(q===null||Math.abs(q-h)>r*.6+.2)return false;}return true;},
  canFly(a,b,r=.4){return this.heightAt(a.x,a.z)!==null&&this.flyable(b.x,b.z,r);},
  canMove(a,b,r=2.4){const h=this.heightAt(a.x,a.z),k=this.heightAt(b.x,b.z),d=Math.hypot(b.x-a.x,b.z-a.z);if(h===null||k===null||Math.abs(h-k)>d*.6+.05)return false;const n=Math.max(1,Math.ceil(d/.4));for(let i=1;i<=n;i++)if(!this.walkable(a.x+(b.x-a.x)*i/n,a.z+(b.z-a.z)*i/n,r))return false;return true;},
  lineClear(a,b){const d=Math.hypot(b.x-a.x,b.z-a.z,(b.y??0)-(a.y??0)),n=Math.max(1,Math.ceil(d/.4));for(let i=1;i<=n;i++){const t=i/n,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,y=(a.y??1)+((b.y??1)-(a.y??1))*t;if(!this.walkable(x,z,.05)||this.solidAt(x,y,z))return false;}return true;},
  findPath(a,b,r=2.4){return findPath(this,a,b,r,{cell:2,budget:12000});},
  chunk(cx,cz){const t=at(cx*TILE,cz*TILE);return{cx,cz,obstacles:t?.decorations||[],lair:t?.safe[0]||{x:0,z:0}};},
 };
 return world;
}

export function setupMissionFloors(s){
 const m=s.mission,count=m.floors||5;
 const rosters=missionRosters(s.seed,count,m.id);
 m.currentFloor=0;m.complete=false;m.bossSpawned=false;m.event=null;m.eventHistory=[];m.floorsState=Array.from({length:count},(_,index)=>({index,z:-index*TILE,state:index?'locked':'ready',entered:false,members:[],roomLootId:null,roster:rosters[index],bossWave:null}));
 return m;
}

export function resolveMissionEvent(s,outcome,result=''){
 const m=s.mission,event=m?.event;if(!event||event.claimed)return false;
 event.claimed=true;event.outcome=outcome;event.result=result;m.eventHistory.push({...event});m.event=null;
 const floor=m.floorsState[m.currentFloor],group=s.exploration?.groups[m.currentFloor];
 if(floor)floor.state='ready';if(group)group.state='ready';
 s.events.push({type:'notice',text:result||'Событие завершено · проход открыт'});
 return true;
}

export function skipMissionEvent(s,id){
 const event=s.mission?.event,node=s.encounters?.nodes.find(n=>n.id===event?.nodeId);
 if(!event||event.nodeId!==id||!node||node.state!=='ready')return false;
 node.state='failed';node.claimed=true;node.skipped=true;
 return resolveMissionEvent(s,'skipped','Вы отказались · проход открыт без награды');
}

function createMissionEvent(s,room,floor,loot){
 const index=room/MISSION_EVENT_INTERVAL-1,plan=MISSION_EVENT_PLAN[index%MISSION_EVENT_PLAN.length],tier=Math.min(3,1+Math.floor(index/3));
 const rewardPart=plan.kind==='challenge'?loot?.('elite'):null,x=0,z=floor.z-19,y=s.world.heightAt?.(x,z)??0;
 const node={id:`mission-event-${room}`,type:plan.type,kind:plan.kind,missionEvent:true,room,x,y,z,radius:plan.type==='infection'?6.5:plan.type==='sealed'?EVENTS.sealed.radius:1.4,state:'ready',discovered:true,announced:true,claimed:false,adapted:true,unlockLevel:1,recommended:1,challengeTier:tier,rewardTier:rewardPart?.tier||tier,rewards:rewardPart?[rewardPart.key]:[],rewardPart,deals:plan.deal?[plan.deal]:[],progress:0};
 (s.encounters??={nodes:[],active:null}).nodes.push(node);
 s.mission.event={id:node.id,nodeId:node.id,room,type:node.type,kind:plan.kind,claimed:false};
 return node;
}

export function prepareMission(s){
 if(!s.mission)throw Error('Mission metadata is required');
 if(!s.mission.floorsState)setupMissionFloors(s);
 s.world=createMissionWorld(s.seed,s.mission);s.player={x:0,z:22,y:0,vy:0,vertical:'grounded'};s.enemies=[];
 s.exploration={visited:new Set([s.world.tiles[0].id]),cells:new Set(),cleared:new Set(),groups:s.mission.floorsState.map(f=>({id:`floor-${f.index+1}`,x:0,z:f.z,roles:f.index===s.mission.floors-1?['boss','elite']:[...f.roster.roles,'elite'],threat:missionRoomThreat(s.mission,f.index),state:f.state,members:f.members})),lootNotice:false};
 return s;
}

const clearSpawn=(world,p,anchor)=>world.walkable(p.x,p.z,1)?p:world.walkable(anchor.x,anchor.z,1)?anchor:null;
const MISSION_ENTRY_LANES=[-6,-4,-2,0,2,4,6];
export function missionEntryPosition(world,floor,slot=0){
 const row=Math.floor(slot/MISSION_ENTRY_LANES.length),lane=slot%MISSION_ENTRY_LANES.length;
 const x=MISSION_ENTRY_LANES[(lane+row*3)%MISSION_ENTRY_LANES.length],z=Math.min(floor.z+MISSION_ENTRY_MAX_Z_OFFSET,floor.z+MISSION_ENTRY_MIN_Z_OFFSET+row*2.5);
 return clearSpawn(world,{x,z},{x:0,z});
}
export function tickMissionFloors(s,{spawn,loot}={}){
 const m=s.mission;if(!m||m.complete||!s.exploration)return;
 const tile=s.world.tileAt?.(s.player.x,s.player.z);if(tile)s.exploration.visited.add(tile.id);
 if(m.event){
  const node=s.encounters?.nodes.find(n=>n.id===m.event.nodeId);
  if(node?.state==='reward'){
   if(node.rewardPart)s.ground.push({id:++s.entityId,x:node.x-5,y:node.y,z:node.z,part:node.rewardPart,missionEventReward:true});
   node.state='complete';node.claimed=true;resolveMissionEvent(s,'victory','Испытание пройдено · деталь лежит у события');
  }else if(node?.state==='complete')resolveMissionEvent(s,'sacrifice','Жертва принята · проход открыт');
  else if(node?.state==='failed')resolveMissionEvent(s,'failed','Испытание провалено · проход открыт без награды');
  if(m.event)return;
 }
 const floor=m.floorsState[m.currentFloor];if(!floor)return;
 const group=s.exploration.groups[floor.index];
 const addEnemy=(enemy,{guaranteedPartDrop=false,guaranteedPartKind=null,arriving=false}={})=>{if(!enemy)return;enemy.groupId=group.id;enemy.anchor={x:0,z:floor.z};enemy.missionRoom=floor.index+1;enemy.guaranteedPartDrop=guaranteedPartDrop;enemy.guaranteedPartKind=guaranteedPartKind;if(arriving)enemy.missionArrival=true;floor.members.push(enemy.id);};
 const defender=(kind,p,role,recipeId)=>{
  if(!p)return null;
  const enemy=spawn?.(kind,p,role,missionRoomThreat(m,floor.index));
  if(!enemy)return null;assignEnemyAssembly(s,strengthenMissionEnemy(enemy,floor.index),missionRoomThreat(m,floor.index),{missionRole:role,missionRecipeId:recipeId});if(kind==='elite'&&floor.index===0){enemy.hp=enemy.maxHp=Math.max(1,enemy.maxHp*.3);}return enemy;
 };
 if(floor.state==='ready'&&Math.abs(s.player.z-floor.z)<=24){
  floor.entered=true;floor.state=group.state='active';
  	  const {eliteRole}=floor.roster,elitePosition=missionEntryPosition(s.world,floor,0);
  if(floor.index===m.floors-1){
   const enemy=strengthenMissionEnemy(spawn?.('boss',{x:0,z:floor.z-8},'mass',missionRoomThreat(m,floor.index)+m.difficulty*360),floor.index),elite=defender('elite',elitePosition,eliteRole,floor.roster.eliteRecipeId);if(enemy){enemy.bossDesignId=m.bossId;enemy.bossName=m.bossName;setupMissionBoss(s,enemy,m.bossId);}addEnemy(enemy);addEnemy(elite,{guaranteedPartDrop:true,arriving:true});m.bossSpawned=true;
   floor.bossWave={index:0,nextAt:combatTime(s)+MISSION_BOSS_WAVE_INTERVAL};
   s.events.push({type:'notice',text:`Босс: ${m.bossName}`});
  }else{
   const roles=floor.roster.roles,recipes=floor.roster.recipeIds;
   const normalCount=(roles.length+1)*MISSION_ENEMY_MULTIPLIER-1;
   for(let index=0;index<normalCount;index++){
    const slot=index%roles.length,role=roles[slot],p=missionEntryPosition(s.world,floor,index+1);
    addEnemy(defender('normal',p,role,recipes[slot]),{arriving:true});
   }
   addEnemy(defender('elite',elitePosition,eliteRole,floor.roster.eliteRecipeId),{guaranteedPartDrop:true,guaranteedPartKind:floor.index===0?'arm':null,arriving:true});
   s.events.push({type:'notice',text:`Комната ${floor.index+1} · ${floor.roster.tacticName} · ${floor.roster.enhancementName}`});
  }
 }
 if(floor.state==='active'&&floor.index===m.floors-1&&floor.bossWave){
  const boss=s.enemies.find(e=>e.hp>0&&e.bossCombat&&e.missionRoom===floor.index+1),wave=floor.bossWave,now=combatTime(s);
  const liveReinforcements=s.enemies.filter(e=>e.hp>0&&e.bossReinforcement&&e.missionRoom===floor.index+1).length;
  if(boss&&now>=wave.nextAt){
   if(liveReinforcements<MISSION_BOSS_REINFORCEMENT_CAP){
    const count=Math.min(MISSION_BOSS_WAVE_SIZE,MISSION_BOSS_REINFORCEMENT_CAP-liveReinforcements),roles=floor.roster.roles,recipes=floor.roster.recipeIds;
    for(let slot=0;slot<count;slot++){
     const role=roles[(wave.index*MISSION_BOSS_WAVE_SIZE+slot)%roles.length];
     const p=missionEntryPosition(s.world,floor,wave.index*MISSION_BOSS_WAVE_SIZE+slot);
     const recipeId=recipes[(wave.index*MISSION_BOSS_WAVE_SIZE+slot)%recipes.length],enemy=defender('normal',p,role,recipeId);if(enemy)enemy.bossReinforcement=true;addEnemy(enemy,{arriving:true});
    }
    wave.index++;
    s.events.push({type:'notice',text:`Подкрепление босса · волна ${wave.index}`});
   }
   wave.nextAt=now+MISSION_BOSS_WAVE_INTERVAL;
  }
 }
 if(floor.state==='active'&&floor.members.length&&floor.members.every(id=>!s.enemies.some(e=>e.id===id&&e.hp>0))){
  floor.state=group.state='cleared';s.exploration.cleared.add(group.id);
  if(!floor.roomLootId){
	   const part=loot?.('normal',floor.index===0?'digestion':null),x=-6,z=floor.z+3;
   if(part){const id=++s.entityId,y=s.world.heightAt?.(x,z)??0;s.ground.push({id,x,y,z,part,groupId:group.id,missionRoomLoot:true});floor.roomLootId=id;}
  }
  spawnMissionEvidence(s,floor);
  if(floor.index===m.floors-1){m.complete=true;s.won=true;s.events.push({type:'victory',text:`Миссия выполнена: ${m.name}`});}
	  else{
	   const room=floor.index+1;m.currentFloor++;
	   if(room%MISSION_EVENT_INTERVAL===0){const event=createMissionEvent(s,room,floor,loot);s.events.push({type:'group-cleared',id:group.id,text:`Комната ${room} зачищена · ${event.kind==='altar'?'найден жертвенный алтарь':'впереди испытание'}`});}
	   else{m.floorsState[m.currentFloor].state='ready';s.exploration.groups[m.currentFloor].state='ready';s.events.push({type:'group-cleared',id:group.id,text:`Комната ${room} зачищена · проход открыт`});}
	  }
 }
}

export function missionFloorStatus(s){
 const m=s.mission;if(!m)return'Свободный маршрут · враги усиливаются со временем';if(m.complete)return'Задание выполнено';
 if(m.event)return`Событие после комнаты ${m.event.room} · ${m.event.kind==='altar'?'решите, принимать ли жертву':'начните испытание или откажитесь'}`;
 const floor=m.floorsState?.[m.currentFloor];if(!floor)return`Комната 1 / ${m.floors}`;
 const boss=s.enemies.find(e=>e.hp>0&&e.bossCombat);if(boss)return missionBossStatus(s,boss);
 const label=floor.index===m.floors-1?m.bossName:`Комната ${floor.index+1} / ${m.floors}`;
 return floor.state==='active'?`${label} · врагов ${floor.members.filter(id=>s.enemies.some(e=>e.id===id&&e.hp>0)).length}`:`${label} · войдите в зал`;
}

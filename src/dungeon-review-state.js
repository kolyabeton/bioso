import {createPart,stats} from './assembly.js';
import {beginEncounter,exitDungeon,hurtEnemy} from './game.js';
import {tickChallenge} from './systems/events/challenges.js';
import {dungeonLayoutStats} from './dungeon-layout.js';
import {SURVIVAL_BOSS_INTERVAL} from './systems/survival-bosses.js';

export const DUNGEON_SCENARIOS={
 roots:{type:'dungeon_roots',name:'Корневые тоннели',label:'Корни',level:15,time:900,count:12},
 catacombs:{type:'dungeon_catacombs',name:'Техногенные катакомбы',label:'Катакомбы',level:25,time:1500,count:18},
};

/** Prepare a fresh, isolated review run using the production dungeon entry path. */
export function stageDungeonReview(s,key='roots'){
 const scenario=DUNGEON_SCENARIOS[key]||DUNGEON_SCENARIOS.roots;
 const node=s.encounters.nodes.find(n=>n.type===scenario.type);
 if(!node)throw Error('Логово отсутствует на карте');
 s.time=scenario.time;s.level=scenario.level;s.enemies=[];s.pending=0;s.dungeonReview=true;
 // The fixture jumps ahead in survival time. Do not replay missed invasions
 // immediately outside the entrance and block the intended return trip.
 const skippedBosses=Math.floor(s.time/SURVIVAL_BOSS_INTERVAL);
 s.survivalBosses={count:skippedBosses,nextAt:(skippedBosses+1)*SURVIVAL_BOSS_INTERVAL,rotation:[]};
 s.body=createPart(s,'bastion',3);
 s.arms=['seed','claws'].map(k=>createPart(s,k,3));
 s.legs=Array.from({length:4},()=>createPart(s,'universal',3));
 s.organs=[];s.hp=stats(s).hp;s.biomass=500;
 s.health.invulnerableUntil=Infinity;
 node.discovered=true;Object.assign(s.player,{x:node.x,y:node.y??0,z:node.z});
 if(!beginEncounter(s,node.id))throw Error('Не удалось войти в логово');
 node.elapsed=0;
 return node;
}

export function dungeonReviewProof(s,node){
 const inside=s.encounters.active===node,world=inside?s.world:node.dungeonLayer?.world,enemies=inside?s.enemies:node.dungeonLayer?.enemies||[];
 return {type:node.type,state:node.state,total:node.members.length,
  remaining:node.members.filter(id=>enemies.some(e=>e.id===id&&e.hp>0)).length,
  cleared:!!node.cleared,time:s.time,elapsed:node.elapsed||0,
  loot:s.ground.filter(p=>p.dungeonLoot).length,inventory:s.inventory.length,
  invulnerable:s.health.invulnerableUntil===Infinity,layout:dungeonLayoutStats(node.tunnelGraph),
  zones:{total:node.aggroZones.length,engaged:node.aggroZones.filter(zone=>zone.state==='engaged').length,groups:node.aggroZones.map(zone=>zone.members.length)},
  terrain:{missionFloor:!!world?.missionLine,environmentId:world?.environmentId},player:{...s.player}};
}

export function clearDungeonReview(s,node){
 if(s.encounters.active!==node)return false;
 for(const zone of node.aggroZones){zone.state='engaged';for(const id of zone.members){const enemy=s.enemies.find(e=>e.id===id);if(enemy){enemy.dungeonDormant=false;if(enemy.territory)enemy.territory.state='engaged';}}}
 for(const enemy of s.enemies.filter(e=>node.members.includes(e.id)&&e.hp>0))hurtEnemy(s,enemy,1e12);
 // Leave drops intact and avoid an unrelated level-up blocking the test controls.
 s.pending=0;s.choices=[];s.xpDrops=[];
 tickChallenge(s,0);
 return true;
}

export function leaveDungeonReview(s,node){
 if(s.encounters.active!==node)return false;
 Object.assign(s.player,node.exit);
 return exitDungeon(s,node.id);
}

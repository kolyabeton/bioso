// Development-only prepared scenarios. Never loaded by an ordinary production run.
import {WEAPONS} from './catalog.js';
import {createPart,stats} from './assembly.js';
import {spawnEnemy} from './game.js';
import {syncMutations,mutationView,combatTime} from './systems/mutations.js';
import {discoverEncounters} from './systems/encounters.js';
export function prepareIsaacReview(s,params){
 const mode=params.get('scenario')||'hive';s.body=createPart(s,'bastion');s.legs=Array.from({length:4},()=>createPart(s,'universal'));
 const kit=mode==='stomach'?{arms:['seed','fangs'],organs:['outerStomach','regen','slime']}:mode==='mire'?{arms:['acid','fangs'],organs:['slime','regen','reverseHeart']}:mode==='conductor'?{arms:['arc','seed'],organs:['shield','stabilizer','accelerator']}:mode==='crazy'?{arms:['seed','needle'],organs:['returnNerve','slime','parasite']}:{arms:['rocket','fangs'],organs:['parasite','digestion','slime']};
 s.arms=kit.arms.map(k=>createPart(s,k));s.organs=kit.organs.map(k=>createPart(s,k));s.inventory=['returnNerve','commonNerve','reverseHeart'].filter(k=>!kit.organs.includes(k)).map(k=>createPart(s,k));s.time=300;s.hp=stats(s).hp;s.biomass=100;s.enemies=[];s.ground=[];
 if(mode==='crazy'){s.inventory=[];s.abilities.learned=['projectiles.0','projectiles.1','projectiles.2','projectiles.3','fire.0','cold.0','electric.0'];}
 const weapon=params.get('weapon');if(Object.hasOwn(WEAPONS,weapon)){s.arms=[createPart(s,weapon),null];s.organs=[];s.time=0;s.hp=stats(s).hp;}
 syncMutations(s);discoverEncounters(s);const route=params.get('screen')||'assembly';
 if(['altar_organs','altar_speed','altar_armor','altar_capacity','altar','sealed','infection','hunt','membrane','slab','nursery'].includes(route)){const n=s.encounters.nodes.find(n=>n.type===route&&(!params.get('tier')||n.challengeTier===Number(params.get('tier'))));s.level=Math.max(s.level,n.unlockLevel||1);s.inventory=[];s.arms=[createPart(s,'seed'),null];s.organs=[];s.legs=[createPart(s,'universal'),createPart(s,'universal'),null,null];if(route==='altar'&&mode==='fusion'){s.arms[1]=createPart(s,'needle');s.inventory=[createPart(s,'universal'),createPart(s,'seed')];}s.hp=stats(s).hp;const approach={x:n.x,y:n.y,z:n.z+3};Object.assign(s.player,s.world.walkable(approach.x,approach.z,.8)?approach:{x:n.x,y:n.y,z:n.z});discoverEncounters(s);return{name:'encounter-detail',params:{id:n.id}};}
 if(route==='loot'){s.ground=[{id:++s.entityId,x:s.player.x+5,y:s.player.y??0,z:s.player.z,part:createPart(s,'needle')}];return{name:'loot',params:{}};}
 if(route==='battle'){
  s.inventory=[];
  let captureTargets=[];
  function spawnTargets(){
   const targetCount=weapon?3:20;
   for(let i=0;i<targetCount;i++){
    const a=i*Math.PI*2/targetCount,p={x:s.player.x+Math.cos(a)*(weapon?2.5:8),z:s.player.z+Math.sin(a)*(weapon?2.5:8)};
    if(s.world.walkable(p.x,p.z,.7)){
     const target=spawnEnemy(s,'normal',p,'mass',0);
     if(weapon&&target){target.hp=target.maxHp=500;target.speed=0;if(target.enemyAttack)target.enemyAttack.readyAt=1e9;captureTargets.push(target);}
    }
   }
  }
  if(!(weapon&&params.has('capture')))spawnTargets();
  const badge=document.createElement('output');badge.id='isaac-review-status';badge.className='isaac-review-status';badge.textContent='Проверочная сборка · бой';document.getElementById('game').append(badge);
  return {name:null,startCapture(){
   if(!weapon)return;
   s.enemies=[];s.shieldStrikes=[];captureTargets=[];
   for(const arm of s.arms.filter(Boolean))arm.cooldown=.8;
   spawnTargets();
  },tick(){badge.textContent=`Проверочная сборка${weapon?' · манекены · '+WEAPONS[weapon]?.name:''} · ${Math.floor(s.time)}с · бой ${Math.floor(combatTime(s))}с · личинки ${s.isaac.larvae.length} · слизь ${s.isaac.slimePools.length} · возврат ${s.shots.filter(q=>q.returning).length} · ${mutationView(s).filter(f=>f.active).map(f=>f.name).join(', ')||'без мутации'}${weapon&&params.has('capture')?' · цели '+captureTargets.map(t=>Math.round(t.hp)).join(' / '):''}`;}};
 }
 return{name:'assembly',params:{}};
}

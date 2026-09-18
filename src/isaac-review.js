// Development-only prepared scenarios. Never loaded by an ordinary production run.
import {WEAPONS} from './catalog.js';
import {createPart,stats} from './assembly.js';
import {spawnEnemy,beginEncounter} from './game.js';
import {syncMutations,mutationView,combatTime} from './systems/mutations.js';
import {discoverEncounters} from './systems/encounters.js';
import {encounterLevel} from './systems/events/proximity.js';
export function prepareIsaacReview(s,params){
 const mode=params.get('scenario')||'hive';s.body=createPart(s,'bastion');s.legs=Array.from({length:4},()=>createPart(s,'universal'));
 const kit=mode==='stomach'?{arms:['seed','fangs'],organs:['digestion','regen','slime']}:mode==='mire'?{arms:['acid','fangs'],organs:['slime','regen','reverseHeart']}:mode==='conductor'?{arms:['arc','seed'],organs:['shield','stabilizer','accelerator']}:mode==='crazy'?{arms:['seed','needle'],organs:['returnNerve','slime','parasite']}:{arms:['rocket','fangs'],organs:['parasite','digestion','slime']};
 s.arms=kit.arms.map(k=>createPart(s,k));s.organs=kit.organs.map(k=>createPart(s,k));s.inventory=['returnNerve','commonNerve','reverseHeart'].filter(k=>!kit.organs.includes(k)).map(k=>createPart(s,k));s.time=300;s.hp=stats(s).hp;s.biomass=100;s.enemies=[];s.ground=[];
 if(mode==='organ-upgrades'){const keys=['mirrorGland','reflexNerve','regen','repairGland','armor'],key=keys.includes(params.get('organ'))?params.get('organ'):'repairGland';s.body.tier=Math.max(1,Math.min(5,Number(params.get('bodyTier'))||1));s.organs=[createPart(s,key),createPart(s,'digestion'),null];s.inventory=keys.filter(k=>k!==key).map(k=>createPart(s,k));s.time=0;s.biomass=Number(params.get('biomass')??2000);s.hp=stats(s).hp;}
 if(mode==='hive-no-incubator')s.organs=s.organs.filter(p=>p.key!=='parasite');
 if(mode==='crazy'){s.inventory=[];s.abilities.learned=['projectiles.0','projectiles.1','projectiles.2','projectiles.3','fire.0','cold.0','electric.0'];}
 const weapon=params.get('weapon');if(Object.hasOwn(WEAPONS,weapon)){s.arms=[createPart(s,weapon),null];s.organs=[];s.time=0;s.hp=stats(s).hp;}
 syncMutations(s);discoverEncounters(s);const route=params.get('screen')||'assembly';
 if(['altar_organs','altar_speed','altar_armor','altar_capacity','altar','sealed','infection','hunt','race','dungeon_roots','dungeon_catacombs','membrane','slab','nursery'].includes(route)){const n=s.encounters.nodes.find(n=>n.type===route&&(!params.get('tier')||n.challengeTier===Number(params.get('tier'))));s.level=Math.max(s.level,encounterLevel(n),1);s.inventory=[];s.arms=[createPart(s,'seed'),null];s.organs=[];s.legs=[createPart(s,'universal'),createPart(s,'universal'),null,null];if(route==='altar'&&mode==='fusion'){s.arms[1]=createPart(s,'needle');s.inventory=[createPart(s,'universal'),createPart(s,'seed')];}s.hp=stats(s).hp;const approach={x:n.x,y:n.y,z:n.z+3};Object.assign(s.player,s.world.walkable(approach.x,approach.z,.8)?approach:{x:n.x,y:n.y,z:n.z});if(mode==='challenge-overlap'){
  const previous=s.encounters.nodes.find(other=>other.type==='infection'&&other.id!==n.id);
  if(previous){Object.assign(previous,{x:n.x,y:n.y,z:n.z});beginEncounter(s,previous.id);previous.progress=12;}
  const boss=spawnEnemy(s,'boss',{x:s.player.x+5,y:s.player.y,z:s.player.z},'mass',s.time);
  if(boss?.territory)boss.territory.state='engaged';
 }
 if(mode==='navigation-far'&&route==='infection'){
  beginEncounter(s,n.id);n.progress=7;s.enemies=[];n.members=[];s.waves.credit=-1e6;s.waves.nextElite=s.waves.nextBoss=1e9;s.health.invulnerableUntil=Infinity;
  let far=null;for(const radius of [30,28,26,24])for(let i=0;i<32&&!far;i++){const angle=i*Math.PI/16,x=n.x+Math.cos(angle)*radius,z=n.z+Math.sin(angle)*radius,y=s.world.heightAt?.(x,z);if(Number.isFinite(y)&&s.world.walkable(x,z,.8))far={x,y,z};}
  if(far)Object.assign(s.player,far);discoverEncounters(s);return{name:null};
 }
 discoverEncounters(s);return{name:'encounter-detail',params:{id:n.id}};}
 if(route==='loot'){s.ground=[{id:++s.entityId,x:s.player.x+5,y:s.player.y??0,z:s.player.z,part:createPart(s,'needle')}];return{name:'loot',params:{}};}
 if(route==='battle'){
  s.inventory=[];
  let captureTargets=[],paused=false,freezeAt=null;
  const loop=weapon&&params.get('loop')==='1';let resetAt=4;
  if(loop){s.waves.credit=-1e6;s.nextElite=s.waves.nextElite=1e9;s.nextBoss=s.waves.nextBoss=1e9;}
  function spawnTargets(){
   let positions=[];
   if(weapon){
    for(let attempt=0;attempt<24&&!positions.length;attempt++){
     const a=(weapon==='harpoon'?0:-Math.PI/2)+attempt*Math.PI*2/24,tx=-Math.sin(a),tz=Math.cos(a),base={x:s.player.x+Math.cos(a)*6,z:s.player.z+Math.sin(a)*6};
     const cluster=[-.72,0,.72].map(offset=>({x:base.x+tx*offset,z:base.z+tz*offset}));
     const clear=cluster.every(p=>{const y=s.world.heightAt?.(p.x,p.z)??0;return s.world.walkable(p.x,p.z,.7)&&(!s.world.lineClear||s.world.lineClear({x:s.player.x,y:(s.player.y??0)+1,z:s.player.z},{x:p.x,y:y+1,z:p.z}));});
     if(clear)positions=cluster;
    }
   }else positions=Array.from({length:20},(_,i)=>{const a=i*Math.PI*2/20;return{x:s.player.x+Math.cos(a)*8,z:s.player.z+Math.sin(a)*8};});
   for(const p of positions){
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
   paused=false;freezeAt=null;
   s.enemies=[];s.shieldStrikes=[];captureTargets=[];
   for(const arm of s.arms.filter(Boolean))arm.cooldown=.8;
   spawnTargets();
  },get paused(){return paused;},tick(){if(loop){if(s.time>=resetAt&&!s.shots.length){s.enemies=[];captureTargets=[];spawnTargets();resetAt=s.time+4;}for(const target of s.enemies)target.damage=0;for(const shot of s.hostileShots)shot.damage=0;}if(params.get('freeze')==='flight'&&s.shots.some(q=>q.travel>=4.2))paused=true;if(params.get('freeze')==='blast'){if(freezeAt==null&&captureTargets.some(target=>target.hp<target.maxHp))freezeAt=s.time+.1;if(freezeAt!=null&&s.time>=freezeAt)paused=true;}badge.textContent=`Проверочная сборка${loop?' · повтор выстрелов · без урона герою':''}${weapon?' · манекены · '+WEAPONS[weapon]?.name:''} · ${Math.floor(s.time)}с · бой ${Math.floor(combatTime(s))}с · личинки ${s.isaac.larvae.length} · слизь ${s.isaac.slimePools.length} · возврат ${s.shots.filter(q=>q.returning).length} · ${mutationView(s).filter(f=>f.active).map(f=>f.name).join(', ')||'без мутации'}${weapon&&params.has('capture')?' · цели '+captureTargets.map(t=>Math.round(t.hp)).join(' · '):''}`;}};
 }
 return{name:route==='soul'?'soul':'assembly',params:{}};
}

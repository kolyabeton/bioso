// Prepared character at the fourth habitat's displayed level; production combat rules.
// Waves are isolated for reproducibility. This is not a full survival playthrough.
import {createWorldRun} from '../../src/world-run.js';
import {createRun,step,addXP,chooseUpgrade,receiveDamage} from '../../src/game.js';
import {createPart,stats} from '../../src/assembly.js';
import {xpRequired} from '../../src/systems/balance.js';

export function levelFourDuel({weapon='claws',seed=42,moving=true,missedHit=false}={}){
 const worldRun=createWorldRun(undefined,'survival',seed);
 const e=worldRun.enemies.find(e=>e.habitatRank===4);
 const s=createRun(undefined,'survival',seed);s.entityId=worldRun.entityId;
 s.world={flat:true,walkable:()=>true,lineClear:()=>true,chunk:()=>({cx:0,cz:0,lair:{x:9999,z:9999}})};
 s.encounters={nodes:[],active:null};s.enemies=[e];s.bossHabitats=worldRun.bossHabitats;
 s.nextElite=Infinity;s.reliefUntil=Infinity;s.waves.credit=0;s.survivalBosses={nextAt:Infinity,count:0};
 s.arms=[createPart(s,weapon),null];
 for(let level=1;level<e.bossLevel;level++){
  addXP(s,xpRequired(s.level)-s.xp);
  if(!chooseUpgrade(s,0))throw Error('Expected an earned ability choice');
 }
 s.health.invulnerableUntil=0;s.ground=[];
 e.x=e.y=e.z=0;e.territory.home={x:0,y:0,z:0};
 s.player={x:0,y:0,z:7,facing:Math.PI};
 const initial={level:s.level,hp:s.hp,abilities:{...s.abilities.levels},bossHp:e.maxHp,damage:e.damage};
 if(missedHit){
  // One attack consumes the starter armor; the next actually reaches health.
  receiveDamage(s,e.damage,stats(s),e);receiveDamage(s,e.damage,stats(s),e);
 }
 while(s.time<420&&!s.dead&&e.hp>0){
  const dx=s.player.x-e.x,dz=s.player.z-e.z,d=Math.hypot(dx,dz)||1,radial=(6.2-d)*1.5;
  step(s,1/30,moving?{x:dx/d*radial-dz/d,z:dz/d*radial+dx/d}:{x:0,z:0});
  s.events.length=0;
 }
 return{weapon,seed,moving,missedHit,initial,seconds:s.time,killed:e.hp===0,dead:s.dead,hp:s.hp,bossHp:e.hp,hits:s.health.hits,phase:e.enemyAttack.phase,rewards:s.bossRewards?.length||0};
}

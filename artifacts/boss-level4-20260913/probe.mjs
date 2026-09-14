import {createWorldRun} from '../../src/world-run.js';
import {createRun,step,addXP,chooseUpgrade} from '../../src/game.js';
import {createPart,stats} from '../../src/assembly.js';
import {xpRequired} from '../../src/systems/balance.js';
const source=createWorldRun(undefined,'survival',42);
console.log(JSON.stringify(source.enemies.filter(e=>e.habitat).map(e=>({level:e.bossLevel,name:e.bossName,hp:e.hp,damage:e.damage,armor:e.armor}))));
for(const tuned of [false,true])for(const weapon of ['claws','pistol'])for(const moving of [false,true]){
 const s=createRun(undefined,'survival',42),e=structuredClone(source.enemies.find(e=>e.habitat&&e.bossLevel===4));s.entityId=source.entityId;
 // Isolate the duel; retain production character stats, damage, attacks and movement.
 s.world={flat:true,walkable:()=>true,lineClear:()=>true,chunk:()=>({cx:0,cz:0,lair:{x:9999,z:9999}})};
 s.encounters={nodes:[],active:null};s.enemies=[e];s.nextElite=Infinity;s.waves.credit=-Infinity;s.survivalBosses={nextAt:Infinity,count:0};s.survivalHordes={nextAt:Infinity};
 s.arms=[createPart(s,weapon),null];
 for(let i=1;i<4;i++){addXP(s,(xpRequired(s.level)-s.xp)/1.5);chooseUpgrade(s,0);}
 s.health.invulnerableUntil=0;s.ground=[];s.hp=stats(s).hp;
 e.x=e.z=e.y=0;e.territory.home={x:0,y:0,z:0};e.bossCombat.anchor={x:0,y:0,z:0};
 if(tuned){e.hp=e.maxHp=600;e.damage=.5;e.bossSpeedScale=1;e.attackRecoveryScale=1.25;}
 s.player={x:0,y:0,z:7,facing:Math.PI};const initial={hp:s.hp,stats:stats(s),abilities:s.abilities.levels};
 for(let i=0;i<180*30&&!s.dead&&e.hp>0;i++){
  const dx=s.player.x-e.x,dz=s.player.z-e.z,d=Math.hypot(dx,dz)||1,want=6.2,radial=(want-d)*1.5;
  const input=moving?{x:dx/d*radial-dz/d,z:dz/d*radial+dx/d}:{x:0,z:0};
  step(s,1/30,input);s.events.length=0;
 }
 console.log(JSON.stringify({tuned,weapon,moving,level:s.level,seconds:s.time,hp:s.hp,dead:s.dead,killed:e.hp===0,bossHp:e.hp,hits:s.health.hits,actions:e.bossCombat.counts,initial}));
}

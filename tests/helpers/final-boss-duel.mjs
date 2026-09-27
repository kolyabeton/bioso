// Prepared equipment and earned-choice API, isolated flat arena without waves.
// This is a reproducible combat simulation, not a complete survival playthrough.
import {createRun,spawnEnemy,step,addXP,chooseUpgrade} from '../../src/game.js';
import {createPart,stats} from '../../src/assembly.js';
import {xpRequired} from '../../src/systems/balance.js';
export function duel({weapon='claws',level=30,dodge=true,seed=321,difficulty=50}={}){
 const s=createRun(undefined,'survival',seed);s.difficulty=difficulty;s.encounters={nodes:[],active:null};s.world={walkable:()=>true,chunk:()=>({cx:0,cz:0,lair:{x:9999,z:9999}})};
 s.nextElite=s.nextBoss=Infinity;s.waves.credit=-1e9;s.survivalBosses={nextAt:Infinity,count:0};s.bossHabitats=[];
 s.body=createPart(s,'hecaton',5);s.arms=Array.from({length:4},()=>{const p=createPart(s,weapon,5);p.upgrades.damage=3;return p;});s.legs=Array.from({length:4},()=>createPart(s,'runner',5));s.organs=['regen','accelerator'].map(k=>createPart(s,k,5));
 const branches=weapon==='claws'?['melee','might','tempo','vitality','cold','fire','motion','electric']:['ranged','might','tempo','vitality','cold','fire','motion','projectiles'];
 for(let l=1;l<level;l++){addXP(s,xpRequired(s.level)-s.xp);let i=s.choices.map((c,i)=>({i,score:branches.indexOf(c.id.split('.')[0])})).sort((a,b)=>(a.score<0?99:a.score)-(b.score<0?99:b.score))[0].i;chooseUpgrade(s,i);}
 s.hp=stats(s).hp;s.health.missing=0;s.ground=[];
 const e=spawnEnemy(s,'final',{x:0,z:weapon==='claws'?3.5:8},'mass',2400);let seconds=0;
 while(seconds<480&&!s.dead&&!s.finalDefeated){const dx=s.player.x-e.x,dz=s.player.z-e.z,d=Math.hypot(dx,dz)||1,want=weapon==='claws'?6.5:8,radial=(want-d)*1.2,pace=weapon==='claws'?.5:1;const input=dodge?{x:(dx/d*radial-dz/d)*pace,z:(dz/d*radial+dx/d)*pace}:{x:0,z:0};step(s,1/30,input);s.events.length=0;seconds+=1/30;}
 return {weapon,level,dodge,seed,seconds:Math.round(seconds),won:s.finalDefeated,dead:s.dead,hp:s.hp,bossLeft:Math.round(e.hp),hits:s.health.hits,blocked:s.health.blocked,learned:Object.values(s.abilities.levels).reduce((sum,rank)=>sum+rank,0),unique:s.abilities.learned.length,speed:stats(s).speed};
}

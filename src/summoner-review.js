// DEV/acceptance-only proof for the complete autonomous summoner build.
import {createPart,stats} from './assembly.js';
import {spawnEnemy} from './game.js';
import {modifiers} from './systems/abilities.js';
import {summonTuning} from './systems/symbionts.js';

export function prepareSummonerReview(s,params=new URLSearchParams()){
 const interception=params.get('intercept')==='1',rockets=params.get('rockets')==='1';let nextInterceptAt=0;
 s.progressionLocked=true;s.time=900;s.level=25;s.enemies=[];s.ground=[];s.shots=[];s.hostileShots=[];s.puddles=[];
 s.world.lineClear=()=>true;
 s.nextElite=s.nextBoss=s.waves.nextElite=s.waves.nextBoss=Infinity;s.waves.credit=-Infinity;s.survivalBosses={nextAt:Infinity,count:0};s.survivalHordes={nextAt:Infinity,count:0,queue:null};s.bossHabitats=[];s.health.invulnerableUntil=Infinity;
 s.body=createPart(s,'broodmother',5);
 s.arms=rockets?[createPart(s,'rocket',5),createPart(s,'rocket',5)]:[createPart(s,'seed',1),createPart(s,'acid',1)];
 if(!rockets)for(const arm of s.arms){arm.disabled=true;arm.cooldown=Infinity;}
 s.legs=Array.from({length:3},()=>createPart(s,'swarmLeg',1));
 s.organs=[createPart(s,'broodNode',1),createPart(s,'broodNode',1),createPart(s,'regen',1)];
 s.abilities.learned=['summons.0','summons.1','summons.2','summons.3'];
 s.abilities.levels={'summons.0':5,'summons.1':5,'summons.2':5,'summons.3':5};
 s.abilities.companions=[];s.metrics.damage={direct:0,burn:0,electric:0,summon:0,acid:0,thermal:0,environment:0};s.hp=stats(s).hp;
 const boss=spawnEnemy(s,'boss',{x:s.player.x,z:s.player.z+6.5},'mass',900,{introductory:false,promote:false});
 const elite=spawnEnemy(s,'elite',{x:s.player.x-2.5,z:s.player.z+3.4},'mass',900,{promote:false});
 if(boss){boss.y=s.player.y??0;boss.hp=boss.maxHp=1e9;boss.speed=boss.damage=0;boss.contact=Infinity;boss.enemyAttack.readyAt=Infinity;boss.bossName='Пастырь Роя';boss.bossLevel=5;boss.territory=null;}
 if(elite){elite.y=s.player.y??0;elite.hp=elite.maxHp=1e9;elite.speed=elite.damage=0;elite.contact=Infinity;elite.enemyAttack.readyAt=Infinity;elite.territory=null;}
 // Acceptance metrics stay machine-readable and never masquerade as mission UI.
 const badge=document.createElement('output');badge.id='summoner-review-status';badge.hidden=true;badge.setAttribute('aria-hidden','true');document.getElementById('game').append(badge);
 return{get paused(){return false;},tick(){
  s.waves.credit=-Infinity;s.survivalBosses.nextAt=Infinity;s.survivalHordes.nextAt=Infinity;s.enemies=[boss,elite].filter(Boolean);for(const enemy of s.enemies){enemy.hp=Math.max(enemy.hp,1e9);enemy.maxHp=1e9;enemy.damage=0;enemy.speed=0;enemy.contact=Infinity;}if(!rockets)for(const arm of s.arms){arm.disabled=true;arm.cooldown=Infinity;}
  if(interception&&s.time>=nextInterceptAt){const c=s.abilities.companions.find(c=>c.phase!=='dead');if(c){const y=(c.y??0)+(c.hover??1.5);s.hostileShots.push({x:c.x,y,z:c.z-1.6,dx:0,dy:0,dz:1,speed:12,life:2,damage:1,key:'enemy-rocket'});nextInterceptAt=s.time+.85;}}
  const tuning=summonTuning(s,modifiers(s)),damage=s.metrics.damage||{},total=Object.values(damage).reduce((sum,value)=>sum+(Number(value)||0),0),share=total?damage.summon/total*100:0,alive=s.abilities.companions.filter(c=>c.phase!=='dead').length,targets=[...new Set(s.abilities.companions.filter(c=>c.phase!=='dead'&&c.target!=null).map(c=>c.target))],bossFocused=!!boss&&targets.length===1&&targets[0]===boss.id;
  badge.dataset.proof=JSON.stringify({alive,max:tuning.count,share,heroDirect:damage.direct||0,heroAcid:damage.acid||0,interceptors:true,replacementInterval:tuning.replacementInterval,interceptions:s.abilities.swarmInterceptions||0,nextSummons:{...(s.abilities.companionSummonReadyAt||{})},hostileShots:s.hostileShots.length,rockets,search:tuning.search,bossFocused,bossId:boss?.id,targets,focus:!!modifiers(s).summonFocus,companions:s.abilities.companions.map(c=>({id:c.id,source:c.sourceKey,target:c.target,phase:c.phase,distance:Math.hypot(c.x-s.player.x,c.z-s.player.z)})),enemies:s.enemies.map(e=>({id:e.id,kind:e.kind,distance:Math.hypot(e.x-s.player.x,e.z-s.player.z)}))});
 }};
}

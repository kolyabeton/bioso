// DEV/acceptance-only real combat fixtures for one synergy at a time.
import {NEURAL_WEB_RANGE} from './systems/ability-combat.js';
import {createPart,stats,upgrade} from './assembly.js';
import {spawnEnemy,receiveDamage} from './game.js';
import {learn} from './systems/abilities.js';
import {assembleEnemy,ENEMY_RECIPES} from './systems/enemy-assembly.js';

const SCENARIOS={
 burn:{arms:['seed'],learned:[],ranked:['fire.0','fire.1','fire.2'],moving:false,singleEdge:true,roll:0},
 impacttools:{arms:['claws','drill'],learned:[],moving:false,singleEdge:true},
 multishot:{arms:['seed'],learned:[],ranked:'projectiles.0',moving:false},
 clawlightning:{arms:['claws'],learned:['electric.0'],moving:false,singleEdge:true},
 ricochet:{arms:['seed'],learned:['ricochet.0'],ranked:['ricochet.1','ricochet.2','ricochet.3'],moving:false,singleEdge:true,ricochet:true},
 neuralweb:{arms:['seed'],learned:['projectiles.0','projectiles.1','projectiles.2','projectiles.3','electric.0','electric.1','electric.2','electric.3','neuralweb'],moving:false},
 countershell:{arms:['claws'],learned:['melee.0','melee.1','melee.2','melee.3','vitality.0','vitality.1','vitality.2','vitality.3','countershell'],counter:true},
 sporebrood:{arms:[],learned:['fire.0','fire.1','fire.2','fire.3','summons.0','summons.1','summons.2','summons.3','sporebrood'],moving:false},
 overgrowth:{arms:['seed'],learned:['might.0','might.1','might.2','might.3','metabolism.0','metabolism.1','metabolism.2','metabolism.3','overgrowth'],spend:true,moving:false},
 cryotrail:{arms:['claws'],learned:['cold.0','cold.1','cold.2','cold.3','motion.0','motion.1','motion.2','motion.3','cryotrail'],moving:true},
};

export function prepareAbilityVfxReview(s,params,setInput){
 const id=Object.hasOwn(SCENARIOS,params.get('synergy'))?params.get('synergy'):'neuralweb',config=SCENARIOS[id],recording=params.get('record')==='1';
 s.progressionLocked=true;s.nextElite=s.nextBoss=Infinity;s.waves.credit=0;s.time=180;s.enemies=[];s.ground=[];s.shots=[];s.hostileShots=[];
 if(config.singleEdge){s.world.walkable=()=>true;s.world.lineClear=()=>true;}
 s.body=createPart(s,'rootwalker',4);s.arms=config.arms.map(key=>createPart(s,key,4));s.legs=Array.from({length:4},()=>createPart(s,'universal',4));s.organs=[];
 for(const ability of config.learned)learn(s,ability);for(const ability of config.ranked?[config.ranked].flat():[])for(let rank=0;rank<5;rank++)learn(s,ability);s.level=Object.values(s.abilities.levels).reduce((sum,rank)=>sum+rank,0)+1;s.hp=stats(s).hp;
 const showcase=id==='neuralweb'&&params.get('showcase')==='1';
 const positions=showcase?[-1,0,1].map(side=>({x:s.player.x+side*4,y:s.player.y,z:s.player.z+10})):config.ricochet?[{x:s.player.x,y:s.player.y,z:s.player.z+2.4},{x:s.player.x+2.8,y:s.player.y,z:s.player.z+3.5},{x:s.player.x+.5,y:s.player.y,z:s.player.z+5.8},{x:s.player.x-2.4,y:s.player.y,z:s.player.z+7.5}]:config.singleEdge?[{x:s.player.x,y:s.player.y,z:s.player.z+3.7}]:[];for(let ring=0;!config.singleEdge&&!showcase&&ring<3;ring++)for(let i=0;i<10;i++){const a=i*Math.PI/5+ring*.17,r=3+ring*2,x=s.player.x+Math.cos(a)*r,z=s.player.z+Math.sin(a)*r;if(s.world.walkable(x,z,.65))positions.push({x,z});}
 for(const [i,position] of positions.entries()){const enemy=spawnEnemy(s,'normal',position,i%4?'mass':'armored',180);if(enemy){if(config.singleEdge){enemy.y=s.player.y;if(id!=='impacttools'&&id!=='burn')enemy.kind='objective';else if(id==='impacttools')enemy.radius=.48;}enemy.hp=enemy.maxHp=config.ricochet||id==='burn'?50000:id==='sporebrood'?1400:500;enemy.speed=enemy.damage=0;if(id!=='burn')enemy.assembly=null;}}
 if(config.singleEdge)s.rng=()=>config.roll??.99;
 // Use the runtime creature renderer for fire acceptance, not an objective prop.
 const burnTarget=id==='burn'?s.enemies[0]:null;
 if(burnTarget){burnTarget.kind='normal';burnTarget.assembly??=assembleEnemy(ENEMY_RECIPES.find(r=>r.id==='carapace'));burnTarget.assemblyRole='armored';burnTarget.tier??=1;burnTarget.x=s.player.x-3;burnTarget.z=s.player.z+5;}
 if(!config.counter)s.health.invulnerableUntil=Infinity;
 if(config.spend){s.biomass=10000;upgrade(s,s.arms[0].id,'damage',true);}
 const badge=document.createElement('output');badge.id='ability-vfx-review-status';badge.style.cssText='position:absolute;left:10px;right:10px;top:92px;z-index:30;padding:6px;background:#10271ecc;color:#eef4ee;font:11px/1.3 monospace;pointer-events:none';document.getElementById('game').append(badge);
 if(recording)badge.hidden=true;
 let angle=0,nextCounter=s.time+.8,nextSpend=s.time+.8,nextShowcase=s.time,paused=false,ricochetFrames=0;return{get paused(){return paused;},tick(){angle+=.012;s.waves.credit=-Infinity;if(config.moving)setInput({x:Math.cos(angle),z:Math.sin(angle)});else setInput({x:0,z:0});
  if(id==='neuralweb'&&params.get('showcase')==='1'&&s.time>=nextShowcase){nextShowcase=s.time+.9;for(const side of [-1,1])s.events.push({type:'soul-proc',kind:'neuralweb',x:s.player.x,y:s.player.y??0,z:s.player.z,tx:s.player.x+side*NEURAL_WEB_RANGE*.6,ty:s.player.y??0,tz:s.player.z+NEURAL_WEB_RANGE*.7});}
  if(config.counter&&s.time>=nextCounter){s.health.invulnerableUntil=0;receiveDamage(s,1,stats(s));s.hp=stats(s).hp;s.health.missing=0;nextCounter=s.time+2.5;}
  if(burnTarget){burnTarget.x=s.player.x-3+Math.sin((s.time-180)*.7)*1.1;burnTarget.z=s.player.z+5+Math.cos((s.time-180)*.7)*.45;}
  if(config.spend&&s.time>=nextSpend&&Object.values(s.arms[0].upgrades).reduce((n,v)=>n+v,0)<10){upgrade(s,s.arms[0].id,'damage',true);nextSpend=s.time+1.4;}
  if(config.ricochet){ricochetFrames=s.shots.some(shot=>shot.ricochetLeft!=null)?ricochetFrames+1:0;if(!recording&&ricochetFrames>=9)paused=true;}
  badge.textContent=`VFX · ${id}${config.ranked?' · ранг 5 из 5':''}${params.get('showcase')==='1'?' · ветвящаяся молния 10 м':''} · ${s.enemies.filter(e=>e.hp>0).length} целей · ${s.enemies.reduce((sum,e)=>sum+(e.burn?.count||0),0)} стаков огня · ${s.abilities.spores.length} спор · ${s.abilities.cryoTrails.length} следов${paused?' · стоп-кадр':''}`;}};
}

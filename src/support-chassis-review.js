import {SUPPORT_BODIES} from './systems/chassis-unlocks.js';
import {createPart,stats} from './assembly.js';
import {spawnEnemy,step} from './game.js';
import {learn} from './systems/abilities.js';
import {chassisTuning,sentinelCircles} from './systems/support-chassis.js';
/** Isolated DEV route; real world, shared assembly UI and normal combat pipeline. */
export function prepareSupportChassisReview(s,params,ui){
 const key=Object.hasOwn(SUPPORT_BODIES,params.get('body'))?params.get('body'):'sentinel',d=SUPPORT_BODIES[key],arms={demolition:['drill','needle'],regulator:['acid','harpoon'],sentinel:['shieldArm','pistol'],assembler:['arc','arc','pistol']}[key];
 s.chassisReview=true;s.body=createPart(s,key);s.arms=arms.map(k=>createPart(s,k));while(s.arms.length<d.arms)s.arms.push(null);
 s.legs=Array.from({length:d.legs},()=>createPart(s,key==='sentinel'?'plated':'universal'));s.organs=Array(d.organs).fill(null);if(key==='demolition')s.organs[0]=createPart(s,'digestion');
 if(key==='assembler')s.body.upgrades={capacity:10};if(key==='regulator')for(let i=0;i<3;i++)learn(s,'cold.3');
 s.hp=stats(s).hp;s.biomass=500;s.inventory=[];s.ground=[];s.enemies=[];s.hostileShots=[];s.progressionLocked=true;s.health.invulnerableUntil=Infinity;
 s.encounters={active:null,nodes:[]};s.nextElite=s.nextBoss=s.waves.nextElite=s.waves.nextBoss=Infinity;s.waves.credit=-Infinity;s.survivalResponse={nextAt:Infinity};
 for(let i=0;i<4;i++){const yaw=i*Math.PI/2,x=s.player.x+Math.sin(yaw)*5,z=s.player.z+Math.cos(yaw)*5;if(!s.world.walkable(x,z,.7))continue;const e=spawnEnemy(s,'normal',{x,z});if(!e)continue;e.assembly=null;e.specialty=null;e.role='mass';e.volatile=false;e.noRewards=true;e.hp=e.maxHp=100000;e.speed=e.damage=0;e.contact=999;e.territory=null;if(key==='regulator'&&i===0)e.kind='boss';}
 if(params.get('advance')==='1'){const advance=document.createElement('button');advance.textContent='Проверить 10 секунд';advance.style.cssText='position:fixed;top:72px;left:50%;transform:translateX(-50%);z-index:60;min-height:44px;padding:8px 16px;background:#29483b;color:#fff;border:1px solid #82958d;border-radius:8px';advance.onclick=()=>{for(let i=0;i<100;i++){step(s,.1);s.events.length=0;}if(s.time>=40)advance.remove();};document.body.append(advance);}
 const report=document.createElement('script');report.id='support-chassis-review-report';report.type='application/json';document.body.append(report);
 if(params.get('screen')==='assembly')ui.open('assembly');else if(params.get('screen')==='catalog')ui.open('catalog',{key,category:'body'});
 let nextShot=0;const stop=Number(params.get('stop')||45);
 return{get paused(){return s.time>=stop;},tick(){s.waves.credit=-Infinity;
  if(!ui.screen&&s.time>=nextShot&&s.time<stop&&(key==='sentinel'||key==='regulator')){nextShot=s.time+.6;const circle=sentinelCircles(s)[0],origin=circle??{x:s.player.x+2,z:s.player.z+1},owner=s.enemies[0];s.hostileShots.push({id:++s.entityId,owner:owner?.id,x:origin.x,y:(s.player.y??0)+1,z:origin.z,dx:1,dz:0,dy:0,speed:4,life:6,travel:0,key:'needle',damage:0});}
  report.textContent=JSON.stringify({body:key,time:s.time,tuning:chassisTuning(s),towers:(s.supportChassis?.towers??[]).map(t=>({id:t.id,x:t.x,y:t.y,z:t.z,hp:t.hp,maxHp:t.maxHp})),enemies:s.enemies.map(e=>({id:e.id,kind:e.kind,hp:e.hp,x:e.x,z:e.z,frozenUntil:e.regulatorFrozenUntil})),hostileShots:s.hostileShots.map(q=>({id:q.id,x:q.x,y:q.y,z:q.z,life:q.life,frozenUntil:q.frozenUntil})),reflected:s.shots.filter(q=>q.chassisReflected).map(q=>({id:q.id,damage:q.w.damage})),metrics:s.metrics.damage});
 }};
}

import {createPart} from './assembly.js';
import {spawnEnemy} from './game.js';
import {springContact} from './systems/extra-parts.js';

// DEV-only loop that exercises the real spring-contact path for visual proof.
export function prepareSpringLeapReview(run,clock=()=>performance.now()){
 run.enemies=[];run.hostileShots=[];run.arms=[];run.legs=[createPart(run,'spring'),createPart(run,'universal')];
 run.extraParts??={};
 run.health.invulnerableUntil=Infinity;run.waves.credit=-1e6;run.nextElite=run.waves.nextElite=Infinity;run.nextBoss=run.waves.nextBoss=Infinity;
 const enemy=spawnEnemy(run,'normal',{x:run.player.x-.8,z:run.player.z},'mass',0,{promote:false});
 if(enemy){enemy.hp=enemy.maxHp=10000;enemy.speed=enemy.damage=0;enemy.enemyAttack.readyAt=Infinity;}
 let next=clock()+350,direction=1,triggeredAt=-Infinity;
 return{paused:false,tick(){
  const now=clock(),since=now-triggeredAt,mark=value=>{if(globalThis.document?.body)document.body.dataset.springLeapReview=value;};mark(since<420?'airborne':since<660?'landing':'ready');if(!enemy||now<next)return;
  enemy.x=run.player.x-direction*.8;enemy.y=run.player.y??0;enemy.z=run.player.z;enemy.contact=1;
  run.extraParts.springReady=true;run.extraParts.springReadyAt=0;run.extraParts.direction={x:direction,z:0};
  if(springContact(run,enemy)){triggeredAt=now;mark('airborne');direction*=-1;next=now+1100;}
 }};
}

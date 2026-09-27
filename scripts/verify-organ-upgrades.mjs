import {writeFile,mkdir} from 'node:fs/promises';
import {createRun,step,spawnEnemy} from '../src/game.js';
import {createPart,stats} from '../src/assembly.js';
import {ORGAN_UPGRADE_STATS} from '../src/systems/organ-upgrades.js';
const results=[];
for(const [name,keys] of Object.entries({single:['mirrorGland'],double:['mirrorGland','mirrorGland'],dodge:['mirrorGland','mirrorGland','reflexNerve','reflexNerve'],mixed:['mirrorGland','reflexNerve','shield','repairGland'],recovery:['mirrorGland','reflexNerve','regen','armor']}))for(const purchases of [0,10,20]){
 const s=createRun(undefined,'survival',731);s.player={x:0,y:0,z:0};s.world.walkable=()=>true;s.world.heightAt=()=>0;s.world.lineClear=()=>true;
 s.body=createPart(s,'bastion',5);s.body.setId='none';s.body.affixes=[];
 s.legs=Array.from({length:4},()=>createPart(s,'universal'));s.arms=[createPart(s,'claws')];s.arms[0].disabled=true;
 s.organs=keys.map(key=>{const p=createPart(s,key,5);p.setId='none';p.affixes=[];if(ORGAN_UPGRADE_STATS[key])p.upgrades[ORGAN_UPGRADE_STATS[key]]=key==='armor'?Math.min(2,purchases/10):purchases;if(key==='shield')p.shieldCharge=1;return p;});
 s.waves.credit=-1e6;s.waves.nextElite=s.waves.nextBoss=Infinity;s.nextElite=s.nextBoss=Infinity;s.hp=stats(s).hp;
 const e=spawnEnemy(s,'normal',{x:5,y:0,z:0});e.hp=e.maxHp=1e6;e.speed=0;e.frozenUntil=Infinity;e.armor=0;e.enemyAttack.readyAt=Infinity;
 const start=stats(s);let fired=0,reflected=0;
 for(let frame=0;frame<3600&&!s.dead;frame++){
  if(frame%20===0){s.hostileShots.push({id:++s.entityId,owner:e.id,x:1,y:1,z:0,dx:-1,dz:0,speed:7,life:2,damage:1});fired++;}
  step(s,1/60);reflected+=s.events.filter(e=>e.type==='shield'&&e.kind==='mirror-organ').length;s.events=[];
 }
 results.push({name,purchases,seconds:Number(s.time.toFixed(2)),alive:!s.dead,hp:s.hp,dodge:start.dodge,armor:start.armor,regenDelay:start.regenDelay,repairDelay:start.armorRepairDelay,fired,reflected,dodged:s.health.dodged,blocked:s.health.blocked,hits:s.health.hits,returnDamage:s.metrics.damage.reflection??0});
}
const dir=new URL('../docs/proof/organ-upgrades-20260914/',import.meta.url);await mkdir(dir,{recursive:true});await writeFile(new URL('combat-scenarios.json',dir),JSON.stringify({method:'Deterministic actual step; prepared rank-V loadouts, frozen target, three incoming projectiles per second for up to 60 seconds. Upgrade counts granted for comparison. This is not a full survival playthrough.',results},null,2)+'\n');console.table(results.map(({name,purchases,seconds,alive,hp,reflected,dodged,hits})=>({name,purchases,seconds,alive,hp,reflected,dodged,hits})));

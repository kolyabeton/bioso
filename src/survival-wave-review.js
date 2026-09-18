import {step,hurtEnemy} from './game.js';
import {SURVIVAL_CADENCE} from './systems/survival-cadence.js';

/** DEV/acceptance only: actual Survival state, spawners, death handlers and renderer.
 * Protected, unarmed player; scripted kills and accelerated simulation clocks.
 * This proves transitions, not difficulty or a normal player clear time.
 */
export function prepareSurvivalWaveReview(s,params=new URLSearchParams()){
 const timeout=params.get('timeout')==='1';
 s.health.invulnerableUntil=Infinity;s.arms=s.arms.map(()=>null);s.progressionLocked=true;
 const panel=document.createElement('aside');panel.id='survival-wave-review';panel.translate=false;
 panel.style.cssText='position:fixed;left:12px;bottom:86px;z-index:120;background:#10251ff2;color:#e4f4ec;padding:12px;max-width:360px;font:13px/1.5 system-ui';
 const title=document.createElement('strong');title.textContent='QA · Волны по зачистке';panel.append(title);
 const status=document.createElement('div');panel.append(status);
 const button=document.createElement('button');button.textContent='Следующий этап проверки';button.style.cssText='margin-top:8px;padding:8px';panel.append(button);document.body.append(panel);
 const checkpoints=[],checks=[];let stage=0;
 const members=()=>!s.waves.cadence?[]:s.enemies.filter(e=>e.hp>0&&e.survivalWaveIndex===s.waves.cadence?.index&&e.survivalWavePack===s.waves.cadence?.pack);
 function check(name,pass){checks.push({name,pass:!!pass});if(!pass)throw Error(name);}
 function advance(seconds){s.pending=0;s.bossRewards=[];for(let left=seconds;left>1e-8;){const dt=Math.min(.05,left);s.arms=s.arms.map(()=>null);step(s,dt);s.arms=s.arms.map(()=>null);left-=dt;}if(seconds===0){s.arms=s.arms.map(()=>null);step(s,0);s.arms=s.arms.map(()=>null);}}
 function clearPack(){
  const initial=s.waves.cadence.phase;
  for(let attempts=0;attempts<30&&s.waves.cadence.phase===initial;attempts++){
   for(const e of members()){delete e.summonAssembly;hurtEnemy(s,e,1e12);}
   if(s.waves.cadence.phase===initial)advance(0);
  }
  check(`cleared ${initial}`,s.waves.cadence.phase!==initial);
 }
 function publish(label){
  const q=s.waves.cadence,entry={label,time:s.time,index:q?.index??null,phase:q?.phase??'waiting',pack:q?.pack??null,issued:q?.issued??0,living:members().length,restUntil:q?.restUntil??null,reinforcementUntil:q?.reinforcementUntil??null,minuteElites:s.enemies.filter(e=>e.hp>0&&e.survivalMinuteElite).length,invaders:s.enemies.filter(e=>e.hp>0&&e.survivalInvader).length};checkpoints.push(entry);
  status.textContent=`${label} · волна ${entry.index==null?'—':entry.index+1} · ${entry.living} врагов · ${Math.max(0,(entry.restUntil??s.time)-s.time).toFixed(2)} с отдыха`;
  panel.dataset.proof=JSON.stringify({method:'Actual rendered Survival. Scripted real death handling, unarmed invulnerable player, accelerated step() clocks; timeout scenario relocates the player away from remnants. Not a balance playthrough.',seed:s.seed,checkpoints,checks});
 }
 button.onclick=()=>{
  try{
   if(stage===0){
    s.time=500;const intro=s.enemies.find(e=>e.id===s.introBossId);hurtEnemy(s,intro,1e12);advance(0);
    check('intro starts main pack',s.waves.cadence?.phase==='main');publish('Основная пачка');
   }else if(stage===1){advance(30);clearPack();advance(0);check('reinforcement follows full clear',s.waves.cadence.phase==='reinforcement');publish('Подкрепление');
   }else if(stage===2){
    if(timeout){const deadline=s.waves.cadence.reinforcementUntil;advance(14.99);check('reinforcement still active before 15 seconds',s.waves.cadence.phase==='reinforcement');publish('Подкрепление · 14,99 секунды');advance(.02);check('timeout starts rest with living survivors',s.waves.cadence.phase==='rest'&&members().length>0);check('rest starts at reinforcement deadline',s.waves.cadence.restUntil===deadline+SURVIVAL_CADENCE.rest);publish('Подкрепление истекло · отдых');}
    else{advance(5);clearPack();check('rest begins at last kill',s.waves.cadence.restUntil===s.time+SURVIVAL_CADENCE.rest);publish(`Передышка ${SURVIVAL_CADENCE.rest} секунд`);}
   }else if(stage===3){const until=s.waves.cadence.restUntil;advance(until-s.time-.01);check('no wave before rest expiry',s.waves.cadence.phase==='rest');check('timed invasion does not reset rest',s.enemies.some(e=>e.hp>0&&e.survivalInvader)&&s.waves.cadence.restUntil===until);publish('За 0,01 с до новой волны');
   }else if(stage===4){
    if(timeout){const p=s.world.tiles.flatMap(t=>t.safe).find(p=>Math.hypot(p.x-s.player.x,p.z-s.player.z)>100&&s.world.walkable(p.x,p.z,2.4));if(p)Object.assign(s.player,{x:p.x,z:p.z,y:s.world.heightAt(p.x,p.z)});}
    advance(.02);check(`next main starts after ${SURVIVAL_CADENCE.rest} seconds`,s.waves.cadence.index===1&&s.waves.cadence.phase==='main');check('wave starts while invader lives',members().length>0&&s.enemies.some(e=>e.hp>0&&e.survivalInvader));publish('Вторая волна · PASS');button.disabled=true;}
   stage++;
  }catch(error){status.textContent=`FAIL · ${error.message}`;publish('FAIL');button.disabled=true;}
 };
 publish('Ожидание первого босса');return{paused:true};
}

import {step} from '../game.js';
import {prepareSurvivalEliteReview} from './survival-elite-review.js';
import {SURVIVAL_BOSS_LIMIT,survivalBossScheduledAt} from '../systems/survival-bosses.js';
import {ignoresBossObstacles} from '../boss-traversal.js';

/** Dev-only checkpoint on the real survival map. main.js isolates review profile storage. */
export function prepareSurvivalBossReview(s,params){
 if(params.get('elite')==='1')return prepareSurvivalEliteReview(s);
 const index=Math.max(1,Math.min(SURVIVAL_BOSS_LIMIT,Number(params.get('boss'))||1));
 const scheduledAt=survivalBossScheduledAt(index);
 s.time=scheduledAt-.05;s.survivalBosses={nextAt:scheduledAt,count:index-1,rotation:[]};
 s.arms=s.arms.map(()=>null);s.health.invulnerableUntil=Infinity;
 step(s,.05);
  const boss=s.enemies.find(e=>e.survivalInvader);
 if(boss)for(let i=0;i<16;i++){
  const angle=i*Math.PI/8,x=boss.x+Math.cos(angle)*(boss.radius+7),z=boss.z+Math.sin(angle)*(boss.radius+7);
  if(s.world.walkable(x,z,2.4)){Object.assign(s.player,{x,z,y:s.world.heightAt(x,z)});break;}
 }
 const panel=document.createElement('aside');panel.id='survival-boss-review';
 panel.style.cssText='position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:120;width:min(280px,calc(var(--game-stage-width) - 24px));padding:8px;background:#14211ef0;color:#dfebe4;font:12px system-ui;text-align:center';
 const title=document.createElement('div');title.textContent=`Тестовое состояние · выживание ${scheduledAt/60} мин · ${boss?.bossName||'Нет места для босса'}`;panel.append(title);
 let paused=true;const button=document.createElement('button');button.textContent='Начать бой';button.style.cssText='min-height:44px;margin:6px;white-space:nowrap';button.onclick=()=>{paused=!paused;button.textContent=paused?'Продолжить':'Пауза';};panel.append(button);
 const report=document.createElement('output');report.style.display='block';panel.append(report);document.body.append(panel);
 return{get paused(){return paused;},tick(){if(!boss)return;const proof={time:s.time,id:boss.bossDesignId,x:boss.x,y:boss.y,z:boss.z,ground:s.world.heightAt(boss.x,boss.z),ignoresObstacles:ignoresBossObstacles(boss),blockedByScenery:!s.world.walkable(boss.x,boss.z,boss.radius),hp:boss.hp,maxHp:boss.maxHp,speed:boss.speed,armor:boss.armor,actions:boss.bossCombat.counts,nextAt:s.survivalBosses.nextAt,habitats:s.bossHabitats.length};panel.dataset.proof=JSON.stringify(proof);report.textContent=`HP ${boss.maxHp} · броня ${boss.armor} · ${Object.values(boss.bossCombat.counts).reduce((a,b)=>a+b,0)} атак`;}};
}

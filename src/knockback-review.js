import {applyEnemyHitKnockback,spawnEnemy} from './game.js';

/** Development-only scene using the same player movement and enemy models as a run. */
export function prepareKnockbackReview(s){
 s.mode='review';s.arms=[];s.enemies=[];s.exploration.groups=[];
 s.waves.credit=-1e6;s.nextElite=s.nextBoss=s.waves.nextElite=s.waves.nextBoss=Infinity;
 s.health.invulnerableUntil=Infinity;
 const home={x:s.player.x,z:s.player.z};
 const place=(kind,side)=>{
  for(const [x,z] of [[side*4,5],[side*5,3],[side*3,7],[side*7,0]]){
   const e=spawnEnemy(s,kind,{x:home.x+x,z:home.z+z},'mass',kind==='boss'?480:180);
   if(!e)continue;
   e.hp=e.maxHp=10000;e.speed=e.damage=0;e.contact=Infinity;e.shootAt=Infinity;
   if(e.enemyAttack)e.enemyAttack.readyAt=Infinity;
   if(e.bossCombat)e.bossCombat.readyAt=Infinity;
   return e;
  }
  return null;
 };
 const elite=place('elite',-1),boss=place('boss',1);
 const panel=document.createElement('aside');panel.id='knockback-review';
 panel.style.cssText='position:fixed;top:64px;left:50%;transform:translateX(-50%);z-index:120;width:min(320px,calc(var(--game-stage-width) - 16px));box-sizing:border-box;padding:8px;background:#14211ef0;color:#dfebe4;font:13px/1.35 system-ui;text-align:center';
 const title=document.createElement('div');title.textContent='Отброс героя · 0,4 с';panel.append(title);
 const actions=document.createElement('div');actions.style.cssText='display:flex;gap:8px;margin-top:7px';panel.append(actions);
 for(const [label,source] of [['Элита · 1,5 м',elite],['Босс · 4 м',boss]]){
  const button=document.createElement('button');button.textContent=label;button.disabled=!source;
  button.style.cssText='flex:1;min-width:0;min-height:44px;padding:0 5px;white-space:nowrap';
  button.onclick=()=>{applyEnemyHitKnockback(s,source,'hurt');panel.dataset.hit=source.kind;};actions.append(button);
 }
 const hint=document.createElement('div');hint.textContent='Нажми на удар и посмотри, как герой отлетает и тормозит.';hint.style.marginTop='6px';panel.append(hint);
 document.body.append(panel);
 return{tick(){panel.dataset.moving=String(!!s.playerKnockback);}};
}

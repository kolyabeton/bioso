import {createPart,stats} from './assembly.js';
import {spawnEnemy} from './game.js';

/** Live auto-attacking review scene for weapon rarity properties. */
export function prepareRarityVfxReview(s,params){
 const mode=['knockback','fury','homing','burst','stationary'].includes(params.get('effect'))?params.get('effect'):'homing';
 s.progressionLocked=true;s.time=180;s.enemies=[];s.ground=[];s.shots=[];s.hostileShots=[];
 s.waves.credit=-Infinity;s.nextElite=s.nextBoss=Infinity;
 s.world.walkable=()=>true;s.world.lineClear=()=>true;
 const weapon=createPart(s,'pistol',4);weapon.affixes=[{stat:{knockback:'doubleKnockback',fury:'woundedFury',homing:'homing',burst:'burst',stationary:'stationaryDamage'}[mode],value:mode==='knockback'?2:mode==='fury'?.3:mode==='stationary'?.25:1}];weapon.ammo=5;if(mode==='burst')weapon.affixBurstReadyAt=s.time+2;s.arms=[weapon];s.organs=[];
 s.hp=mode==='fury'?Math.floor(stats(s).hp*.4):stats(s).hp;s.health.missing=stats(s).hp-s.hp;s.health.invulnerableUntil=Infinity;
 const origin={x:s.player.x,z:s.player.z};
 const enemy=spawnEnemy(s,'normal',{x:origin.x+.8,z:origin.z+2.4},'mass',180,{promote:false});
 enemy.hp=enemy.maxHp=100000;enemy.armor=0;enemy.speed=enemy.damage=0;enemy.enemyAttack.readyAt=Infinity;
 const badge=document.createElement('output');badge.id='rarity-vfx-review-status';badge.style.cssText='position:absolute;left:10px;top:92px;z-index:30;padding:6px;background:#10271ecc;color:#eef4ee;font:11px/1.3 monospace;pointer-events:none';document.getElementById('game').append(badge);
 return{tick(){s.waves.credit=-Infinity;
  if(mode==='burst'&&weapon.affixBurstUntil&&s.time>=weapon.affixBurstUntil&&weapon.affixBurstReadyAt>s.time+2)weapon.affixBurstReadyAt=s.time+.25;
  if(mode==='homing'){enemy.x=origin.x+.8+Math.sin((s.time-180)*2)*.9;enemy.z=origin.z+2.4;}
  if(['fury','burst','stationary'].includes(mode)){enemy.x=origin.x+.8;enemy.z=origin.z+2.4;enemy.kickX=enemy.kickZ=0;}
  if(mode==='knockback'&&Math.hypot(enemy.x-origin.x,enemy.z-origin.z)>4){enemy.x=origin.x+.8;enemy.z=origin.z+2.4;enemy.kickX=enemy.kickZ=0;}
  badge.textContent=`Редкость · ${mode} · HP ${s.hp}/${stats(s).hp} · снарядов ${s.shots.length} · урон врагу ${Math.round(100000-enemy.hp)}${mode==='burst'?` · всплеск ${Math.max(0,(weapon.affixBurstUntil||0)-s.time).toFixed(1)} с`:''}${mode==='stationary'?` · без движения ${Math.min(3,s.stationaryFor||0).toFixed(1)} с`:''}`;
 }};
}

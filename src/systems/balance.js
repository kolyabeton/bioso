import {SHIELD_RECHARGE_SECONDS,REGEN_INTERVAL_SECONDS} from './health-tuning.js';
import {LOOT_RULES} from './sets-loot.js';
/** Shared simulation tuning. Times are seconds, health values are whole segments. */
export const HEALTH = Object.freeze({base:3,invulnerability:1,regenDelay:REGEN_INTERVAL_SECONDS,vampireHits:10,vampireDelay:0,shieldDelay:SHIELD_RECHARGE_SECONDS});
export const ECONOMY = Object.freeze({upgradeBase:12,upgradeStep:6,normalLoot:LOOT_RULES.normalChance,digest:[0,6,8,10,12,14],digestRarity:{common:1,uncommon:1.5,rare:2,relic:3},digestRefund:.5,tierLevels:[1,7,13,20,27]});
export const upgradeCost = ranks => ECONOMY.upgradeBase + ECONOMY.upgradeStep*ranks;
// Player-reported survival pacing target: displayed level stays near elapsed minutes.
export const XP_PICKUP_MULTIPLIER=.5;
export const xpRequired = level => {
 if(level===1)return 9;
 if(level===2)return 22;
 if(level<=21)return Math.round(18 + 10*(level-1) + .08*(level-1)**2);
 // Ease choices 22–28, then increase the cost of the long-run tail.
 return level<=28 ? 250+4*(level-21) : 278+40*(level-28);
};
export const WAVES = [
 {minute:0,rate:28,softCap:24,hp:12,elite:280,boss:2000,speed:2.15,weights:[1,0,0,0]},
 {minute:8,rate:40,softCap:34,hp:24,elite:700,boss:3200,speed:2.25,weights:[.76,.16,.08,0]},
 {minute:16,rate:55,softCap:46,hp:42,elite:1300,boss:5800,speed:2.35,weights:[.64,.18,.12,.06]},
 {minute:24,rate:72,softCap:60,hp:70,elite:2100,boss:9000,speed:2.45,weights:[.62,.2,.14,.04]},
 {minute:32,rate:92,softCap:74,hp:100,elite:3100,boss:13000,speed:2.55,weights:[.60,.2,.16,.04]},
 {minute:40,rate:118,softCap:74,hp:140,elite:4400,boss:19000,speed:2.65,weights:[.57,.22,.16,.05]},
];
export const MINUTE_SIGNATURES=Object.freeze(['mass','fast','ranged','armored','mass','flying','mixed','climax']);
export const MINUTE_BUDGET=Object.freeze([
 Object.freeze({from:0,to:10,share:.10}),
 Object.freeze({from:10,to:44,share:.65}),
 Object.freeze({from:44,to:52,share:.23}),
 Object.freeze({from:52,to:60,share:.02}),
]);
export const WAVE_RULES=Object.freeze({cap:88,eliteCap:6,pursuerCap:3,bossEvery:480,eliteStart:180,eliteEvery:90,earlyWaveEliteCount:3,earlyWaveEliteHp:.3,bossFlow:.25,bossSoftCap:.5,bossRelief:12,rewardRelief:4,projectileSpeed:5,projectileLife:3.5});
// Survival pressure is separate from legacy mission budgets and player build power.
export const SURVIVAL_PRESSURE=Object.freeze({hp:1.3,speed:1.15,rate:1,recovery:.75,introBossHp:182,introBossDamage:.5,introBossXp:6});
export const SURVIVAL_WAVE_BOSS_LEVELS=Object.freeze([
 Object.freeze({hp:1,armor:0,attack:1}),Object.freeze({hp:1.35,armor:5,attack:1.1}),Object.freeze({hp:1.8,armor:10,attack:1.2}),Object.freeze({hp:2.5,armor:15,attack:1.35}),Object.freeze({hp:3.4,armor:20,attack:1.5}),
]);
// Generated map bosses have their own fixed budgets, separate from wave/mission
// bosses. Keep the introductory encounter and the level-four starter-gear duel.
export const SURVIVAL_HABITAT_RADIUS=3.4;
export const SURVIVAL_HABITAT_BALANCE=Object.freeze([
 Object.freeze({level:1,hp:SURVIVAL_PRESSURE.introBossHp,damage:SURVIVAL_PRESSURE.introBossDamage,armor:20,speed:1.68,recovery:1}),
 Object.freeze({level:8,hp:1800,damage:2,armor:25,speed:1.76,recovery:1}),
 Object.freeze({level:16,hp:4800,damage:2,armor:30,speed:1.83,recovery:1}),
 Object.freeze({level:24,hp:12500,damage:.5,armor:20,speed:1.7,recovery:1.25}),
 Object.freeze({level:30,hp:40000,damage:2,armor:35,speed:2.65,recovery:1}),
]);
// A fixed end-of-run challenge: approaching early never scales the Mother down.
// HP includes survival pressure; keep mission and timed superboss budgets separate.
export const SURVIVAL_FINAL=Object.freeze({recommendedLevel:30,hp:110000,armor:35,speed:2.65,recovery:.65,shotSpread:.2});
export const ELITE_SPEED_MULTIPLIER=1.15*1.15;
export function phaseAt(time){
 const minute=Math.max(0,time/60),i=Math.min(WAVES.length-1,Math.floor(minute/8)),a=WAVES[i],b=WAVES[Math.min(i+1,WAVES.length-1)],t=Math.min(1,(minute-a.minute)/8);
 return {...a,minuteSignature:MINUTE_SIGNATURES[Math.floor(minute)%MINUTE_SIGNATURES.length],...Object.fromEntries(['rate','hp','elite','boss','speed'].map(k=>[k,a[k]+(b[k]-a[k])*t]))};
}
export function enemyBalance(time,kind='normal',role='mass'){
 const p=phaseAt(time);
 if(kind==='elite')return{hp:p.elite*1.5,damage:1,speed:p.speed*ELITE_SPEED_MULTIPLIER,radius:1,armor:15,xp:16,role:'elite'};
 if(kind==='boss'||kind==='final')return{hp:p.boss*(kind==='final'?3.5:1.6),damage:2,speed:p.speed*.65,radius:3.4,armor:20,xp:kind==='final'?90:60,role:kind};
 const roles={flying:{hp:.45,speed:1.45*1.15,radius:.4,armor:0},mass:{hp:1,speed:1,radius:.55,armor:0},fast:{hp:.55,speed:1.3,radius:.4,armor:0},armored:{hp:2,speed:.7,radius:.8,armor:35},ranged:{hp:.8,speed:.8,radius:.5,armor:0}};
 const r=roles[role]||roles.mass;
 return{...r,hp:p.hp*r.hp,speed:p.speed*r.speed,damage:.5,xp:1,role};
}

import {SHIELD_RECHARGE_SECONDS,REGEN_INTERVAL_SECONDS} from './health-tuning.js';
import {LOOT_RULES} from './sets-loot.js';
/** Shared simulation tuning. Times are seconds, health values are whole segments. */
export const HEALTH = Object.freeze({base:3,invulnerability:.5,regenDelay:REGEN_INTERVAL_SECONDS,vampireHits:30,vampireDelay:30,shieldDelay:SHIELD_RECHARGE_SECONDS});
export const ECONOMY = Object.freeze({upgradeBase:12,upgradeStep:6,normalLoot:LOOT_RULES.normalChance,digest:[0,6,8,10,12,14],digestRarity:{common:1,uncommon:1.5,rare:2,relic:3},digestRefund:.5,tierLevels:[1,7,13,20,27]});
export const upgradeCost = ranks => ECONOMY.upgradeBase + ECONOMY.upgradeStep*ranks;
// At steady collection: ~8 / 20 / 30 selections at 8 / 24 / 40 minutes.
export const xpRequired = level => {
 if(level<=21)return Math.round(18 + 10*(level-1) + .08*(level-1)**2);
 // Ease choices 22–28, then increase the cost of the long-run tail.
 return level<=28 ? 250+4*(level-21) : 278+40*(level-28);
};
export const WAVES = [
 {minute:0,rate:48,hp:12,elite:280,boss:2000,speed:2.15,weights:[1,0,0,0]},
 {minute:8,rate:90,hp:24,elite:700,boss:3200,speed:2.25,weights:[.76,.16,.08,0]},
 {minute:16,rate:132,hp:42,elite:1300,boss:5800,speed:2.35,weights:[.64,.18,.12,.06]},
 {minute:24,rate:174,hp:70,elite:2100,boss:9000,speed:2.45,weights:[.62,.2,.14,.04]},
 {minute:32,rate:216,hp:100,elite:3100,boss:13000,speed:2.55,weights:[.60,.2,.16,.04]},
 {minute:40,rate:252,hp:140,elite:4400,boss:19000,speed:2.65,weights:[.57,.22,.16,.05]},
];
export const WAVE_RULES=Object.freeze({cap:100,bossEvery:480,eliteStart:180,eliteEvery:90,bossFlow:.5,projectileSpeed:5,projectileLife:3.5});
// Survival pressure is separate from legacy mission budgets and player build power.
export const SURVIVAL_PRESSURE=Object.freeze({hp:1.3,speed:1.15,rate:1.2,recovery:.75,introBossHp:520});
export function phaseAt(time){
 const minute=Math.max(0,time/60),i=Math.min(WAVES.length-1,Math.floor(minute/8)),a=WAVES[i],b=WAVES[Math.min(i+1,WAVES.length-1)],t=Math.min(1,(minute-a.minute)/8);
 return {...a,...Object.fromEntries(['rate','hp','elite','boss','speed'].map(k=>[k,a[k]+(b[k]-a[k])*t]))};
}
export function enemyBalance(time,kind='normal',role='mass'){
 const p=phaseAt(time);
 if(kind==='elite')return{hp:p.elite*1.5,damage:1,speed:p.speed*.85,radius:1,armor:15,xp:12,role:'elite'};
 if(kind==='boss'||kind==='final')return{hp:p.boss*(kind==='final'?3.5:1.6),damage:1,speed:p.speed*.65,radius:1.7,armor:20,xp:45,role:kind};
 const roles={flying:{hp:.45,speed:1.45,radius:.4,armor:0},mass:{hp:1,speed:1,radius:.55,armor:0},fast:{hp:.55,speed:1.3,radius:.4,armor:0},armored:{hp:2,speed:.7,radius:.8,armor:35},ranged:{hp:.8,speed:.8,radius:.5,armor:0}};
 const r=roles[role]||roles.mass;
 return{...r,hp:p.hp*r.hp,speed:p.speed*r.speed,damage:1,xp:1,role};
}

import {updateSurvivalBossDamage} from './survival-scaling.js';
/** Easy enemies retain reduced health and deal one quarter of base damage.
 * Armor is absent on easy and 30% stronger on hard. Slider values interpolate. */
export const normalizeDifficulty=value=>Number.isFinite(value)?Math.max(0,Math.min(100,value)):100;
/** Counter-matchup penalties are disabled on Easy and reach their authored
 * values only on Hard. Intermediate slider positions interpolate linearly. */
export const difficultyCounterScale=value=>normalizeDifficulty(value)/100;
export function difficultyBossDamage(value=100){const position=normalizeDifficulty(value)/50,index=Math.min(1,Math.floor(position)),anchors=[.5,1,2];return anchors[index]+(anchors[index+1]-anchors[index])*(position-index);}
export function difficultyProfile(value=100){const t=normalizeDifficulty(value)/100;return {normalCount:.4+.6*t,stats:t<=.5?.35+.8*t:.5+.5*t,damage:t<=.5?.25+t:.5+.5*t,armor:t<=.5?1.5*t:.75+1.1*(t-.5),speed:(.8+.2*t)*(t<.5?.7+.6*t:1),attackRate:t<.5?.7+.6*t:1,rest:50-30*t,growth:.5+.5*t};}
export const difficultyHardShare=value=>Math.max(0,Math.min(1,(normalizeDifficulty(value)-50)/50));
export const difficultyPlayerHealthPenalty=value=>Number.isFinite(value)?difficultyHardShare(value):0;
export const difficultyTime=(s,time)=>Math.max(0,time)*difficultyProfile(s.difficulty).growth;
export function scaleEnemyStats(s,e,{health=true}={}){const p=difficultyProfile(s.difficulty),boss=['boss','final'].includes(e.kind),bossSpeed=boss&&!e.difficultyBossSpeedApplied?1+difficultyHardShare(s.difficulty):1;if(health){e.hp=Math.max(1,e.hp*p.stats);e.maxHp=e.hp;}e.damage=boss?difficultyBossDamage(s.difficulty)*(s.recordMode&&e.endgameScaled?3:1):e.damage*p.damage;e.armor=(e.armor||0)*p.armor;e.speed*=p.speed*bossSpeed;e.difficultyAttackRate=p.attackRate*(boss?1+difficultyHardShare(s.difficulty):1);if(boss){e.difficultyBossSpeedApplied=true;e.survivalDamageScale=1;updateSurvivalBossDamage(s,e);}return e;}
export const difficultyLabel=value=>value===0?'Легко':value===100?'Сложно':value===50?'Средне':value<50?'Легче':'Сложнее';

export const difficultyNormalCount=(s,count)=>Math.max(0,Math.round(count*difficultyProfile(s.difficulty).normalCount));

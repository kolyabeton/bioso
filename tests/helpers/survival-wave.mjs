import {createRun,spawnEnemy,hurtEnemy} from '../../src/game.js';
import {tickWaves} from '../../src/systems/waves.js';
import {startNextSurvivalWave} from '../../src/systems/survival-cadence.js';
export function waveRun(seed=20260913){
 const s=createRun(undefined,'survival',seed);
 s.world={flat:true,walkable:()=>true,lineClear:()=>true,chunk:()=>({cx:0,cz:0,lair:{x:10000,z:10000}})};
 s.bossHabitats=[];s.encounters={active:null,nodes:[]};return s;
}
export const tickWave=(s,dt=0)=>tickWaves(s,dt,(...args)=>spawnEnemy(s,...args));
export function openWave(s,time=120){s.time=time;startNextSurvivalWave(s);tickWave(s);return s;}
export const members=s=>s.enemies.filter(e=>e.hp>0&&e.survivalWaveIndex===s.waves.cadence?.index&&e.survivalWavePack===s.waves.cadence?.pack);
export function clearPack(s){
 // Real death handling, including spawned descendants; never delete live mobs.
 let rounds=0;
 while(members(s).length){if(++rounds>10)throw Error('unbounded descendants');for(const e of members(s))hurtEnemy(s,e,1e12);}
 s.bossRewards=[];s.pending=0;
}
/** Fights one pack to its handover: the roster is bigger than the live cap, so killing
 * what stands on the field only streams in the rest of it. */
export function drainPack(s){
 const {index,pack,phase}=s.waves.cadence;
 const same=()=>s.waves.cadence.index===index&&s.waves.cadence.pack===pack&&s.waves.cadence.phase===phase;
 for(let rounds=0;same();rounds++){
  if(rounds>400)throw Error('pack never handed over');
  clearPack(s);if(same())tickWave(s);
 }
}
/** Fights the current wave to its end: a pack streams in more members than fit at once,
 * so keep killing what is present until the cadence hands over to the next index. */
export function nextWave(s){
 const index=s.waves.cadence.index;
 for(let rounds=0;s.waves.cadence.index===index;rounds++){
  if(rounds>200)throw Error('wave never advanced');
  if(s.waves.cadence.phase==='rest')s.time=s.waves.cadence.restUntil;else clearPack(s);
  tickWave(s);
 }
}

import {normalizeMeta} from './meta-progression.js';
import {normalizeDifficulty} from './difficulty.js';
export const survivalEscapeMass=difficulty=>Math.round(2000+40*normalizeDifficulty(difficulty));
export const SURVIVAL_BURST_AT=11;
export const SURVIVAL_ENDING_DURATION=18;
export function collectBiomass(s,amount){
 s.biomass+=amount;
 if(s.mode==='survival'){s.biomassCollected=(s.biomassCollected||0)+amount;recordBiomassScore(s);}
}
export function recordBiomassScore(s){
 if(s.mode!=='survival')return;
 s.profile.meta??=normalizeMeta();
 const score=Math.floor(s.biomassCollected||0);
 if(score>(s.profile.meta.biomassRecord||0)){s.profile.meta.biomassRecord=score;s.events.push({type:'profile-progress'});}
}
export function motherDefeated(s){
 if(s.mode!=='survival'||s.escapeQuest)return;
 s.escapeQuest={startMass:s.biomassCollected||0,goal:survivalEscapeMass(s.difficulty)};
 s.events.push({type:'notice',text:`Матка повержена. Соберите ещё ${s.escapeQuest.goal.toLocaleString('ru-RU')} биомассы: её энергия разорвёт сеть и освободит души.`});
}
export function tickEscape(s,dt){
 if(s.ending){
  if(s.ending.previewHold)return true;
  s.ending.elapsed+=dt;
  if(s.ending.elapsed>=SURVIVAL_BURST_AT&&!s.ending.exploded){s.ending.exploded=true;s.events.push({type:'blast',key:'rocket',x:s.player.x,y:(s.player.y||0)+1,z:s.player.z,radius:7});}
  if(s.ending.elapsed>=SURVIVAL_ENDING_DURATION){s.ending=null;s.won=true;s.continued=false;s.events.push({type:'victory',text:'Души свободны. Победа!'});}
  return true;
 }
 if(s.mode==='survival'&&!s.dead&&!s.won&&s.escapeQuest&&(s.biomassCollected||0)-s.escapeQuest.startMass>=s.escapeQuest.goal){s.ending={elapsed:0,exploded:false};return true;}
 return false;
}
export function rememberSurvivalBoss(s,e){
 if(s.mode!=='survival'||!['boss','final'].includes(e.kind))return;
 const archive=s.endgameBosses??=[];
 const key=e.endgameKey||e.id;
 if(!archive.some(q=>q.key===key)){const template=structuredClone({...e,hp:e.maxHp});if(e.endgameScaled){template.hp/=3;template.maxHp/=3;template.damage/=3;}archive.push({key,template,nextAt:Infinity});}
 const entry=archive.find(q=>q.key===key);entry.nextAt=s.recordMode?s.time+60:Infinity;
}
export function continueForRecord(s){
 if(s.mode!=='survival'||s.dead||!s.won||s.recordMode)return false;
 s.continued=true;s.recordMode=true;s.victoryRerollsSettled=true;
 s.survivalBosses={nextAt:s.time+60,count:0,rotation:[]};
 for(const entry of s.endgameBosses||[])entry.nextAt=s.time;
 for(const e of s.enemies)if(e.hp>0&&!e.endgameScaled){e.hp*=3;e.maxHp*=3;e.damage=(e.damage||1)*3;e.endgameScaled=true;}
 s.visitedLairs.clear();s.events.push({type:'notice',text:'Игра на рекорд · боссы и волны ×3 · события доступны снова'});
 return true;
}
export function tickRecordBosses(s){
 if(!s.recordMode||s.encounters?.active)return;
 for(const entry of s.endgameBosses||[]){
  if(s.time<entry.nextAt||s.enemies.some(e=>e.hp>0&&e.endgameKey===entry.key))continue;
  const e=structuredClone(entry.template),home=e.territory?.home||e;
  Object.assign(e,{id:++s.entityId,x:home.x,y:home.y||0,z:home.z,hp:e.maxHp*3,maxHp:e.maxHp*3,damage:(e.damage||1)*3,born:s.time,contact:0,endgameKey:entry.key,endgameScaled:true,arrivalSounded:false});
  if(e.territory)e.territory.state='idle';if(e.enemyAttack){e.enemyAttack.warning=null;e.enemyAttack.readyAt=s.time+2;}e.windup=null;
  s.enemies.push(e);const habitat=s.bossHabitats?.find(q=>q.rank===e.habitatRank);if(habitat)habitat.id=e.id;
  entry.nextAt=Infinity;
 }
}

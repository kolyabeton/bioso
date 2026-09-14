import {STORY_CUES,storyCue,storyCueRecordId} from './story-cues.js';
import {evidenceCue,thoughtCue} from './story-evidence.js';

const missionBoss=run=>run.enemies?.find(enemy=>enemy.hp>0&&enemy.bossCombat&&enemy.missionRoom===run.mission?.floors);
const survivalMother=run=>run.enemies?.find(enemy=>enemy.hp>0&&enemy.kind==='final');

export function storyCueReady(cue,run){
  if(!cue||!run)return false;
  if(cue.once&&run.profile?.meta?.storyCues?.includes(storyCueRecordId(cue)))return false;
  if(cue.mission==='global')return cue.trigger==='run-start'&&(run.time??0)>=2;
  if(cue.mission==='survival'){
    if(run.mode!=='survival')return false;
    if(cue.trigger==='survival-start')return run.time>=5;
    if(cue.trigger==='survival-pressure')return run.time>=120;
    if(cue.trigger==='survival-archive')return run.time>=300;
    if(cue.trigger?.startsWith('survival-boss-'))return (run.bosses??0)>=Number(cue.trigger.slice(-1));
    const mother=survivalMother(run);
    if(cue.trigger==='survival-final')return !!mother&&(mother.hp<mother.maxHp||mother.territory?.state==='engaged'||!mother.territory);
    if(cue.trigger==='survival-final-half')return !!mother&&mother.hp/mother.maxHp<=.5;
    return false;
  }
  if(run.mission?.id!==cue.mission)return false;
  if(cue.trigger==='mission-start')return !!run.mission.floorsState?.[0]?.entered||run.mission.currentFloor>0||run.mission.bossSpawned;
  if(cue.trigger==='mission-early')return run.mission.currentFloor>=2||run.mission.floorsState?.[1]?.state==='cleared';
  if(cue.trigger==='mission-mid')return run.mission.currentFloor>=12||run.mission.floorsState?.[11]?.state==='cleared';
  if(cue.trigger==='mission-boss')return !!missionBoss(run);
  if(cue.trigger==='mission-boss-half'){
    const boss=missionBoss(run);return !!boss&&boss.hp/boss.maxHp<=.5;
  }
  return false;
}

export function createStoryDirector(radio,{enabled=true,onRecord=()=>{}}={}){
  let currentRun=null;const seen=new Set();
  function reset(run){currentRun=run;seen.clear();radio.clear();}
  function tick(run){
    if(!enabled)return;
    if(run!==currentRun)reset(run);
    if(run.dead||run.pending||run.bossRewards?.length||run.won&&!run.continued)return;
    for(const cue of STORY_CUES)if(!seen.has(cue.id)&&storyCueReady(cue,run)){seen.add(cue.id);radio.enqueue(cue);onRecord(cue);}
  }
  function play(id,options){const cue=storyCue(id);return cue?radio.show(cue,options):false;}
  function discover(evidence){
    if(!enabled||!evidence)return false;const clue=evidenceCue(evidence);if(seen.has(clue.id))return false;
    seen.add(clue.id);radio.enqueue(clue);const reflection=thoughtCue(evidence);if(reflection){seen.add(reflection.id);radio.enqueue(reflection);}return true;
  }
  return{reset,tick,play,discover,get seen(){return[...seen];}};
}

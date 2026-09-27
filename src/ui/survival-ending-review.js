import {pendingLoads,frameWork} from '../frame-work.js';
import {hurtEnemy} from '../game.js';
import {collectBiomass} from '../systems/survival-endgame.js';
/** Deterministic real-route review: Mother death -> earned quest -> timed ending. */
export function prepareSurvivalEndingReview(s,params,ui){
 const mother=s.enemies.find(e=>e.kind==='final');hurtEnemy(s,mother,1e9);
 s.bossRewards=[];s.pending=0;s.choices=[];s.enemies=[];
 collectBiomass(s,10000);
 const stage=params.get('stage');
 s.ending={elapsed:stage==='victory'?17.9:stage==='growth'?8:stage==='burst'?12.2:0,exploded:['victory','burst'].includes(stage),previewHold:true};
 const frozen=['growth','burst'].includes(stage);let readyAt=0,replayAt=0;
 return {tick(){
  if(frozen)return;
  if(s.ending?.previewHold){
   const tile=s.world.tileAt(s.player.x,s.player.z);
   if(!s.streaming?.ready?.has(tile?.id)){readyAt=0;return;}
   readyAt||=performance.now();const waited=performance.now()-readyAt;
   if(waited>1000&&(!pendingLoads()&&!frameWork.info().preparationQueued||waited>12000))s.ending.previewHold=false;
  }
  if(s.won&&!s.continued&&ui.screen==='end'&&params.get('loop')==='1'){
   replayAt||=performance.now();if(performance.now()-replayAt<2000)return;
   s.won=false;s.continued=false;s.ending={elapsed:0,exploded:false};ui.close();replayAt=0;
  }
 }};
}

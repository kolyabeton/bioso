import {createPart} from './assembly.js';
import {step} from './game.js';
import {survivalPressureProfile} from './systems/balance.js';

const REVIEW_AT=15*60;

/** DEV/acceptance fixture. Uses the real Survival director, enemies and renderer. */
export function prepareSurvivalPressureReview(params,{getRun,start}){
 const requested=params.get('build')==='swarm'?'swarm':'ranged';
 start('survival',20260915);
 const s=getRun();
 s.health.invulnerableUntil=Infinity;s.progressionLocked=true;s.pending=0;s.bossRewards=[];s.enemies=[];
 s.survivalBosses={nextAt:Infinity,count:0,rotation:[]};s.survivalElites={nextAt:Infinity,count:0};
 s.arms=s.arms.map((_,index)=>createPart(s,requested==='swarm'?'drone':index?'pistol':'seed',5));
 s.time=REVIEW_AT-.05;step(s,.05);
 const squad=s.enemies.filter(enemy=>enemy.survivalResponseIndex===0),leader=squad.find(enemy=>enemy.survivalResponseLeader);
 const positions=[[-2.6,-6.8],[2.6,-7.3],[0,-9.2]];
 squad.forEach((enemy,index)=>{const [x,z]=positions[index]??[index*1.8,-9];Object.assign(enemy,{x:s.player.x+x,z:s.player.z+z,y:s.world.heightAt?.(s.player.x+x,s.player.z+z)??0});delete enemy.summonAssembly;});
 if(requested==='swarm'){
  step(s,.05);
  s.abilities.companions.forEach((companion,index)=>Object.assign(companion,{x:s.player.x+(index?1.1:-1.1),y:s.player.y??0,z:s.player.z-3.5,hover:1.5,phase:'escort'}));
  if(leader){Object.assign(leader,{x:s.player.x,z:s.player.z-5,y:s.world.heightAt?.(s.player.x,s.player.z-5)??0,speed:0});step(s,.01);}
 }
 const pressure=survivalPressureProfile(30*60),panel=document.createElement('aside');panel.id='survival-pressure-review';panel.translate=false;
 panel.style.cssText='position:fixed;left:12px;bottom:86px;z-index:120;background:#10251ff2;color:#e4f4ec;padding:12px;max-width:360px;font:13px/1.5 system-ui;border:1px solid #739884';
 const title=document.createElement('strong');title.textContent=`15:00 · Ответ среды: ${requested==='swarm'?'охотник на рой':'щитоносец и фланкеры'}`;
 const detail=document.createElement('div');detail.textContent=requested==='swarm'?'Охотник ведёт 0,8-секундное наведение на один дрон.':'Элитный щитоносец прикрывает быстрых бойцов.';
 const metrics=document.createElement('div');metrics.style.cssText='margin-top:6px;color:#b9d4c5';metrics.textContent=`30:00 · враги ×${pressure.count.toFixed(2)} · живой лимит ×${pressure.live.toFixed(2)} · урон ×${pressure.damage.toFixed(2)}`;
 panel.append(title,detail,metrics);document.body.append(panel);
 const proof={method:'Actual Survival response director, spawned enemies, player loadout and renderer.',build:requested,time:s.time,response:s.survivalResponse,squad:squad.map(enemy=>({id:enemy.id,recipeId:enemy.recipeId,kind:enemy.kind,specialty:enemy.specialty,leader:!!enemy.survivalResponseLeader})),companions:s.abilities.companions.map(companion=>({id:companion.id,source:companion.sourceKey})),pressureAt30:pressure};
 panel.dataset.proof=JSON.stringify(proof);let saving=false,saved=false,captureAfter=performance.now()+12000;
 return{paused:true,afterRender(){
  if(saved||saving||performance.now()<captureAfter)return;saving=true;
  document.querySelector('#world').toBlob(async blob=>{try{
   const base='http://127.0.0.1:4191/__survival-pressure-proof/'+requested;
   const [image,metadata]=await Promise.all([fetch(base+'.png',{method:'POST',body:blob}),fetch(base+'.json',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(proof,null,2)})]);
   if(!image.ok||!metadata.ok)throw Error('Proof server unavailable');saved=true;document.body.dataset.survivalPressureProof='saved';
  }catch(error){document.body.dataset.survivalPressureProof='failed';document.body.dataset.survivalPressureProofError=error.message;}finally{saving=false;}},'image/png');
 }};
}

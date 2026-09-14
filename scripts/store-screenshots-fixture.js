// Staged media checkpoints using the current game renderer and actual assets.
// Loaded only by store-screenshots-server.mjs; never part of a release build.
import {createPart,stats} from '../src/assembly.js';
import {CATALOG} from '../src/catalog.js';
import {spawnEnemy,step} from '../src/game.js';
import {prepareBossRuntimeReview} from '../src/boss-runtime-review.js';
import {environmentId} from '../src/environment-profiles.js';

export function preparePress(s,q,ui,snapshot){
 const scene=q.get('scene')||'battle',body=q.get('body')||'rootwalker';
 if(scene==='boss'){
  prepareBossRuntimeReview(s);
  document.querySelector('#boss-runtime-review')?.remove();
 }else if(s.mode==='survival'){
  const tile=s.world.tiles.find(t=>environmentId(t)===(q.get('environment')||'root-forest')&&t.kind!=='transition');
  if(tile){const x=tile.x+14,z=tile.z+4;Object.assign(s.player,{x,z,y:s.world.heightAt(x,z)||0});}
  s.enemies=[];
 }else{Object.assign(s.player,{x:0,z:0,y:0});step(s,0);}
 s.body=createPart(s,body,4);
 const d=CATALOG[body],weapons=(q.get('weapons')||'rocket,harpoon,claws,arc').split(',');
 s.arms=Array.from({length:d.arms},(_,i)=>createPart(s,weapons[i%weapons.length],2));
 s.legs=Array.from({length:d.legs},(_,i)=>createPart(s,i%2?'plated':'universal',2));
 s.organs=Array.from({length:d.organs},(_,i)=>createPart(s,['regen','shield','accelerator','digestion'][i%4],2));
 s.inventory=[];s.ground=[];s.biomass=246;s.level=18;s.kills=387;s.time=scene==='boss'?1104:742;
 s.abilities.learned=['might.0','tempo.0','projectiles.0','vitality.0'];
 s.abilities.levels=Object.fromEntries(s.abilities.learned.map(id=>[id,2]));
 s.hp=stats(s).hp;s.health.invulnerableUntil=Infinity;s.pending=0;s.progressionLocked=true;
 if(scene==='battle'){
  s.enemies=[];
  const count=Number(q.get('count'))||52;
  for(let i=0;i<count;i++){
   const angle=i*2.399963,ring=4+Math.sqrt(i/count)*12;
   spawnEnemy(s,'normal',{x:s.player.x+Math.cos(angle)*ring*.64,z:s.player.z+Math.sin(angle)*ring},['mass','fast','armored','ranged','flying'][i%5],742);
  }
  if(s.mission){const floor=s.mission.floorsState[s.mission.currentFloor];floor.members=s.enemies.map(e=>e.id);for(const e of s.enemies)e.missionRoom=s.mission.currentFloor+1;}
  for(let i=0;i<6;i++)step(s,.05);
  s.events=[];s.pending=0;
 }
 if(scene==='assembly')ui.open('assembly');
 const report=document.createElement('script');report.type='application/json';report.id='press-capture-proof';document.body.append(report);
 return{paused:true,tick(){const info=snapshot();report.textContent=JSON.stringify({method:'Staged in-engine screenshot; granted loadout, progress and population; frozen simulation; unmodified production renderer and UI.',route:location.href,viewport:{width:innerWidth,height:innerHeight},scene,...info});}};
}

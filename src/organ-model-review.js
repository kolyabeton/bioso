import {BODIES,ORGANS} from './catalog.js';
import {createPart,stats} from './assembly.js';

// DEV/acceptance route: the real assembly preview, equipment and pickup renderer.
export function prepareOrganModelReview(s,params,ui,setInput){
 const keys=(params.get('organs')||'parasite,slime,repairGland').split(',').filter(key=>Object.hasOwn(ORGANS,key));
 const body=Object.hasOwn(BODIES,params.get('body'))?params.get('body'):'bastion',meta=BODIES[body];
 s.body=createPart(s,body);s.arms=Array(meta.arms).fill(null);s.arms[0]=createPart(s,'pistol');
 s.legs=Array.from({length:meta.legs},()=>createPart(s,'universal'));
 s.organs=Array.from({length:Math.max(meta.organs,keys.length)},(_,i)=>keys[i]?createPart(s,keys[i]):null);
 s.inventory=[];s.enemies=[];s.hostileShots=[];s.progressionLocked=true;s.health.invulnerableUntil=Infinity;
 s.nextElite=s.nextBoss=s.waves.nextElite=s.waves.nextBoss=Infinity;s.waves.credit=-Infinity;
 s.encounters={active:null,nodes:[]};s.hp=stats(s).hp;s.biomass=100;
 const start={...s.player};
 s.ground=keys.map((key,i)=>{const x=start.x+(i-(keys.length-1)/2)*3,z=start.z+5;return{id:++s.entityId,part:createPart(s,key),x,z,y:s.world.heightAt?.(x,z)??0};});
 const report=document.createElement('script');report.id='organ-model-review-report';report.type='application/json';document.body.append(report);
 if(params.get('screen')==='assembly')ui.open('assembly');
 const pickup=params.get('pickup')==='1';
 return{get paused(){return pickup?s.time>=4:params.get('live')!=='1';},tick(){
  s.waves.credit=-Infinity;
  if(pickup)setInput({x:0,z:s.time>=1&&s.time<4&&s.player.z<start.z+5?.4:0});
  report.textContent=JSON.stringify({...window.bioso?.snapshot(),groundItems:s.ground.map(q=>({key:q.part.key,id:q.part.id})),inventoryItems:s.inventory.map(p=>({key:p.key,id:p.id}))});
 }};
}

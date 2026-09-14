import {createPart} from './assembly.js';
// DEV/acceptance-only authored secret-model showcase on the real game stage.
export function prepareSecretGlbReview(s){
 const generatedSecrets=s.encounters.nodes.filter(n=>['membrane','slab','nursery'].includes(n.type)).length;
 const params=new URLSearchParams(location.search),state=params.get('state')==='reward'?'reward':'ready';
 s.progressionLocked=true;s.enemies=[];s.ground=[];s.nextElite=s.nextBoss=s.waves.nextElite=s.waves.nextBoss=Infinity;s.waves.credit=-Infinity;s.health.invulnerableUntil=Infinity;
 const y=(x,z)=>s.world.heightAt?.(x,z)??0,origin=s.player;
 s.encounters={active:null,nodes:[
  {id:'proof-membrane',type:'membrane',state,discovered:true,x:origin.x-4.4,y:y(origin.x-4.4,origin.z+5.2),z:origin.z+5.2,radius:1.4,rewards:['regen']},
  {id:'proof-slab',type:'slab',state,discovered:true,x:origin.x,y:y(origin.x,origin.z+7),z:origin.z+7,radius:1.4,rewards:['shield']},
  {id:'proof-nursery',type:'nursery',state,discovered:true,x:origin.x+4.4,y:y(origin.x+4.4,origin.z+5.2),z:origin.z+5.2,radius:1.4,rewards:['seed']},
 ]};
 const tool=params.get('tool');if(['acid','hammer','drill','arc','seed'].includes(tool))s.arms=[createPart(s,tool),null];
 const focus=params.get('secret');if(['membrane','slab','nursery'].includes(focus)){s.encounters.nodes=s.encounters.nodes.filter(n=>n.type===focus);Object.assign(s.encounters.nodes[0],{x:origin.x,z:origin.z+(tool?1.5:5.2),y:y(origin.x,origin.z+(tool?1.5:5.2))});}
 const report=document.createElement('script');report.id='secret-review-report';report.type='application/json';document.body.append(report);
 const badge=document.createElement('output');badge.style.cssText='position:absolute;left:10px;right:10px;top:88px;z-index:30;padding:8px;border:1px solid #a68059;background:#102019e8;color:#eef3e9;font:600 11px/1.4 system-ui;text-align:center;pointer-events:none';badge.textContent='СЕКРЕТЫ · '+generatedSecrets+' НА КАРТЕ';document.getElementById('game').append(badge);
 return{get paused(){return false;},tick(){s.waves.credit=-Infinity;const info=window.bioso?.snapshot();report.textContent=JSON.stringify({generatedSecrets,state,mode:s.mode,enemies:s.enemies.length,arms:s.arms.map(p=>p?.key),nodes:s.encounters.nodes.map(n=>({type:n.type,state:n.state,x:n.x,y:n.y,z:n.z})),loadedModels:info?.loadedModels,failedModels:info?.failedModels,fps:info?.fps,triangles:info?.triangles});}};
}

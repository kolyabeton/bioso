import {missionGateClosed,missionGateZ} from './mission-environment.js';

const BEDS={
 'root-forest':{gain:.075,cutoff:4200},
 'brood-nursery':{gain:.055,cutoff:1250},
};
const MECHANISMS={
 'garden-pump':{environment:'upper-gardens',gain:.105,near:4,far:20,cutoff:2100,models:new Set(['environment-garden-irrigator-v1','environment-garden-basin-v1'])},
 'scrap-turbine':{environment:'quiet-scrapyard',gain:.09,near:5,far:22,cutoff:3600,models:new Set(['environment-scrap-megaturbine-v1','environment-scrap-turbine-v1','environment-scrap-engine-v2'])},
};
const WORLD_KEYS=[...Object.keys(BEDS),...Object.keys(MECHANISMS),'mission-gate'];

const setTarget=(parameter,value,now,time=.35)=>{
 if(parameter.setTargetAtTime)parameter.setTargetAtTime(value,now,time);
 else if(parameter.setValueAtTime)parameter.setValueAtTime(value,now);
 else parameter.value=value;
};
const disconnect=node=>{try{node?.disconnect();}catch{}};
const halt=source=>{try{source?.stop();}catch{}};
const distanceGain=(distance,near,far)=>distance>=far?0:distance<=near?1:1-(distance-near)/(far-near);

/** Approved world recordings routed through the existing combat context/master. */
export function createForestAudio(context,master,{load=async()=>null}={}){
 const buffers=new Map(),pending=new Set(),beds=new Map();
 let state={},world=null,emitters=[],mechanism=null,gateMission=null,gateStates=[];

 function request(key){
  if(buffers.has(key)||pending.has(key))return;
  pending.add(key);
  Promise.resolve().then(()=>load(key)).then(buffer=>{if(buffer)buffers.set(key,buffer);}).catch(()=>{}).finally(()=>pending.delete(key));
 }
 function makeLoop(key,{gain:level,cutoff}){
  const buffer=buffers.get(key);if(!buffer)return null;
  const source=context.createBufferSource(),gain=context.createGain(),filter=context.createBiquadFilter?.();
  source.buffer=buffer;source.loop=true;gain.gain.value=0;
  if(filter){filter.type='lowpass';filter.frequency.value=cutoff;source.connect(filter).connect(gain).connect(master);}
  else source.connect(gain).connect(master);
  source.start();
  return{key,source,gain,filter,level,stop(){halt(source);disconnect(source);disconnect(filter);disconnect(gain);}};
 }
 function ensureBeds(){
  for(const [key,cfg] of Object.entries(BEDS))if(!beds.has(key)){const voice=makeLoop(key,cfg);if(voice)beds.set(key,voice);}
 }
 function cacheEmitters(nextWorld){
  if(world===nextWorld)return;
  world=nextWorld;emitters=[];
  for(const tile of nextWorld?.tiles||[])for(const item of tile.decorations||[])for(const [key,cfg] of Object.entries(MECHANISMS))if(cfg.models.has(item.model)){
   emitters.push({key,x:item.x,z:item.z});break;
  }
 }
 function nearestMechanism(player,weights){
  let nearest=null;
  for(const emitter of emitters){
   const cfg=MECHANISMS[emitter.key],weight=weights[cfg.environment]||0;if(weight<=.01)continue;
   const distance=Math.hypot((player?.x||0)-emitter.x,(player?.z||0)-emitter.z),score=cfg.gain*weight*distanceGain(distance,cfg.near,cfg.far);
   if(score>0&&(!nearest||score>nearest.score))nearest={...emitter,distance,weight,score};
  }
  return nearest;
 }
 function stopMechanism(){if(mechanism){mechanism.stop();mechanism=null;}}
 function updateMechanism(player,weights,combat){
  const nearest=nearestMechanism(player,weights);
  if(!nearest){stopMechanism();return;}
  const cfg=MECHANISMS[nearest.key];
  if(mechanism?.key!==nearest.key){stopMechanism();mechanism=makeLoop(nearest.key,cfg);}
  if(!mechanism)return;
  const level=cfg.gain*nearest.weight*distanceGain(nearest.distance,cfg.near,cfg.far)*(combat?.55:1);
  setTarget(mechanism.gain.gain,level,context.currentTime,.2);
 }
 function playGate(distance){
  const buffer=buffers.get('mission-gate');if(!buffer)return;
  const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;
  gain.gain.value=.28*(1-Math.min(1,distance/45)*.45);source.connect(gain).connect(master);
  source.onended=()=>{disconnect(source);disconnect(gain);};source.start();
 }
 function syncGates(mission,player,audible){
  if(!mission){gateMission=null;gateStates=[];return;}
  const count=Math.max(0,(mission.floors||0)-1),current=Array.from({length:count},(_,i)=>missionGateClosed(mission,i));
  if(gateMission===mission&&audible)for(let i=0;i<count;i++)if(gateStates[i]===true&&current[i]===false){
   const distance=Math.hypot(player?.x||0,(player?.z||0)-missionGateZ(i));if(distance<=45)playGate(distance);
  }
  gateMission=mission;gateStates=current;
 }
 function stopVoices(){for(const voice of beds.values())voice.stop();beds.clear();stopMechanism();}
 function update(value={}){
  state=value;for(const key of WORLD_KEYS)request(key);
  const audible=value.active!==false&&!value.paused;
  syncGates(value.mission,value.player,audible);
  if(!audible){stopVoices();return;}
  const weights=value.weatherBlend||{...(value.active?{'root-forest':1}:{})};
  ensureBeds();
  for(const [key,voice] of beds){const weight=weights[key]||0,level=voice.level*weight*(value.combat?.35:1);setTarget(voice.gain.gain,level,context.currentTime,.6);}
  cacheEmitters(value.world);updateMechanism(value.player,weights,value.combat);
 }
 function stop(){syncGates(state.mission,state.player,false);stopVoices();}
 return{update,stop,info:()=>({beds:[...beds.keys()],mechanism:mechanism?.key||null,loaded:[...buffers.keys()]})};
}

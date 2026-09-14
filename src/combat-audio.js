const SOUNDS={hit:[210,125,.045,'triangle',.022],'player-hit':[95,42,.23,'sawtooth',.065],'reload-start':[320,660,.11,'triangle',.035],experience:[900,1350,.055,'sine',.018],danger:[440,180,.3,'square',.032],'fuse-start':[280,580,.25,'square',.032]};
import {createAudioFeedback} from './ui/audio-feedback.js';
import {createForestAudio} from './forest-audio.js';
const GUN_KEYS=new Set(['pistol','seed','shotgun','needle']);
const UI_KEYS=new Set(['click','open','close','confirm','deny','organic','mechanical','pickup']);
const MAX_SHOTS=8;
const EFFECTS={
  hammer:{file:'shield',gain:.32,voices:3},
  claws:{file:'claws',gain:.28,voices:4},
  drill:{file:'drill',gain:.22,voices:2},
  harpoon:{file:'harpoon',gain:.32,voices:4},
  arc:{file:'electric',gain:.28,voices:3,interval:.075},
  rocket:{file:'rocket',gain:.28,voices:3,interval:.06},
  ...Object.fromEntries([...UI_KEYS].map(key=>[`ui-${key}`,{file:`ui-${key}`,gain:key==='click'?.18:.25,voices:2,interval:key==='pickup'?.08:.04}])),
};
const MAX_EFFECTS=12;

export function createCombatAudio(volume,{
  shotUrl='/assets/audio/approved-pistol.mp3',
  effectBaseUrl=shotUrl.slice(0,shotUrl.lastIndexOf('/')+1),
  createContext=()=>new (window.AudioContext||window.webkitAudioContext)(),
  loadShot=async context=>{
    const response=await fetch(shotUrl);
    if(!response.ok)throw new Error(`Gunshot: ${response.status}`);
    return context.decodeAudioData(await response.arrayBuffer());
  },
  loadEffect=async(context,key)=>{
    const response=await fetch(`${effectBaseUrl}approved-${EFFECTS[key].file}.wav`);
    if(!response.ok)throw new Error(`Sound ${key}: ${response.status}`);
    return context.decodeAudioData(await response.arrayBuffer());
  },
}={}){
  let context,master,shotBuffer,loading;
  const last=new Map(),shots=new Set();
  const buffers=new Map(),pending=new Set(),effects=new Set(),effectTimes=new Map();
  const feedback=createAudioFeedback(cue=>event({type:'ui',cue}));
  function ui(cue='click'){unlock();feedback(cue);}
  function syncVolume(){if(master)master.gain.setValueAtTime(Math.max(0,Math.min(100,volume()))/100,context.currentTime);}
  function unlock(){
    if(!volume())return;
    try{
      if(!context){context=createContext();master=context.createGain();master.connect(context.destination);}
      syncVolume();
      if(context.state==='suspended')context.resume().catch(()=>{});
      if(!shotBuffer&&!loading)loading=loadShot(context).then(buffer=>{shotBuffer=buffer;}).catch(()=>{}).finally(()=>{loading=null;});
      for(const key of Object.keys(EFFECTS))if(!buffers.has(key)&&!pending.has(key)){
        pending.add(key);
        Promise.resolve().then(()=>loadEffect(context,key)).then(buffer=>buffers.set(key,buffer)).catch(()=>{}).finally(()=>pending.delete(key));
      }
    }catch{/* Audio support or loading must not block combat. */}
  }
  function playEffect(key,event){
    const cfg=EFFECTS[key],buffer=buffers.get(key);if(!buffer)return;
    const now=context.currentTime;
    if(cfg.interval&&now-(effectTimes.get(key)??-10)<cfg.interval)return;
    effectTimes.set(key,now);
    // A fast contact weapon renews its own motor burst, without accumulating loops.
    if(key==='drill')for(const voice of [...effects])if(voice.key===key&&voice.owner===event.source)voice.stop();
    const same=[...effects].filter(v=>v.key===key);
    if(same.length>=cfg.voices)same[0].stop();
    if(effects.size>=MAX_EFFECTS)effects.values().next().value.stop();
    const source=context.createBufferSource(),gain=context.createGain();
    source.buffer=buffer;gain.gain.value=cfg.gain;
    source.connect(gain).connect(master);
    let ended=false,stopping=false;
    const voice={key,owner:event.source,stop(){
      if(ended||stopping)return;stopping=true;effects.delete(voice);
      const at=context.currentTime;
      gain.gain.setValueAtTime(gain.gain.value,at);
      gain.gain.linearRampToValueAtTime(0,at+.012);
      source.stop(at+.012);
    }};
    function cleanup(){if(ended)return;ended=true;effects.delete(voice);source.disconnect();gain.disconnect();}
    source.onended=cleanup;effects.add(voice);source.start();
  }
  function playShot(){
    if(!shotBuffer)return;
    if(shots.size>=MAX_SHOTS){const oldest=shots.values().next().value;oldest.stop();oldest.onended();}
    const source=context.createBufferSource(),gain=context.createGain();
    source.buffer=shotBuffer;gain.gain.value=.25;
    source.connect(gain).connect(master);shots.add(source);
    source.onended=()=>{shots.delete(source);source.disconnect();gain.disconnect();};
    source.start();
  }
  function event(e){
    if(!context||!volume())return;
    syncVolume();
    if(e.type==='ui'||e.type==='pickup'){
      const cue=e.type==='pickup'?'pickup':e.cue;
      if(UI_KEYS.has(cue))try{playEffect(`ui-${cue}`,e);}catch{}
      return;
    }
    if(e.type==='attack'){
      if(GUN_KEYS.has(e.key))try{playShot();}catch{}
      else if(EFFECTS[e.key]&&e.key!=='arc'&&e.key!=='rocket')try{playEffect(e.key,e);}catch{}
      return;
    }
    // Arc links share a brief cooldown; rockets sound at impact, never at launch.
    if(e.type==='arc'||(e.type==='blast'&&e.key==='rocket')){
      try{playEffect(e.type==='arc'?'arc':'rocket',e);}catch{}
      return;
    }
    const cfg=SOUNDS[e.type];if(!cfg)return;
    const now=context.currentTime;
    if(now-(last.get(e.type)??-10)<(e.type==='hit'?.055:.1))return;
    last.set(e.type,now);
    try{
      const [from,to,length,wave,level]=cfg,o=context.createOscillator(),g=context.createGain();
      o.type=wave;o.frequency.setValueAtTime(from,now);o.frequency.exponentialRampToValueAtTime(to,now+length);
      g.gain.setValueAtTime(level,now);g.gain.exponentialRampToValueAtTime(.0001,now+length);
      o.connect(g).connect(master);o.start(now);o.stop(now+length);
      o.onended=()=>{o.disconnect();g.disconnect();};
    }catch{}
  }
  let atmosphere;
  function updateAmbient(value){if(!context)return;if(!volume()){atmosphere?.stop();return;}atmosphere??=createForestAudio(context,master);atmosphere.update(value);}
  return{unlock,event,syncVolume,ui,updateAmbient};
}

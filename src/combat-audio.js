const SOUNDS={hit:[210,125,.045,'triangle',.022],'player-hit':[95,42,.23,'sawtooth',.065],experience:[900,1350,.055,'sine',.018],danger:[440,180,.3,'square',.032],'fuse-start':[280,580,.25,'square',.032]};
import {createAudioFeedback} from './ui/audio-feedback.js';
import {createForestAudio} from './forest-audio.js';
const GUN_KEYS=new Set(['pistol','seed','shotgun','needle']);
const RELOAD_SOUND_KEYS=new Set(['needle','shotgun','rocket']);
const UI_KEYS=new Set(['click','open','close','confirm','deny','organic','mechanical','pickup']);
const MAX_SHOTS=8;
const EFFECTS={
  hammer:{file:'shield',gain:.32,voices:3},
  claws:{file:'claws',gain:.28,voices:4},
  drill:{file:'drill',gain:.22,voices:2},
  harpoon:{file:'harpoon',gain:.32,voices:4},
  acid:{file:'acid-wash',gain:.3,voices:3,interval:.08},
  'symbiont-bite':{file:'symbiont-bite',gain:.27,voices:4,interval:.065},
  dodge:{file:'dodge',gain:.33,voices:3,interval:.06},
  'spring-leap':{file:'spring-leap',gain:.55,voices:2,interval:.15},
  'drone-death':{file:'drone-death',gain:.28,voices:4,interval:.05},
  sporebrood:{file:'sporebrood',gain:.32,voices:3,interval:.1},
  overgrowth:{file:'overgrowth',gain:.3,voices:2,interval:.2},
  revive:{file:'revive',gain:.42,voices:2,interval:.25},
  'heart-pulse':{file:'heart-discharge',gain:.36,voices:2,interval:.3},
  'challenge-result':{file:'challenge-result',gain:.3,voices:1,interval:.25},
  'level-up':{file:'level-up',gain:.34,voices:1,interval:.45},
  'player-step':{file:'player-step',gain:.22,voices:2,interval:.12},
  'shield-block':{file:'shield-block',gain:.38,voices:3,interval:.06},
  'player-death':{file:'player-death',gain:.42,voices:1,interval:.8},
  'boss-arrival':{file:'boss-arrival',gain:.38,voices:1,interval:1.5},
  'boss-phase':{file:'boss-phase',gain:.42,voices:1,interval:1.5},
  'boss-swarm':{file:'boss-swarm',gain:.32,voices:2,interval:.3},
  'boss-heavy-slam':{file:'boss-heavy-slam',gain:.42,voices:3,interval:.1},
  'boss-root-eruption':{file:'boss-root-eruption',gain:.38,voices:2,interval:.1},
  'boss-heavy-sweep':{file:'boss-heavy-sweep',gain:.36,voices:3,interval:.08},
  'weapon-reload':{file:'weapon-reload',gain:.119,voices:2,interval:.08},
  'enemy-wasp-volley':{file:'enemy-wasp-volley',gain:.3,voices:3,interval:.08},
  'enemy-wet-cast':{file:'enemy-wet-cast',gain:.38,voices:3,interval:.1},
  unlock:{file:'unlock',gain:.34,voices:2,interval:.25},
  'group-cleared':{file:'group-cleared',gain:.36,voices:2,interval:.2},
  'lore-found':{file:'lore-found',gain:.3,voices:2,interval:.3},
  'important-death':{file:'important-death',gain:.38,voices:3,interval:.12},
  arc:{file:'electric',gain:.4,voices:3,interval:.075},
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
    const effect=EFFECTS[key],prefix=effect.generated?'generated-':'approved-';
    const response=await fetch(`${effectBaseUrl}${prefix}${effect.file}.wav`);
    if(!response.ok)throw new Error(`Sound ${key}: ${response.status}`);
    return context.decodeAudioData(await response.arrayBuffer());
  },
  loadWorld=async(context,key)=>{
    const response=await fetch(`${effectBaseUrl}approved-world-${key}.wav`);
    if(!response.ok)throw new Error(`World sound ${key}: ${response.status}`);
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
    source.buffer=buffer;gain.gain.value=key==='challenge-result'&&event.result==='failed'?.27:cfg.gain;
    if(key==='challenge-result'&&event.result==='failed'&&source.playbackRate)source.playbackRate.value=.84;
    if(key==='player-step'&&source.playbackRate)source.playbackRate.value=(event.step||0)%2?.99:1.01;
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
      else if(EFFECTS[e.key]&&e.key!=='rocket')try{playEffect(e.key,e);}catch{}
      return;
    }
    if(e.type==='summon-attack'){
      try{playEffect('symbiont-bite',e);}catch{}
      return;
    }
    if(e.type==='dodge'||e.type==='spring-leap'){
      try{playEffect(e.type,e);}catch{}
      return;
    }
    if(e.type==='summon-death'){
      try{playEffect('drone-death',e);}catch{}
      return;
    }
    if(e.type==='ability-impact'&&e.kind==='sporebrood'){
      try{playEffect('sporebrood',e);}catch{}
      return;
    }
    if(e.type==='soul-proc'&&(e.kind==='overgrowth'||e.kind==='revive')){
      try{playEffect(e.kind,e);}catch{}
      return;
    }
    if(e.type==='heart-pulse'||e.type==='challenge-result'){
      try{playEffect(e.type,e);}catch{}
      return;
    }
    if(['level-up','player-step','player-death','boss-arrival','boss-phase'].includes(e.type)){
      try{playEffect(e.type,e);}catch{}
      return;
    }
    if(e.type==='reload-start'&&RELOAD_SOUND_KEYS.has(e.key)){
      try{playEffect('weapon-reload',e);}catch{}
      return;
    }
    if(e.type==='shield'&&e.kind!=='health-invulnerability'){
      try{playEffect('shield-block',e);}catch{}
      return;
    }
    const bossAction=e.type==='boss-action'?e.action:e.type==='enemy-strike'?e.bossAction:null;
    if(['swarm','bees'].includes(bossAction)){
      try{playEffect('boss-swarm',e);}catch{}
      return;
    }
    if(['slam','root-slam','crush','hunter-pounce','ground-claws'].includes(bossAction)){
      try{playEffect('boss-heavy-slam',e);}catch{}
      return;
    }
    if(bossAction==='roots'){
      try{playEffect('boss-root-eruption',e);}catch{}
      return;
    }
    if(['cleave','reaping-sweep','drill-sweep','brood-sweep'].includes(bossAction)){
      try{playEffect('boss-heavy-sweep',e);}catch{}
      return;
    }
    if(['hunter-volley','hive-volley','needle-line','needle-fan','needle-rain'].includes(bossAction)){
      try{playEffect('enemy-wasp-volley',e);}catch{}
      return;
    }
    if(['brood-ring','acid-bloom','vine-sweep'].includes(bossAction)){
      try{playEffect('enemy-wet-cast',e);}catch{}
      return;
    }
    if(['unlock','group-cleared','lore-found'].includes(e.type)){
      try{playEffect(e.type,e);}catch{}
      return;
    }
    if(e.type==='destroy'||e.type==='death'&&['elite','boss','final'].includes(e.kind)){
      try{playEffect('important-death',e);}catch{}
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
  function updateAmbient(value){if(!context)return;atmosphere??=createForestAudio(context,master,{load:key=>loadWorld(context,key)});atmosphere.update(volume()?value:{...value,active:false});}
  return{unlock,event,syncVolume,ui,updateAmbient};
}

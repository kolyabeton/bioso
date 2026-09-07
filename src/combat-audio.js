const SOUNDS={hit:[210,125,.045,'triangle',.022],'player-hit':[95,42,.23,'sawtooth',.065],'reload-start':[320,660,.11,'triangle',.035],experience:[900,1350,.055,'sine',.018],danger:[440,180,.3,'square',.032],'fuse-start':[280,580,.25,'square',.032]};
const GUN_KEYS=new Set(['seed','needle']);
const MAX_SHOTS=8;

export function createCombatAudio(volume,{
  shotUrl='/assets/audio/approved-pistol.mp3',
  createContext=()=>new (window.AudioContext||window.webkitAudioContext)(),
  loadShot=async context=>{
    const response=await fetch(shotUrl);
    if(!response.ok)throw new Error(`Gunshot: ${response.status}`);
    return context.decodeAudioData(await response.arrayBuffer());
  },
}={}){
  let context,master,shotBuffer,loading;
  const last=new Map(),shots=new Set();
  function syncVolume(){if(master)master.gain.setValueAtTime(Math.max(0,Math.min(100,volume()))/100,context.currentTime);}
  function unlock(){
    if(!volume())return;
    try{
      if(!context){context=createContext();master=context.createGain();master.connect(context.destination);}
      syncVolume();
      if(context.state==='suspended')context.resume().catch(()=>{});
      if(!shotBuffer&&!loading)loading=loadShot(context).then(buffer=>{shotBuffer=buffer;}).catch(()=>{}).finally(()=>{loading=null;});
    }catch{/* Audio support or loading must not block combat. */}
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
    if(e.type==='attack'){
      if(GUN_KEYS.has(e.key))try{playShot();}catch{}
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
  return{unlock,event,syncVolume};
}

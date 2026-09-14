const distortionCurve=amount=>{
  const samples=256,curve=new Float32Array(samples);
  for(let i=0;i<samples;i++){const x=i*2/(samples-1)-1;curve[i]=(Math.PI+amount)*x/(Math.PI+amount*Math.abs(x));}
  return curve;
};

const robotProfiles=Object.freeze({
  hunter:{high:260,low:3900,distortion:32,delay:.034,echo:.07},
  leviathan:{high:115,low:2450,distortion:58,delay:.072,echo:.16},
  cathedral:{high:135,low:3100,distortion:26,delay:.11,echo:.2},
  collector:{high:310,low:4700,distortion:18,delay:.044,echo:.19},
  shepherd:{high:220,low:2850,distortion:46,delay:.026,echo:.1},
  mother:{high:105,low:3350,distortion:20,delay:.14,echo:.22},
});

const radioMix=Object.freeze({voice:.86,noise:.2,dropVoice:.08,dropNoise:.34,minGap:1500,gapRange:1600,minDrop:65,dropRange:75});

export function createStoryAudio(baseUrl,getSettings,{setDucked=()=>{},onEnded=()=>{},createAudio=src=>new Audio(src),createContext=()=>new (window.AudioContext||window.webkitAudioContext)(),schedule=(callback,delay)=>{const timer=setTimeout(callback,delay);timer?.unref?.();return timer;},cancel=timer=>clearTimeout(timer),random=Math.random}={}){
  let context,current;
  const volume=()=>{const settings=getSettings();return settings.soundEnabled?Math.max(0,Math.min(100,settings.effects))/100:0;};
  const localizedSource=(cue,language)=>`${baseUrl}${language==='en'?cue.audio.replace('assets/audio/story/','assets/audio/story/en/'):cue.audio}`;
  function voiceMix(session,mix){
    session.voiceMix=mix;const level=volume()*mix;
    if(session.gain&&context)session.gain.gain.setTargetAtTime(level,context.currentTime,.012);else session.audio.volume=level;
  }
  function noiseMix(session,mix){session.noiseMix=mix;if(session.interference)session.interference.volume=volume()*mix;}
  function settleRadio(session){voiceMix(session,radioMix.voice);noiseMix(session,radioMix.noise);}
  function clearRadioTimers(session){
    if(!session)return;
    if(session.glitchTimer!=null)cancel(session.glitchTimer);
    if(session.restoreTimer!=null)cancel(session.restoreTimer);
    session.glitchTimer=session.restoreTimer=null;
  }
  function scheduleDropout(session){
    clearRadioTimers(session);
    if(current!==session||session.suspended)return;
    const delay=radioMix.minGap+random()*radioMix.gapRange;
    session.glitchTimer=schedule(()=>{
      session.glitchTimer=null;
      if(current!==session||session.suspended)return;
      voiceMix(session,radioMix.dropVoice);noiseMix(session,radioMix.dropNoise);
      session.restoreTimer=schedule(()=>{
        session.restoreTimer=null;
        if(current!==session||session.suspended)return;
        settleRadio(session);scheduleDropout(session);
      },radioMix.minDrop+random()*radioMix.dropRange);
    },delay);
  }
  function unlock(){try{context??=createContext();if(context.state==='suspended')context.resume().catch(()=>{});}catch{context=null;}}
  function stop(){
    if(!current)return;
    clearRadioTimers(current);
    for(const media of [current.audio,current.interference])if(media){media.pause();media.removeAttribute?.('src');media.load?.();}
    for(const node of current.nodes||[])try{node.disconnect();}catch{}
    current=null;setDucked(false);
  }
  function pause(){
    if(!current||current.suspended)return;
    clearRadioTimers(current);settleRadio(current);
    current.suspended=true;
    current.audio.pause();current.interference?.pause();setDucked(false);
  }
  function resume(){
    if(!current?.suspended)return false;
    if(!volume()){stop();return false;}
    const session=current;session.suspended=false;settleRadio(session);setDucked(true);
    session.interference?.play().catch(()=>{});
    session.audio.play().catch(()=>{if(current===session&&!session.suspended)stop();});
    scheduleDropout(session);
    return true;
  }
  function syncVolume(){
    const level=volume();
    if(!current)return;
    if(current.gain&&context)current.gain.gain.setTargetAtTime(level*(current.voiceMix??radioMix.voice),context.currentTime,.03);else current.audio.volume=level*(current.voiceMix??radioMix.voice);
    if(current.interference)current.interference.volume=level*(current.noiseMix??radioMix.noise);
    if(!level)stop();
  }
  function syncLanguage(){
    if(!current?.cue)return false;
    const language=getSettings().language;
    if(!['ru','en'].includes(language)||language===current.language)return false;
    const session=current,wasPlaying=!session.suspended&&!session.audio.paused;
    session.audio.pause();session.language=language;session.audio.src=localizedSource(session.cue,language);session.audio.load?.();
    if(wasPlaying)session.audio.play().catch(()=>{if(current===session&&!session.suspended)stop();});
    return true;
  }
  function play(cue){
    stop();const level=volume(),language=getSettings().language;
    if(!level||!cue?.audio||!['ru','en'].includes(language))return false;
    const audio=createAudio(localizedSource(cue,language)),interference=createAudio(`${baseUrl}assets/audio/story/radio-interference.m4a`),nodes=[];audio.preload='auto';
    interference.preload='auto';interference.loop=true;interference.volume=level*radioMix.noise;
    let gain=null;
    try{
      if(cue.voice==='robot'&&context){
        const profile=robotProfiles[cue.voiceProfile]||robotProfiles.hunter;
        const source=context.createMediaElementSource(audio),high=context.createBiquadFilter(),low=context.createBiquadFilter(),shape=context.createWaveShaper(),delay=context.createDelay(.2),echo=context.createGain();gain=context.createGain();
        high.type='highpass';high.frequency.value=profile.high;low.type='lowpass';low.frequency.value=profile.low;shape.curve=distortionCurve(profile.distortion);shape.oversample='2x';delay.delayTime.value=profile.delay;echo.gain.value=profile.echo;gain.gain.value=level*radioMix.voice;
        source.connect(high);high.connect(low);low.connect(shape);shape.connect(gain);shape.connect(delay);delay.connect(echo);echo.connect(delay);delay.connect(gain);gain.connect(context.destination);
        nodes.push(source,high,low,shape,delay,echo,gain);
      }else audio.volume=level*radioMix.voice;
    }catch{audio.volume=level*radioMix.voice;gain=null;}
    const session=current={audio,interference,nodes,gain,cue,language,voiceMix:radioMix.voice,noiseMix:radioMix.noise,glitchTimer:null,restoreTimer:null};setDucked(true);
    const complete=()=>{if(current?.audio!==audio)return;stop();onEnded(cue);};
    audio.onended=complete;audio.onerror=complete;
    interference.play().catch(()=>{});audio.play().catch(()=>{if(current?.audio===audio&&!current.suspended)complete();});scheduleDropout(session);
    return true;
  }
  return{unlock,play,stop,pause,resume,syncVolume,syncLanguage,get playing(){return!!current&&!current.audio.paused;},get cue(){return current?.audio?.src||'';}};
}

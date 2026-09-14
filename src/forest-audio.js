/** Procedural atmosphere routed through the existing combat context and master. */
export function createForestAudio(context,master){
 let wind=null,nextBird=0;const calls=new Set();
 function stop(){if(wind){wind.source.stop();wind.source.disconnect();wind.filter.disconnect();wind.gain.disconnect();wind=null;}for(const call of calls){call.osc.stop();call.osc.disconnect();call.gain.disconnect();}calls.clear();}
 function update({active=false,paused=false,combat=false,strength=0}={}){
  if(!active||paused){stop();return;}
  const now=context.currentTime;
  if(!wind){
   const buffer=context.createBuffer(1,context.sampleRate*2,context.sampleRate),data=buffer.getChannelData(0);let brown=0;
   for(let i=0;i<data.length;i++){brown=(brown+(Math.random()*2-1)*.025)/1.025;data[i]=brown*3;}
   const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();
   source.buffer=buffer;source.loop=true;filter.type='lowpass';filter.frequency.value=650;gain.gain.value=0;source.connect(filter).connect(gain).connect(master);source.start();wind={source,filter,gain};nextBird=now+6;
  }
  wind.gain.gain.setTargetAtTime((.06+strength*.09)*(combat?.35:1),now,.6);
  wind.filter.frequency.setTargetAtTime(450+strength*1100,now,.5);
  if(!combat&&now>=nextBird){nextBird=now+12+Math.random()*14;
   for(let i=0;i<3;i++){const osc=context.createOscillator(),gain=context.createGain(),at=now+i*.17,f=1750+Math.random()*450;
    osc.type='sine';osc.frequency.setValueAtTime(f,at);osc.frequency.exponentialRampToValueAtTime(f*1.22,at+.065);osc.frequency.exponentialRampToValueAtTime(f*.85,at+.14);
    gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(.018,at+.025);gain.gain.exponentialRampToValueAtTime(.0001,at+.16);osc.connect(gain).connect(master);
    const call={osc,gain};calls.add(call);osc.onended=()=>{calls.delete(call);osc.disconnect();gain.disconnect();};osc.start(at);osc.stop(at+.18);
   }
  }
 }
 return{update,stop};
}

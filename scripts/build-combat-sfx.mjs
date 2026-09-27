import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const SAMPLE_RATE=48000;
const outputDir=fileURLToPath(new URL('../public/assets/audio/',import.meta.url));

function randomSource(seed){
 let state=seed>>>0;
 return()=>{state=(state+0x6d2b79f5)>>>0;let n=state;n=Math.imul(n^(n>>>15),n|1);n^=n+Math.imul(n^(n>>>7),n|61);return((n^(n>>>14))>>>0)/4294967296*2-1;};
}

const clamp=value=>Math.max(-1,Math.min(1,value));
const pulse=(t,at,width)=>Math.exp(-Math.pow((t-at)/width,2));
const envelope=(t,duration,attack,release)=>Math.min(1,t/attack,(duration-t)/release);

function acidWash(duration=.52){
 const frames=Math.round(duration*SAMPLE_RATE),samples=new Float64Array(frames),noise=randomSource(0xa61d2026);
 let spray=0,wet=0,wingPhase=0,stridulationPhase=0;
 for(let i=0;i<frames;i++){
  const t=i/SAMPLE_RATE,n=noise();spray+=.16*(n-spray);wet+=.035*(n-wet);
  const jet=envelope(t,duration,.012,.075)*Math.min(1,Math.max(0,(t-.008)/.045));
  // A wingbeat fundamental with harmonics and irregular flutter makes the
  // discharge read as a large engineered insect instead of a generic sprayer.
  const wingFrequency=205+22*Math.sin(Math.PI*2*7*t)-42*Math.min(1,t/duration);wingPhase+=Math.PI*2*wingFrequency/SAMPLE_RATE;
  const wingFlutter=.38+.62*Math.pow(.5+.5*Math.sin(Math.PI*2*(27+3*Math.sin(Math.PI*2*3*t))*t),2);
  const wing=envelope(t,duration,.006,.065)*wingFlutter*(Math.sin(wingPhase)+.38*Math.sin(wingPhase*2)+.16*Math.sin(wingPhase*3));
  // Short stridulating bands stay above the wet jet and preserve attack clarity.
  const stridulationFrequency=1750+420*Math.sin(Math.PI*2*9*t);stridulationPhase+=Math.PI*2*stridulationFrequency/SAMPLE_RATE;
  const stridulationGate=Math.pow(Math.max(0,Math.sin(Math.PI*2*47*t)),5)*pulse(t,.22,.19);
  const stridulation=Math.sin(stridulationPhase)*stridulationGate;
  const valve=Math.exp(-t*95)*(n*.38+Math.sin(Math.PI*2*1120*t)*.28);
  const bubbles=[.13,.225,.335,.415].reduce((sum,at,index)=>sum+pulse(t,at,.018+index*.002)*Math.sin(Math.PI*2*(72+index*13)*(t-at)),0);
  samples[i]=valve*.34+wing*.34+stridulation*.12+jet*(spray*.24+wet*.25)+bubbles*.2;
 }
 return samples;
}

function symbiontBite(duration=.29){
 const frames=Math.round(duration*SAMPLE_RATE),samples=new Float64Array(frames),noise=randomSource(0xb17e2026);
 let crunch=0,clickBody=0,buzzPhase=0,scrapePhase=0;
 for(let i=0;i<frames;i++){
  const t=i/SAMPLE_RATE,n=noise();crunch+=.085*(n-crunch);clickBody+=.018*(n-clickBody);const chitin=n-clickBody;
  // A very short wing buzz precedes the mandible close; it is intentionally
  // absent from the tail so dense swarms do not become a continuous drone.
  const buzzDuration=.067,buzzFrequency=285+135*Math.min(1,t/buzzDuration);buzzPhase+=Math.PI*2*buzzFrequency/SAMPLE_RATE;
  const buzzEnvelope=t<buzzDuration?Math.sin(Math.PI*t/buzzDuration):0;
  const buzz=buzzEnvelope*(.58+.42*Math.sin(Math.PI*2*39*t))*(Math.sin(buzzPhase)+.42*Math.sin(buzzPhase*2));
  const jaw=[.069,.119].reduce((sum,at,index)=>{const age=t-at;if(age<0)return sum;const snap=Math.exp(-age*(index?105:135));return sum+snap*(chitin*.64+Math.sin(Math.PI*2*(index?2380:3020)*age)*.24+Math.sin(Math.PI*2*(index?170:215)*age)*.28);},0);
  const scrapeFrequency=760+170*Math.sin(Math.PI*2*15*t);scrapePhase+=Math.PI*2*scrapeFrequency/SAMPLE_RATE;
  const scrapeEnvelope=pulse(t,.157,.064)*(.45+.55*Math.pow(Math.max(0,Math.sin(Math.PI*2*72*t)),2));
  const scrape=scrapeEnvelope*(Math.sin(scrapePhase)*.3+chitin*.25);
  const flesh=envelope(t,duration,.018,.05)*pulse(t,.16,.09)*(crunch*.35+Math.sin(Math.PI*2*82*t)*.09);
  const release=t>.15?Math.exp(-(t-.15)*24)*Math.sin(Math.PI*2*126*(t-.15))*.08:0;
  samples[i]=buzz*.22+jaw*.62+scrape+flesh+release;
 }
 return samples;
}

function normalizedPcm(samples,peak=.82){
 const sourcePeak=samples.reduce((max,value)=>Math.max(max,Math.abs(value)),0)||1,scale=peak/sourcePeak;
 return Int16Array.from(samples,value=>Math.round(clamp(value*scale)*32767));
}

function wav(pcm){
 const dataBytes=pcm.length*2,buffer=Buffer.alloc(44+dataBytes);
 buffer.write('RIFF',0);buffer.writeUInt32LE(36+dataBytes,4);buffer.write('WAVE',8);buffer.write('fmt ',12);buffer.writeUInt32LE(16,16);
 buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(1,22);buffer.writeUInt32LE(SAMPLE_RATE,24);buffer.writeUInt32LE(SAMPLE_RATE*2,28);
 buffer.writeUInt16LE(2,32);buffer.writeUInt16LE(16,34);buffer.write('data',36);buffer.writeUInt32LE(dataBytes,40);
 for(let i=0;i<pcm.length;i++)buffer.writeInt16LE(pcm[i],44+i*2);
 return buffer;
}

for(const [file,render] of [['generated-acid-wash.wav',acidWash],['generated-symbiont-bite.wav',symbiontBite]]){
 const pcm=normalizedPcm(render()),buffer=wav(pcm),path=`${outputDir}/${file}`;writeFileSync(path,buffer);
 const peak=Math.max(...pcm.map(Math.abs))/32767;
 console.log(JSON.stringify({file,duration:pcm.length/SAMPLE_RATE,sampleRate:SAMPLE_RATE,channels:1,bitDepth:16,peak,sha256:createHash('sha256').update(buffer).digest('hex')}));
}

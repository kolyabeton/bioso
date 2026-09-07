import test from 'node:test';
import assert from 'node:assert/strict';
import {createBackgroundMusic} from '../src/background-music.js';
import {readSettings,SETTINGS_KEY} from '../src/ui/settings.js';

function fixture(load) {
  const voices=[];
  let contexts=0, loads=0;
  const gain={gain:{value:0,setTargetAtTime(value){this.value=value;}},connect(){},disconnect(){}};
  const context={state:'running',currentTime:0,destination:{},createGain:()=>gain,
    createBufferSource(){const voice={connect(){},disconnect(){},start(when,offset){this.offset=offset;},stop(){this.stopped=true;}};voices.push(voice);return voice;},
    close:async()=>{},resume:async()=>{},
  };
  const music=createBackgroundMusic('/music.mp3',{createContext:()=>{contexts++;return context;},loadBuffer:async()=>{loads++;return load?load():{duration:28};}});
  music.setVolume(30);
  return {music,voices,context,gain,counts:()=>({contexts,loads})};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));

test('music waits for a gesture and repeated gestures keep a single looping voice',async()=>{
  const f=fixture();assert.equal(f.counts().contexts,0);
  f.music.unlock();f.music.unlock();await settle();f.music.unlock();
  assert.deepEqual(f.counts(),{contexts:1,loads:1});assert.equal(f.voices.length,1);
  assert.equal(f.voices[0].loop,true);assert.equal(f.gain.gain.value,.18);
});

test('mute and hidden tab stop playback; resume retains position without overlapping voices',async()=>{
  const f=fixture();f.music.unlock();await settle();
  f.context.currentTime=10;f.music.setVolume(0);assert.equal(f.voices[0].stopped,true);
  f.context.currentTime=20;f.music.setVolume(50);assert.equal(f.voices[1].offset,10);
  f.context.currentTime=25;f.music.setActive(false);assert.equal(f.voices[1].stopped,true);
  f.context.currentTime=100;f.music.setActive(true);assert.equal(f.voices[2].offset,15);
  assert.equal(f.voices.filter(v=>!v.stopped).length,1);
});

test('loading while hidden stays silent and failed loads can retry on the next gesture',async()=>{
  let resolve;
  const f=fixture(()=>new Promise(r=>{resolve=r;}));f.music.unlock();f.music.setActive(false);
  resolve({duration:28});await settle();assert.equal(f.voices.length,0);
  f.music.setActive(true);assert.equal(f.voices.length,1);f.music.dispose();assert.equal(f.voices[0].stopped,true);
  let attempts=0;const retry=fixture(()=>{if(++attempts===1)throw Error('offline');return {duration:28};});
  retry.music.unlock();await settle();assert.equal(retry.voices.length,0);
  retry.music.unlock();await settle();assert.equal(retry.voices.length,1);
});

test('a new profile starts muted and old saved volume levels do not opt into sound',()=>{
  assert.equal(readSettings({getItem:()=>null}).soundEnabled,false);
  assert.equal(readSettings({getItem:()=>null}).music,10);
  assert.equal(readSettings({getItem:key=>key===SETTINGS_KEY?' {"music":0}':null}).music,0);
  assert.equal(readSettings({getItem:()=>'{"music":30,"effects":60}'}).soundEnabled,false);
  assert.equal(readSettings({getItem:()=>'{"soundEnabled":true}'}).soundEnabled,true);
});

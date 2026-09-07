import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombatAudio} from '../src/combat-audio.js';

function fixture(){
 let level=60,loads=0,contexts=0;
 const voices=[],gains=[];
 const context={state:'running',currentTime:0,destination:{},
  createGain(){const g={gain:{value:0,setValueAtTime(v){this.value=v;}},connect(){return this;},disconnect(){}};gains.push(g);return g;},
  createBufferSource(){const source={connect(g){return g;},disconnect(){},start(){this.started=true;},stop(){this.stopped=true;}};voices.push(source);return source;},
 };
 const audio=createCombatAudio(()=>level,{createContext:()=>{contexts++;return context;},loadShot:async()=>{loads++;return {duration:.74};}});
 return{audio,voices,gains,setLevel:v=>{level=v;},counts:()=>({loads,contexts})};
}
const settle=()=>new Promise(r=>setImmediate(r));

test('approved gunshot fires once per seed/needle attack, not for claws or other weapons',async()=>{
 const f=fixture();f.audio.unlock();await settle();
 for(const key of ['seed','needle','claws','drill','hammer','whip','fangs','rocket','arc','acid'])f.audio.event({type:'attack',key});
 assert.equal(f.voices.length,2);assert.ok(f.voices.every(v=>v.started));
});

test('master mute blocks loading and playback, and mutes already playing shots',async()=>{
 const f=fixture();f.setLevel(0);f.audio.unlock();assert.deepEqual(f.counts(),{loads:0,contexts:0});
 f.setLevel(60);f.audio.unlock();await settle();f.audio.event({type:'attack',key:'seed'});
 assert.equal(f.gains[0].gain.value,.6);
 f.setLevel(0);f.audio.syncVolume();assert.equal(f.gains[0].gain.value,0);
 f.audio.event({type:'attack',key:'needle'});assert.equal(f.voices.length,1);
});

test('simultaneous guns are audible independently, with a bounded voice count',async()=>{
 const f=fixture();f.audio.unlock();f.audio.unlock();await settle();
 for(let i=0;i<12;i++)f.audio.event({type:'attack',key:'seed',source:i});
 assert.equal(f.counts().loads,1);assert.equal(f.voices.filter(v=>!v.stopped).length,8);
});

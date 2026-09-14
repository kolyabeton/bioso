import test from 'node:test';
import assert from 'node:assert/strict';
import {createCombatAudio} from '../src/combat-audio.js';

function fixture(){
 let level=60,loads=0,contexts=0;
 const voices=[],gains=[];
 const context={state:'running',currentTime:0,destination:{},
  createGain(){const g={gain:{value:0,setValueAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.value=v;}},connect(){return this;},disconnect(){}};gains.push(g);return g;},
  createBufferSource(){const source={connect(g){return g;},disconnect(){},start(){this.started=true;},stop(){this.stopped=true;}};voices.push(source);return source;},
 };
 const effectLoads=[];
 const audio=createCombatAudio(()=>level,{createContext:()=>{contexts++;return context;},loadShot:async()=>{loads++;return {name:'pistol',duration:.74};},loadEffect:async(c,key)=>{effectLoads.push(key);return{name:key,duration:.32};}});
 return{audio,voices,gains,context,effectLoads,setLevel:v=>{level=v;},counts:()=>({loads,contexts})};
}
const settle=()=>new Promise(r=>setImmediate(r));

test('approved gunshot covers pistol, seed, shotgun and needle; selected melee and harpoon use their own recordings',async()=>{
 const f=fixture();f.audio.unlock();await settle();
 for(const key of ['pistol','seed','shotgun','needle','claws','drill','hammer','harpoon','whip','fangs','rocket','arc','acid'])f.audio.event({type:'attack',key});
 assert.deepEqual(f.voices.map(v=>v.buffer.name),['pistol','pistol','pistol','pistol','claws','drill','hammer','harpoon']);
 assert.ok(f.voices.every(v=>v.started));
});

test('shield waits for contact, rocket waits for explosion, and arc links do not stack a full sound per target',async()=>{
 const f=fixture();f.audio.unlock();await settle();
 f.audio.event({type:'melee-windup',key:'hammer'});
 f.audio.event({type:'attack',key:'rocket'});f.audio.event({type:'attack',key:'arc'});
 assert.equal(f.voices.length,0);
 f.audio.event({type:'attack',key:'hammer',animationStarted:true});
 f.audio.event({type:'blast',key:'rocket'});
 for(let i=0;i<3;i++)f.audio.event({type:'arc'});
 assert.deepEqual(f.voices.map(v=>v.buffer.name),['hammer','rocket','arc']);
 f.context.currentTime=.1;f.audio.event({type:'arc'});
 assert.equal(f.voices.length,4);
});

test('repeated unlocks load every chosen file once; mute blocks all selected effects',async()=>{
 const f=fixture();f.audio.unlock();f.audio.unlock();await settle();f.audio.unlock();await settle();
 assert.equal(f.effectLoads.length,14);assert.equal(new Set(f.effectLoads).size,14);
 f.setLevel(0);
 for(const key of ['hammer','claws','drill','harpoon'])f.audio.event({type:'attack',key});
 f.audio.event({type:'arc'});f.audio.event({type:'blast',key:'rocket'});
 assert.equal(f.voices.length,0);
});

test('fast drills renew the owning motor; all new effects have a bounded voice count',async()=>{
 const f=fixture();f.audio.unlock();await settle();
 for(let i=0;i<10;i++){f.context.currentTime+=.2;f.audio.event({type:'attack',key:'drill',source:'left'});}
 assert.equal(f.voices.filter(v=>!v.stopped).length,1);
 for(let i=0;i<20;i++)for(const key of ['hammer','claws','harpoon'])f.audio.event({type:'attack',key,source:i});
 assert.ok(f.voices.filter(v=>!v.stopped).length<=12);
 for(const voice of f.voices)voice.onended();
 f.audio.event({type:'attack',key:'harpoon'});
 assert.ok(f.voices.at(-1).started);
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

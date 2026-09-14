import test from 'node:test';
import assert from 'node:assert/strict';
import {createStoryRadio,storyRadioShouldSuspend} from '../src/ui/story-radio.js';

function fixture(t){
  const elements=new Map(),classes=new Set(),calls=[];
  const root={hidden:true,dataset:{},setAttribute(){},classList:{add:value=>classes.add(value),remove:value=>classes.delete(value)},querySelector(selector){if(!elements.has(selector))elements.set(selector,{addEventListener(){}});return elements.get(selector);},remove(){}};
  const originals=['document','requestAnimationFrame'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]);
  t.after(()=>{for(const [key,descriptor] of originals){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}});
  globalThis.document={createElement:()=>root};globalThis.requestAnimationFrame=callback=>callback();
  t.mock.timers.enable({apis:['setTimeout']});
  let now=0;t.mock.method(performance,'now',()=>now);
  const radio=createStoryRadio({append(){}},{play:cue=>calls.push(`play:${cue.id}`),stop:()=>calls.push('stop'),pause:()=>calls.push('pause'),resumeAudio:()=>calls.push('resume')});
  return{radio,calls,advance(ms){now+=ms;t.mock.timers.tick(ms);}};
}
const cue=id=>({id,speaker:'Девочка по радио',text:'Садовник, ты слышишь?',duration:5000});

test('assembly suspends the current line and its remaining timer without replaying or requeuing it',t=>{
  const {radio,calls,advance}=fixture(t);
  radio.enqueue(cue('first'));advance(2000);radio.enqueue(cue('second'));
  radio.suspend();radio.suspend();advance(10000);
  assert.equal(radio.visible,false);assert.equal(radio.cue,'first');assert.deepEqual(radio.queued,['second']);
  radio.resume();radio.resume();
  assert.equal(radio.visible,true);assert.deepEqual(calls,['play:first','pause','resume']);
  advance(2999);assert.equal(radio.cue,'first');advance(1);assert.equal(radio.visible,false);
  advance(320);assert.equal(radio.cue,'second');assert.equal(calls.filter(value=>value==='play:first').length,1);
  radio.dispose();
});

test('an untimed preview remains untimed after returning and a dismissed line never resumes',t=>{
  const {radio,calls,advance}=fixture(t);
  radio.show(cue('preview'),{duration:0});radio.suspend();advance(20000);radio.resume();advance(20000);
  assert.equal(radio.visible,true);radio.suspend();radio.hide();radio.resume();advance(20000);
  assert.equal(radio.visible,false);assert.equal(calls.filter(value=>value==='play:preview').length,1);
  assert.equal(calls.filter(value=>value==='resume').length,1);radio.dispose();
});

test('a voiced line advances when its audio ends instead of cutting a slow performance at the text timer',t=>{
  const elements=new Map(),root={hidden:true,dataset:{},setAttribute(){},classList:{add(){},remove(){}},querySelector(selector){if(!elements.has(selector))elements.set(selector,{addEventListener(){}});return elements.get(selector);},remove(){}};
  const originals=['document','requestAnimationFrame'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]);
  t.after(()=>{for(const [key,descriptor] of originals){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}});
  globalThis.document={createElement:()=>root};globalThis.requestAnimationFrame=callback=>callback();t.mock.timers.enable({apis:['setTimeout']});
  const radio=createStoryRadio({append(){}},{play:()=>true});radio.enqueue(cue('first'));radio.enqueue(cue('second'));
  t.mock.timers.tick(5000);assert.equal(radio.cue,'first');radio.audioEnded('first');t.mock.timers.tick(320);assert.equal(radio.cue,'second');radio.dispose();
});

test('map and level choice keep story audio continuous',()=>{
  assert.equal(storyRadioShouldSuspend('map'),false);
  assert.equal(storyRadioShouldSuspend('level'),false);
  assert.equal(storyRadioShouldSuspend('assembly'),true);
  assert.equal(storyRadioShouldSuspend('settings'),true);
  assert.equal(storyRadioShouldSuspend(''),false);
});

test('silent visual review keeps a cue open without starting audio',t=>{
  const {radio,calls}=fixture(t);radio.show(cue('preview'),{duration:0,playAudio:false});
  assert.equal(radio.visible,true);assert.deepEqual(calls,['stop']);radio.dispose();
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {holdForAssets} from '../src/ui/loading-gate.js';
import {frameWork} from '../src/frame-work.js';

test('loading curtain waits for scene residency beyond 14 seconds and preparation gaps',()=>{
 const oldRaf=globalThis.requestAnimationFrame,oldBoot=globalThis.__biosoBoot;
 const callbacks=[],events=[];let ready=false;
 globalThis.requestAnimationFrame=fn=>callbacks.push(fn);
 globalThis.__biosoBoot={show:()=>events.push('show'),set:v=>events.push(v),hide:()=>events.push('hide'),finish:()=>events.push('finish')};
 const base=performance.now(),frame=t=>callbacks.shift()(base+t);
 try{
  holdForAssets({ready:()=>ready,onComplete:()=>events.push('complete')});
  frame(16000);frame(17000);
  assert.ok(!events.includes('hide'));assert.ok(!events.includes(1));
  ready=true;frame(18000);
  const work=frameWork.run(()=>{});frame(19000);
  assert.ok(!events.includes('hide'));
  frameWork.pump();frame(20000);frame(20300);
  assert.deepEqual(events.slice(-3),['complete',1,'hide']);
  assert.equal(callbacks.length,0);
  return work;
 }finally{globalThis.requestAnimationFrame=oldRaf;globalThis.__biosoBoot=oldBoot;}
});

test('initial gate preserves intro and a newer gate cancels stale completion',()=>{
 const oldRaf=globalThis.requestAnimationFrame,oldBoot=globalThis.__biosoBoot;
 const callbacks=[],events=[];
 globalThis.requestAnimationFrame=fn=>callbacks.push(fn);
 globalThis.__biosoBoot={show:()=>events.push('show'),set:()=>{},hide:()=>events.push('hide'),finish:()=>events.push('finish')};
 const base=performance.now(),frame=t=>callbacks.shift()(base+t);
 try{
  holdForAssets({initial:true,onComplete:()=>events.push('stale')});
  assert.deepEqual(events,[]);
  holdForAssets({initial:true,onComplete:()=>events.push('complete')});
  frame(1000);frame(1000);frame(1400);
  assert.deepEqual(events,['complete','finish','hide']);
  assert.equal(callbacks.length,0);
 }finally{globalThis.requestAnimationFrame=oldRaf;globalThis.__biosoBoot=oldBoot;}
});

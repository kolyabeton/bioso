import test from 'node:test';
import assert from 'node:assert/strict';
import {FrameWorkQueue,limitedLoad} from '../src/frame-work.js';
import {BiomeStream} from '../src/biome-stream.js';
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
test('shared frame preparation stops at budget, respects priority and cancels obsolete work',async()=>{
 let clock=0,valid=true;const queue=new FrameWorkQueue({now:()=>clock,budgetMs:1}),calls=[];
 const a=queue.run(()=>{calls.push('a');clock+=.6;}),b=queue.run(()=>{calls.push('b');clock+=.6;},{priority:-1});
 const c=queue.run(()=>assert.fail('obsolete work executed'),{valid:()=>valid});const rejected=assert.rejects(c,/Superseded/);
 queue.pump();assert.deepEqual(calls,['b','a']);assert.equal(queue.jobs.length,1);valid=false;queue.pump();await Promise.all([a,b,rejected]);
 const failed=queue.run(()=>{throw Error('bad asset');});const error=assert.rejects(failed,/bad asset/);queue.pump();await error;
});
test('asset loads have a global concurrency ceiling of two and recover after rejection',async()=>{
 const release=[];let active=0,peak=0;
 const jobs=Array.from({length:5},(_,i)=>limitedLoad(()=>{active++;peak=Math.max(peak,active);return new Promise((resolve,reject)=>release.push(()=>{active--;i===1?reject(Error('offline')):resolve(i);}));}));
 const all=Promise.allSettled(jobs);await tick();assert.equal(active,2);
 while(release.length){release.shift()();await tick();}const results=await all;
 assert.equal(peak,2);assert.equal(results.filter(r=>r.status==='fulfilled').length,4);
});
test('tile queue prioritizes current requests, limits active builds and releases stale completions',async()=>{
 const starts=[],finish=new Map(),released=[];
 const stream=new BiomeStream((id,{valid})=>new Promise(resolve=>{starts.push(id);finish.set(id,()=>resolve({id,valid:valid()}));}),v=>released.push(v.id));
 stream.update(['current','ahead','behind']);await tick();assert.deepEqual(starts,['current','ahead']);
 stream.update(['new','current']);finish.get('ahead')();await tick();assert.deepEqual(starts,['current','ahead','new']);assert.deepEqual(released,[]);
 finish.get('current')();await tick();assert.ok(stream.ready.has('current'));
 finish.get('new')();await tick();assert.deepEqual(released,['ahead']);
 stream.reset();finish.get('new')();await tick();assert.deepEqual(released,['ahead','current','new']);assert.equal(stream.ready.size,0);
});

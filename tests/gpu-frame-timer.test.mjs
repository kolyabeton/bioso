import test from 'node:test';
import assert from 'node:assert/strict';
import {createGpuFrameTimer} from '../src/gpu-frame-timer.js';
function fixture(options){
 const queries=[];let active=null,disjoint=false;
 const gl={QUERY_RESULT_AVAILABLE:1,QUERY_RESULT:2,getExtension:()=>({TIME_ELAPSED_EXT:3,GPU_DISJOINT_EXT:4}),getParameter:()=>disjoint,
  createQuery(){const q={ready:false,ns:0};queries.push(q);return q;},beginQuery(_,q){assert.equal(active,null);active=q;},endQuery(){active=null;},
  getQueryParameter(q,p){return p===1?q.ready:q.ns;},deleteQuery(q){q.deleted=true;}};
 const renderer={capabilities:{isWebGL2:true},getContext:()=>gl,render(ns=2e6){if(active)active.ns+=ns;},initTexture(){renderer.render(1e6);},compileAsync(){renderer.render(3e6);return Promise.resolve();}};
 const timer=createGpuFrameTimer(renderer,options);timer.drain();
 return {timer,renderer,queries,setDisjoint:v=>disjoint=v,ready(){for(const q of queries)q.ready=true;}};
}
test('sums every pass and upload once and waits for the complete frame',async()=>{
 const f=fixture();f.timer.beginFrame();f.renderer.initTexture();await f.renderer.compileAsync();f.renderer.render();f.timer.endFrame();
 f.queries[0].ready=true;f.timer.beginFrame();assert.equal(f.timer.drain().gpuMs,null);f.timer.endFrame();
 f.ready();f.timer.beginFrame();assert.deepEqual(f.timer.drain().gpuSamples,[{id:1,ms:6}]);f.timer.endFrame();assert.ok(f.queries.every(q=>q.deleted));
});
test('disjoint and query overflow frames cannot report partial GPU times',()=>{
 const f=fixture({maxQueries:1});f.timer.beginFrame();f.renderer.render();f.renderer.render();f.timer.endFrame();f.ready();f.timer.beginFrame();assert.equal(f.timer.drain().gpuMs,null);f.timer.endFrame();
 f.timer.beginFrame();f.renderer.render();f.timer.endFrame();f.setDisjoint(true);f.ready();f.timer.beginFrame();assert.equal(f.timer.drain().gpuMs,null);f.timer.endFrame();
 f.setDisjoint(false);f.timer.beginFrame();f.renderer.render();f.timer.endFrame();f.ready();f.timer.beginFrame();assert.equal(f.timer.drain().gpuMs,2);f.timer.endFrame();
});
test('missing extension stays unavailable and dispose restores methods',()=>{
 const render=()=>42,renderer={getContext:()=>({}),capabilities:{isWebGL2:false},render};const t=createGpuFrameTimer(renderer);t.beginFrame();assert.equal(renderer.render(),42);t.endFrame();assert.equal(t.drain().gpuTimerAvailable,false);assert.equal(t.info().gpuMs,null);t.dispose();assert.equal(renderer.render,render);
});
test('counts preparation submitted between animation callbacks',()=>{
 const f=fixture();f.timer.beginFrame();f.renderer.render();f.timer.endFrame();f.renderer.initTexture();f.ready();f.timer.beginFrame();assert.equal(f.timer.drain().gpuMs,3);f.timer.endFrame();
});

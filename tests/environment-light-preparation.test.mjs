import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {bakeEnvironmentLight,bakeEnvironmentLightAsync} from '../src/environment-static-light.js';
function fixture(){
 const group=new T.Group(),material=new T.MeshStandardMaterial(),geometry=new T.BoxGeometry(1,2,1);
 for(let i=0;i<3;i++){const mesh=new T.Mesh(geometry,material);mesh.position.set(i*2,1,i);group.add(mesh);}
 let target=null,color=new T.Color('#123456'),alpha=.4;const calls=[];
 const renderer={autoClear:true,getRenderTarget:()=>target,setRenderTarget:t=>{target=t;},getClearColor:out=>out.copy(color),getClearAlpha:()=>alpha,setClearColor:(c,a)=>{color=new T.Color(c);alpha=a;},clear:()=>calls.push('clear'),compileAsync:async()=>{calls.push('compile');},render:object=>{if(object.isMesh)assert.equal(object.matrixWorld.elements[12],object.matrix.elements[12]);calls.push('draw');}};
 return {group,renderer,calls,dispose(){geometry.dispose();material.dispose();}};
}
test('incremental light preparation preserves one clear, all depth draws and renderer state',async()=>{
 const f=fixture();let workCalls=0;
 const target=await bakeEnvironmentLightAsync(f.renderer,f.group,{x:0,z:0},{},async fn=>{workCalls++;return fn();});
 assert.equal(f.calls.filter(x=>x==='clear').length,1);assert.equal(f.calls.filter(x=>x==='draw').length,3);assert.equal(f.calls.filter(x=>x==='compile').length,3);
 assert.ok(workCalls>3);assert.equal(f.renderer.getRenderTarget(),null);assert.equal(f.renderer.autoClear,true);assert.equal(f.renderer.getClearAlpha(),.4);
 assert.equal(f.renderer.getClearColor(new T.Color()).getHexString(),'123456');
 assert.ok(f.group.children.every(m=>m.material.customProgramCacheKey().endsWith('-cell-depth-v1')));target.dispose();f.dispose();
});
test('the synchronous compatibility entrypoint keeps a single depth scene draw',()=>{
 const f=fixture(),target=bakeEnvironmentLight(f.renderer,f.group,{x:0,z:0});assert.deepEqual(f.calls,['clear','draw']);target.dispose();f.dispose();
});
test('cancelled light preparation releases its render target and owned depth materials',async()=>{
 const f=fixture();let cancelled=false,disposed=0;const original=T.WebGLRenderTarget.prototype.dispose;
 T.WebGLRenderTarget.prototype.dispose=function(){disposed++;return original.call(this);};
 f.renderer.compileAsync=async()=>{cancelled=true;};
 try{await assert.rejects(bakeEnvironmentLightAsync(f.renderer,f.group,{x:0,z:0},{},async fn=>{if(cancelled)throw Error('Superseded preparation');return fn();}),/Superseded/);assert.equal(disposed,1);assert.equal(f.renderer.getRenderTarget(),null);}
 finally{T.WebGLRenderTarget.prototype.dispose=original;f.dispose();}
});

test('an empty incremental light target is still cleared to fully lit',async()=>{
 const f=fixture();f.group.clear();const target=await bakeEnvironmentLightAsync(f.renderer,f.group,{x:0,z:0},{},async fn=>fn());assert.deepEqual(f.calls,['clear','draw']);target.dispose();f.dispose();
});

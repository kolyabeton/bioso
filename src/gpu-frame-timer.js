/** Sum GPU command intervals per rendered frame, excluding CPU pose preparation.
 * Queries are asynchronous. Missing/disjoint/incomplete frames are never zeroes. */
export function createGpuFrameTimer(renderer,{maxQueries=64}={}){
 const gl=renderer.getContext(),ext=renderer.capabilities.isWebGL2?gl.getExtension('EXT_disjoint_timer_query_webgl2'):null;
 const pending=[],frames=[],samples=[],originals=new Map();let current=null,lastFrame=null,depth=0,ms=null,id=0,capture=false,dropped=0;
 function poll(){
  if(!ext)return;
  const disjoint=gl.getParameter(ext.GPU_DISJOINT_EXT);
  if(disjoint){ms=null;for(const frame of frames)frame.invalid=true;}
  while(pending.length&&gl.getQueryParameter(pending[0].query,gl.QUERY_RESULT_AVAILABLE)){
   const {query,frame}=pending.shift();if(!frame.invalid)frame.ms+=gl.getQueryParameter(query,gl.QUERY_RESULT)/1e6;
   frame.pending--;gl.deleteQuery(query);
  }
  while(frames.length&&frames[0].sealed&&!frames[0].pending){
   const frame=frames.shift();if(frame.invalid||!frame.passes){dropped++;continue;}
   ms=frame.ms;id++;if(capture){samples.push({id,ms});if(samples.length>240)samples.shift();}
  }
 }
 // compileAsync submits synchronously then waits for driver completion; do not
 // leave a query active across that promise. Nested render calls count once.
 for(const name of ['render','clear','clearDepth','clearColor','clearStencil','initTexture','compileAsync']){
  const original=renderer[name];if(typeof original!=='function')continue;originals.set(name,original);
  renderer[name]=function(...args){
   // Promise continuations may submit preparation between animation callbacks.
   // Attribute them to the preceding frame, before the next poll can retire it.
   let query=null;const frame=current||lastFrame;
   if(ext&&frame&&depth===0){
    if(pending.length<maxQueries){query=gl.createQuery();if(query)gl.beginQuery(ext.TIME_ELAPSED_EXT,query);}
    if(!query)frame.invalid=true;
   }
   depth++;
   try{return original.apply(this,args);}
   catch(error){if(frame)frame.invalid=true;throw error;}
   finally{depth--;if(query){gl.endQuery(ext.TIME_ELAPSED_EXT);frame.pending++;frame.passes++;pending.push({query,frame});}}
  };
 }
 const info=()=>({gpuMs:ms,gpuSampleId:id,gpuTimerAvailable:!!ext,gpuDroppedFrames:dropped,gpuTiming:'summed-main-context-passes'});
 return {
  beginFrame(){poll();if(current){current.sealed=true;current.invalid=true;}current=ext?{ms:0,pending:0,passes:0,sealed:false,invalid:false}:null;if(current)frames.push(current);},
  endFrame(){if(current){current.sealed=true;lastFrame=current;if(!current.passes){frames.pop();lastFrame=null;dropped++;}}current=null;},
  info,
  drain(){capture=true;return {...info(),gpuSamples:samples.splice(0)};},
  dispose(){for(const [name,original]of originals)renderer[name]=original;for(const {query}of pending)gl.deleteQuery(query);pending.length=frames.length=samples.length=0;current=lastFrame=null;}
 };
}

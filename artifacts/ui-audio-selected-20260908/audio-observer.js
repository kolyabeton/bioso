// Read-only audio trace for a copy of the real game entry point. No production globals are changed.
const trace=document.createElement('pre');trace.id='audio-proof';trace.hidden=true;document.body.append(trace);
const events=[],bytes=new WeakMap(),buffers=new WeakMap();
const publish=()=>trace.textContent=JSON.stringify(events);
const arrayBuffer=Response.prototype.arrayBuffer;
Response.prototype.arrayBuffer=async function(){const data=await arrayBuffer.call(this);bytes.set(data,this.url);return data;};
const decode=AudioContext.prototype.decodeAudioData;
AudioContext.prototype.decodeAudioData=function(data,...rest){return decode.call(this,data,...rest).then(buffer=>{buffers.set(buffer,bytes.get(data)||'unknown');return buffer;});};
const start=AudioBufferSourceNode.prototype.start;
AudioBufferSourceNode.prototype.start=function(...args){events.push({file:buffers.get(this.buffer)?.split('/').at(-1)||'unknown',duration:this.buffer?.duration,at:performance.now()});publish();return start.apply(this,args);};
publish();

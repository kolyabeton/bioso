import test from 'node:test';
import assert from 'node:assert/strict';
import {createForestAudio} from '../src/forest-audio.js';

const settle=()=>new Promise(resolve=>setImmediate(resolve));

function fixture(){
 const sources=[],gains=[],filters=[],loads=[];
 const parameter=value=>({value,setValueAtTime(next){this.value=next;},setTargetAtTime(next){this.value=next;}});
 const context={currentTime:1,
  createBufferSource(){const source={loop:false,connect(node){return node;},disconnect(){this.disconnected=true;},start(){this.started=true;},stop(){this.stopped=true;}};sources.push(source);return source;},
  createGain(){const gain={gain:parameter(0),connect(node){return node;},disconnect(){this.disconnected=true;}};gains.push(gain);return gain;},
  createBiquadFilter(){const filter={type:'',frequency:parameter(0),connect(node){return node;},disconnect(){this.disconnected=true;}};filters.push(filter);return filter;},
 };
 const audio=createForestAudio(context,{}, {load:async key=>{loads.push(key);return{name:key,duration:key==='mission-gate'?1.6:8};}});
 return{audio,context,sources,gains,filters,loads};
}

test('approved forest and nursery recordings crossfade as two bounded world beds',async()=>{
 const f=fixture(),state={active:true,weatherBlend:{'root-forest':.75,'brood-nursery':.25},world:{tiles:[]},player:{x:0,z:0}};
 f.audio.update(state);await settle();f.audio.update(state);
 assert.deepEqual(new Set(f.loads),new Set(['root-forest','brood-nursery','garden-pump','scrap-turbine','mission-gate']));
 assert.deepEqual(f.sources.filter(source=>source.loop).map(source=>source.buffer.name),['root-forest','brood-nursery']);
 assert.equal(f.gains[0].gain.value,.075*.75);assert.equal(f.gains[1].gain.value,.055*.25);
 assert.equal(f.filters[1].frequency.value,1250);
});

test('only the nearest approved garden or scrapyard mechanism owns a loop voice',async()=>{
 const f=fixture(),world={tiles:[{decorations:[
  {model:'environment-garden-basin-v1',x:2,z:0},
  {model:'environment-scrap-engine-v2',x:12,z:0},
  {model:'environment-city-duct-v1',x:1,z:0},
 ]}]},state={active:true,weatherBlend:{'upper-gardens':1,'quiet-scrapyard':1},world,player:{x:0,z:0}};
 f.audio.update(state);await settle();f.audio.update(state);
 assert.equal(f.audio.info().mechanism,'garden-pump');
 const garden=f.sources.find(source=>source.buffer?.name==='garden-pump');assert.ok(garden?.loop);
 f.audio.update({...state,player:{x:13,z:0}});
 assert.equal(f.audio.info().mechanism,'scrap-turbine');assert.equal(garden.stopped,true);
 assert.equal(f.sources.filter(source=>source.loop&&!source.stopped).filter(source=>['garden-pump','scrap-turbine'].includes(source.buffer.name)).length,1);
});

test('short mission gate cue fires once on a nearby closed-to-open edge',async()=>{
 const f=fixture(),mission={floors:2,floorsState:[{state:'active'},{state:'locked'}],event:null},state={active:true,weatherBlend:{},world:{tiles:[]},player:{x:0,z:-32},mission};
 f.audio.update(state);await settle();f.audio.update(state);
 mission.floorsState[0].state='cleared';f.audio.update(state);f.audio.update(state);
 const gates=f.sources.filter(source=>source.buffer?.name==='mission-gate');
 assert.equal(gates.length,1);assert.equal(gates[0].loop,false);assert.equal(gates[0].buffer.duration,1.6);
});

test('muted or paused updates stop world loops and silently synchronize gate state',async()=>{
 const f=fixture(),mission={floors:2,floorsState:[{state:'active'},{state:'locked'}],event:null},state={active:true,weatherBlend:{'root-forest':1},world:{tiles:[]},player:{x:0,z:-32},mission};
 f.audio.update(state);await settle();f.audio.update(state);f.audio.update({...state,active:false});
 assert.ok(f.sources.filter(source=>source.loop).every(source=>source.stopped));
 mission.floorsState[0].state='cleared';f.audio.update({...state,active:false});f.audio.update(state);
 assert.equal(f.sources.filter(source=>source.buffer?.name==='mission-gate').length,0);
});

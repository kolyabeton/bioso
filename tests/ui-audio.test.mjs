import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createAudioFeedback,createOperationFeedback,installationSound} from '../src/ui/audio-feedback.js';
import {createSettings} from '../src/ui/settings.js';
import {createRun} from '../src/game.js';
import {createPart,equip,def,upgrade,swapBody} from '../src/assembly.js';
import {cloneForComparison} from '../src/ui/adapters.js';
const settle=()=>new Promise(r=>setImmediate(r));

test('one user action chooses its result over click and navigation; next action stays independent',async()=>{
 const sounds=[],feedback=createAudioFeedback(s=>sounds.push(s));
 feedback();feedback('open');feedback('confirm');feedback('close');await settle();
 assert.deepEqual(sounds,['confirm']);
 feedback();feedback('mechanical');feedback('deny');await settle();
 assert.deepEqual(sounds,['confirm','deny']);
 feedback('close');await settle();assert.equal(sounds.at(-1),'close');
});

test('equipment previews stay silent; successful body/organ and limb/weapon mutations use the selected materials',()=>{
 const s=createRun(),heard=[],wrap=createOperationFeedback(()=>s,c=>heard.push(c));
 const equipSound=wrap(equip,(state,id)=>installationSound(def(state.inventory.find(p=>p.id===id)).kind));
 for(const [key,cue] of [['drill','mechanical'],['universal','mechanical'],['digestion','organic']]){
  const p=createPart(s,key);s.inventory.push(p);const clone=cloneForComparison(s);
  assert.equal(equipSound(clone,p.id,0),true);assert.equal(heard.includes('preview'),false);
  const count=heard.length;assert.equal(equipSound(s,p.id,0),true);assert.equal(heard.length,count+1);assert.equal(heard.at(-1),cue);
 }
 assert.deepEqual(heard,['mechanical','mechanical','organic']);
 const body=createPart(s,s.body.key);s.inventory.push(body);assert.equal(wrap(swapBody,'organic')(s,body.id),true);assert.equal(heard.at(-1),'organic');
});

test('failed upgrade reports denial, successful upgrade confirms, and zero-valued success is not failure',()=>{
 const s=createRun(),heard=[],wrap=createOperationFeedback(()=>s,c=>heard.push(c));s.biomass=0;
 const improve=wrap(upgrade,'confirm');assert.equal(improve(s,s.arms[0].id,'damage',true),false);assert.deepEqual(heard,['deny']);
 s.biomass=10000;assert.equal(improve(s,s.arms[0].id,'damage',true),true);assert.equal(heard.at(-1),'confirm');
 assert.equal(wrap(()=>0,'confirm')(s),0);assert.equal(heard.at(-1),'confirm');
});

test('UI feedback respects opt-in, effects volume, and independent music setting',()=>{
 const heard=[],settings=createSettings({getItem:()=>null,setItem(){}},{feedback:s=>heard.push(s)});
 settings.tick();assert.deepEqual(heard,['click']);settings.update('soundEnabled',true);settings.update('music',0);
 settings.tick('open');assert.deepEqual(heard,['click','open']);settings.update('effects',0);settings.tick('confirm');assert.equal(heard.length,2);
});

test('shipped closing is exactly the opening PCM reversed; all chosen UI files contain non-silent mono PCM',()=>{
 const dir=new URL('../public/assets/audio/',import.meta.url),rows=JSON.parse(readFileSync(new URL('ui-effect-sources.json',dir)));
 const pcm=row=>{const b=readFileSync(new URL(row.file,dir));assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.readUInt16LE(22),1);assert.equal(b.readUInt16LE(34),16);const x=Array.from({length:(b.length-44)/2},(_,i)=>b.readInt16LE(44+i*2));assert.ok(x.some(v=>Math.abs(v)>100));assert.ok(Math.abs(x.length/b.readUInt32LE(24)-row.duration)<.0001);return x;};
 const decoded=new Map(rows.map(r=>[r.key,pcm(r)]));assert.deepEqual(decoded.get('close'),decoded.get('open').toReversed());
});

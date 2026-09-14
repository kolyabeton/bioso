import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from 'three';
import {createWorldRun} from '../src/world-run.js';
import {SECRETS} from '../src/systems/secrets/definitions.js';
import {EVENT_PRESENTATION} from '../src/gameplay-modules/event-presentation.js';
import {createGameplayModulesView} from '../src/gameplay-modules/view.js';
import {visibleEventMarkers} from '../src/ui/event-marker-visibility.js';
import {filteredMapMarkers} from '../src/ui/map.js';
import {discoverEncounters,nearbyEncounters,openSecret} from '../src/systems/encounters.js';

test('survival places nine or ten reachable secrets with variety and deterministic positions',()=>{
 const counts=new Set();
 for(let seed=1;seed<=100;seed++){
  const s=createWorldRun(undefined,'survival',seed),secrets=s.encounters.nodes.filter(n=>SECRETS[n.type]);
  assert.ok([9,10].includes(secrets.length),`seed ${seed}: ${secrets.length}`);counts.add(secrets.length);
  assert.equal(new Set(secrets.map(n=>n.id)).size,secrets.length);
  for(const type of Object.keys(SECRETS))assert.ok([3,4].includes(secrets.filter(n=>n.type===type).length));
  for(const n of secrets){assert.ok(s.world.walkable(n.x,n.z,2.4));assert.ok(Number.isFinite(n.y));assert.equal(n.state,'ready');assert.equal(n.discovered,false);}
  for(let i=0;i<s.encounters.nodes.length;i++)for(let j=i+1;j<s.encounters.nodes.length;j++){
   const a=s.encounters.nodes[i],b=s.encounters.nodes[j];assert.ok(Math.hypot(a.x-b.x,a.z-b.z)>=32);
  }
  if(seed<=5)assert.deepEqual(createWorldRun(undefined,'survival',seed).encounters.nodes,s.encounters.nodes);
  assert.equal(s.encounters.nodes.filter(n=>!SECRETS[n.type]).length,17,'public event roster stays intact');
 }
 assert.deepEqual([...counts].sort((a,b)=>a-b),[9,10]);
});

test('new model registrations point to self-contained GLBs with textured geometry',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../public/assets/kit/manifest.json',import.meta.url)));
 for(const type of Object.keys(SECRETS)){
  const id=EVENT_PRESENTATION[type].model;assert.equal(id,`secret-${type}-v2`);
  const entry=manifest.find(e=>e.id===id);assert.ok(entry);
  const bytes=await readFile(new URL(`../public/assets/kit/${entry.file}`,import.meta.url));assert.equal(bytes.length,entry.bytes);assert.equal(bytes.toString('ascii',0,4),'glTF');
  const doc=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
  assert.ok(doc.images.length>=3);assert.ok(doc.images.every(i=>Number.isInteger(i.bufferView)));
  for(const mesh of doc.meshes)for(const p of mesh.primitives)assert.ok(p.attributes.NORMAL!==undefined&&p.attributes.TEXCOORD_0!==undefined);
 }
});

test('secret GLBs retain their materials without highlights, signals or rings in any state',async()=>{
 const material=new T.MeshStandardMaterial({color:0xb7b0a2,emissive:0x010203});
 const template=new T.Group();template.add(new T.Mesh(new T.BoxGeometry(),material));
 const loaded=[],view=createGameplayModulesView(new T.Scene(),{load:async id=>{loaded.push(id);return template;}});
 const nodes=Object.keys(SECRETS).map((type,i)=>({type,state:'ready',x:i*4,y:0,z:0}));
 const s={time:0,level:1,player:{x:0,z:0},encounters:{nodes}};
 view.update(s);await Promise.resolve();view.update(s);
 assert.deepEqual(loaded,Object.keys(SECRETS).map(type=>`secret-${type}-v2`));
 for(const group of view.root.children){
  const asset=group.getObjectByName('event-asset:'+group.userData.eventModel);assert.ok(asset);
  assert.equal(group.getObjectByName('interaction-highlight'),undefined);
  asset.traverse(o=>{if(o.isMesh)assert.equal(o.material,material);});
 }
 for(const state of ['ready','reward','complete'])for(const distance of [30,4,0]){
  for(const n of nodes)n.state=state;s.player.x=distance;view.update(s);
  for(const group of view.root.children){
   assert.equal(group.getObjectByName('interaction-highlight'),undefined);
   for(const mesh of group.children.filter(o=>o.isMesh&&['RingGeometry','SphereGeometry'].includes(o.geometry.type)))assert.equal(mesh.visible,false);
  }
 }
 assert.equal(material.emissive.getHex(),0x010203);
 view.dispose();material.dispose();template.children[0].geometry.dispose();
});

test('passing secrets never reveals them or their map and world markers; opening still exposes the reward action',()=>{
 for(const type of Object.keys(SECRETS)){
  const n={id:type,type,state:'ready',discovered:false,x:0,y:0,z:0};
  const s={mode:'survival',time:0,level:1,player:{x:0,y:0,z:0},world:{flat:true,lineClear:()=>true},enemies:[],events:[],encounters:{nodes:[n]}};
  discoverEncounters(s);assert.equal(n.discovered,false);assert.deepEqual(s.events,[]);assert.deepEqual(nearbyEncounters(s),[]);
  for(const state of ['ready','reward','complete'])for(const discovered of [false,true]){
   Object.assign(n,{state,discovered});
   assert.deepEqual(visibleEventMarkers(s),[]);
   for(const filter of ['all','events','loot','threats','recovery'])assert.deepEqual(filteredMapMarkers(s,filter),[]);
  }
  n.state='ready';assert.equal(openSecret(s,n),true);assert.deepEqual(nearbyEncounters(s),[n]);
 }
});

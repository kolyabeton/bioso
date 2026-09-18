import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createRun} from '../src/game.js';
import {createPart,drop,autoPickup,pickup,stats} from '../src/assembly.js';
import {createGroundItemsView} from '../src/ground-items-view.js';
import {partModelId} from '../src/asset-models.js';
import {STORY_EVIDENCE} from '../src/story-evidence.js';
import {describePart} from '../src/ui/adapters.js';
import {eventReward} from '../src/systems/encounters.js';
import {partMeta} from '../src/systems/sets/definitions.js';
test('discard installed or stored items once, preserve identity, and allow pickup',()=>{
 const s=createRun(),arm=s.arms[0],before=stats(s).weight;
 arm.upgrades.damage=2;assert(drop(s,arm.id));assert.equal(s.arms[0],null);
 assert.equal(s.ground[0].part,arm);assert(stats(s).weight<before);assert.equal(drop(s,arm.id),false);
 autoPickup(s);assert.equal(s.ground.length,1);assert(pickup(s,s.ground[0].id));assert.equal(s.inventory[0],arm);
 assert.equal(arm.upgrades.damage,2);assert(drop(s,arm.id));assert.equal(drop(s,s.body.id),false);
});
test('ground meshes use shared part and highlight batches, then clear on reset',async()=>{
 const s=createRun(),scene=new T.Scene(),ids=[];
 const view=createGroundItemsView(scene,async id=>{ids.push(id);return new T.Mesh(new T.BoxGeometry(1,2,1),new T.MeshBasicMaterial());});
 const parts=['claws','universal','wanderer','digestion'].map(key=>createPart(s,key));
 view.update(parts.map((part,id)=>({id,part,x:id,y:0,z:0})));await Promise.resolve();
 assert.deepEqual(ids,parts.map(partModelId));assert.equal(scene.children.length,1);assert.equal(view.info().visibleGroundItems,4);
 assert.equal(scene.getObjectByName('ground-item-halos').count,4);assert.equal(scene.getObjectByName('ground-item-pointers').count,4);assert.equal(scene.getObjectByName('ground-item-particles').geometry.drawRange.count,96);
 view.update(parts.map((part,id)=>({id,part,x:id,y:0,z:0})),1,2,true);
 assert.equal(scene.getObjectByName('ground-item-particles').geometry.drawRange.count,0);
 view.update([]);assert.equal(view.info().visibleGroundItems,0);
 view.update([{id:8,part:parts[0],x:0,z:0}]);view.reset();await Promise.resolve();assert.equal(view.info().visibleGroundItems,0);
});
test('a physical story clue reuses an existing item model and highlight treatment',async()=>{
 const scene=new T.Scene(),ids=[],view=createGroundItemsView(scene,async id=>{ids.push(id);return new T.Mesh(new T.BoxGeometry(1,1,1),new T.MeshBasicMaterial());});
 view.update([{id:1,lore:{modelKey:'stabilizer'},x:0,y:0,z:0}]);await Promise.resolve();
 assert.deepEqual(ids,[partModelId({key:'stabilizer'})]);assert.equal(view.info().visibleGroundItems,1);
});
test('walking over a story clue records it without adding equipment',()=>{
 const s=createRun(),evidence=STORY_EVIDENCE[0],inventory=s.inventory.length;
 s.ground=[{id:++s.entityId,lore:evidence,x:s.player.x,y:s.player.y??0,z:s.player.z}];
 assert.deepEqual(autoPickup(s),[]);assert.equal(s.ground.length,0);assert.equal(s.inventory.length,inventory);
 assert.deepEqual(s.storyEvidence.map(item=>item.id),[evidence.id]);assert.equal(s.events.at(-1).type,'lore-found');
});
test('equipment details do not expose removed memory traces',()=>{
 const s=createRun(),part=createPart(s,'hunter',3),details=describePart(s,part);
 assert.equal(details.lines.some(line=>line.startsWith('След памяти: ')),false);
});

/** Item 31: an event reward is always epic. It used to be built with createPart
 * alone, which leaves rarity unset and therefore common, so the 'event' entry in
 * LOOT_RULES.weights was never consulted. */
test('event rewards are always epic with affixes for that rarity',()=>{
 const seen=new Set();
 for(let i=0;i<200;i++){
  const s=createRun(undefined,'survival',9100+i);s.time=300;
  const part=eventReward(s,'seed',3);
  seen.add(partMeta(part).rarity);
  assert.equal(part.affixes.length,2,'epic parts roll two affixes');
 }
 assert.deepEqual([...seen],['rare']);
});

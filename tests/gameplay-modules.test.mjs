import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {GAMEPLAY_MODULES,modulePresentation} from '../src/gameplay-modules/definitions.js';
import {createGameplayModulesView} from '../src/gameplay-modules/view.js';
import * as facade from '../src/systems/encounters.js';
import * as secrets from '../src/systems/secrets/index.js';
import * as events from '../src/systems/events/index.js';
import {isaacHit} from '../src/systems/isaac-combat.js';
import {isaacHit as organHit} from '../src/systems/organs/index.js';
import {SETS as legacySets} from '../src/systems/sets-loot.js';
import {SETS} from '../src/systems/sets/index.js';

test('domain entry points preserve simulation API identity',()=>{
 assert.equal(facade.openSecret,secrets.openSecret);assert.equal(facade.takeDeal,events.takeDeal);
 assert.equal(facade.tickChallenge,events.tickChallenge);assert.equal(isaacHit,organHit);assert.equal(SETS,legacySets);
 assert.deepEqual(Object.keys(GAMEPLAY_MODULES).sort(),Object.keys(facade.ENCOUNTERS).sort());
});
test('world modules retain opened shells and distinguish active, reward and exhausted states',()=>{
 const scene=new T.Scene(),view=createGameplayModulesView(scene);
 const nodes=Object.keys(GAMEPLAY_MODULES).map((type,i)=>({type,x:i*4,y:6,z:0,radius:7,state:'ready'}));
 const s={time:0,level:1,world:{flat:false},encounters:{nodes}};view.update(s);
 assert.equal(view.root.children.length,11);
 assert.equal(view.root.children.filter(n=>n.visible).length,3);
 s.time=300;view.update(s);assert.equal(view.root.children.filter(n=>n.visible).length,11);
 const before=JSON.stringify(nodes);view.update(s);assert.equal(JSON.stringify(nodes),before);
 nodes[0].state='reward';nodes[1].state='complete';nodes[4].state='active';nodes[6].state='failed';view.update(s);
 assert.equal(modulePresentation(nodes[0]).signal,'reward');assert.equal(modulePresentation(nodes[1]).opened,true);
 assert.equal(view.root.children[1].visible,true);assert.equal(modulePresentation(nodes[4]).signal,'active');
 assert.equal(modulePresentation(nodes[6]).signal,'off');
 for(const child of view.root.children)assert.equal(child.position.y,6);
 s.encounters.nodes=nodes.slice(0,2);view.update(s);assert.equal(view.root.children.length,2);
 view.reset();assert.equal(view.root.children.length,0);view.update(s);assert.equal(view.root.children.length,2);
 view.dispose();assert.equal(scene.children.length,0);
});


test('nursery, slab and organic cache render as image sprites and keep reward states',()=>{
 const view=createGameplayModulesView(new T.Scene());
 const nodes=['nursery','slab','membrane'].map((type,i)=>({type,x:i*4,y:0,z:0,state:'ready'}));
 const run={time:0,encounters:{nodes}};view.update(run);
 for(const group of view.root.children){
  const sprites=[];group.traverse(o=>{if(o.isSprite)sprites.push(o);});
  assert.equal(sprites.length,1);assert.ok(sprites[0].material.map);
  assert.equal(group.children.filter(o=>o.isMesh&&o.visible).length,0);
 }
 nodes[0].state='reward';nodes[1].state='complete';view.update(run);
 const sprites=[];view.root.traverse(o=>{if(o.isSprite)sprites.push(o);});
 assert.equal(sprites[1].material.opacity,.65);
 assert.notEqual(sprites[0].material.color.getHex(),0xffffff);
 view.dispose();
});

test('existing event models replace placeholders, and late loads cannot revive retired scenes',async()=>{
 const pending=[],view=createGameplayModulesView(new T.Scene(),{load:id=>new Promise(resolve=>pending.push({id,resolve}))});
 const nodes=['altar','sealed','infection','hunt'].map(type=>({type,state:'ready',x:0,y:0,z:0,radius:5}));
 const s={time:300,encounters:{nodes}};view.update(s);
 assert.deepEqual(pending.map(p=>p.id),['arch-stairs','arch-gate','arch-planter','arch-arch']);
 const template=new T.Group();template.add(new T.Mesh(new T.BoxGeometry(),new T.MeshBasicMaterial()));
 pending[0].resolve(template);await Promise.resolve();
 assert.equal(view.root.children[0].userData.eventModel,'arch-stairs');
 assert.ok(view.root.children[0].getObjectByName('event-asset:arch-stairs'));
 const retired=[...view.root.children];view.reset();
 for(const p of pending.slice(1))p.resolve(template);await Promise.resolve();
 assert.equal(view.root.children.length,0);
 for(const group of retired.slice(1))assert.equal(group.userData.eventModel,undefined);
 view.dispose();template.children[0].geometry.dispose();template.children[0].material.dispose();
});

test('simultaneous event discoveries announce together once instead of overwriting notices',()=>{
 const nodes=['altar','sealed','infection','hunt'].map(type=>({type,x:100,y:0,z:100,state:'ready'}));
 const s={time:300,level:1,player:{x:0,y:0,z:0},world:{flat:true},encounters:{nodes},events:[]};
 facade.discoverEncounters(s);
 assert.equal(s.events.length,1);assert.match(s.events[0].text,/4/);
 assert.ok(nodes.every(n=>n.discovered&&n.announced));
 facade.discoverEncounters(s);assert.equal(s.events.length,1);
});

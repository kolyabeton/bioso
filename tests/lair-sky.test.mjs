import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createWorldRun} from '../src/world-run.js';
import {stageDungeonReview,leaveDungeonReview} from '../src/dungeon-review-state.js';
import {createDungeonView} from '../src/dungeon-view.js';
import {createGameplayModulesView} from '../src/gameplay-modules/view.js';

test('sky lair renders a technical deck and clouds, without stone islands or overworld event props',()=>{
 const s=createWorldRun(undefined,'survival',20317),n=stageDungeonReview(s,'roots'),scene=new T.Scene(),view=createDungeonView(scene),modules=createGameplayModulesView(scene,{load:async()=>null});
 view.update(s);modules.update(s);
 assert(view.info().dungeonSky);
 assert.equal(scene.getObjectByName('dungeon-corridor-floor').material.name,'lair-technical-deck');
 assert(scene.getObjectByName('lair-cloud-sea').position.y< -5);
 assert.equal(scene.getObjectByName('dungeon-void'),undefined);
 assert.equal(scene.getObjectByName('dungeon-scenery-foundations'),undefined);
 assert.equal(modules.root.children.length,2,'the local entrance and its dungeon altar are rendered in the sky lair');
 assert.deepEqual(modules.root.children.map(child=>child.name).sort(),['module-altar_organs','module-dungeon_roots']);
 assert(leaveDungeonReview(s,n));view.update(s);modules.update(s);
 assert.equal(scene.getObjectByName('survival-dungeon-tunnels').visible,false,'cloud sea is removed from view when returning to survival');
 assert(modules.root.children.length>1,'survival event props return outside');
 view.reset();modules.dispose();
});

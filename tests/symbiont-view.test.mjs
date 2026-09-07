import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createEffectsView} from '../src/systems/effects-view.js';

test('bee models follow elevated companions, reset, and release their scene',()=>{
 const scene=new T.Scene(),view=createEffectsView(scene);
 const s={time:1,enemies:[],abilities:{companions:[{x:2,y:7,z:3,aim:.7,lastShotAt:1}],summonShots:[]}};
 view.update(s,true);
 const bee=scene.getObjectByName('mechanical-bee-0');
 assert.equal(bee.visible,true);assert.deepEqual(bee.position.toArray(),[2,8.5,3]);assert.equal(bee.rotation.y,.7);
 assert.equal(scene.getObjectByName('mechanical-bee-1').visible,false);
 s.abilities.companions.push({x:-2,z:-3});view.update(s);assert.equal(scene.getObjectByName('mechanical-bee-1').visible,true);
 view.reset();assert.equal(bee.visible,false);view.dispose();assert.equal(scene.children.length,0);
});

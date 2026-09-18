import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createConsumablePhaseView} from '../src/consumable-phase-view.js';

test('phase borrows visible hero geometry, returns on expiry and respects pause/reset',()=>{
 const scene=new T.Scene(),hero=new T.Group(),geometry=new T.BoxGeometry(),part=new T.Mesh(geometry,new T.MeshBasicMaterial());hero.add(part);scene.add(hero);
 const view=createConsumablePhaseView(scene),s={consumables:{phaseUntil:2}};let disposed=0;geometry.addEventListener('dispose',()=>disposed++);
 view.event({type:'pickup',kind:'phase'},hero);view.update(s,hero,0,.1,false);
 const ghost=scene.getObjectByName('consumable-phase-shell');assert(ghost.visible);assert.equal(ghost.children[0].geometry,geometry);
 const y=ghost.position.y;view.update(s,hero,0,0,false);assert.equal(ghost.position.y,y);
 view.update(s,hero,1,1,false);assert(!ghost.visible);view.update(s,hero,2,.1,false);assert(ghost.visible);
 view.update(s,hero,2,0,true);assert(!ghost.visible);view.reset();view.dispose();assert.equal(disposed,0);
});

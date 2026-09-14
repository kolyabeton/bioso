import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createLivingView} from '../src/living-view.js';

test('temporary player invulnerability has no bright ground ring',()=>{
 const scene=new T.Scene(),view=createLivingView(scene),state={dead:false,time:1,isaac:{extraTime:0},player:{x:0,y:0,z:0},health:{invulnerableUntil:2},enemies:[]};
 view.update(state);const root=scene.getObjectByName('living-combat');
 assert.equal(root.children.length,1);assert.equal(root.children[0].count,0);
 view.dispose();assert.equal(scene.getObjectByName('living-combat'),undefined);
});

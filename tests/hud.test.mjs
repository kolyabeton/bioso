import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRun} from '../src/game.js';
import {createPart} from '../src/assembly.js';
import {creatureModel} from '../src/game-view.js';
test('HUD exposes assembly, map and weapon toggle instructions',async()=>{const html=await readFile(new URL('../index.html',import.meta.url),'utf8');assert.doesNotMatch(html,/data-part=/);for(const id of ['assembly-button','map-button','panel','preview','world'])assert.equal((html.match(new RegExp(`id="${id}"`,'g'))||[]).length,1);assert.match(html,/НАЖМИТЕ НА ОРУЖИЕ, ЧТОБЫ ВКЛЮЧИТЬ ИЛИ ВЫКЛЮЧИТЬ/);});
test('physical creature exposes exactly the equipped arms and legs, including four-arm body',()=>{const s=createRun();s.body=createPart(s,'hecaton');s.arms=Array.from({length:4},()=>createPart(s,'seed'));s.legs=Array.from({length:4},()=>createPart(s,'plated'));const m=creatureModel(s);assert.equal(m.userData.arms.size,4);assert.equal(m.userData.legs.length,4);s.legs[2]=null;s.arms[2]=null;const n=creatureModel(s);assert.equal(n.userData.legs.length,3);assert.equal(n.userData.arms.size,3);});

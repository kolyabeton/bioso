import test from 'node:test';
import assert from 'node:assert/strict';
import {attack,createRun,spawnEnemy} from '../src/game.js';
import {createPart,equip,swapBody} from '../src/assembly.js';
import {BODIES} from '../src/catalog.js';

for(const key of ['bastion','reactor'])test(`${BODIES[key].name} exposes three functional arm mounts`,()=>{
 const s=createRun();
 const body=createPart(s,key),thirdArm=createPart(s,'seed');
 s.inventory.push(body,thirdArm);
 assert.equal(BODIES[key].arms,3);
 assert.ok(swapBody(s,body.id));
 assert.equal(s.arms.length,3);
 assert.ok(equip(s,thirdArm.id,2));
 assert.equal(s.arms[2],thirdArm);
 s.arms[0]=s.arms[1]=null;
 const enemy=spawnEnemy(s,'normal',{x:0,z:5});
 enemy.speed=0;
 attack(s,.01);
 assert.equal(s.shots.length,1);
});

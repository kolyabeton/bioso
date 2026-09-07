import test from 'node:test';
import assert from 'node:assert/strict';
import {bodySize} from '../src/body-size.js';
import {createRun} from '../src/game.js';
import {createPart,swapBody} from '../src/assembly.js';
import {assembleBiomeWorld} from '../src/biome-world.js';
import {movePlayer,bodyRadius} from '../src/elevation.js';
test('structural size follows mounts and carrying capacity without changing with backpack contents',()=>{
 const s=createRun(),small=bodyRadius(s);assert.equal(small,.8);
 for(const key of ['hunter','bastion','chimera','rootwalker','hecaton'])assert(bodySize({key,tier:1}).radius>small);
 assert(bodySize({key:'bastion',tier:1}).scale>1.8);assert(bodySize({key:'rootwalker',tier:1}).scale>2);
 s.inventory.push(createPart(s,'bastion',5));assert.equal(bodyRadius(s),small);
 assert(bodySize({key:'rootwalker',tier:5}).radius<=2.4);
});
test('real shrub-rock passage admits the starter and blocks the large frame, with no tunnelling',()=>{
 const w=assembleBiomeWorld(20317),results={};
 for(const key of ['wanderer','rootwalker']){const s=createRun();s.world=w;s.body=createPart(s,key);s.player={x:8.5,y:0,z:-18};for(let i=0;i<60;i++)movePlayer(s,.02,.1,0);results[key]=s.player.x;assert(w.walkable(s.player.x,s.player.z,bodyRadius(s)));}
 assert(results.wanderer>14.49);assert(results.rootwalker<13);
});
test('a larger body cannot be equipped into a gap it cannot occupy; smaller bodies remain swappable',()=>{
 const s=createRun();s.world=assembleBiomeWorld(20317);s.player={x:13,y:0,z:-18};const p=createPart(s,'rootwalker');s.inventory.push(p);
 assert(s.world.walkable(13,-18,bodyRadius(s)));assert(!s.world.walkable(13,-18,bodySize(p).radius));assert.equal(swapBody(s,p.id),false);assert.equal(s.body.key,'wanderer');assert(s.inventory.includes(p));
});

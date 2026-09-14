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
function sizeGap(w,small,large){for(let z=w.bounds.minZ+3;z<w.bounds.maxZ-3;z+=.25)for(let x=w.bounds.minX+3;x<w.bounds.maxX-3;x+=.25)if(w.walkable(x,z,small)&&!w.walkable(x,z,large))return{x,z};return null;}
test('current world retains passages that admit the starter and block a large frame',()=>{
 const w=assembleBiomeWorld(20317),small=bodySize({key:'wanderer'}).radius,large=bodySize({key:'rootwalker'}).radius,gap=sizeGap(w,small,large);
 assert.ok(gap);assert.equal(w.walkable(gap.x,gap.z,small),true);assert.equal(w.walkable(gap.x,gap.z,large),false);
});
test('a larger body cannot be equipped into a gap it cannot occupy; smaller bodies remain swappable',()=>{
 const s=createRun();s.world=assembleBiomeWorld(20317);const p=createPart(s,'rootwalker'),gap=sizeGap(s.world,bodyRadius(s),bodySize(p).radius);s.player={...gap,y:s.world.heightAt(gap.x,gap.z)};s.inventory.push(p);
 assert(s.world.walkable(gap.x,gap.z,bodyRadius(s)));assert(!s.world.walkable(gap.x,gap.z,bodySize(p).radius));assert.equal(swapBody(s,p.id),false);assert.equal(s.body.key,'wanderer');assert(s.inventory.includes(p));
});

import assert from 'node:assert/strict';
import {assembleBiomeWorld as oldWorld} from './world-reference.mjs';
import {assembleBiomeWorld as newWorld} from '../../src/biome-world.js';
import {seededRandom} from '../../src/simulation.js';
import {createWorldRun,stepWorldRun} from '../../src/world-run.js';
let comparisons=0;
const a=oldWorld(20317),b=newWorld(20317),rng=seededRandom(9813);
for(let i=0;i<10000;i++){
 const x=rng()*324-34,z=rng()*324-34,r=[0,.4,.8,1.4,2.4][i%5],p={x,z},q={x:x+(rng()-.5)*4,z:z+(rng()-.5)*4};
 for(const [method,args]of [['heightAt',[x,z]],['walkable',[x,z,r]],['flyable',[x,z,r]],['canMove',[p,q,r]],['canFly',[p,q,r]],['lineClear',[{...p,y:1},{...q,y:1}]]]){assert.equal(a[method](...args),b[method](...args),method);comparisons++;}
}
const runs=[a,b].map(world=>{const s=createWorldRun(undefined,'survival',20317);s.world=world;s.time=115;s.health.invulnerableUntil=Infinity;return s;});
for(let frame=0;frame<1200;frame++)for(const s of runs)stepWorldRun(s,1/60,{x:Math.cos(frame/240),z:Math.sin(frame/240)});
const state=s=>({player:s.player,enemies:s.enemies,time:s.time,rngNext:s.rng(),hp:s.hp,kills:s.kills,ground:s.ground,xp:s.xp,abilities:s.abilities});
assert.deepEqual(state(runs[0]),state(runs[1]));
console.log(JSON.stringify({passed:true,collisionComparisons:comparisons,simulationFrames:1200,enemies:runs[0].enemies.length}));

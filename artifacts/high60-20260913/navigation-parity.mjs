import assert from 'node:assert/strict';
import {createWorldRun,stepWorldRun} from '../../src/world-run.js';
import {step as oldStep} from './game-reference.mjs';
import {spawnEnemy} from '../../src/game.js';
const runs=Array.from({length:2},()=>{const s=createWorldRun(undefined,'survival',20317);s.time=1120;s.health.invulnerableUntil=Infinity;for(let i=0;i<1000&&s.enemies.length<180;i++)spawnEnemy(s,i<6?'elite':'normal',null,i%5===0?'ranged':'mass',s.time,{wave:true,promote:false});return s;});
for(let frame=0;frame<900;frame++){
 const input={x:Math.cos(frame/240),z:Math.sin(frame/240)};
 oldStep(runs[0],1/60,input);stepWorldRun(runs[1],1/60,input);
 if(frame===450)for(const s of runs){const tile=s.world.tiles[0];tile.decorations=tile.decorations.slice(1);for(const t of s.world.tiles)delete t.collisionDecorations;}
 const state=s=>{return Object.fromEntries(Object.entries(s).filter(([key,value])=>key!=='world'&&typeof value!=='function'));};try{assert.deepEqual(state(runs[0]),state(runs[1]));}catch{const diffs=[];function compare(a,b,path=''){if(typeof a==='function'&&typeof b==='function'){diffs.push(path+': functions');return;}if(a&&b&&typeof a==='object'&&typeof b==='object'){for(const key of new Set([...Object.keys(a),...Object.keys(b)]))compare(a[key],b[key],path+'.'+key);}else if(!Object.is(a,b))diffs.push(path+': '+a+' / '+b);}compare(state(runs[0]),state(runs[1]));throw Error(JSON.stringify({frame,diffs:diffs.slice(0,12)}));}
}
assert.equal(runs[0].rng(),runs[1].rng());assert.equal(runs[0].enemyAssemblyRng(),runs[1].enemyAssemblyRng());if(runs[0].consumableRng)assert.equal(runs[0].consumableRng(),runs[1].consumableRng());console.log(JSON.stringify({passed:true,frames:900,initialCrowd:180,finalCrowd:runs[0].enemies.length,obstacleInvalidationFrame:450}));

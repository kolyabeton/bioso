import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorldRun} from '../src/world-run.js';

test('survival encounters vary by seed, spread across tiles with no more than two objects each, and remain reachable',()=>{
 const layouts=new Set();
 for(let seed=1;seed<=30;seed++){
  const s=createWorldRun(undefined,'survival',seed),allNodes=s.encounters.nodes,nodes=allNodes.filter(n=>!n.dungeonId);
  assert.ok([26,27].includes(allNodes.length));
  const counts=new Map();for(const n of nodes){const id=s.world.tileAt(n.x,n.z).id;counts.set(id,(counts.get(id)||0)+1);}assert.ok([...counts.values()].every(n=>n<=2));
  layouts.add(JSON.stringify(allNodes.map(n=>[n.x,n.z])));
  for(const [i,n] of nodes.entries()){
   assert.ok(Math.hypot(n.x-s.player.x,n.z-s.player.z)>=48);
   assert.ok(s.world.walkable(n.x,n.z,2.4));
   assert.ok(s.world.findPath(s.world.tileAt(n.x,n.z).safe[2],n,2.4).length);
   for(const other of nodes.slice(i+1))assert.ok(Math.hypot(n.x-other.x,n.z-other.z)>=32);
  }
 }
 assert.equal(layouts.size,30);
});

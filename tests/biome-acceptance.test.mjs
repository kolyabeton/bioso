import {createRun} from '../src/game.js';
import {prepareBiomes} from '../src/biome-run.js';
import {tickHostileShots} from '../src/systems/waves.js';
import {WAVE_RULES} from '../src/systems/balance.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {assembleBiomeWorld,validateWorld} from '../src/biome-world.js';

test('module validation compares authored port height with the actual surface',()=>{
 const w=assembleBiomeWorld(12),t=w.tiles[0],p=t.ports[1];
 for(const tile of w.tiles)for(const q of tile.ports)if(q.x===p.x&&q.z===p.z)q.y=2;
 assert.ok(validateWorld(w).includes(t.id+':seam'));
});
test('module validation rejects a missing biome',()=>{
 const w=assembleBiomeWorld(12);for(const t of w.tiles)if(t.biome==='forest')t.biome='gardens';
 assert.ok(validateWorld(w).includes('world:missing-biome:forest'));
});
test('airborne hero can be hit at its real height and is missed by a lower projectile',()=>{
 for(const height of [1,3]){
  const s=prepareBiomes(createRun(undefined,'survival',12)),t=s.world.tiles.find(t=>t.kind==='clearing');
  s.player={x:t.x,z:t.z,y:2,vertical:'jumping'};
  s.hostileShots=[{x:t.x-2,z:t.z,y:height,dx:1,dz:0,dy:0,life:1}];let hits=0;
  tickHostileShots(s,4/WAVE_RULES.projectileSpeed,()=>hits++);
  assert.equal(hits,height===3?1:0);
 }
});
test('a decoration volume blocks hostile fire before it reaches the hero',()=>{
 const s=prepareBiomes(createRun(undefined,'survival',12)),t=s.world.tiles.find(t=>t.kind==='clearing'),d=t.decorations[0];
 s.player={x:d.x+5,z:d.z,y:0};s.hostileShots=[{x:d.x-5,z:d.z,y:1,dx:1,dz:0,dy:0,life:2}];let hits=0;
 tickHostileShots(s,10/WAVE_RULES.projectileSpeed,()=>hits++);
 assert.equal(hits,0);assert.equal(s.hostileShots.length,0);
});

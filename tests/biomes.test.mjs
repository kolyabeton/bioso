import test from 'node:test';
import assert from 'node:assert/strict';
import {createBiomeWorld,validateWorld,MODULES,TRANSITIONS} from '../src/biome-world.js';
import {prepareBiomes} from '../src/biome-run.js';
import {createRun} from '../src/game.js';
import {movePlayer} from '../src/elevation.js';
import {BiomeStream} from '../src/biome-stream.js';
const run=()=>prepareBiomes(createRun(undefined,'survival',12));
test('100 seeds: all four biomes, twelve modules, four transitions, connected ground and seams',()=>{
 assert.equal(MODULES.length,12);assert.equal(TRANSITIONS.length,4);const signatures=new Set();
 for(let seed=0;seed<100;seed++){const w=createBiomeWorld(seed);assert.equal(w.tiles.length,25);assert.equal(new Set(w.tiles.map(t=>t.biome)).size,4);assert.deepEqual(validateWorld(w),[]);assert.equal(w.fallback,false);signatures.add(w.tiles.map(t=>t.moduleId).join(','));assert.deepEqual(w.tiles,createBiomeWorld(seed).tiles);}
 assert.ok(signatures.size>30);
});
test('streaming retains bounded residency, failed loads can retry, obsolete loads release',async()=>{
 const released=[],pending=new Map();let fail=true;
 const stream=new BiomeStream(id=>id==='bad'&&fail?Promise.reject(Error('offline')):id==='slow'?new Promise(r=>pending.set(id,r)):Promise.resolve({id}),v=>released.push(v.id));
 const tick=()=>new Promise(r=>setTimeout(r,0));stream.update(['a','bad','slow']);await tick();assert.equal(stream.ready.has('a'),true);assert.equal(stream.entries.get('bad').status,'error');stream.update(['a']);pending.get('slow')({id:'slow'});await tick();assert.ok(released.includes('slow'));
 fail=false;stream.update(['bad']);await tick();assert.ok(stream.ready.has('bad'));assert.ok(released.includes('a'));stream.reset();assert.equal(stream.entries.size,0);
});
test('a full ring route preserves run state and loot on return',()=>{
 const s=run(),original=s.ground.map(q=>q.id),wave=s.waves;s.arms=[];
 // Ground paths, no teleport: route safe points and shared portals around the ring.
 for(let i=0;i<=16;i++){
  const t=s.world.tiles[i%16],goal=t.safe[2],path=s.world.findPath(s.player,goal,1.5);assert.ok(path.length||Math.hypot(s.player.x-goal.x,s.player.z-goal.z)<2);
  for(const p of path){const dx=p.x-s.player.x,dz=p.z-s.player.z,n=Math.ceil(Math.hypot(dx,dz)/.2);for(let k=0;k<n;k++)movePlayer(s,.025,dx/n,dz/n);assert.equal(s.dead,false);}
  assert.ok(Math.hypot(s.player.x-goal.x,s.player.z-goal.z)<3,`${i}: ${JSON.stringify(s.player)}`);
 }
 assert.deepEqual(s.ground.map(q=>q.id),original);assert.equal(s.waves,wave);
});
test('stream retry reloads the same failed tile; crossing is held until ready',async()=>{
 let fail=true;const stream=new BiomeStream(()=>fail?Promise.reject(Error('offline')):Promise.resolve({}),()=>{});const tick=()=>new Promise(r=>setTimeout(r,0));stream.update(['a']);await tick();assert.equal(stream.entries.get('a').status,'error');fail=false;stream.retry();stream.update(['a']);await tick();assert.equal(stream.ready.has('a'),true);
 const s=run(),a=s.world.tiles[0],b=s.world.tiles[1];s.player={x:31.9,z:0,y:0};s.streaming={ready:new Set([a.id])};movePlayer(s,.05,.2,0);assert.equal(s.player.x,31.9);s.streaming.ready.add(b.id);movePlayer(s,.05,.2,0);assert.ok(s.player.x>32);
});

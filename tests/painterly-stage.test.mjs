import test from 'node:test';
import assert from 'node:assert/strict';
import {createPaintedRun,stepPaintedRun,STAGE_ROWS} from '../src/painterly-stage.js';
import {step,spawnEnemy} from '../src/game.js';
import {move,spawnPoint} from '../src/terrain.js';
import {MISSIONS} from '../src/catalog.js';
import {createPart,newProfile} from '../src/assembly.js';
import {readFile} from 'node:fs/promises';

test('painted stage keeps new assembly and real combat on the restored terrace',()=>{
 const s=createPaintedRun(newProfile(),'survival',123);
 assert.deepEqual(s.arms.map(p=>p?.key??null),['claws',null]);
 assert.equal(s.world.presentation,'painterly');
 assert.ok(s.world.walkable(s.player.x,s.player.z));
 const enemy=spawnEnemy(s,'normal',{x:s.player.x,z:s.player.z-1});
 enemy.hp=enemy.maxHp=100;const hp=enemy.hp;step(s,.05);assert.equal(enemy.hp,hp);
 for(let i=0;i<90&&enemy.hp===hp;i++)step(s,1/60);assert.ok(enemy.hp<hp);
 assert.ok(s.events.some(e=>e.type==='attack'&&e.key==='claws'));
 assert.equal(s.events.some(e=>e.type==='attack'&&e.key==='seed'),false);
});
test('movement stays on painted ground at all edges, including large bodies',()=>{
 const s=createPaintedRun();s.body=createPart(s,'hecaton');
 for(const [zz,left,right] of STAGE_ROWS){
  for(const x of [left,(left+right)/2,right]){
   const p={x,z:zz};move(s.world,p,-999,-999);assert.ok(s.world.walkable(p.x,p.z));
   move(s.world,p,999,999);assert.ok(s.world.walkable(p.x,p.z));
  }
 }
 assert.equal(s.world.walkable(-100,0),false);
 assert.equal(s.world.walkable(0,100),false);
});
test('all mission nodes remain shared with objective enemies and reachable on terrace',()=>{
 for(const mission of MISSIONS){
  const s=createPaintedRun(newProfile(),mission.id,123);
  for(const node of s.mission.nodes){
   assert.ok(s.world.walkable(node.x,node.z),mission.id);
   const p={...s.player};
   for(let i=0;i<300;i++){const dx=node.x-p.x,dz=node.z-p.z,d=Math.hypot(dx,dz);if(d<.1)break;move(s.world,p,dx/d*.5,dz/d*.5);}
   assert.ok(Math.hypot(node.x-p.x,node.z-p.z)<.6,mission.id);
   if(node.kind==='objective')assert.ok(s.enemies.includes(node));
  }
 }
});
test('enemies can spawn on actual painted ground from center and either end',()=>{
 const s=createPaintedRun(newProfile(),'survival',123);
 for(const player of [{x:1.5,z:21},{x:2,z:0},{x:6,z:-24}]){
  let found=0;
  for(let i=0;i<50;i++){const point=spawnPoint(s.world,player,s.rng);if(point){assert.ok(s.world.walkable(point.x,point.z));assert.ok(Math.hypot(point.x-player.x,point.z-player.z)>=27);found++;}}
  assert.ok(found>=45,`spawn coverage: ${found}/50`);
 }
});
test('main game activates large world while retaining the legacy presentation adapter',async()=>{
 const css=await readFile(new URL('../src/ui/game-ui.css',import.meta.url),'utf8');
 const main=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
 const view=await readFile(new URL('../src/game-view.js',import.meta.url),'utf8');
 assert.match(css,/upper-gardens-v2\.jpg/);assert.match(css,/56\.25dvh/);
 assert.match(main,/run=createWorldRun\(profile/);
 assert.match(view,/if\(!painted&&!biomeActive\)updateChunks\(s\)/);
 assert.match(view,/camera\.lookAt\(0,0,0\)/);
});
test('loot scattered beyond a painted edge stays reachable without losing its item',()=>{
 const run=createPaintedRun();const part=createPart(run,'seed');
 run.ground.push({id:123,part,x:99,z:99});
 stepPaintedRun(run,0,{x:0,z:0});
 assert.equal(run.ground[0].part,part);
 assert.ok(run.world.walkable(run.ground[0].x,run.ground[0].z));
});

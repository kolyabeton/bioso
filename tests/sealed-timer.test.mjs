import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,beginEncounter,step} from '../src/game.js';
import {claimEncounter} from '../src/systems/encounters.js';

function fixture(){
 const s=createRun(undefined,'survival',19);
 s.world={walkable:()=>true,chunk:()=>({cx:0,cz:0,lair:{x:999,z:999}})};
 s.time=300;s.arms=[];s.enemies=[];s.rng=()=>.99;
 const n={id:'sealed-timer',type:'sealed',state:'ready',x:0,y:0,z:0,radius:7,rewards:['claws'],elapsed:100,progress:100};
 s.encounters={nodes:[n],active:null};
 assert(beginEncounter(s,n.id));assert.equal(n.elapsed,0);
 return{s,n};
}

for(const fps of [20,30,60,120])test(`sealed reward requires 45 active seconds through the game loop at ${fps} FPS`,()=>{
 const {s,n}=fixture();
 for(let frame=1;frame<=45*fps;frame++){
  // Worst case for premature success: no enemy survives until the next frame.
  s.enemies=[];
  if(frame===15*fps){
   const elapsed=n.elapsed;
   s.pending=1;step(s,120);s.pending=0;
   assert.equal(n.elapsed,elapsed);assert.equal(n.state,'active');
   s.bossRewards=[{}];step(s,120);s.bossRewards=[];
   assert.equal(n.elapsed,elapsed);assert.equal(n.state,'active');
  }
  step(s,1/fps);
  assert.equal(s.time,300,'the run clock stays frozen throughout the challenge');
  if(frame<45*fps){assert.equal(n.state,'active');assert.equal(s.encounters.active,n);assert.equal(claimEncounter(s,n.id,0),false);}
 }
 assert.equal(n.state,'reward');assert.equal(s.encounters.active,null);
 assert(Math.abs(n.elapsed-45)<1e-8);
 assert.equal(s.events.filter(e=>e.text==='Испытание пройдено · выберите награду').length,1);
 assert(claimEncounter(s,n.id,0));assert.equal(claimEncounter(s,n.id,0),false);
});

test('a dead player cannot complete the sealed timer or receive its reward',()=>{
 const {s,n}=fixture();n.elapsed=44.99;s.enemies=[];s.hp=0;s.dead=true;
 step(s,.05);assert.equal(n.elapsed,44.99);assert.equal(n.state,'active');
 assert.equal(claimEncounter(s,n.id,0),false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,spawnEnemy} from '../src/game.js';
import {tickWaves} from '../src/systems/waves.js';
import {tickSurvivalHordes} from '../src/systems/survival-hordes.js';
import {assignWaveEliteDisposition} from '../src/systems/territories.js';
import {enemyBalance,SURVIVAL_PRESSURE} from '../src/systems/balance.js';

function fixture(){
 const s=createRun(undefined,'survival',20260913);
 s.world={flat:true,walkable:()=>true,lineClear:()=>true};s.enemies=[];s.bossHabitats=[];s.encounters={active:null,nodes:[]};
 return s;
}
function tick(s,dt){const spawn=(...args)=>spawnEnemy(s,...args);tickSurvivalHordes(s,dt,spawn);tickWaves(s,dt,spawn);}

test('map elites remain independent during warmup, exhausted wave quota, rest and relief',()=>{
 const s=fixture();
 for(const time of [0,120,185,220]){
  s.time=time;if(time===120)tick(s,0);if(time===220)s.reliefUntil=250;
  const issued=s.waves.eliteWave?.issued;
  for(let i=0;i<4;i++){
   const e=spawnEnemy(s,'elite',{x:10+i,z:0},'mass',time);
   assert.ok(e);assert.equal(e.wavePressureIndex,undefined);assert.equal(e.waveElite,undefined);
   assert.equal(s.waves.eliteWave?.issued,issued);
  }
 }
 s.time=250;tick(s,0);
 assert.equal(s.enemies.filter(e=>e.waveElite).length,2,'map elites do not consume wave slots');
});

test('warmup never promotes wave mobs, so the first assault starts with one weak elite',()=>{
 const s=fixture();s.time=90;s.normalSpawnCount=29;s.waves.credit=1;
 tickWaves(s,0,(...args)=>spawnEnemy(s,...args));assert.equal(s.enemies[0].kind,'normal');
 assert.equal(spawnEnemy(s,'elite',null,'mass',90,{wave:true}),null);
 s.time=120;tick(s,0);
 const elite=s.enemies.find(e=>e.waveElite);assert.ok(elite);assert.equal(elite.wavePressureIndex,0);
 const hp=Math.round(Math.round(enemyBalance(120,'elite').hp*SURVIVAL_PRESSURE.hp)*.3);
 assert.equal(elite.hp,hp);assert.equal(elite.damage,.5);
 assignWaveEliteDisposition(s,elite);assert.equal(elite.hp,hp);assert.equal(elite.damage,.5);assert.equal(s.waves.waveEliteCount,1);
});

test('successive waves issue exactly 1, 2, 3, 4, 5, 6 elites even when every enemy dies immediately',()=>{
 const s=fixture(),counts=[];
 for(let wave=0;wave<8;wave++){
  let count=0;s.time=120+wave*100;tick(s,0);
  for(let frame=0;frame<650;frame++){
   count+=s.enemies.filter(e=>e.kind==='elite').length;s.enemies=[];
   s.time=120+wave*100+(frame+1)/10;tick(s,.1);
  }
  count+=s.enemies.filter(e=>e.kind==='elite').length;s.enemies=[];counts.push(count);
 }
 assert.deepEqual(counts,[1,2,3,4,5,6,6,6]);
});

test('surviving elites occupy next-wave slots and cannot stack beyond its quota',()=>{
 const s=fixture();
 for(let wave=0;wave<7;wave++){
  s.time=120+wave*100;tick(s,0);
  for(let frame=1;frame<=650;frame++){
   s.enemies=s.enemies.filter(e=>e.kind==='elite');
   s.time=120+wave*100+frame/10;tick(s,.1);
   assert.ok(s.enemies.filter(e=>e.kind==='elite').length<=Math.min(6,wave+1));
  }
  assert.equal(s.enemies.filter(e=>e.kind==='elite').length,Math.min(6,wave+1));
 }
});

test('direct wave promotions and scheduled requests cannot bypass the quota after a kill',()=>{
 const s=fixture();s.time=120;tick(s,0);s.enemies[0].hp=0;
 for(let i=0;i<10;i++){
  s.normalSpawnCount=29;const e=spawnEnemy(s,'normal',{x:10,z:0},'mass',s.time,{wave:true,promote:true});
  assert.equal(e.kind,'normal');assert.equal(spawnEnemy(s,'elite',null,'mass',s.time,{wave:true}),null);
  s.time=121+i;s.nextElite=s.time;tick(s,1);
 }
 assert.equal(s.waves.eliteWave.issued,1);assert.equal(s.enemies.filter(e=>e.hp>0&&e.kind==='elite').length,0);
});

test('blocked placement does not spend the first elite and no wave elite appears during relief',()=>{
 const s=fixture();s.time=120;s.world.walkable=()=>false;
 assert.equal(spawnEnemy(s,'elite',null,'mass',120,{wave:true}),null);assert.equal(s.waves.eliteWave.issued,0);
 s.world.walkable=()=>true;s.reliefUntil=125;
 assert.equal(spawnEnemy(s,'elite',null,'mass',120,{wave:true}),null);
 s.time=126;assert.ok(spawnEnemy(s,'elite',null,'mass',126,{wave:true}));assert.equal(s.waves.eliteWave.issued,1);
 s.time=185;assert.equal(spawnEnemy(s,'elite',null,'mass',185,{wave:true}),null);
});

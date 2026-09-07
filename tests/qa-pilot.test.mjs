import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorldRun,stepWorldRun} from '../src/world-run.js';
import {createPilot} from '../src/qa-pilot.js';
import {spawnEnemy} from '../src/game.js';

test('melee controller baits a volatile fuse then retreats beyond its real blast',()=>{
 const s=createWorldRun(undefined,'core',42),bot=createPilot({style:'melee'});
 s.world={landmarks:[],walkable:()=>true};s.exploration.groups=[];s.mission.complete=true;s.mode='comparison';s.enemies=[];s.player={x:0,z:0};s.encounters={nodes:[],active:null};
 const enemy=spawnEnemy(s,'normal',{x:6,z:0},'mass',0);enemy.volatile=true;enemy.hp=enemy.maxHp=200;
 let warned=false;for(let i=0;i<600&&!s.dead&&enemy.hp>0;i++){stepWorldRun(s,1/60,bot.direction(s));warned ||= enemy.fuseRemaining!=null;s.events=[];}
 assert.ok(warned);assert.equal(enemy.hp,0);assert.equal(s.health.hits,0);
});

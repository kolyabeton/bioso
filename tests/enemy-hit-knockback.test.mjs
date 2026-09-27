import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,receiveDamage,step,ENEMY_HIT_KNOCKBACK} from '../src/game.js';
import {stats} from '../src/assembly.js';

const fixture=()=>{
 const s=createRun(undefined,'survival',7331);
 s.world={walkable:()=>true};
 s.rng=()=>1;
 s.health.armorSpent=stats(s).armor;
 return s;
};

test('elite hits knock the hero back and boss hits knock much farther',()=>{
 const eliteRun=fixture(),elite={kind:'elite',x:-1,z:0};
 assert.equal(receiveDamage(eliteRun,.5,stats(eliteRun),elite),'hurt');
 assert.equal(eliteRun.player.x,0);
 assert.equal(eliteRun.events.at(-1).type,'player-knockback');
 step(eliteRun,.1);
 assert.ok(eliteRun.player.x>0&&eliteRun.player.x<ENEMY_HIT_KNOCKBACK.elite);
 for(let i=0;i<3;i++)step(eliteRun,.1);
 assert.ok(Math.abs(eliteRun.player.x-ENEMY_HIT_KNOCKBACK.elite)<1e-6);

 const bossRun=fixture(),boss={kind:'boss',x:-1,z:0};
 assert.equal(receiveDamage(bossRun,.5,stats(bossRun),boss),'hurt');
 assert.equal(bossRun.player.x,0);
 step(bossRun,.1,{x:-1,z:0});
 assert.ok(bossRun.player.x>0&&bossRun.player.x<ENEMY_HIT_KNOCKBACK.boss);
 for(let i=0;i<3;i++)step(bossRun,.1,{x:-1,z:0});
 assert.ok(Math.abs(bossRun.player.x-ENEMY_HIT_KNOCKBACK.boss)<1e-6);
 assert.ok(bossRun.player.x>eliteRun.player.x*2);
});

test('ordinary, dodged and invulnerability-ignored hits do not knock the hero back',()=>{
 const ordinaryRun=fixture();
 receiveDamage(ordinaryRun,.5,stats(ordinaryRun),{kind:'normal',x:-1,z:0});
 assert.equal(ordinaryRun.player.x,0);

 const dodgedRun=fixture();dodgedRun.extraParts={springDodgeUntil:1};
 assert.equal(receiveDamage(dodgedRun,.5,stats(dodgedRun),{kind:'boss',x:-1,z:0}),'dodged');
 assert.equal(dodgedRun.player.x,0);

 const ignoredRun=fixture();ignoredRun.health.invulnerableUntil=1;
 assert.equal(receiveDamage(ignoredRun,.5,stats(ignoredRun),{kind:'boss',x:-1,z:0}),'ignored');
 assert.equal(ignoredRun.player.x,0);
});

test('an elite projectile pushes in its flight direction on impact',()=>{
 const s=fixture();
 s.hostileShots.push({id:99,owner:7,kind:'elite',x:-1,y:1,z:0,dx:1,dz:0,dy:0,speed:10,life:1,damage:.5,travel:0});
 step(s,.1);
 assert.equal(s.health.hits,1);
 assert.equal(s.player.x,0);
 step(s,.1);
 assert.ok(s.player.x>0&&s.player.x<ENEMY_HIT_KNOCKBACK.elite);
 assert.equal(s.hostileShots.length,0);
});
